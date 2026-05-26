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


class SuggestionEngine:
    async def generate_suggestions(
        self,
        prompt: str,
        intent: Dict[str, Any],
        context: Dict[str, Any],
        ambiguity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate smart clarification questions.
        """

        system_prompt = """
You are a suggestion engine.

Based on the prompt analysis, generate 3–4 smart clarification questions.

Return ONLY valid JSON:

{
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": [
        "Option 1",
        "Option 2"
      ],
      "category": "tech_stack|features|design|architecture"
    }
  ],
  "estimated_complexity": "low|medium|high"
}
"""

        analysis_context = f"""
Intent: {intent}

Context: {context}

Ambiguity: {ambiguity}

Original Prompt:
{prompt}
"""

        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=800,
                    temperature=0.7,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": analysis_context}
                    ]
                )

                text = response.choices[0].message.content.strip()

            else:
                response = client.messages.create(
                    model=model_name,
                    max_tokens=800,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[
                        {
                            "role": "user",
                            "content": analysis_context
                        }
                    ]
                )

                text = response.content[0].text.strip()

            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]

            return json.loads(text)

        except Exception:
            return {
                "questions": [
                    {
                        "id": "q1",
                        "question": "What type of project are you building?",
                        "options": [
                            "Dashboard",
                            "Landing Page",
                            "Admin Panel",
                            "API"
                        ],
                        "category": "features"
                    },
                    {
                        "id": "q2",
                        "question": "Which frontend framework should be used?",
                        "options": [
                            "React",
                            "Next.js",
                            "Vue",
                            "Vanilla JS"
                        ],
                        "category": "tech_stack"
                    }
                ],
                "estimated_complexity": "medium"
            }