import json
import os
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

KEYWORDS = {
    "Electrical": ["ac", "fan", "light", "switch", "spark", "power", "socket", "fuse", "electricity"],
    "Plumbing": ["tap", "leak", "water", "flush", "drain", "toilet", "washroom", "cooler"],
    "Audio-Visual": ["projector", "screen", "hdmi", "mic", "speaker", "audio", "display"],
    "Furniture": ["bench", "chair", "desk", "table", "door", "lock"],
    "Network/IT": ["wifi", "wi-fi", "internet", "lan", "router", "portal", "ethernet"],
    "Sanitation": ["dustbin", "trash", "soap", "clean", "smell", "waste"],
    "Infrastructure": ["elevator", "lift", "roof", "corridor", "ceiling", "stair"],
}

def keyword_baseline_predict(text: str) -> str:
    lower = text.lower()
    scores = {}
    for cat, words in KEYWORDS.items():
        score = sum(1 for w in words if re.search(r'\b' + re.escape(w), lower))
        scores[cat] = score
    best_cat, best_score = max(scores.items(), key=lambda x: x[1])
    return best_cat if best_score > 0 else "General"

def train_and_compare(train_path: str, test_path: str):
    with open(train_path, "r", encoding="utf-8") as f:
        train_data = json.load(f)
    with open(test_path, "r", encoding="utf-8") as f:
        test_data = json.load(f)

    X_train = [item["text"] for item in train_data]
    y_train = [item["category"] for item in train_data]

    X_test = [item["text"] for item in test_data]
    y_test = [item["category"] for item in test_data]

    # 1. Keyword Baseline Evaluation
    y_pred_baseline = [keyword_baseline_predict(t) for t in X_test]
    baseline_acc = accuracy_score(y_test, y_pred_baseline)

    # 2. Logistic Regression Classifier on TF-IDF / N-gram representations
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    clf = LogisticRegression(max_iter=200, C=1.0)
    clf.fit(X_train_vec, y_train)
    y_pred_lr = clf.predict(X_test_vec)
    lr_acc = accuracy_score(y_test, y_pred_lr)

    report = {
        "baseline_accuracy": round(float(baseline_acc), 4),
        "logistic_regression_accuracy": round(float(lr_acc), 4),
        "test_sample_count": len(y_test),
        "train_sample_count": len(y_train),
        "comparison": f"Logistic Regression ({round(float(lr_acc)*100, 1)}%) vs Keyword Baseline ({round(float(baseline_acc)*100, 1)}%)",
    }
    return report, clf, vectorizer

if __name__ == "__main__":
    cur_dir = os.path.dirname(os.path.abspath(__file__))
    train_p = os.path.join(cur_dir, "data", "train.json")
    test_p = os.path.join(cur_dir, "data", "test.json")
    res, _, _ = train_and_compare(train_p, test_p)
    print("NLP Classification Benchmark Results:")
    print(json.dumps(res, indent=2))
