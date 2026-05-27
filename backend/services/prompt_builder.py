import json
from typing import Dict, Any
from ..core.ai_client import call_ai_async, MODEL
from ..core.prompts import PROMPT_BUILDER_PROMPT

class PromptBuilder:
    async def build(self, original_prompt: str, selections: Dict[str, str], intent: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Builds the final production-grade enhanced prompt using all gathered context and user answers.
        """
        clarifications = "\\n".join([f"- {k}: {v}" for k, v in selections.items()]) if selections else "None provided"

        analysis_context = f"""RAW USER PROMPT:
{original_prompt}

DEEP INTENT ANALYSIS:
{json.dumps(intent, indent=2)}

CONTEXT DETECTION:
{json.dumps(context, indent=2)}

USER CLARIFICATION ANSWERS:
{clarifications}

Now generate the production-grade final prompt."""

        enhanced_prompt = await call_ai_async(
            system_prompt=PROMPT_BUILDER_PROMPT,
            user_content=analysis_context,
            max_tokens=1500,
            temperature=0.5
        )

        return {
            "enhanced_prompt": enhanced_prompt,
            "original_prompt": original_prompt,
            "selections": selections,
            "metadata": {
                "intent": intent,
                "context": context,
                "word_count": len(enhanced_prompt.split()),
                "model": MODEL
            }
        }
