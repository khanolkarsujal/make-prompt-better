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
You are an advanced software project context detection engine.

Your job is to deeply analyze a user's prompt and extract meaningful engineering context.

Analyze the request and infer:

1. TECH STACK
Detect explicitly mentioned OR implied technologies.

Return an empty list if unknown.

2. PROJECT TYPE
Infer the strongest matching project category:

- dashboard
- app
- api
- library
- ecommerce
- admin_panel
- landing_page
- portfolio
- ai_system
- automation
- saas_platform

3. FEATURES
Infer likely intended features.

Examples:
Dashboard:
- charts
- analytics
- filters
- authentication
- export

Ecommerce:
- cart
- payments
- products
- admin panel

Admin:
- role management
- permissions
- CRUD

4. MISSING CONTEXT
Detect missing information needed for implementation.

Examples:
- framework
- design_style
- authentication
- database
- responsive_behavior
- deployment_target
- state_management
- api_structure

Rules:
- infer intelligently
- avoid hallucination
- prefer practical engineering assumptions
- return ONLY valid JSON
- no markdown
- no explanations

Output format:

{
  "tech_stack": [],
  "project_type": "dashboard|app|api|library|ecommerce|admin_panel|landing_page|portfolio|ai_system|automation|saas_platform",
  "features": [],
  "missing_context": []
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