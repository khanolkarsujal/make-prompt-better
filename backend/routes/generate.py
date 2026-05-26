from fastapi import APIRouter
from schemas.request import AnalyzeRequest, BuildRequest
from schemas.response import BuildResponse, StageState, AnalyzeResponse
from services.ai_service import StageEngine, IntentAnalyzer, ContextDetector, build_enhanced_prompt, analyze_prompt

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyze a prompt and return suggestions for clarification"""
    result = await analyze_prompt(request.prompt, selections=request.selections, model_override=request.model)
    return result

@router.post("/next", response_model=StageState)
async def next_stage(request: AnalyzeRequest) -> dict:
    """Run the next step of the multi-stage analysis loop."""
    engine = StageEngine()
    result = await engine.next_step(request.prompt, request.selections, request.model)
    return result

@router.post("/build", response_model=BuildResponse)
async def build(request: BuildRequest):
    """Build an enhanced prompt based on user selections"""
    result = await build_enhanced_prompt(request.prompt, request.selections, request.intent, request.context, request.model)
    return result