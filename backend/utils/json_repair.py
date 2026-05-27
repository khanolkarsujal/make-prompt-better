import json
import re
from typing import Any, Tuple

class JsonRepair:
    """Utility to safely parse JSON strings coming from LLMs.
    
    1. Try a strict ``json.loads``.
    2. If it fails, attempt a light‑weight repair (balance braces, fix stray commas, quote keys).
    3. Return ``(data, repaired)`` where ``repaired`` is ``True`` if a repair was needed.
    """
    @staticmethod
    def _balanced_braces(text: str) -> bool:
        """Return True if the number of opening and closing braces matches."""
        return text.count('{') == text.count('}')

    @staticmethod
    def _repair(text: str) -> str:
        # Remove any trailing characters after the last closing brace
        if '}' in text:
            last = text.rfind('}')
            text = text[:last+1]
        # Ensure braces are balanced – if missing closing brace, add one
        if not JsonRepair._balanced_braces(text):
            # simple heuristic: if there are more opening braces, append closing ones
            diff = text.count('{') - text.count('}')
            text += '}' * diff
        # Fix common issues: stray commas before closing brace, missing quotes around keys
        text = re.sub(r',\s*}', '}', text)  # trailing comma
        # Quote unquoted keys (very naive)
        text = re.sub(r'(?<=\{|,)(\s*)([A-Za-z0-9_]+)(\s*):', r'\1"\2"\3:', text)
        return text

    @staticmethod
    def safe_parse(raw: str) -> Tuple[Any, bool]:
        """Attempt to parse *raw* JSON.
        Returns ``(data, repaired)``. ``repaired`` is ``True`` when the
        parser had to apply a fix.
        """
        try:
            return json.loads(raw), False
        except json.JSONDecodeError:
            repaired = JsonRepair._repair(raw)
            try:
                return json.loads(repaired), True
            except json.JSONDecodeError:
                # irrecoverable – caller will handle fallback
                raise
