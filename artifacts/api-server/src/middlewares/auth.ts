import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthRequest extends Request {
  userId?: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function getToken(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const queryToken = req.query["access_token"] ?? req.query["token"];
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken;
  }

  return null;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
  return;
}
