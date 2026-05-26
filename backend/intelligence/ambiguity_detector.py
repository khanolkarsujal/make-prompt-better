from typing import Dict, Any
import json
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


class AmbiguityDetector:
    async def detect(self, prompt: str) -> Dict[str, Any]:
        """
        Detect ambiguity and missing clarity in prompt.
        """

        system_prompt = """
You are an advanced ambiguity detector.

Analyze the prompt and return ONLY valid JSON.

Detect:
- vague requirements
- missing technical details
- missing architecture decisions
- missing UX/design choices
- deployment uncertainty

Return format:

{
  "ambiguous_terms": [
    "term1",
    "term2"
  ],
  "clarification_needed": true,
  "ambiguity_score": 0.0,
  "missing_requirements": [
    "framework",
    "authentication",
    "database",
    "design_style",
    "responsive_behavior"
  ],
  "risk_level": "low|medium|high"
}

Rules:
- ambiguity_score must be between 0 and 1
- high ambiguity = vague prompt
- low ambiguity = detailed prompt
- infer realistic missing requirements
"""

        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=350,
                    temperature=0.3,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                )

                text = response.choices[0].message.content.strip()

            else:
                response = client.messages.create(
                    model=model_name,
                    max_tokens=350,
                    temperature=0.3,
                    system=system_prompt,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                )

                text = response.content[0].text.strip()

            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]

            return json.loads(text)

        except Exception:
            return {
                "ambiguous_terms": [],
                "clarification_needed": True,
                "ambiguity_score": 0.75,
                "missing_requirements": [
                    "framework",
                    "design_style",
                    "authentication",
                    "responsive_behavior"
                ],
                "risk_level": "medium"
            }