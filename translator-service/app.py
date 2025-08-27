from fastapi import FastAPI
from pydantic import BaseModel
import re

app = FastAPI()

# Load dictionary
import json
with open("gloss-dictionary.json") as f:
    GLOSS_DICT = json.load(f)

class ASRInput(BaseModel):
    text: str

@app.post("/translate")
def translate(asr: ASRInput):
    words = asr.text.lower().split()
    glosses = []
    for w in words:
        gloss = GLOSS_DICT.get(w, None)
        if gloss:
            glosses.append({"word": w, "gloss": gloss})
        else:
            glosses.append({"word": w, "gloss": f"FINGERSPELL({w})"})
    return {"glosses": glosses}
