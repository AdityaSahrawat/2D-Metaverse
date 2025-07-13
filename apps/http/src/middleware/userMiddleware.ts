import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const jwt_Secret = "123"; // move to process.env.JWT_SECRET in real apps

export function UserMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return 
  }

  try {
    const decoded = jwt.verify(token, jwt_Secret) as { id: string };
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized: Invalid or expired token",
    });
    return ;
  }
}   