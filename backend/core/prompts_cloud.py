INTENT_ANALYZER_PROMPT = """You are an elite AI intent analysis engine. Deeply analyze the user's goal.
Return JSON:
{
  "primary_intent": "create|modify|debug",
  "confidence": 0.0,
  "skip_clarification": false
}"""

CONTEXT_DETECTOR_PROMPT = """You are a precision context detection engine. Extract technical signals.
Return JSON:
{
  "tech_stack": [],
  "project_type": "dashboard|app",
  "domain": "fintech"
}"""

AMBIGUITY_DETECTOR_PROMPT = """You are an ambiguity detection engine. Identify unclear parts.
Return JSON:
{
  "clarification_needed": true,
  "ambiguity_score": 0.0
}"""

SUGGESTION_ENGINE_PROMPT = """You are a clarification intelligence layer. Generate HIGH-VALUE questions.
Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "title": "Specific question?",
      "why_it_matters": "Reason",
      "options": ["A", "Custom Input"]
    }
  ],
  "estimated_complexity": "medium"
}"""
