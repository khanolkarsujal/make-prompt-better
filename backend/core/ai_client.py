from openai import AsyncOpenAI
import json
import logging
import time
import re
from .config import settings
from fastapi import HTTPException
from typing import AsyncGenerator, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = AsyncOpenAI(base_url=settings.OLLAMA_BASE_URL, api_key="ollama")
MODEL = settings.OLLAMA_MODEL

def log_telemetry(request_id: str, strategy: str, latency_ms: int, tokens_in: int, tokens_out: int, json_retries: int, success: bool, error: str = ""):
    """Structured telemetry logging."""
    telemetry = {
        "request_id": request_id,
        "strategy": strategy,
        "model": MODEL,
        "latency_ms": latency_ms,
        "tokens_input": tokens_in,
        "tokens_output": tokens_out,
        "json_retries": json_retries,
        "success": success,
        "error": error
    }
    logger.info(f"[TELEMETRY] {json.dumps(telemetry)}")

async def call_ai_async(system_prompt: str, user_content: str, max_tokens: int = 600, temperature: float = 0.3, stream: bool = False) -> Any:
    """
    Call LLM asynchronously. If stream=True, returns an AsyncGenerator. Otherwise returns a string.
    """
    t0 = time.time()
    request_id = str(hash(user_content + str(t0)))
    
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
        )
        
        if stream:
            async def generate():
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            return generate()
            
        content = response.choices[0].message.content.strip()
        usage = response.usage
        
        log_telemetry(
            request_id=request_id,
            strategy=settings.INFERENCE_STRATEGY,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.prompt_tokens if usage else 0,
            tokens_out=usage.completion_tokens if usage else 0,
            json_retries=0,
            success=True
        )
        
        return content
    except Exception as e:
        log_telemetry(
            request_id=request_id,
            strategy=settings.INFERENCE_STRATEGY,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=0, tokens_out=0, json_retries=0,
            success=False,
            error=str(e)
        )
        logger.error(f"AI API Call failed: {e}")
        raise HTTPException(status_code=502, detail=f"LLM Generation Failed: {str(e)}")

def repair_json(text: str) -> str:
    """Lightweight JSON repair layer for local 7B models."""
    # Remove trailing commas
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    # Ensure braces are balanced (simple heuristic)
    open_b = text.count('{')
    close_b = text.count('}')
    if open_b > close_b:
        text += '}' * (open_b - close_b)
    return text

def parse_json(text: str, max_retries: int = 1) -> dict:
    """Safely strip markdown fences, repair JSON, and parse."""
    if "<think>" in text and "</think>" in text:
        text = text.split("</think>")[1]
        
    for attempt in range(max_retries + 1):
        clean_text = text
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
        else:
            start = clean_text.find("{")
            end = clean_text.rfind("}")
            if start != -1 and end != -1 and end > start:
                clean_text = clean_text[start:end+1]
                
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            if attempt < max_retries:
                text = repair_json(clean_text)
            else:
                logger.error(f"Failed to parse JSON. Final text: {clean_text}")
                raise HTTPException(status_code=502, detail="Failed to parse structured JSON from LLM.")
