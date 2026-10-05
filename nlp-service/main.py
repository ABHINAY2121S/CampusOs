import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from analyzer import analyze_complaint
from classifier import train_and_compare

app = FastAPI(title="Campus OS NLP Service", version="1.0.0")

class AnalyzeRequest(BaseModel):
    text: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "campus-os-nlp"}

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return analyze_complaint(req.text)

@app.get("/evaluation")
def evaluation():
    cur_dir = os.path.dirname(os.path.abspath(__file__))
    train_p = os.path.join(cur_dir, "data", "train.json")
    test_p = os.path.join(cur_dir, "data", "test.json")
    if os.path.exists(train_p) and os.path.exists(test_p):
        report, _, _ = train_and_compare(train_p, test_p)
        return report
    return {"error": "Dataset not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
