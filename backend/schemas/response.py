from pydantic import BaseModel

class GenerateResponse(BaseModel):
    success: bool
    prompt : str
    result: str
    
