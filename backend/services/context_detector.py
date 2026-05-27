from typing import Dict, Any

class ContextDetector:
    """Parses context from the unified mega JSON."""
    
    def parse(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        return unified_data.get("context", {
            "tech_stack": [],
            "project_type": "unknown",
            "domain": "general"
        })
