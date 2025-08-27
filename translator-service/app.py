import os
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class TextInput(BaseModel):
    text: str

SIGN_LANGUAGE_DICT = {
    "hello": "👋 (HELLO sign)",
    "how are you": "🙏 (HOW ARE YOU sign)",
    "thank you": "🤟 (THANK YOU sign)",
    "yes": "👍 (YES sign)",
    "no": "👎 (NO sign)"
}

@app.post("/translate")
async def translate(input: TextInput):
    text = input.text.lower().strip()
    sign = SIGN_LANGUAGE_DICT.get(text, f"❓ (No sign found for '{text}')")
    return {"original": input.text, "sign": sign}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
