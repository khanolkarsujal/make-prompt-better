import json
from anthropic import Anthropic
from openai import OpenAI
from core.config import settings
from schemas.response import StageState
from typing import Dict, List, Any, Optional

# Initialize AI clients for each provider
_xai_client = OpenAI(base_url="https://api.x.ai/v1", api_key=settings.XAI_API_KEY or "none")
_ollama_client = OpenAI(base_url=settings.OLLAMA_BASE_URL, api_key="ollama")
_google_client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai",
    api_key=settings.GOOGLE_API_KEY or "none"
)
_anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY or "none")

# Default model/client based on provider
_PROVIDER_DEFAULTS = {
    "xai":      (_xai_client,      "grok-3-mini"),
    "ollama":   (_ollama_client,   settings.OLLAMA_MODEL),
    "google":   (_google_client,   "gemini-2.0-flash"),
    "anthropic":(_anthropic_client,"claude-sonnet-4-5"),
}

def _resolve(model_override: Optional[str] = None):
    """Return (client, model_name, is_openai) based on config + optional override."""
    provider = settings.AI_PROVIDER
    client, model = _PROVIDER_DEFAULTS.get(provider, (_xai_client, "grok-3-mini"))
    is_openai = provider in ["xai", "ollama", "google"]

    if model_override:
        model = model_override
        model_lower = model.lower()
        if "gemini" in model_lower:
            client = _google_client
            is_openai = True
        elif "grok" in model_lower:
            client = _xai_client
            is_openai = True
        elif "claude" in model_lower:
            client = _anthropic_client
            is_openai = False
        else:
            # Fallback to ollama for unknown (e.g. deepseek)
            client = _ollama_client
            is_openai = True

    return client, model, is_openai

