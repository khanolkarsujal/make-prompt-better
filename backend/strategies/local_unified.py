import json
import time
from typing import Dict, Any, Optional
from ..strategies.base import InferenceStrategy
from ..core.ai_client import client, parse_json, log_telemetry
from ..core.config import settings
from ..core.prompts_local import UNIFIED_ANALYSIS_PROMPT
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class LocalUnifiedStrategy(InferenceStrategy):
    """Single-pass execution logic optimized for Qwen2.5 7B via Ollama."""
    
    async def analyze(self, prompt: str, selections: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        effective_prompt = prompt
        if selections:
            effective_prompt += "\\n\\nPrevious Answers:\\n" + "\\n".join([f"- {k}: {v}" for k, v in selections.items()])
            
        messages = [
            {"role": "system", "content": UNIFIED_ANALYSIS_PROMPT},
            {"role": "user", "content": f"Analyze this prompt:\\n\\n{effective_prompt}"}
        ]
        
        t0 = time.time()
        request_id = str(hash(effective_prompt + str(t0)))
        
        try:
            response = await client.chat.completions.create(
                model=settings.OLLAMA_MODEL,
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            usage = response.usage
            
            parsed_json = parse_json(content, max_retries=1)
            
            log_telemetry(
                request_id=request_id,
                strategy="local_unified",
                latency_ms=int((time.time() - t0) * 1000),
                tokens_in=usage.prompt_tokens if usage else 0,
                tokens_out=usage.completion_tokens if usage else 0,
                json_retries=0, # Simplified tracking here
                success=True
            )
            
            return parsed_json
            
        except Exception as e:
            log_telemetry(
                request_id=request_id, strategy="local_unified",
                latency_ms=int((time.time() - t0) * 1000), tokens_in=0, tokens_out=0, json_retries=0, success=False, error=str(e)
            )
            logger.error(f"Local Unified Strategy Failed: {str(e)}")
            raise HTTPException(status_code=502, detail="AI Service Error")
