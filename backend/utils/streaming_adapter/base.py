from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any


class BaseStreamingAdapter(ABC):
    """Abstract base for provider‑specific streaming adapters.

    Subclasses must implement ``stream`` which yields partial
    responses from the provider as they become available.
    The yielded items are dictionaries that can be merged into the
    final response payload.
    """

    @abstractmethod
    async def stream(self, prompt: str, **kwargs) -> AsyncIterator[Dict[str, Any]]:
        """Yield partial response chunks for a given *prompt*.

        Args:
            prompt: The user prompt to send to the model.
            **kwargs: Provider‑specific arguments (e.g. temperature, max_tokens).

        Yields:
            Partial JSON‑serialisable dictionaries representing the streamed
            output.
        """
        raise NotImplementedError
