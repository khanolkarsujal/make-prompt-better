from typing import Dict, Any, Optional
from ..schemas.response import StageState
from ..core.config import settings

# Strategies
from ..strategies.local_unified import LocalUnifiedStrategy
from ..strategies.cloud_parallel import CloudParallelStrategy

# Parsers
from .intent_analyzer import IntentAnalyzer
from .context_detector import ContextDetector
from .ambiguity_detector import AmbiguityDetector
from .suggestion_engine import SuggestionEngine

from .prompt_builder import PromptBuilder

class StageEngine:
    """Orchestrates the multi-stage analysis loop using the active Inference Strategy."""
    
    def __init__(self):
        # Instantiate active strategy based on config
        if settings.INFERENCE_STRATEGY == "cloud":
            self.strategy = CloudParallelStrategy()
        else:
            self.strategy = LocalUnifiedStrategy()
            
        # Parsers
        self.intent_analyzer = IntentAnalyzer()
        self.context_detector = ContextDetector()
        self.ambiguity_detector = AmbiguityDetector()
        self.suggestion_engine = SuggestionEngine()
        
        self.prompt_builder = PromptBuilder()
        
    async def analyze_prompt(self, prompt: str, selections: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Runs the active strategy and pipes the result through parsers."""
        
        raw_analysis = await self.strategy.analyze(prompt, selections)
        
        return {
            "intent": self.intent_analyzer.parse(raw_analysis),
            "context": self.context_detector.parse(raw_analysis),
            "ambiguity": self.ambiguity_detector.parse(raw_analysis),
            "suggestions": self.suggestion_engine.parse(raw_analysis)
        }

    async def next_step(self, prompt: str, selections: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Determines whether to ask clarification questions or move to final prompt.

        * At most one question is returned per call.
        * Previously answered question IDs are omitted (based on `selections`).
        * Stops after `MAX_QUESTIONS_TOTAL` (6) or when intent confidence >= 0.85.
        """
        # Ensure selections is a dict
        selections = selections or {}
        # Run the unified analysis strategy
        raw_analysis = await self.strategy.analyze(prompt, selections)
        # Parse all components
        intent = self.intent_analyzer.parse(raw_analysis)
        context = self.context_detector.parse(raw_analysis)
        ambiguity = self.ambiguity_detector.parse(raw_analysis)
        # Parse suggestions (all questions)
        suggestions = self.suggestion_engine.parse(raw_analysis)
        # Determine already answered questions
        answered_titles = set(selections.keys())
        # Filter out answered questions
        remaining_questions = [q for q in suggestions.get("questions", []) if q.get("title") not in answered_titles]
        # Decide if we should continue asking questions
        max_questions = 6
        confidence = intent.get("confidence", 0.0)
        # Stop if we have hit the absolute max or if we have answered at least 3 questions and confidence is high enough
        stop_early = len(answered_titles) >= 3 and confidence >= 0.85
        if len(answered_titles) >= max_questions or stop_early or not remaining_questions:
            # No more clarification needed – move to final stage
            build_result = await self.build_enhanced_prompt(prompt, selections, intent, context)
            stage_state = StageState(
                stage="final",
                confidence=confidence,
                questions=[],
                estimated_complexity=None,
                final_prompt=build_result["enhanced_prompt"],
                selections=selections,
                tags={"intent": intent, "context": context, "ambiguity": ambiguity},
                fix_options=suggestions.get("fix_options", [])
            )
        else:
            # Return a single next question (if any)
            next_question = remaining_questions[:1]
            stage_state = StageState(
                stage="question",
                confidence=confidence,
                questions=next_question,
                estimated_complexity=suggestions.get("estimated_complexity"),
                final_prompt=None,
                selections=selections,
                tags={"intent": intent, "context": context, "ambiguity": ambiguity},
                fix_options=suggestions.get("fix_options", [])
            )
        return stage_state.model_dump()

    async def build_enhanced_prompt(self, prompt: str, selections: Dict[str, str], intent: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not intent or not context:
            raw = await self.strategy.analyze(prompt)
            intent = self.intent_analyzer.parse(raw)
            context = self.context_detector.parse(raw)
                
        return await self.prompt_builder.build(prompt, selections, intent, context)
