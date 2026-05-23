from fastapi import FastAPI

app = FastAPI()

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