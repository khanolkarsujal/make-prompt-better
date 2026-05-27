import hashlib
import json
import os

try:
    import tiktoken
except ImportError:  # pragma: no cover
    tiktoken = None

class TokenCounter:
    """Count tokens for a given prompt using the appropriate tokenizer.
    Falls back to a simple heuristic when the model's tokenizer library is not installed.
    """

    @staticmethod
    def _get_encoder(model_name: str):
        if tiktoken is None:
            return None
        # Map known model names to encodings – extend as needed
        mapping = {
            "gpt-4": "cl100k_base",
            "gpt-3.5-turbo": "cl100k_base",
            "qwen2.5": "gpt2",  # approximate for Qwen2.5 7B (uses same BPE as GPT‑2)
            "llama": "gpt2",
        }
        for key, enc in mapping.items():
            if key in model_name.lower():
                return tiktoken.get_encoding(enc)
        return None

    @classmethod
    def count(cls, text: str, model_name: str) -> int:
        encoder = cls._get_encoder(model_name)
        if encoder:
            return len(encoder.encode(text))
        # Heuristic: average 4 characters per token (common for English text)
        return max(1, len(text) // 4)

    @classmethod
    def prompt_key(cls, prompt: str, selections: dict) -> str:
        """Deterministic SHA‑256 key for caching based on prompt + selections."""
        raw = prompt + json.dumps(selections, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
