from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class Question(BaseModel):
    id: str
    title: str
    why_it_matters: Optional[str] = None
    options: List[str]
    category: str

class Suggestions(BaseModel):
    questions: List[Question]
    estimated_complexity: str

class AnalyzeResponse(BaseModel):
    intent: Dict[str, Any]
    context: Dict[str, Any]
    ambiguity: Dict[str, Any]
    suggestions: Suggestions

class BuildResponse(BaseModel):
    enhanced_prompt: str
    original_prompt: str
    selections: Dict[str, str]
    metadata: Dict[str, Any]
class StageState(BaseModel):
    stage: str
    confidence: float
    questions: List[Question] = []
    estimated_complexity: Optional[str] = None
    final_prompt: Optional[str] = None
    selections: Optional[Dict[str, str]] = None
    tags: Optional[Dict[str, Any]] = None
