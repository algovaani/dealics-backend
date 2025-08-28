import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: any;
		}
	}
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
	if (!req.user) return res.status(401).json({ message: "Unauthorized" });
	if (req.user.user_role !== "admin")
		return res.status(403).json({ message: "Forbidden" });
	next();
}