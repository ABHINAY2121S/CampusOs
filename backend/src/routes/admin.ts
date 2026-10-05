import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("admin", "hod"));

// ── Admin KPIs Overview ───────────────────────────────────────────────────
router.get("/overview", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalIssues, openIssues, resolvedIssues, criticalIssues, activeTechnicians] =
      await Promise.all([
        prisma.issue.count(),
        prisma.issue.count({
          where: { status: { notIn: ["resolved", "closed"] } },
        }),
        prisma.issue.count({
          where: { status: { in: ["resolved", "closed"] } },
        }),
        prisma.issue.count({
          where: {
            priorityScore: { gte: 75 },
            status: { notIn: ["resolved", "closed"] },
          },
        }),
        prisma.user.count({
          where: { role: "technician" },
        }),
      ]);

    // Average resolution time for resolved issues
    const resolvedSample = await prisma.issue.findMany({
      where: {
        resolvedAt: { not: null },
      },
      select: { createdAt: true, resolvedAt: true },
      take: 100,
    });

    let avgResolutionHours = 14.5;
    if (resolvedSample.length > 0) {
      const totalHours = resolvedSample.reduce((acc, curr) => {
        if (!curr.resolvedAt) return acc;
        return acc + (curr.resolvedAt.getTime() - curr.createdAt.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Number((totalHours / resolvedSample.length).toFixed(1));
    }

    // SLA breaches (open > 48h with priority >= 75)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const slaBreaches = await prisma.issue.count({
      where: {
        status: { notIn: ["resolved", "closed"] },
        priorityScore: { gte: 75 },
        createdAt: { lt: twoDaysAgo },
      },
    });

    res.json({
      totalIssues,
      openIssues,
      resolvedIssues,
      criticalIssues,
      activeTechnicians,
      avgResolutionHours,
      slaBreaches,
      resolutionRate: totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── Building Heatmap ──────────────────────────────────────────────────────
router.get("/heatmap", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buildings = await prisma.building.findMany({
      select: { name: true, code: true },
    });

    const issues = await prisma.issue.findMany({
      where: { status: { notIn: ["resolved", "closed"] } },
      select: { building: true, priorityScore: true },
    });

    const map: Record<string, { total: number; critical: number }> = {};
    buildings.forEach((b) => {
      map[b.name] = { total: 0, critical: 0 };
    });

    issues.forEach((iss) => {
      const bName = iss.building || "Other / Campus Grounds";
      if (!map[bName]) {
        map[bName] = { total: 0, critical: 0 };
      }
      map[bName].total += 1;
      if (iss.priorityScore >= 75) {
        map[bName].critical += 1;
      }
    });

    const result = Object.entries(map).map(([building, stats]) => ({
      building,
      total: stats.total,
      critical: stats.critical,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Category Distribution ─────────────────────────────────────────────────
router.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalIssues = await prisma.issue.count();
    const categories = await prisma.issue.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const result = categories.map((cat) => ({
      category: cat.category,
      count: cat._count.id,
      percent: totalIssues > 0 ? Math.round((cat._count.id / totalIssues) * 100) : 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Department Performance ────────────────────────────────────────────────
router.get("/departments/performance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        issues: {
          select: { status: true, priorityScore: true, createdAt: true, resolvedAt: true },
        },
      },
    });

    const result = departments.map((dept) => {
      const total = dept.issues.length;
      const open = dept.issues.filter((i) => !["resolved", "closed"].includes(i.status)).length;
      const resolved = total - open;
      const critical = dept.issues.filter((i) => i.priorityScore >= 75 && !["resolved", "closed"].includes(i.status)).length;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        total,
        open,
        resolved,
        critical,
        slaMetPercent: total > 0 ? Math.round((resolved / Math.max(1, total)) * 100) : 100,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Needs Attention (Critical / High Priority Clusters) ────────────────────
router.get("/needs-attention", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issues = await prisma.issue.findMany({
      where: {
        priorityScore: { gte: 75 },
        status: { notIn: ["resolved", "closed"] },
      },
      orderBy: { priorityScore: "desc" },
      take: 10,
      include: {
        reporter: { select: { name: true } },
        department: { select: { name: true } },
        cluster: { select: { affectedCount: true, mergedCount: true } },
      },
    });

    res.json(issues);
  } catch (err) {
    next(err);
  }
});

// ── List Technicians ───────────────────────────────────────────────────────
router.get("/technicians", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: "technician" },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            assignedIssues: {
              where: { status: { notIn: ["resolved", "closed"] } },
            },
          },
        },
      },
    });

    res.json(
      technicians.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        department: t.department?.name,
        departmentId: t.department?.id,
        activeTasks: t._count.assignedIssues,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
