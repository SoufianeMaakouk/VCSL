from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# simple dictionary
GLOSS_DICT = {
    "hello": "HELLO_SIGN",
    "come": "COME_SIGN",
    "thanks": "THANKS_SIGN"
}

class InputText(BaseModel):
    text: str

@app.post("/translate")
def translate(data: InputText):
    words = data.text.lower().split()
    result = []
    for w in words:
        gloss = GLOSS_DICT.get(w, f"FINGERSPELL({w})")
        result.append({"word": w, "gloss": gloss})
    return {"glosses": result}
