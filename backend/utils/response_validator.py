import json
from typing import Any, Tuple

from ..core.config import settings

# Strict fallback payload preserving semantics
FALLBACK_PAYLOAD = {
    "status": "repair_failed",
    "fallback": True,
    "intent": {"primary_intent": "unknown", "confidence": 0.0},
    "ambiguity": {"clarification_needed": True},
    "suggestions": {"questions": []},
}

class ResponseValidator:
    """Validate raw JSON from the model.
    
    1. Attempt to parse JSON (using robust repair).
    2. If parsing fails, return ``FALLBACK_PAYLOAD``.
    3. Validate that required top‑level keys exist; otherwise fallback.
    """

    @staticmethod
    def _has_required_keys(data: dict) -> bool:
        required = {"intent", "ambiguity", "suggestions"}
        return required.issubset(data.keys())

    @staticmethod
    def validate(raw: str) -> Tuple[dict, bool]:
        """Return a tuple ``(payload, repaired)``.
        ``repaired`` is ``True`` when the payload had to be repaired or replaced.
        """
        # Try strict parse first
        try:
            payload = json.loads(raw)
            repaired = False
        except json.JSONDecodeError:
            # Use lightweight repair (same logic as in ``core.ai_client``)
            from core.ai_client import repair_json
            try:
                repaired_text = repair_json(raw)
                payload = json.loads(repaired_text)
                repaired = True
            except json.JSONDecodeError:
                # Irrecoverable – return strict fallback
                return FALLBACK_PAYLOAD, True
        # Validate structure
        if not ResponseValidator._has_required_keys(payload):
            return FALLBACK_PAYLOAD, True
        return payload, repaired
