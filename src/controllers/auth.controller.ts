import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return sendApiResponse(res, 400, false, "Email/username and password are required", []);
    }
    
    const user = await authService.validateUser(identifier, password);
    if (!user) {
      return sendApiResponse(res, 401, false, "Invalid credentials", []);
    }
    
    const token = authService.issueToken(user);
    return sendApiResponse(res, 200, true, "Login successful", [{ token, user }]);
  } catch (error: any) {
    console.error("Login error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.register(req.body);
    const token = authService.issueToken(user);
    return sendApiResponse(res, 201, true, "Registration successful", [{ token, user }]);
  } catch (err: any) {
    console.error("Registration error:", err);
    return sendApiResponse(res, 400, false, err.message ?? "Registration failed", []);
  }
};


