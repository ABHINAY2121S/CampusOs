import re
import math
from typing import Dict, Any, List

BUILDING_LOOKUP = {
    "RCC": "Ramanujan Computing Complex",
    "AAB": "Aryabhata Academic Block",
    "KSC": "Dr. APJ Abdul Kalam Science Center",
    "VEH": "Visvesvaraya Engineering Hall",
    "SAB": "Sarabhai Administrative Building",
    "BLOCK A": "Aryabhata Academic Block",
    "BLOCK B": "Visvesvaraya Engineering Hall",
    "BLOCK C": "Ramanujan Computing Complex",
}

ASSETS = [
    "projector", "ac", "air conditioner", "ceiling fan", "fan", "tube light", "light",
    "switchboard", "socket", "water cooler", "water tap", "tap", "flush valve", "toilet",
    "wifi router", "router", "lan port", "desk", "chair", "bench", "door lock",
    "microphone", "speaker", "hdmi cable", "elevator", "lift", "dustbin", "trash bin"
]

def analyze_complaint(text: str) -> Dict[str, Any]:
    lower = text.lower()

    # 1. Location detection (room & building)
    room = None
    building = None

    room_match = re.search(r'\b([A-Z]{2,4}-\d{3}|[A-Z]\d{3}|LH-\d+|Lab-\d+|\d{3})\b', text, re.IGNORECASE)
    if room_match:
        room = room_match.group(1).upper()
        prefix = room.split("-")[0]
        if prefix in BUILDING_LOOKUP:
            building = BUILDING_LOOKUP[prefix]

    if not building:
        for key, val in BUILDING_LOOKUP.items():
            if re.search(r'\b' + re.escape(key) + r'\b', text, re.IGNORECASE):
                building = val
                break

    # 2. Asset detection
    asset = None
    for cand in ASSETS:
        if cand in lower:
            asset = cand.title()
            break

    # 3. Urgency detection
    urgency = "medium"
    if re.search(r'\b(spark|smoke|fire|flood|shock|blast|trapped|stuck inside)\b', lower):
        urgency = "emergency"
    elif re.search(r'\b(exam|immediate|urgent|hazard|starting now|right now|overflowing)\b', lower):
        urgency = "critical"
    elif re.search(r'\b(broken|cannot hear|not working|leaking|lecture|class)\b', lower):
        urgency = "high"
    elif re.search(r'\b(creak|flicker|loose|dim|slow)\b', lower):
        urgency = "low"

    # 4. Category detection
    category = "General"
    if re.search(r'\b(fan|light|switch|spark|ac|air condition|power|electricity|fuse|voltage)\b', lower):
        category = "Electrical"
    elif re.search(r'\b(tap|leak|water|flush|pipe|drain|toilet|washroom|cooler|filter)\b', lower):
        category = "Plumbing"
    elif re.search(r'\b(projector|screen|hdmi|mic|microphone|speaker|audio|display|sound)\b', lower):
        category = "Audio-Visual"
    elif re.search(r'\b(desk|bench|chair|table|seat)\b', lower):
        category = "Furniture"
    elif re.search(r'\b(wifi|wi-fi|internet|lan|ethernet|network|router|portal|slow net)\b', lower):
        category = "Network/IT"
    elif re.search(r'\b(clean|dustbin|trash|smell|stink|garbage|soap|sweep)\b', lower):
        category = "Sanitation"
    elif re.search(r'\b(elevator|lift|door|lock|roof|staircase|tile|window)\b', lower):
        category = "Infrastructure"

    # 5. Deterministic 384-dimensional vector embedding
    vec = [0.0] * 384
    for i, ch in enumerate(text):
        vec[i % 384] += math.sin((ord(ch) + 1) * (i + 1))
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    embedding = [round(v / norm, 6) for v in vec]

    return {
        "category": category,
        "building": building,
        "room": room,
        "asset": asset,
        "urgency": urgency,
        "confidence": 0.92,
        "embedding": embedding,
    }
