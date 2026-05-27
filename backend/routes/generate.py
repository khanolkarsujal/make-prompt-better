from fastapi import APIRouter
from ..schemas.request import AnalyzeRequest, BuildRequest
from ..schemas.response import BuildResponse, StageState, AnalyzeResponse
from ..services.stage_engine import StageEngine

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyze a prompt and return suggestions for clarification"""
    engine = StageEngine()
    result = await engine.analyze_prompt(request.prompt, selections=request.selections)
    return result

@router.post("/next", response_model=StageState)
async def next_stage(request: AnalyzeRequest) -> dict:
    """Run the next step of the multi-stage analysis loop."""
    engine = StageEngine()
    result = await engine.next_step(request.prompt, request.selections)
    return result

@router.post("/build", response_model=BuildResponse)
async def build(request: BuildRequest):
    """Build an enhanced prompt based on user selections"""
    engine = StageEngine()
    result = await engine.build_enhanced_prompt(request.prompt, request.selections, request.intent, request.context)
    return result