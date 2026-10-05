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
  // Room code pattern e.g. B204, LH-1, Lab 3, CR-302, 401, 102
  let room: string | undefined;
  let building: string | undefined;

  const roomMatch = text.match(/\b([A-Z]-?\d{3}|[A-Z]\d{3}|lh[- ]?\d+|lab[- ]?\d+|cr[- ]?\d+|\d{3})\b/i);
  if (roomMatch) {
    room = roomMatch[0].toUpperCase();
    if (room.startsWith("A")) building = "Block A (Main)";
    else if (room.startsWith("B")) building = "Block B (Engineering)";
    else if (room.startsWith("C")) building = "Block C (Computing)";
    else if (room.startsWith("D")) building = "Block D (Science)";
    else building = "Academic Complex";
  }

  const buildingMatch = text.match(
    /\b(block\s*[a-d]|main building|admin block|library|hostel\s*[a-d1-4]|science block|canteen)\b/i
  );
  if (buildingMatch) {
    building = buildingMatch[0];
  }

  // 3. Detect Asset
  let asset: string | undefined;
  const assetCandidates = [
    "projector",
    "ac",
    "air conditioner",
    "fan",
    "light",
    "tube light",
    "switchboard",
    "power socket",
    "tap",
    "flush",
    "water cooler",
    "ro filter",
    "speaker",
    "microphone",
    "display monitor",
    "chair",
    "desk",
    "podium",
    "bench",
    "wifi router",
    "lan port",
    "elevator",
    "lift",
    "door handle",
    "window latch",
  ];
  for (const cand of assetCandidates) {
    if (lower.includes(cand)) {
      asset = cand.charAt(0).toUpperCase() + cand.slice(1);
      break;
    }
  }

  // 4. Urgency
  let urgency: "low" | "medium" | "high" | "critical" | "emergency" = "medium";
  if (/spark|smoke|fire|flood|shock|collapse|blast|burst/i.test(text)) {
    urgency = "emergency";
  } else if (/exam|started|starting|urgent|immediate|right now|hazard/i.test(text)) {
    urgency = "critical";
  } else if (/lecture|class|cannot hear|disturbing|broken|not working/i.test(text)) {
    urgency = "high";
  } else if (/flicker|creak|slow|loose|dim/i.test(text)) {
    urgency = "low";
  }

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
    building,
    room,
    asset,
    urgency,
    confidence: 0.88,
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
