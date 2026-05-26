from typing import Dict, Any
import asyncio
import logging

logger = logging.getLogger(__name__)
from intelligence.intent_classifier import IntentClassifier
from intelligence.context_detector import ContextDetector
from intelligence.ambiguity_detector import AmbiguityDetector
from intelligence.suggestion_engine import SuggestionEngine


class IntelligenceOrchestrator:
    """
    Central intelligence pipeline.

    Flow:
    Prompt
        ↓
    Intent Analysis
        ↓
    Context Detection
        ↓
    Ambiguity Detection
        ↓
    Suggestion Generation
    """

    def __init__(self):
        self.intent_classifier = IntentClassifier()
        self.context_detector = ContextDetector()
        self.ambiguity_detector = AmbiguityDetector()
        self.suggestion_engine = SuggestionEngine()

    async def analyze_prompt(
        self,
        prompt: str
    ) -> Dict[str, Any]:
        """
        Full intelligence analysis pipeline.
        """

        # Run analysis in parallel
        logger.info("Starting intelligence pipeline")
        intent_task = self.intent_classifier.analyze(prompt)
        context_task = self.context_detector.detect(prompt)
        ambiguity_task = self.ambiguity_detector.detect(prompt)

        intent, context, ambiguity = await asyncio.gather(
            intent_task,
            context_task,
            ambiguity_task
        )

        suggestions = await self.suggestion_engine.generate_suggestions(
            prompt=prompt,
            intent=intent,
            context=context,
            ambiguity=ambiguity
        )

        logger.info("Prompt analyzed successfully")
        
        return {
            "intent": intent,
            "context": context,
            "ambiguity": ambiguity,
            "suggestions": suggestions
        }