def _call_ai(cl, mdl, is_openai, system_prompt, user_content, max_tokens=600, temperature=0.3):
    """Unified AI call helper."""
    if is_openai:
        response = cl.chat.completions.create(
            model=mdl, max_tokens=max_tokens, temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
        )
        return response.choices[0].message.content.strip()
    else:
        response = cl.messages.create(
            model=mdl, max_tokens=max_tokens, temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        return response.content[0].text.strip()

import re
def _parse_json(text: str) -> dict:
    """Safely strip markdown fences and parse JSON."""
    # If the model outputs <think> tags (like DeepSeek-R1), remove them
    if "<think>" in text and "</think>" in text:
        text = text.split("</think>")[1]
    
    # Try to find the JSON block using markdown fences first
    if "```json" in text:
        extracted = text.split("```json")[1].split("```")[0].strip()
        try: return json.loads(extracted)
        except: pass
    elif "```" in text:
        extracted = text.split("```")[1].split("```")[0].strip()
        try: return json.loads(extracted)
        except: pass
        
    # Fallback: extract substring from first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        extracted = text[start:end+1]
        try: return json.loads(extracted)
        except: pass
    
    # Absolute fallback: try parsing the whole thing
    return json.loads(text.strip())


# =====================================================
# INTENT ANALYZER — Elite multi-dimensional analysis
# =====================================================
class IntentAnalyzer:

    SYSTEM_PROMPT = """You are an elite AI intent analysis engine — the smartest reasoning layer of an autonomous AI system.

Your job is NOT to guess. Your job is to deeply understand what the user ACTUALLY wants, even when:
- they write badly or in broken English
- they skip critical details
- they mix multiple ideas
- they are unclear, emotional, or vague
- they don't know the right technical terms

THINKING MODE:
Before generating output, internally simulate:
1. What is the user's PRIMARY goal?
2. What are the SECONDARY goals?
3. What is the EMOTIONAL intent? (frustrated? excited? exploring?)
4. What is the BUSINESS intent?
5. What is the TECHNICAL intent?
6. What is the UX intent?
7. What critical information is MISSING?
8. What parts are AMBIGUOUS?
9. What is your CONFIDENCE level?

CONFIDENCE SCORING:
- 0.9+ : User is clear, specific, detailed → SKIP clarification
- 0.7-0.89 : Mostly clear, minor gaps → ask 1-2 focused questions
- 0.5-0.69 : Significant gaps → ask 2-3 critical questions
- below 0.5 : Very vague → ask up to 4 targeted questions

Return ONLY valid JSON, no explanation:
{
  "primary_intent": "create|modify|debug|explain|test|automate|design|analyze",
  "goal": "Precise description of what the user ultimately wants to achieve",
  "secondary_intent": "optional secondary goal detected",
  "emotional_intent": "excited|frustrated|exploring|urgent|unsure",
  "business_intent": "brief business goal if detectable",
  "technical_intent": "what technical system/output they need",
  "ux_intent": "what UX/experience they want",
  "confidence": 0.0,
  "missing_information": ["specific missing detail 1", "specific missing detail 2"],
  "ambiguities": ["ambiguous aspect 1"],
  "technical_requirements": ["detected tech requirement 1"],
  "output_format": "code|prompt|architecture|plan|ui|api|automation",
  "constraints": ["any constraints mentioned or inferred"],
  "complexity": "low|medium|high|enterprise",
  "skip_clarification": false
}

Set skip_clarification to true ONLY when confidence >= 0.9 AND ambiguities is empty AND missing_information is empty."""

    async def analyze(self, prompt: str, model_override: Optional[str] = None) -> Dict[str, Any]:
        cl, mdl, is_openai = _resolve(model_override)
        try:
            text = _call_ai(cl, mdl, is_openai, self.SYSTEM_PROMPT, prompt, max_tokens=600, temperature=0.2)
            return _parse_json(text)
        except Exception as e:
            print(f"INTENT ANALYZER EXCEPTION: {e}")
            return {
                "primary_intent": "create",
                "goal": "Build application",
                "secondary_intent": "",
                "emotional_intent": "exploring",
                "business_intent": "",
                "technical_intent": "web application",
                "ux_intent": "modern UI",
                "confidence": 0.5,
                "missing_information": ["specific features", "tech stack preference"],
                "ambiguities": ["overall scope"],
                "technical_requirements": [],
                "output_format": "code",
                "constraints": [],
                "complexity": "medium",
                "skip_clarification": False
            }


# =====================================================
# CONTEXT DETECTOR — Deep tech and domain detection
# =====================================================
class ContextDetector:

    SYSTEM_PROMPT = """You are a precision context detection engine inside an autonomous AI system.

Deeply analyze the user's prompt and extract every detectable technical and domain signal.
Even if the user doesn't mention tech explicitly, infer from context clues.

Return ONLY valid JSON:
{
  "tech_stack": ["detected or inferred frameworks/libraries"],
  "project_type": "dashboard|app|api|library|landing|automation|agent|cli|mobile",
  "domain": "fintech|edtech|ecommerce|saas|devtools|healthcare|social|productivity|other",
  "features": ["feature 1 detected in prompt", "feature 2"],
  "missing_context": ["critical context that is absent"],
  "output_mode": "prompt_engineering|ui_generation|backend_architecture|ai_workflow|agent_system|code_generation|system_design|automation"
}"""

    async def detect(self, prompt: str, model_override: Optional[str] = None) -> Dict[str, Any]:
        cl, mdl, is_openai = _resolve(model_override)
        try:
            text = _call_ai(cl, mdl, is_openai, self.SYSTEM_PROMPT, prompt, max_tokens=400, temperature=0.2)
            return _parse_json(text)
        except:
            return {"tech_stack": [], "project_type": "app", "domain": "other", "features": [], "missing_context": [], "output_mode": "code_generation"}


# =====================================================
# AMBIGUITY DETECTOR — Precision ambiguity scoring
# =====================================================
class AmbiguityDetector:

    SYSTEM_PROMPT = """You are an ambiguity detection engine inside an autonomous AI system.

Your job: identify EVERY part of the user's prompt that could be interpreted in more than one way, or is simply unclear.

Focus on:
- Vague descriptors ("modern", "nice", "fast", "simple")
- Missing scale ("how big?", "how many?")
- Unclear tech choices (multiple valid options exist)
- Conflicting signals
- Undefined user roles or personas
- Missing output specification

Return ONLY valid JSON:
{
  "ambiguous_terms": ["term or phrase that is ambiguous"],
  "clarification_needed": true,
  "ambiguity_score": 0.0,
  "interpretation_risk": "low|medium|high"
}

ambiguity_score: 0.0 = perfectly clear, 1.0 = completely unclear"""

    async def detect(self, prompt: str, model_override: Optional[str] = None) -> Dict[str, Any]:
        cl, mdl, is_openai = _resolve(model_override)
        try:
            text = _call_ai(cl, mdl, is_openai, self.SYSTEM_PROMPT, prompt, max_tokens=300, temperature=0.2)
            return _parse_json(text)
        except:
            return {"ambiguous_terms": [], "clarification_needed": True, "ambiguity_score": 0.6, "interpretation_risk": "medium"}


# =====================================================
# SUGGESTION ENGINE — Intelligent question generation
# =====================================================
class SuggestionEngine:

    SYSTEM_PROMPT = """You are the clarification intelligence layer of an autonomous AI system.

Your job: generate the MINIMUM number of HIGH-VALUE questions needed to eliminate critical ambiguity and fill missing information gaps.

RULES:
- Ask ONLY questions that unlock execution — skip anything the AI can reasonably infer
- Maximum 4 questions, minimum 1
- Each question must be highly specific, not generic
- Never ask "what do you want?" — that is useless
- Prioritize: missing tech stack > missing features > missing design > missing constraints
- Always include a "Custom Input" option
- Each question must include WHY it matters

If confidence is already high (>= 0.85) and ambiguity is low, return an empty questions array.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "title": "Specific, actionable question title?",
      "why_it_matters": "One sentence explaining why this unlocks better output",
      "options": ["Option A", "Option B", "Option C", "Option D", "Custom Input"],
      "category": "tech_stack|features|design|architecture|scale|output_format"
    }
  ],
  "estimated_complexity": "low|medium|high|enterprise"
}"""

    async def generate_suggestions(self, prompt: str, intent: Dict, context: Dict, ambiguity: Dict, model_override: Optional[str] = None) -> Dict[str, Any]:
        analysis_context = f"""User Prompt: {prompt}

Intent Analysis: {json.dumps(intent)}
Context Detection: {json.dumps(context)}
Ambiguity Detection: {json.dumps(ambiguity)}"""

        cl, mdl, is_openai = _resolve(model_override)
        try:
            text = _call_ai(cl, mdl, is_openai, self.SYSTEM_PROMPT, analysis_context, max_tokens=1000, temperature=0.5)
            return _parse_json(text)
        except:
            return {
                "questions": [
                    {
                        "id": "q1",
                        "title": "What type of application are you building?",
                        "why_it_matters": "Determines the entire architecture and component structure.",
                        "options": ["Web Dashboard", "Mobile App", "REST API", "AI Agent", "Custom Input"],
                        "category": "features"
                    },
                    {
                        "id": "q2",
                        "title": "Which frontend framework should be used?",
                        "why_it_matters": "Controls the entire code generation approach.",
                        "options": ["Next.js", "React + Vite", "Vue 3", "SvelteKit", "Custom Input"],
                        "category": "tech_stack"
                    }
                ],
                "estimated_complexity": "medium"
            }


# =====================================================
# PROMPT BUILDER — Production-grade final synthesis
# =====================================================
class StageEngine:
    """Orchestrates the multi‑stage analysis loop.

    Workflow:
    1️⃣ Run full analysis (intent, context, ambiguity, suggestions).
    2️⃣ If `skip_clarification` is true OR confidence >= 0.85 and no questions, generate final prompt.
    3️⃣ Otherwise return the next set of questions for the UI.
    """
    
    async def next_step(self, prompt: str, selections: Dict[str, str] = None, model_override: Optional[str] = None) -> Dict[str, Any]:
        # Run analysis pipeline (uses existing helper)
        analysis = await analyze_prompt(prompt, selections, model_override)
        intent = analysis["intent"]
        context = analysis["context"]
        ambiguity = analysis["ambiguity"]
        suggestions = analysis["suggestions"]
        
        # Determine if we can skip further clarification
        skip = intent.get("skip_clarification", False) or intent.get("confidence", 0) >= 0.85
        print(f"DEBUG LOOP: confidence={intent.get('confidence')}, skip_clarification={intent.get('skip_clarification')}, skip={skip}")
        print(f"DEBUG LOOP: selections={selections}")
        
        if skip:
            print("DEBUG LOOP: SKIPPING TO FINAL!")
            # Build final enhanced prompt
            final = await build_enhanced_prompt(prompt, selections or {}, intent, context, model_override)
            stage_state = StageState(
                stage="final",
                confidence=intent.get("confidence", 0.0),
                questions=[],
                estimated_complexity=suggestions.get("estimated_complexity"),
                final_prompt=final.get("enhanced_prompt"),
                selections=selections or {},
                tags={"intent": intent, "context": context, "ambiguity": ambiguity}
            )
            return stage_state.dict()
        else:
            stage_state = StageState(
                stage="question",
                confidence=intent.get("confidence", 0.0),
                questions=suggestions.get("questions", []),
                estimated_complexity=suggestions.get("estimated_complexity"),
                final_prompt=None,
                selections=selections or {},
                tags={"intent": intent, "context": context, "ambiguity": ambiguity}
            )
            return stage_state.dict()

    SYSTEM_PROMPT = """You are an elite prompt architect and autonomous AI execution engine.

Your job: synthesize the user's raw idea + their answers + deep analysis into a PRODUCTION-GRADE, fully executable prompt that an AI coding agent can use to build the complete system.

You think like:
- A senior software architect
- A product strategist
- A UX designer
- A DevOps engineer
- A prompt engineering expert

The output prompt must be:
- Immediately executable by AI coding agents (Cursor, Claude, GPT-4)
- Comprehensive but not bloated
- Structured with clear sections
- Include all critical technical decisions
- Handle edge cases proactively
- Specify file structure, component breakdown, and data flow
- Include styling, responsiveness, and accessibility requirements
- Specify state management approach
- Include error handling strategy
- Define API contracts if applicable

FORMAT your output prompt with these clear sections:
## PROJECT OVERVIEW
## TECHNICAL STACK
## ARCHITECTURE & FILE STRUCTURE
## CORE FEATURES & REQUIREMENTS
## UI/UX SPECIFICATIONS
## DATA MODELS & API CONTRACTS
## STATE MANAGEMENT
## ERROR HANDLING & EDGE CASES
## IMPLEMENTATION ORDER

Return ONLY the final enhanced prompt text — no preamble, no explanation."""

    async def build_enhanced_prompt(self, original_prompt: str, selections: Dict[str, str], intent: Dict, context: Dict, model_override: Optional[str] = None) -> Dict[str, Any]:
        clarifications = "\n".join([f"- {k}: {v}" for k, v in selections.items()]) if selections else "None provided"

        analysis_context = f"""RAW USER PROMPT:
{original_prompt}

DEEP INTENT ANALYSIS:
{json.dumps(intent, indent=2)}

CONTEXT DETECTION:
{json.dumps(context, indent=2)}

USER CLARIFICATION ANSWERS:
{clarifications}

Now generate the production-grade final prompt."""

        cl, mdl, is_openai = _resolve(model_override)
        try:
            text = _call_ai(cl, mdl, is_openai, self.SYSTEM_PROMPT, analysis_context, max_tokens=3000, temperature=0.5)
            return {
                "enhanced_prompt": text,
                "original_prompt": original_prompt,
                "selections": selections,
                "metadata": {
                    "intent": intent,
                    "context": context,
                    "word_count": len(text.split()),
                    "model": mdl
                }
            }
        except Exception as e:
            fallback = f"Create {original_prompt}\n\nSpecifications:\n{clarifications}"
            return {
                "enhanced_prompt": fallback,
                "original_prompt": original_prompt,
                "selections": selections,
                "metadata": {"error": str(e)}
            }


# =====================================================
# MAIN SERVICE FUNCTIONS
# =====================================================
async def analyze_prompt(prompt: str, selections: Optional[Dict[str, str]] = None, model_override: Optional[str] = None) -> Dict[str, Any]:
    """Full analysis pipeline: Intent → Context → Ambiguity → Suggestions"""
    intent_analyzer = IntentAnalyzer()
    context_detector = ContextDetector()
    ambiguity_detector = AmbiguityDetector()
    suggestion_engine = SuggestionEngine()

    # Feed previous answers into all engines for continuous loop evaluation
    effective_prompt = prompt
    if selections:
        effective_prompt += "\n\nPrevious Answers:\n" + "\n".join([f"- {k}: {v}" for k, v in selections.items()])

    intent = await intent_analyzer.analyze(effective_prompt, model_override)
    context = await context_detector.detect(effective_prompt, model_override)
    ambiguity = await ambiguity_detector.detect(effective_prompt, model_override)

    suggestions = await suggestion_engine.generate_suggestions(effective_prompt, intent, context, ambiguity, model_override)
    return {"intent": intent, "context": context, "ambiguity": ambiguity, "suggestions": suggestions}


async def build_enhanced_prompt(original_prompt: str, selections: Dict[str, str], intent: Dict = None, context: Dict = None, model_override: Optional[str] = None) -> Dict[str, Any]:
    """Build the final production-grade enhanced prompt"""
    prompt_builder = StageEngine()
    if not intent:
        intent = await IntentAnalyzer().analyze(original_prompt, model_override)
    if not context:
        context = await ContextDetector().detect(original_prompt, model_override)
    return await prompt_builder.build_enhanced_prompt(original_prompt, selections, intent, context, model_override)
