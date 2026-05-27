from typing import Dict, Any

class AmbiguityDetector:
    """Parses ambiguity from the unified mega JSON."""
    
    def parse(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        return unified_data.get("ambiguity", {
            "ambiguous_terms": [],
            "clarification_needed": False,
            "ambiguity_score": 0.0
        })
