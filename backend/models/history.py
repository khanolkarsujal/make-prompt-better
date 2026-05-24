from typing import List, Dict, Any
from datetime import datetime
import uuid

# In-memory store for prompt history
_history: List[Dict[str, Any]] = []

def get_history() -> List[Dict[str, Any]]:
    return list(reversed(_history))  # newest first

def add_to_history(prompt: str, enhanced_prompt: str, selections: Dict[str, str]) -> Dict[str, Any]:
    entry = {
        "id": str(uuid.uuid4()),
        "prompt": prompt,
        "enhanced_prompt": enhanced_prompt,
        "selections": selections,
        "created_at": datetime.utcnow().isoformat(),
        "is_favorite": False,
    }
    _history.append(entry)
    # Keep only the last 50 entries
    if len(_history) > 50:
        _history.pop(0)
    return entry

def toggle_favorite(entry_id: str) -> bool:
    for entry in _history:
        if entry["id"] == entry_id:
            entry["is_favorite"] = not entry["is_favorite"]
            return entry["is_favorite"]
    return False

def delete_from_history(entry_id: str) -> bool:
    global _history
    before = len(_history)
    _history = [e for e in _history if e["id"] != entry_id]
    return len(_history) < before
