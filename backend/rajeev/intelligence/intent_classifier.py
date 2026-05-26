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


class IntentClassifier:
    async def analyze(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze user intent from prompt.
        Returns structured intent classification.
        """

        system_prompt = """
You are an intent analyzer.

Analyze the user's prompt and return ONLY valid JSON:

{
  "primary_intent": "create|modify|debug|explain|test",
  "confidence": 0.0,
  "domain": "web|mobile|api|data|ui|backend",
  "complexity": "low|medium|high"
}
"""

        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=300,
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
                    max_tokens=300,
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

            # Remove markdown json wrapper if model adds it
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]

            return json.loads(text)

        except Exception:
            return {
                "primary_intent": "create",
                "confidence": 0.5,
                "domain": "web",
                "complexity": "medium"
            }