import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: number;
				user_id?: number;
				sub?: number;
				first_name?: string;
				last_name?: string;
				email?: string;
				user_name?: string;
				user_role?: string;
			};
		}
	}
}

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export function adminAuth(req: Request, res: Response, next: NextFunction) {
	if (!req.user) return sendApiResponse(res, 401, false, "Unauthorized", []);
	if (req.user.user_role !== "admin")
		return sendApiResponse(res, 403, false, "Forbidden", []);
	next();
}