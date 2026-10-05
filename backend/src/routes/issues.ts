import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { AppError } from "../errors";
import { analyzeIssueText } from "../services/nlpClient";
import { findSimilarIssues } from "../services/similaritySearch";
import { calculatePriorityScore } from "../services/priorityEngine";
import { emitToUser, emitToRole, broadcast } from "../lib/socket";

const router = Router();

// ── Analyze route (plain text -> extracted entities + similar issues) ──────
const AnalyzeSchema = z.object({
  text: z.string().min(3),
});

router.post("/analyze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = AnalyzeSchema.parse(req.body);

    // 1. Analyze text via NLP service / fallback
    const analysis = await analyzeIssueText(text);

    // 2. Query for similar issues in last 14 days
    const similarIssues = await findSimilarIssues({
      embedding: analysis.embedding,
      building: analysis.building,
      room: analysis.room,
      threshold: 0.75,
      limit: 5,
    });

    res.json({
      category: analysis.category,
      building: analysis.building || null,
      room: analysis.room || null,
      asset: analysis.asset || null,
      urgency: analysis.urgency,
      confidence: analysis.confidence,
      embedding: analysis.embedding,
      similarIssues,
    });
  } catch (err) {
    next(err);
  }
});

// ── Create issue ──────────────────────────────────────────────────────────
const CreateIssueSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string().default("General"),
  building: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  asset: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "critical", "emergency"]).default("medium"),
  embedding: z.array(z.number()).optional().nullable(),
  clusterId: z.string().optional().nullable(),
});

router.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateIssueSchema.parse(req.body);
    const userId = req.user!.id;

    // Generate unique display ID: CO-XXXX
    const count = await prisma.issue.count();
    const displayId = `CO-${(2000 + count + 1).toString()}`;

    // Calculate initial priority score
    const priorityResult = calculatePriorityScore({
      affectedCount: 1,
      urgency: body.urgency,
      createdAt: new Date(),
      room: body.room,
      building: body.building,
      mergedCount: 1,
    });

    const issue = await prisma.issue.create({
      data: {
        displayId,
        title: body.title,
        description: body.description,
        category: body.category,
        building: body.building,
        room: body.room,
        asset: body.asset,
        urgency: body.urgency,
        status: "reported",
        priorityScore: priorityResult.score,
        priorityBreakdown: priorityResult.breakdown as any,
        clusterId: body.clusterId || null,
        reporterId: userId,
        events: {
          create: {
            actor: req.user!.name,
            type: "reported",
            payload: { message: "Issue submitted by student" },
          },
        },
        affectedUsers: {
          create: {
            userId,
          },
        },
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        events: true,
      },
    });

    // Create cluster if not part of one
    if (!body.clusterId) {
      const cluster = await prisma.issueCluster.create({
        data: {
          canonicalIssueId: issue.id,
          affectedCount: 1,
          mergedCount: 1,
        },
      });
      await prisma.issue.update({
        where: { id: issue.id },
        data: { clusterId: cluster.id },
      });
    }

    if (body.embedding && body.embedding.length > 0) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Issue" SET embedding = '[${body.embedding.join(",")}]'::vector WHERE id = '${issue.id}'`
        );
      } catch {
        // ponytail: safe fallback if pgvector extension not present in dev DB
      }
    }

    broadcast("issue:created", { issueId: issue.id, displayId: issue.displayId, title: issue.title });
    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
});

