import pickle
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent

with open(BASE_DIR / "models" / "cv.pkl", "rb") as f:
    cv = pickle.load(f)
with open(BASE_DIR / "models" / "clf.pkl", "rb") as f:
    clf = pickle.load(f)

app = FastAPI(title="Spam Detector")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class EmailIn(BaseModel):
    text: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict")
def predict(email: EmailIn):
    # plain text -> CountVectorizer -> model -> 1 = spam
    tokens = cv.transform([email.text])
    prediction = int(clf.predict(tokens)[0])
    # probability of the predicted class, 0..1
    confidence = float(clf.predict_proba(tokens)[0].max())
    return {
        "prediction": prediction,
        "label": "spam" if prediction == 1 else "not spam",
        "confidence": round(confidence, 4),
    }


# Serve the built React app (present inside the Docker image)
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
