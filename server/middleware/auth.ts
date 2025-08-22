import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "gi_registration_jwt_secret_key_2024";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role?: string;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

export function generateToken(user: {
  id: number;
  username: string;
  role?: string;
}) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "24h" });
}
