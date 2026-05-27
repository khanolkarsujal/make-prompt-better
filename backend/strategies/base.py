from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class InferenceStrategy(ABC):
    @abstractmethod
    async def analyze(self, prompt: str, selections: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Runs inference and returns the standard analysis payload."""
        pass
