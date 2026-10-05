import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors";

const JWT_SECRET = process.env.JWT_SECRET || "dev-campusos-jwt-secret-key-32chars";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "student" | "faculty" | "hod" | "admin" | "technician";
  name: string;
  departmentId?: string | null;
  studentId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Missing or invalid authorization header", 401, "UNAUTHORIZED"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId,
      studentId: user.studentId,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
