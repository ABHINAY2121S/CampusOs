import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../errors";

const router = Router();

router.use(authMiddleware);

// ── Student / User Dashboard Stats ────────────────────────────────────────
router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [
      myIssuesTotal,
      myIssuesOpen,
      myIssuesResolved,
      myAffectedCount,
      activeNoticesCount,
      upcomingEventsCount,
    ] = await Promise.all([
      prisma.issue.count({
        where: { reporterId: userId },
      }),
      prisma.issue.count({
        where: {
          reporterId: userId,
          status: { notIn: ["resolved", "closed"] },
        },
      }),
      prisma.issue.count({
        where: {
          reporterId: userId,
          status: { in: ["resolved", "closed"] },
        },
      }),
      prisma.issueAffected.count({
        where: { userId },
      }),
      prisma.notice.count({
        where: {
          publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.event.count({
        where: {
          date: { gte: new Date() },
        },
      }),
    ]);

    res.json({
      myIssuesTotal,
      myIssuesOpen,
      myIssuesResolved,
      myAffectedCount,
      activeNoticesCount,
      upcomingEventsCount,
    });
  } catch (err) {
    next(err);
  }
});

// ── User Activity (Reported & Affected issues) ────────────────────────────
router.get("/activity", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [reported, affected, followed] = await Promise.all([
      prisma.issue.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          displayId: true,
          title: true,
          category: true,
          status: true,
          priorityScore: true,
          createdAt: true,
        },
      }),
      prisma.issueAffected.findMany({
        where: { userId },
        take: 10,
        include: {
          issue: {
            select: {
              id: true,
              displayId: true,
              title: true,
              category: true,
              status: true,
              priorityScore: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.issueFollow.findMany({
        where: { userId },
        take: 10,
        include: {
          issue: {
            select: {
              id: true,
              displayId: true,
              title: true,
              category: true,
              status: true,
              priorityScore: true,
            },
          },
        },
      }),
    ]);

    res.json({
      reported,
      affected: affected.map((a) => a.issue),
      followed: followed.map((f) => f.issue),
    });
  } catch (err) {
    next(err);
  }
});

// ── Profile ───────────────────────────────────────────────────────────────
router.get("/profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department?.name,
      departmentId: user.departmentId,
      studentId: user.studentId,
      year: user.year,
      division: user.division,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, year, division } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name ? { name } : {}),
        ...(year ? { year } : {}),
        ...(division ? { division } : {}),
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
