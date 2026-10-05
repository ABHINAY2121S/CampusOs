import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Access denied: insufficient permissions", 403, "FORBIDDEN"));
    }
    next();
  };
}
