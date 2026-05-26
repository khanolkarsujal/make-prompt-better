import json
from anthropic import Anthropic
from openai import OpenAI
from core.config import settings
from typing import Dict, List, Any
from intelligence.orchestration import IntelligenceOrchestrator
from intelligence.prompt_enhancer import PromptEnhancer

# Initialize AI client based on provider
if settings.AI_PROVIDER == "xai":
    client = OpenAI(
        base_url="https://api.x.ai/v1",
        api_key=settings.XAI_API_KEY
    )
    model_name = "grok-2-preview"
else:
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    model_name = "claude-3-5-sonnet-20240620"

# Intent Analyzer
class IntentAnalyzer:
    async def analyze(self, prompt: str) -> Dict[str, Any]:
        """Analyze the user's intent from the prompt"""
        system_prompt = """You are an intent analyzer. Analyze the user's prompt and return ONLY valid JSON:
{
  "primary_intent": "create|modify|debug|explain|test",
  "confidence": 0.0-1.0,
  "domain": "web|mobile|api|data|ui|backend",
  "complexity": "low|medium|high"
}"""
        
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
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.content[0].text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            return json.loads(text)
        except:
            return {"primary_intent": "create", "confidence": 0.5, "domain": "web", "complexity": "medium"}

# Context Detector
class ContextDetector:
    async def detect(self, prompt: str) -> Dict[str, Any]:
        """Detect context from the prompt"""
        system_prompt = """You are a context detector. Analyze the prompt and return ONLY valid JSON:
{
  "tech_stack": ["framework1", "framework2"],
  "project_type": "dashboard|app|api|library",
  "features": ["feature1", "feature2"],
  "missing_context": ["context1", "context2"]
}"""
        
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
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.content[0].text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            return json.loads(text)
        except:
            return {"tech_stack": [], "project_type": "app", "features": [], "missing_context": []}

# Ambiguity Detector
class AmbiguityDetector:
    async def detect(self, prompt: str) -> Dict[str, Any]:
        """Detect ambiguous parts of the prompt"""
        system_prompt = """You are an ambiguity detector. Analyze the prompt and return ONLY valid JSON:
{
  "ambiguous_terms": ["term1", "term2"],
  "clarification_needed": true/false,
  "ambiguity_score": 0.0-1.0
}"""
        
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
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.content[0].text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            return json.loads(text)
        except:
            return {"ambiguous_terms": [], "clarification_needed": True, "ambiguity_score": 0.7}

# Suggestion Engine
class SuggestionEngine:
    async def generate_suggestions(self, prompt: str, intent: Dict, context: Dict, ambiguity: Dict) -> Dict[str, Any]:
        """Generate clarifying questions and options based on analysis"""
        system_prompt = """You are a suggestion engine. Based on the analysis, generate clarifying questions. Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Clear question text?",
      "options": ["Option 1", "Option 2", "Option 3"],
      "category": "tech_stack|features|design|architecture"
    }
  ],
  "estimated_complexity": "low|medium|high"
}

Generate 3-4 relevant clarifying questions."""
        
        analysis_context = f"""Intent: {intent}
Context: {context}
Ambiguity: {ambiguity}
Original Prompt: {prompt}"""
        
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
                    messages=[{"role": "user", "content": analysis_context}]
                )
                text = response.content[0].text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            return json.loads(text)
        except:
            return {
                "questions": [
                    {"id": "q1", "question": "What is the main goal of this feature?", "options": ["Dashboard", "Admin Panel", "Landing Page", "Data Visualization"], "category": "features"},
                    {"id": "q2", "question": "Preferred frontend framework?", "options": ["Next.js", "React + Vite", "Vue", "Svelte"], "category": "tech_stack"},
                    {"id": "q3", "question": "Styling approach?", "options": ["Tailwind CSS", "shadcn/ui", "MUI", "Custom CSS"], "category": "design"}
                ],
                "estimated_complexity": "medium"
            }

# Prompt Builder
class PromptBuilder:
    async def build_enhanced_prompt(self, original_prompt: str, selections: Dict[str, str], intent: Dict, context: Dict) -> Dict[str, Any]:
        """Build the final enhanced prompt"""
        clarifications = "\n".join([f"- {k}: {v}" for k, v in selections.items()])
        
        system_prompt = """You are an expert prompt engineer. 
Convert the vague user prompt + their answers + analysis into a **highly detailed, production-ready prompt** optimized for AI coding agents.
Include:
- Clear project structure
- Component breakdown
- Tech stack specifics
- Styling and design requirements
- State management approach
- Best practices
- Edge cases to handle
- Testing considerations

Return ONLY the final enhanced prompt text."""

        analysis_context = f"""Original Prompt: {original_prompt}

Intent Analysis: {intent}
Context: {context}

User Selections:
{clarifications}"""
        
        try:
            if settings.AI_PROVIDER == "xai":
                response = client.chat.completions.create(
                    model=model_name,
                    max_tokens=2500,
                    temperature=0.65,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": analysis_context}
                    ]
                )
                enhanced_prompt = response.choices[0].message.content.strip()
            else:
                response = client.messages.create(
                    model=model_name,
                    max_tokens=2500,
                    temperature=0.65,
                    system=system_prompt,
                    messages=[{"role": "user", "content": analysis_context}]
                )
                enhanced_prompt = response.content[0].text.strip()
            
            return {
                "enhanced_prompt": enhanced_prompt,
                "original_prompt": original_prompt,
                "selections": selections,
                "metadata": {
                    "intent": intent,
                    "context": context,
                    "word_count": len(enhanced_prompt.split())
                }
            }
        except Exception as e:
            return {
                "enhanced_prompt": f"Create {original_prompt} with the following specifications: {clarifications}",
                "original_prompt": original_prompt,
                "selections": selections,
                "metadata": {"error": str(e)}
            }

# Main service functions

async def build_enhanced_prompt(
    original_prompt: str,
    selections: Dict[str, str],
    intent: Dict = None,
    context: Dict = None
) -> Dict[str, Any]:
    """
    Build enhanced prompt using
    Prompt Enhancement Layer.
    """

    prompt_enhancer = PromptEnhancer()

    # Auto-analyze if missing
    if not intent:
        intent_classifier = IntentClassifier()
        intent = await intent_classifier.analyze(
            original_prompt
        )

    if not context:
        context_detector = ContextDetector()
        context = await context_detector.detect(
            original_prompt
        )

    return await prompt_enhancer.enhance_prompt(
        original_prompt=original_prompt,
        selections=selections,
        intent=intent,
        context=context
    )