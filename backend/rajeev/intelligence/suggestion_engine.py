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
You are an advanced software clarification engine.

Your job is to intelligently ask the MOST IMPORTANT follow-up questions needed to transform a vague request into an implementation-ready software specification.

You are NOT a chatbot.
You are an engineering thinking system.

Inputs:
- user prompt
- intent analysis
- context detection
- ambiguity analysis

Your task:
1. Detect what information is missing.
2. Ask highly relevant clarification questions.

Examples:

If user says:
"build dashboard"

Ask:
- What kind of dashboard? (analytics, admin, ecommerce, CRM, finance, etc.)
- Should users authenticate/login?
- Do you prefer React, Next.js, or another framework?
- Should it be mobile responsive?

If user says:
"build ecommerce app"

Ask:
- Payment gateway needed?
- Admin panel required?
- Guest checkout or login required?
- Inventory management needed?

Rules:
- Ask ONLY high-value engineering questions.
- Avoid generic or repetitive questions.
- Prioritize implementation-critical details.
- Ask between 3–5 questions maximum.
- Questions should feel intelligent and natural.
- Include useful options whenever possible.
- Return ONLY valid JSON.
- No markdown.
- No explanations.

Output format:

{
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": [
        "Option 1",
        "Option 2"
      ],
      "category": "tech_stack|features|design|architecture|authentication|database"
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
                        "question": "What kind of dashboard are you building?",
                        "options": [
                            "Analytics",
                            "Admin",
                            "Ecommerce",
                            "CRM"
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
                            "Angular"
                        ],
                        "category": "tech_stack"
                    },
                    {
                        "id": "q3",
                        "question": "Should authentication/login be included?",
                        "options": [
                            "Yes",
                            "No"
                        ],
                        "category": "authentication"
                    }
                ],
                "estimated_complexity": "medium"
            }