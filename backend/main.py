from fastapi import FastAPI
from backend.routes.generate import router  as generate_router

app = FastAPI()
title="Vibe Prompt Engine API",
description="API for generating content based on prompts using AI",
version="1.0.0",

app.include_router(generate_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Hello, World!"}

@app.get("/health")
def health_check():
    return {"status": "OK"}


@app.post("/generate")
def generate_content(prompt: str):
    return {
        "response": " Ai output here"
    }