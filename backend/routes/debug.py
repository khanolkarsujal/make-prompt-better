from fastapi import APIRouter
from services.ai_service import get_diagnostics

router = APIRouter()

@router.get("/debug/state")
async def debug_state():
    """Return the most recent loop diagnostics as JSON.
    Includes confidence, skip flag, selections, intent, context, ambiguity, suggestions.
    """
    return {"diagnostics": get_diagnostics()}
