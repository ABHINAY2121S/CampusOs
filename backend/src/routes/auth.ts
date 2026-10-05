import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { authMiddleware, generateToken } from "../middleware/auth";
import { AppError } from "../errors";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(4).max(100),
});

router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { department: true },
    });

    if (!user) {
      return next(new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return next(new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
      departmentId: user.departmentId,
      studentId: user.studentId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department?.name || null,
        studentId: user.studentId,
        year: user.year,
        division: user.division,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department?.name || null,
      departmentId: user.departmentId,
      studentId: user.studentId,
      year: user.year,
      division: user.division,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
