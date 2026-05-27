import asyncio
from typing import Dict, Any, Optional
from .base import InferenceStrategy
from ..core.ai_client import call_ai_async, parse_json
from ..core.prompts_cloud import INTENT_ANALYZER_PROMPT, CONTEXT_DETECTOR_PROMPT, AMBIGUITY_DETECTOR_PROMPT, SUGGESTION_ENGINE_PROMPT

class CloudParallelStrategy(InferenceStrategy):
    """Parallel multi-agent execution logic optimized for Cloud Endpoints (OpenAI/Anthropic)."""
    
    async def analyze(self, prompt: str, selections: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        effective_prompt = prompt
        if selections:
            effective_prompt += "\\n\\nPrevious Answers:\\n" + "\\n".join([f"- {k}: {v}" for k, v in selections.items()])
            
        # Fire independent specialized agents concurrently
        intent_res, context_res, ambiguity_res = await asyncio.gather(
            call_ai_async(INTENT_ANALYZER_PROMPT, effective_prompt),
            call_ai_async(CONTEXT_DETECTOR_PROMPT, effective_prompt),
            call_ai_async(AMBIGUITY_DETECTOR_PROMPT, effective_prompt)
        )
        
        intent = parse_json(intent_res)
        context = parse_json(context_res)
        ambiguity = parse_json(ambiguity_res)
        
        skip = intent.get("skip_clarification", False) or intent.get("confidence", 0) >= 0.85
        
        if skip:
            suggestions = {"questions": []}
        else:
            sugg_ctx = f"Prompt: {effective_prompt}\\nIntent: {intent}\\nContext: {context}\\nAmbiguity: {ambiguity}"
            sugg_res = await call_ai_async(SUGGESTION_ENGINE_PROMPT, sugg_ctx)
            suggestions = parse_json(sugg_res)
            
        return {
            "intent": intent,
            "context": context,
            "ambiguity": ambiguity,
            "suggestions": suggestions
        }
