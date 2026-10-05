export interface NLPAnalysisResult {
  category: string;
  building?: string;
  room?: string;
  asset?: string;
  urgency: "low" | "medium" | "high" | "critical" | "emergency";
  confidence: number;
  embedding: number[];
}

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "http://localhost:8001";

/**
 * Fallback regex + rule-based analyzer when NLP service is unreachable.
 */
function ruleBasedAnalyze(text: string): NLPAnalysisResult {
  const lower = text.toLowerCase();

  // 1. Detect Category
  let category = "General";
  if (/ac|air condition|fan|light|switch|wire|socket|power|fuse|electricity|blackout|tripped/i.test(text)) {
    category = "Electrical";
  } else if (/tap|leak|water|flush|pipe|drain|washroom|toilet|sink|ro purifier/i.test(text)) {
    category = "Plumbing";
  } else if (/projector|screen|hdmi|mic|speaker|audio|sound|display|av/i.test(text)) {
    category = "Audio-Visual";
  } else if (/bench|desk|chair|table|door|lock|window|blackboard|podium|whiteboard/i.test(text)) {
    category = "Furniture";
  } else if (/wifi|internet|lan|ethernet|network|router|portal|slow net/i.test(text)) {
    category = "Network/IT";
  } else if (/trash|garbage|dust|sweep|mop|dirty|smell|stink|clean/i.test(text)) {
    category = "Sanitation";
  } else if (/lift|elevator|staircase|railing|crack|plaster/i.test(text)) {
    category = "Infrastructure";
  }

  // 2. Detect Room & Building
  let room: string | undefined;
  let building: string | undefined;

  const numRoomMatch = text.match(/\b(?:room|rm|cr|lh|lab)?\s*([1-9]\d{2,3})\b/i);
  const alphaRoomMatch = text.match(/\b([A-Z][- ]?\d{2,3}|lh[- ]?\d+|lab[- ]?\d+|cr[- ]?\d+)\b/i);
  const buildingMatch = text.match(
    /\b(block\s*[a-d]|[a-d]\s*block|main building|engineering building|admin block|library|hostel\s*[a-d1-4]?|canteen|workshop|seminar hall|auditorium)\b/i
  );

  if (alphaRoomMatch) {
    room = alphaRoomMatch[0].toUpperCase().replace(/\s+/g, "");
    if (room.startsWith("A")) building = "Block A (Main)";
    else if (room.startsWith("B")) building = "Block B (Engineering)";
    else if (room.startsWith("C")) building = "Block C (Computing)";
    else if (room.startsWith("D")) building = "Block D (Science)";
  } else if (numRoomMatch) {
    const num = numRoomMatch[1];
    room = `Room ${num}`;
    const floorDigit = parseInt(num[0], 10);
    building = `DMCE Main Building · Floor ${floorDigit}`;
  }

  if (buildingMatch) {
    const rawBldg = buildingMatch[0];
    building = rawBldg.charAt(0).toUpperCase() + rawBldg.slice(1);
  }

  // 3. Detect Asset
  let asset: string | undefined;
  const assetCandidates = [
    "ceiling fan",
    "exhaust fan",
    "table fan",
    "fan",
    "air conditioner",
    "ac",
    "projector",
    "smartboard",
    "smart board",
    "tube light",
    "light",
    "bulb",
    "switchboard",
    "power socket",
    "water cooler",
    "ro filter",
    "tap",
    "flush",
    "speaker",
    "microphone",
    "mic",
    "display monitor",
    "podium",
    "bench",
    "chair",
    "desk",
    "wifi router",
    "lan port",
    "elevator",
    "lift",
    "door handle",
    "window latch",
  ];
  for (const cand of assetCandidates) {
    if (new RegExp(`\\b${cand}\\b`, "i").test(lower)) {
      asset = cand.charAt(0).toUpperCase() + cand.slice(1);
      break;
    }
  }

  // 4. Urgency
  let urgency: "low" | "medium" | "high" | "critical" | "emergency" = "medium";
  if (/spark|smoke|fire|flood|shock|collapse|blast|burst|hazard/i.test(text)) {
    urgency = "emergency";
  } else if (/exam|started|starting|urgent|immediate|right now/i.test(text)) {
    urgency = "critical";
  } else if (/lecture|class|cannot hear|disturbing|broken|not working|leaking|stuck/i.test(text)) {
    urgency = "high";
  } else if (/flicker|creak|slow|loose|dim/i.test(text)) {
    urgency = "low";
  }

  // Dynamic confidence score based on entity recognition
  let confidenceScore = 0.65;
  if (category !== "General") confidenceScore += 0.12;
  if (asset) confidenceScore += 0.10;
  if (room || building) confidenceScore += 0.10;
  const confidence = Math.min(0.97, Math.round(confidenceScore * 100) / 100);

  // Pseudo-embedding 384-d normalized vector (deterministic hash based)
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 384] += Math.sin(charCode * (i + 1));
  }
  const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0)) || 1;
  const normalizedEmbedding = embedding.map((v) => Number((v / norm).toFixed(6)));

  return {
    category,
    building: building || "DMCE Main Campus",
    room: room || "",
    asset: asset || "Campus Equipment",
    urgency,
    confidence,
    embedding: normalizedEmbedding,
  };
}

export async function analyzeIssueText(text: string): Promise<NLPAnalysisResult> {
  if (!text || text.trim().length === 0) {
    return {
      category: "General",
      urgency: "medium",
      confidence: 0.5,
      embedding: new Array(384).fill(0),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${NLP_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as NLPAnalysisResult;
      return data;
    }
  } catch {
    // Service offline or timeout - fallback to rule-based analyzer seamlessly
  }

  return ruleBasedAnalyze(text);
}