// ── List issues (paginated with filters) ──────────────────────────────────
router.get("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      category,
      priority,
      search,
      departmentId,
      my,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category && category !== "All") {
      where.category = category;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (my === "true") {
      where.reporterId = req.user!.id;
    }

    if (priority) {
      // High >= 75 / Medium 40-74 / Low < 40
      if (priority.toLowerCase() === "high") {
        where.priorityScore = { gte: 75 };
      } else if (priority.toLowerCase() === "medium") {
        where.priorityScore = { gte: 40, lt: 75 };
      } else if (priority.toLowerCase() === "low") {
        where.priorityScore = { lt: 40 };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { displayId: { contains: search, mode: "insensitive" } },
        { room: { contains: search, mode: "insensitive" } },
        { building: { contains: search, mode: "insensitive" } },
      ];
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take,
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
        include: {
          reporter: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, code: true } },
          cluster: { select: { id: true, affectedCount: true, mergedCount: true } },
          _count: { select: { comments: true, affectedUsers: true } },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      issues,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Get single issue ──────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ id }, { displayId: id }],
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, studentId: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
        cluster: {
          include: {
            issues: {
              select: { id: true, displayId: true, title: true, createdAt: true, status: true },
            },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
        affectedUsers: {
          where: { userId },
          select: { userId: true },
        },
        followers: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { affectedUsers: true, followers: true },
        },
      },
    });

    if (!issue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    res.json({
      ...issue,
      isAffected: issue.affectedUsers.length > 0,
      isFollowing: issue.followers.length > 0,
      affectedCount: issue._count.affectedUsers,
    });
  } catch (err) {
    next(err);
  }
});

// ── Idempotent "I'm affected too" ─────────────────────────────────────────
router.post("/:id/affected", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
      include: { cluster: true },
    });

    if (!issue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    // Upsert affected record
    await prisma.issueAffected.upsert({
      where: {
        issueId_userId: { issueId: issue.id, userId },
      },
      create: { issueId: issue.id, userId },
      update: {},
    });

    const affectedCount = await prisma.issueAffected.count({
      where: { issueId: issue.id },
    });

    // Update cluster affected count if part of cluster
    let mergedCount = 1;
    if (issue.clusterId) {
      const cluster = await prisma.issueCluster.update({
        where: { id: issue.clusterId },
        data: { affectedCount },
      });
      mergedCount = cluster.mergedCount;
    }

    // Recalculate transparent priority score
    const updatedPriority = calculatePriorityScore({
      affectedCount,
      urgency: issue.urgency || "medium",
      createdAt: issue.createdAt,
      room: issue.room,
      building: issue.building,
      mergedCount,
    });

    const updatedIssue = await prisma.issue.update({
      where: { id: issue.id },
      data: {
        priorityScore: updatedPriority.score,
        priorityBreakdown: updatedPriority.breakdown as any,
      },
    });

    // Add event log
    await prisma.issueEvent.create({
      data: {
        issueId: issue.id,
        actor: req.user!.name,
        type: "affected_added",
        payload: { affectedCount, newScore: updatedPriority.score },
      },
    });

    broadcast("issue:updated", {
      issueId: issue.id,
      priorityScore: updatedPriority.score,
      affectedCount,
    });

    res.json({
      success: true,
      affectedCount,
      priorityScore: updatedPriority.score,
      priorityBreakdown: updatedPriority.breakdown,
    });
  } catch (err) {
    next(err);
  }
});

// ── Toggle follow issue ───────────────────────────────────────────────────
router.post("/:id/follow", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
    });

    if (!issue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    const existing = await prisma.issueFollow.findUnique({
      where: { issueId_userId: { issueId: issue.id, userId } },
    });

    if (existing) {
      await prisma.issueFollow.delete({
        where: { issueId_userId: { issueId: issue.id, userId } },
      });
      res.json({ following: false });
    } else {
      await prisma.issueFollow.create({
        data: { issueId: issue.id, userId },
      });
      res.json({ following: true });
    }
  } catch (err) {
    next(err);
  }
});

