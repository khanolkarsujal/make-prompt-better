from typing import Dict, Any

class IntentAnalyzer:
    """Parses intent from the unified mega JSON."""
    
    def parse(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        return unified_data.get("intent", {
            "primary_intent": "General",
            "confidence": 0.5,
            "skip_clarification": False
        })
