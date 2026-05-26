import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from services.ai_service import IntentAnalyzer

async def main():
    analyzer = IntentAnalyzer()
    prompt = "build an app\n\nPrevious Answers:\n- What type of application are you building?: Web Dashboard\n- Which frontend framework should be used?: Next.js"
    # test with no override
    res = await analyzer.analyze(prompt)
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(main())