// ── Merge duplicate issue into cluster ────────────────────────────────────
router.post("/:id/merge", authMiddleware, requireRole("admin", "hod"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { targetIssueId } = req.body;

    if (!targetIssueId) {
      return next(new AppError("targetIssueId is required", 400));
    }

    const [sourceIssue, targetIssue] = await Promise.all([
      prisma.issue.findUnique({ where: { id } }),
      prisma.issue.findUnique({ where: { id: targetIssueId }, include: { cluster: true } }),
    ]);

    if (!sourceIssue || !targetIssue) {
      return next(new AppError("One or both issues not found", 404));
    }

    let clusterId = targetIssue.clusterId;
    if (!clusterId) {
      const cluster = await prisma.issueCluster.create({
        data: {
          canonicalIssueId: targetIssue.id,
          affectedCount: 1,
          mergedCount: 1,
        },
      });
      clusterId = cluster.id;
      await prisma.issue.update({
        where: { id: targetIssue.id },
        data: { clusterId },
      });
    }

    // Increment cluster mergedCount
    const cluster = await prisma.issueCluster.update({
      where: { id: clusterId },
      data: {
        mergedCount: { increment: 1 },
      },
    });

    // Mark source issue as duplicate / closed
    await prisma.issue.update({
      where: { id: sourceIssue.id },
      data: {
        status: "closed",
        clusterId,
      },
    });

    // Recalculate target priority score with new duplicate count
    const affectedCount = await prisma.issueAffected.count({
      where: { issueId: targetIssue.id },
    });

    const newPriority = calculatePriorityScore({
      affectedCount: Math.max(1, affectedCount),
      urgency: targetIssue.urgency || "medium",
      createdAt: targetIssue.createdAt,
      room: targetIssue.room,
      building: targetIssue.building,
      mergedCount: cluster.mergedCount,
    });

    await prisma.issue.update({
      where: { id: targetIssue.id },
      data: {
        priorityScore: newPriority.score,
        priorityBreakdown: newPriority.breakdown as any,
      },
    });

    await prisma.issueEvent.create({
      data: {
        issueId: targetIssue.id,
        actor: req.user!.name,
        type: "merged",
        payload: {
          mergedIssueId: sourceIssue.id,
          mergedDisplayId: sourceIssue.displayId,
          newMergedCount: cluster.mergedCount,
          newPriorityScore: newPriority.score,
        },
      },
    });

    broadcast("issue:updated", {
      issueId: targetIssue.id,
      priorityScore: newPriority.score,
    });

    res.json({
      success: true,
      canonicalIssueId: targetIssue.id,
      mergedCount: cluster.mergedCount,
      priorityScore: newPriority.score,
    });
  } catch (err) {
    next(err);
  }
});

