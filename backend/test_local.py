import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from services.ai_service import IntentAnalyzer, _call_ai, _resolve

async def main():
    analyzer = IntentAnalyzer()
    prompt = "build an app"
    
    cl, mdl, is_openai = _resolve("deepseek-coder:6.7b")
    try:
        text = _call_ai(cl, mdl, is_openai, analyzer.SYSTEM_PROMPT, prompt, max_tokens=600, temperature=0.2)
        print("RAW OUTPUT:", repr(text))
    except Exception as e:
        print("API CALL FAILED:", e)

if __name__ == "__main__":
    asyncio.run(main())
