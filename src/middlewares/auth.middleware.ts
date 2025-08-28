import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function userAuth(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) return res.status(401).json({ message: "Unauthorized" });

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET!);
		// Attach user info to request
		req.user = payload;
		next();
	} catch (err) {
		return res.status(403).json({ message: "Invalid or expired token" });
	}
}
