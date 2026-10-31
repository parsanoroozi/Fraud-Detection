from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def predict(text):
    return client.post("/api/predict", json={"text": text}).json()["prediction"]


def test_health():
    assert client.get("/api/health").status_code == 200


def test_spam():
    assert predict("WINNER! Claim your FREE prize now, text WIN to 80086") == 1


def test_not_spam():
    assert predict("Are we still meeting for lunch tomorrow?") == 0
