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


class ContextDetector:
    async def detect(self, prompt: str) -> Dict[str, Any]:
        """
        Detect project context from prompt.
        """

        system_prompt = """
You are a context detector.

Analyze the prompt and return ONLY valid JSON:

{
  "tech_stack": ["framework1", "framework2"],
  "project_type": "dashboard|app|api|library",
  "features": ["feature1", "feature2"],
  "missing_context": ["context1", "context2"]
}
"""

        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=400,
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
                    max_tokens=400,
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
                "tech_stack": [],
                "project_type": "app",
                "features": [],
                "missing_context": []
            }