from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from models.history import get_history, add_to_history, toggle_favorite, delete_from_history

router = APIRouter()

class SaveHistoryRequest(BaseModel):
    prompt: str
    enhanced_prompt: str
    selections: Dict[str, str]

@router.get("/history")
async def get_prompt_history():
    """Return all saved prompt history entries"""
    return {"history": get_history()}

@router.post("/history")
async def save_to_history(request: SaveHistoryRequest):
    """Save a prompt to history"""
    entry = add_to_history(request.prompt, request.enhanced_prompt, request.selections)
    return {"entry": entry, "message": "Saved to history"}

@router.patch("/history/{entry_id}/favorite")
async def favorite_entry(entry_id: str):
    """Toggle favorite status for a history entry"""
    result = toggle_favorite(entry_id)
    return {"is_favorite": result}

@router.delete("/history/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete a history entry"""
    success = delete_from_history(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Deleted successfully"}
