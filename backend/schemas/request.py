from pydantic import BaseModel
from typing import Dict, Optional, Any

class AnalyzeRequest(BaseModel):
    prompt: str

class BuildRequest(BaseModel):
    prompt: str
    selections: Dict[str, str]
    intent: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None