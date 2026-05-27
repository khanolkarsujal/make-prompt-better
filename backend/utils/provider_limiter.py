import asyncio

class ProviderLimiterRegistry:
    """Registry of asyncio.Semaphore objects keyed by provider name.
    Allows each inference provider to have its own concurrency limit.
    """
    _registry: dict[str, asyncio.Semaphore] = {}

    @classmethod
    def get(cls, provider: str, default: int = 5) -> asyncio.Semaphore:
        """Return a semaphore for *provider*.
        If the provider is unknown the *default* limit is used.
        """
        key = provider.lower()
        if key not in cls._registry:
            limits = {
                "ollama": 2,
                "openai": 20,
                "anthropic": 15,
                "groq": 50,
                "vllm": 30,
            }
            limit = limits.get(key, default)
            cls._registry[key] = asyncio.Semaphore(limit)
        return cls._registry[key]
