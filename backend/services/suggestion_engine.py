from typing import Dict, Any

class SuggestionEngine:
    """Parses suggestions from the unified mega JSON."""
    
    def parse(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        suggestions = unified_data.get("suggestions", {
            "questions": [],
            "estimated_complexity": "medium",
            "fix_options": ["retry", "repair", "skip"]
        })
        
        settings = unified_data.get("settings", {})
        if "fix_options" in settings:
            suggestions["fix_options"] = settings["fix_options"]

        # Keep only the first question to enforce one-at-a-time clarification
        if suggestions.get("questions"):
            suggestions["questions"] = suggestions["questions"][:1]
        return suggestions
