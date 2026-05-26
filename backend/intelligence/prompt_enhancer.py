from typing import Dict, Any
from anthropic import Anthropic
from openai import OpenAI
from core.config import settings


# Initialize AI client
if settings.AI_PROVIDER == "xai":
    client = OpenAI(
        base_url="https://api.x.ai/v1",
        api_key=settings.XAI_API_KEY
    )
    model_name = "grok-2-preview"
else:
    client = Anthropic(
        api_key=settings.ANTHROPIC_API_KEY
    )
    model_name = "claude-3-5-sonnet-20240620"


class PromptEnhancer:
    async def enhance_prompt(
        self,
        original_prompt: str,
        selections: Dict[str, str],
        intent: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Convert vague prompts into
        production-ready AI prompts.
        """

        clarifications = "\n".join(
            [f"- {k}: {v}" for k, v in selections.items()]
        )

        system_prompt = """
You are an expert prompt engineer.

Your job is to transform vague prompts into
highly detailed, production-ready prompts
for AI coding agents.

You MUST include:

- Clear project requirements
- Architecture suggestions
- Tech stack details
- Component breakdown
- Styling guidance
- State management approach
- Edge cases
- Testing considerations
- Performance considerations

Return ONLY the final enhanced prompt text.
"""

        analysis_context = f"""
Original Prompt:
{original_prompt}

Intent:
{intent}

Context:
{context}

User Clarifications:
{clarifications}
"""

        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=2500,
                    temperature=0.65,
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": analysis_context
                        }
                    ]
                )

                enhanced_prompt = (
                    response.choices[0]
                    .message.content.strip()
                )

            else:
                response = client.messages.create(
                    model=model_name,
                    max_tokens=2500,
                    temperature=0.65,
                    system=system_prompt,
                    messages=[
                        {
                            "role": "user",
                            "content": analysis_context
                        }
                    ]
                )

                enhanced_prompt = (
                    response.content[0]
                    .text.strip()
                )

            return {
                "enhanced_prompt": enhanced_prompt,
                "original_prompt": original_prompt,
                "selections": selections,
                "metadata": {
                    "intent": intent,
                    "context": context,
                    "word_count": len(
                        enhanced_prompt.split()
                    )
                }
            }

        except Exception as e:
            return {
                "enhanced_prompt":
                    f"Create {original_prompt} "
                    f"with specifications: "
                    f"{clarifications}",

                "original_prompt":
                    original_prompt,

                "selections":
                    selections,

                "metadata": {
                    "error": str(e)
                }
            }