// ── Assign issue to department & technician ──────────────────────────────
router.patch("/:id/assign", authMiddleware, requireRole("admin", "hod"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { departmentId, assigneeId } = req.body;

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        departmentId: departmentId || undefined,
        assigneeId: assigneeId || undefined,
        status: "assigned",
      },
      include: {
        assignee: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await prisma.issueEvent.create({
      data: {
        issueId: issue.id,
        actor: req.user!.name,
        type: "assigned",
        payload: {
          department: issue.department?.name,
          assignee: issue.assignee?.name,
        },
      },
    });

    if (assigneeId) {
      emitToUser(assigneeId, "issue:assigned", { issueId: issue.id, displayId: issue.displayId });
    }

    // Persist and emit notifications to reporter and followers
    const assignFollowers = await prisma.issueFollow.findMany({
      where: { issueId: issue.id },
      select: { userId: true },
    });
    const assignRecipients = Array.from(new Set([issue.reporterId, ...assignFollowers.map((f) => f.userId)]));
    for (const rId of assignRecipients) {
      await prisma.notification.create({
        data: {
          userId: rId,
          type: "issue_assigned",
          title: `Technician assigned to ${issue.displayId}`,
          body: `${issue.assignee?.name || "Technician"} has been assigned to work on this issue.`,
          payload: { issueId: issue.id },
        },
      }).catch(() => {});
      emitToUser(rId, "notification:new", {
        title: `Technician assigned to ${issue.displayId}`,
        body: `${issue.assignee?.name || "Technician"} has been assigned to work on this issue.`,
        issueId: issue.id,
      });
    }

    broadcast("issue:updated", { issueId: issue.id, status: issue.status });

    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// ── Update issue status ──────────────────────────────────────────────────
router.patch("/:id/status", authMiddleware, requireRole("admin", "hod", "technician"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["reported", "ai_classified", "assigned", "technician_accepted", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return next(new AppError(`Invalid status: ${status}`, 400));
    }

    const existingIssue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
    });
    if (!existingIssue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    // RBAC: technician can only update issues assigned to them or their department
    if (req.user!.role === "technician") {
      const isAssignedToUser = existingIssue.assigneeId === req.user!.id;
      const isAssignedToDept = Boolean(existingIssue.departmentId && req.user!.departmentId && existingIssue.departmentId === req.user!.departmentId);
      if (!isAssignedToUser && !isAssignedToDept) {
        return next(new AppError("You can only update issues assigned to you or your department", 403, "FORBIDDEN"));
      }
    }

    const updateData: any = { status };
    if (status === "resolved") {
      updateData.resolvedAt = new Date();
    }

    const issue = await prisma.issue.update({
      where: { id: existingIssue.id },
      data: updateData,
    });

    await prisma.issueEvent.create({
      data: {
        issueId: issue.id,
        actor: req.user!.name,
        type: `status_${status}`,
        payload: { newStatus: status },
      },
    });

    // Notify reporter and all followers
    const statusFollowers = await prisma.issueFollow.findMany({
      where: { issueId: issue.id },
      select: { userId: true },
    });
    const statusRecipients = Array.from(new Set([issue.reporterId, ...statusFollowers.map((f) => f.userId)]));
    for (const rId of statusRecipients) {
      await prisma.notification.create({
        data: {
          userId: rId,
          type: "issue_update",
          title: `Issue ${issue.displayId} status updated`,
          body: `Status is now: ${status.replace("_", " ")}`,
          payload: { issueId: issue.id, status },
        },
      }).catch(() => {});
      emitToUser(rId, "notification:new", {
        title: `Issue ${issue.displayId} status updated`,
        body: `Status is now: ${status.replace("_", " ")}`,
        issueId: issue.id,
      });
    }

    broadcast("issue:updated", { issueId: issue.id, status });
    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// ── Add comment to issue ──────────────────────────────────────────────────
router.post("/:id/comments", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body || typeof body !== "string" || !body.trim()) {
      return next(new AppError("Comment body is required", 400));
    }
    const cleanBody = body.trim();
    if (cleanBody.length > 2000) {
      return next(new AppError("Comment exceeds maximum length of 2000 characters", 400));
    }

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
      select: { id: true, displayId: true, reporterId: true },
    });
    if (!issue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    const comment = await prisma.comment.create({
      data: {
        issueId: issue.id,
        authorId: req.user!.id,
        body: cleanBody,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.issueEvent.create({
      data: {
        issueId: issue.id,
        actor: req.user!.name,
        type: "comment_added",
        payload: { commentId: comment.id },
      },
    });

    broadcast("issue:comment", { issueId: issue.id, comment });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// ── Confirm resolution (by student or admin) ───────────────────────────────
router.post("/:id/confirm-resolution", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
    });
    if (!issue) {
      return next(new AppError("Issue not found", 404, "NOT_FOUND"));
    }

    // Permission check: only reporter or admin/HOD can confirm resolution
    if (issue.reporterId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "hod") {
      return next(new AppError("Only the reporter or an administrator can confirm resolution", 403, "FORBIDDEN"));
    }

    const updated = await prisma.issue.update({
      where: { id: issue.id },
      data: { status: "closed" },
    });

    await prisma.issueEvent.create({
      data: {
        issueId: issue.id,
        actor: req.user!.name,
        type: "confirmed_closed",
        payload: { message: "Resolution confirmed by student" },
      },
    });

    broadcast("issue:updated", { issueId: issue.id, status: "closed" });
    res.json({ success: true, status: "closed" });
  } catch (err) {
    next(err);
  }
});

export default router;
