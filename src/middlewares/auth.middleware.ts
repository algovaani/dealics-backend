import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

function extractToken(req: Request): string | null {
	// Authorization header variants
	const rawAuthLower = req.headers["authorization"] as string | undefined;
	const rawAuthUpper = (req.headers as any)["Authorization"] as string | undefined;
	let headerStr: string | null = null;
	if (typeof rawAuthLower === "string" && rawAuthLower.trim()) headerStr = rawAuthLower;
	else if (typeof rawAuthUpper === "string" && rawAuthUpper.trim()) headerStr = rawAuthUpper;
	if (headerStr) {
		const parts = headerStr.trim().split(/\s+/);
		if (parts.length === 2 && /^Bearer$/i.test(parts[0] as string)) return (parts[1] as string).trim();
		// Sometimes clients send just the token
		if (parts.length === 1) return (parts[0] as string).trim();
	}

	// x-access-token header
	const xAccess = req.headers["x-access-token"] as string | string[] | undefined;
	if (typeof xAccess === "string" && xAccess.trim()) return xAccess.trim();
	if (Array.isArray(xAccess) && xAccess[0]) return xAccess[0].trim();

	// Cookie: token=...
	const cookieHeader = req.headers["cookie"] as string | undefined;
	if (typeof cookieHeader === "string" && cookieHeader) {
		const parts = cookieHeader.split(";").map((c: string) => c.trim());
		const found = parts.find((c) => c.startsWith("token="));
		if (found) return found.slice("token=".length);
	}

	return null;
}

export function userAuth(req: Request, res: Response, next: NextFunction) {
	const token = extractToken(req);
	if (!token) return sendApiResponse(res, 401, false, "Unauthorized", []);

	try {
		const secret = process.env.JWT_SECRET || "dev-secret-change";
		const payload = jwt.verify(token, secret) as any;
		// Attach user info to request and normalize id
		req.user = {
			...payload,
			id: (payload && (payload.user_id || payload.sub || payload.id)) ?? undefined,
		};
		return next();
	} catch (err: any) {
		if (err?.name === "TokenExpiredError") {
			return sendApiResponse(res, 403, false, "Token expired", []);
		}
		return sendApiResponse(res, 403, false, "Invalid or expired token", []);
	}
}
