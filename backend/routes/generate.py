from fastapi import APIRouter
from schemas.request import AnalyzeRequest, BuildRequest
from schemas.response import AnalyzeResponse, BuildResponse
from services.ai_service import analyze_prompt, build_enhanced_prompt

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyze a prompt and return suggestions for clarification"""
    result = await analyze_prompt(request.prompt)
    return result

@router.post("/build", response_model=BuildResponse)
async def build(request: BuildRequest):
    """Build an enhanced prompt based on user selections"""
    result = await build_enhanced_prompt(
        request.prompt, 
        request.selections,
        request.intent,
        request.context
    )
    return result