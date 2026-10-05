export interface PriorityFactors {
  affectedCount: number;
  urgency: string; // low | medium | high | critical | emergency
  createdAt: Date | string | number;
  room?: string | null;
  building?: string | null;
  mergedCount: number; // distinct merged reports
}

export interface FactorBreakdown {
  raw: number;
  max: number;
  weight: number;
  contribution: number;
  note: string;
}

export interface PriorityResult {
  score: number;
  label: "High" | "Medium" | "Low";
  breakdown: {
    affected_students: FactorBreakdown;
    severity: FactorBreakdown;
    duration: FactorBreakdown;
    location_crit: FactorBreakdown;
    academic_impact: FactorBreakdown;
    duplicate_reports: FactorBreakdown;
  };
}

export function calculatePriorityScore(factors: PriorityFactors): PriorityResult {
  // 1. Affected students (weight 0.30, max 80)
  const affectedRaw = Math.max(1, factors.affectedCount || 1);
  const affectedMax = 80;
  const affectedFraction = Math.min(affectedRaw / affectedMax, 1);
  const affectedContrib = affectedFraction * 0.30;

  // 2. Severity (weight 0.20, max 5)
  const urgencyMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
    emergency: 5,
  };
  const severityRaw = urgencyMap[factors.urgency?.toLowerCase()] || 2;
  const severityMax = 5;
  const severityFraction = severityRaw / severityMax;
  const severityContrib = severityFraction * 0.20;

  // 3. Duration (weight 0.15, max 168 hours = 1 week)
  const createdTime = new Date(factors.createdAt).getTime();
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - createdTime) / (1000 * 60 * 60));
  const durationMax = 168;
  const durationFraction = Math.min(hoursElapsed / durationMax, 1);
  const durationContrib = durationFraction * 0.15;

  // 4. Location criticality (weight 0.15, max 3)
  // classroom=3, lab=2, library/admin=1, hostel=1, other=1
  const locStr = `${factors.room || ""} ${factors.building || ""}`.toLowerCase();
  let locationRaw = 1;
  if (/classroom|lecture|hall|lh|cr\b/i.test(locStr)) {
    locationRaw = 3;
  } else if (/lab|workshop/i.test(locStr)) {
    locationRaw = 2;
  } else if (/library|admin|office|hostel/i.test(locStr)) {
    locationRaw = 1;
  }
  const locationMax = 3;
  const locationFraction = locationRaw / locationMax;
  const locationContrib = locationFraction * 0.15;

  // 5. Academic impact (weight 0.10, max 3)
  // classroom/lab → 3, library/hostel → 2, other → 1
  let academicRaw = 1;
  if (/classroom|lecture|hall|lh|cr\b|lab|workshop/i.test(locStr)) {
    academicRaw = 3;
  } else if (/library|hostel/i.test(locStr)) {
    academicRaw = 2;
  }
  const academicMax = 3;
  const academicFraction = academicRaw / academicMax;
  const academicContrib = academicFraction * 0.10;

  // 6. Duplicate reports (weight 0.10, max 30)
  // Based on distinct merged reports, not affected count
  const duplicateRaw = Math.max(0, (factors.mergedCount || 1) - 1);
  const duplicateMax = 30;
  const duplicateFraction = Math.min(duplicateRaw / duplicateMax, 1);
  const duplicateContrib = duplicateFraction * 0.10;

  // Total score: 0 to 100
  const totalFraction =
    affectedContrib +
    severityContrib +
    durationContrib +
    locationContrib +
    academicContrib +
    duplicateContrib;

  const score = Math.round(totalFraction * 100);

  // Label per instruction: High >= 75 / Medium 40-74 / Low < 40
  let label: "High" | "Medium" | "Low" = "Low";
  if (score >= 75) {
    label = "High";
  } else if (score >= 40) {
    label = "Medium";
  } else {
    label = "Low";
  }

  return {
    score,
    label,
    breakdown: {
      affected_students: {
        raw: affectedRaw,
        max: affectedMax,
        weight: 0.30,
        contribution: Math.round(affectedContrib * 100),
        note: `${affectedRaw} affected student${affectedRaw > 1 ? "s" : ""}`,
      },
      severity: {
        raw: severityRaw,
        max: severityMax,
        weight: 0.20,
        contribution: Math.round(severityContrib * 100),
        note: `Urgency level: ${factors.urgency || "medium"} (${severityRaw}/5)`,
      },
      duration: {
        raw: Math.round(hoursElapsed),
        max: durationMax,
        weight: 0.15,
        contribution: Math.round(durationContrib * 100),
        note: `${Math.round(hoursElapsed)}h elapsed since reported`,
      },
      location_crit: {
        raw: locationRaw,
        max: locationMax,
        weight: 0.15,
        contribution: Math.round(locationContrib * 100),
        note: `Location criticality rank ${locationRaw}/3`,
      },
      academic_impact: {
        raw: academicRaw,
        max: academicMax,
        weight: 0.10,
        contribution: Math.round(academicContrib * 100),
        note: `Academic impact score ${academicRaw}/3`,
      },
      duplicate_reports: {
        raw: duplicateRaw,
        max: duplicateMax,
        weight: 0.10,
        contribution: Math.round(duplicateContrib * 100),
        note: `${duplicateRaw} merged duplicate report${duplicateRaw !== 1 ? "s" : ""}`,
      },
    },
  };
}

// Runnable self-check
if (require.main === module) {
  const test1 = calculatePriorityScore({
    affectedCount: 80,
    urgency: "critical",
    createdAt: Date.now() - 1000 * 60 * 60 * 168,
    room: "Classroom 301",
    building: "Academic Block A",
    mergedCount: 15,
  });
  console.assert(test1.score >= 75, `Expected High >= 75, got ${test1.score}`);
  console.assert(test1.label === "High", `Expected label High, got ${test1.label}`);

  const testLow = calculatePriorityScore({
    affectedCount: 1,
    urgency: "low",
    createdAt: Date.now(),
    room: "Store Room",
    building: "Staff Quarters",
    mergedCount: 1,
  });
  console.assert(testLow.score < 40, `Expected Low < 40, got ${testLow.score}`);
  console.assert(testLow.label === "Low", `Expected label Low, got ${testLow.label}`);

  console.log("PriorityEngine self-check passed: High:", test1.score, "Low:", testLow.score);
}
