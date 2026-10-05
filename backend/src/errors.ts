import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 400,
    public code?: string
  ) {
    super(message);
  }
}

/** Central error handler – must be registered after all routes */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  // Zod validation errors
  if (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "ZodError"
  ) {
    return res.status(422).json({
      error: "Validation error",
      issues: (err as unknown as { errors: unknown[] }).errors,
    });
  }

  // Prisma unique constraint
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return res.status(409).json({ error: "Record already exists" });
  }

  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
}
