from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from core.config import settings
from routes.generate import router as generate_router
from routes.history import router as history_router
from routes.templates import router as templates_router

app = FastAPI(title="Vibe Prompt Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router, prefix="/api", tags=["generate"])
app.include_router(history_router, prefix="/api", tags=["history"])
app.include_router(templates_router, prefix="/api", tags=["templates"])

@app.get("/")
async def root():
    return {"message": "Vibe Prompt Engine Backend is running ✨"}