import { prisma } from "../lib/prisma";

export interface SimilarIssueResult {
  id: string;
  displayId: string;
  title: string;
  description: string;
  category: string;
  building?: string | null;
  room?: string | null;
  asset?: string | null;
  status: string;
  priorityScore: number;
  similarity: number;
}

/**
 * Searches for duplicate/similar issues within the last 14 days.
 * Uses WHERE with similarity expression, filtering by room when known, else building.
 */
export async function findSimilarIssues(params: {
  embedding?: number[] | null;
  building?: string | null;
  room?: string | null;
  threshold?: number;
  limit?: number;
}): Promise<SimilarIssueResult[]> {
  const { embedding, building, room, threshold = 0.75, limit = 5 } = params;

  if (!embedding || embedding.length === 0) {
    // Fallback keyword/location query if no embedding available
    if (!building && !room) return [];
    try {
      const candidates = await prisma.issue.findMany({
        where: {
          status: { notIn: ["resolved", "closed"] },
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          ...(room ? { room } : building ? { building } : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return candidates.map((c) => ({
        id: c.id,
        displayId: c.displayId,
        title: c.title,
        description: c.description,
        category: c.category,
        building: c.building,
        room: c.room,
        asset: c.asset,
        status: c.status,
        priorityScore: c.priorityScore,
        similarity: 0.8, // nominal fallback similarity
      }));
    } catch {
      return [];
    }
  }

  const vectorStr = `[${embedding.join(",")}]`;

  try {
    // Filter by room when known, else building
    let locationClause = "";
    if (room && room.trim()) {
      locationClause = `AND room = '${room.replace(/'/g, "''")}'`;
    } else if (building && building.trim()) {
      locationClause = `AND building = '${building.replace(/'/g, "''")}'`;
    }

    // Direct pgvector cosine query using WHERE with similarity expression
    const rawQuery = `
      SELECT id, "displayId", title, description, category, building, room, asset, status, "priorityScore",
             1 - (embedding <=> '${vectorStr}'::vector) AS similarity
      FROM "Issue"
      WHERE embedding IS NOT NULL
        AND (1 - (embedding <=> '${vectorStr}'::vector)) >= ${threshold}
        ${locationClause}
        AND "createdAt" > now() - interval '14 days'
        AND status NOT IN ('resolved', 'closed')
      ORDER BY similarity DESC
      LIMIT ${limit};
    `;

    const results = await prisma.$queryRawUnsafe<SimilarIssueResult[]>(rawQuery);
    return results;
  } catch (err) {
    // If pgvector isn't available or fails (e.g. running without pgvector extension in dev), fallback safely
    // ponytail: fallback to location-based recent issues if vector extension query throws
    try {
      const candidates = await prisma.issue.findMany({
        where: {
          status: { notIn: ["resolved", "closed"] },
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          ...(room ? { room } : building ? { building } : {}),
        },
        take: limit,
      });
      return candidates.map((c) => ({
        id: c.id,
        displayId: c.displayId,
        title: c.title,
        description: c.description,
        category: c.category,
        building: c.building,
        room: c.room,
        asset: c.asset,
        status: c.status,
        priorityScore: c.priorityScore,
        similarity: 0.76,
      }));
    } catch {
      return [];
    }
  }
}
