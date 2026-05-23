from fastapi import APIRouter , HTTPException
from ..schemas.request import GenerateRequest
from ..schemas.response import GenerateResponse
from ..services.ai_service import generate_ai_response


router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    try:
        if not request.prompt or request.prompt.strip() == "":
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        result = generate_ai_response(request.prompt)

        return GenerateResponse(success=True, prompt=request.prompt, result=result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))