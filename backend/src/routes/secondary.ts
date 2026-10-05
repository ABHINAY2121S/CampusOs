import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../errors";

const router = Router();
router.use(authMiddleware);

// ── Notices ───────────────────────────────────────────────────────────────
router.get("/notices", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: [{ important: "desc" }, { publishedAt: "desc" }],
    });
    res.json(notices);
  } catch (err) {
    next(err);
  }
});

// ── Events ────────────────────────────────────────────────────────────────
router.get("/events", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: {
        registrations: {
          where: { userId },
          select: { userId: true },
        },
        _count: { select: { registrations: true } },
      },
    });

    res.json(
      events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        venue: e.venue,
        attendeeCount: e._count.registrations,
        isRegistered: e.registrations.length > 0,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      create: { eventId: id, userId },
      update: {},
    });

    res.json({ success: true, registered: true });
  } catch (err) {
    next(err);
  }
});

// ── Lost & Found ──────────────────────────────────────────────────────────
router.get("/lost-found", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.lostFoundItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/lost-found", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, title, description, location } = req.body;
    const item = await prisma.lostFoundItem.create({
      data: {
        type: type || "found",
        title,
        description,
        location,
        reporterId: req.user!.id,
        status: "open",
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// ── Services Directory ────────────────────────────────────────────────────
router.get("/services", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { category: "asc" },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// ── Schemes & Scholarships ────────────────────────────────────────────────
router.get("/schemes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const schemes = await prisma.scheme.findMany({
      include: {
        savedBy: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    res.json(
      schemes.map((s) => ({
        ...s,
        isSaved: s.savedBy.length > 0,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post("/schemes/:id/save", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.savedItem.findUnique({
      where: { userId_schemeId: { userId, schemeId: id } },
    });

    if (existing) {
      await prisma.savedItem.delete({
        where: { userId_schemeId: { userId, schemeId: id } },
      });
      res.json({ saved: false });
    } else {
      await prisma.savedItem.create({
        data: { userId, schemeId: id },
      });
      res.json({ saved: true });
    }
  } catch (err) {
    next(err);
  }
});

// ── Notifications ─────────────────────────────────────────────────────────
router.get("/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.post("/notifications/mark-read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: req.user!.id },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id },
        data: { read: true },
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user!.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Campus AI Assistant ───────────────────────────────────────────────────
router.post("/assistant/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return next(new AppError("Question is required", 400));
    }

    const q = question.toLowerCase();
    // Rule-based campus assistant with context from db
    let answer =
      "I can help you navigate Campus OS. You can report infrastructure issues, check examination notices, apply for scholarships, or find lost items across campus.";
    const sources: string[] = [];

    if (/issue|complaint|broken|repair|projector|wifi|tap|water|light|fan/i.test(q)) {
      answer =
        "To report an issue, navigate to the 'Report Issue' tab. Our AI will automatically detect the category, location, and equipment, and check for duplicates to increase resolution priority!";
      sources.push("Campus Issue Resolution Policy");
    } else if (/scholarship|scheme|fee|aid|financial/i.test(q)) {
      const schemes = await prisma.scheme.findMany({ take: 2 });
      if (schemes.length > 0) {
        answer = `We have active scholarship schemes available such as "${schemes[0].title}". You can check eligibility and deadlines under the Schemes section.`;
        sources.push(...schemes.map((s) => s.title));
      }
    } else if (/notice|exam|circular|holiday|timetable/i.test(q)) {
      const notices = await prisma.notice.findMany({ take: 2, orderBy: { publishedAt: "desc" } });
      if (notices.length > 0) {
        answer = `Recent announcements: "${notices[0].title}". Check the Notices board for official circulars and full circular texts.`;
        sources.push(...notices.map((n) => n.title));
      }
    } else if (/lost|found|wallet|id card|bottle|bag/i.test(q)) {
      answer =
        "If you lost or found something, visit the Lost & Found desk in the student center or submit a report in the Lost & Found section.";
      sources.push("Campus Security Desk");
    }

    res.json({
      answer,
      sources,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
