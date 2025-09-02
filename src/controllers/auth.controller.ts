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

/**
 * Forgot Password API (equivalent to Laravel recovery_password1)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return sendApiResponse(res, 400, false, "Please enter email.", []);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendApiResponse(res, 400, false, "Please enter a valid email address", []);
    }

    // Find user by email
    const user = await authService.findUserByEmail(email);
    
    if (!user) {
      return sendApiResponse(res, 404, false, "Email not found in our records. Please create an account", []);
    }

    // Send simple email notification (frontend will handle reset link)
    const emailSent = await authService.sendSimpleForgotPasswordEmail(user);
    
    if (!emailSent) {
      return sendApiResponse(res, 500, false, "Email not sent. Please try again later or contact support.", []);
    }

    // Mask email for response
    const maskEmail = (email: string) => {
      const parts = email.split('@');
      const namePart = parts[0].substring(0, 3) + '*'.repeat(Math.max(0, parts[0].length - 3));
      return namePart + '@' + parts[1];
    };
    
    const maskedEmail = maskEmail(email);
    
    return sendApiResponse(res, 200, true, `Password reset instructions have been sent to ${maskedEmail}. Please check your email.`, []);

  } catch (error: any) {
    console.error("Forgot password error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Reset Password API (called by frontend after user clicks email link)
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;

    // Validation
    if (!token || !new_password) {
      return sendApiResponse(res, 400, false, "Token and new password are required", []);
    }

    if (new_password.length < 6) {
      return sendApiResponse(res, 400, false, "Password must be at least 6 characters long", []);
    }

    // Verify token and get user
    const user = await authService.verifyRecoveryToken(token);
    
    if (!user) {
      return sendApiResponse(res, 400, false, "Invalid or expired reset token", []);
    }

    // Update password and clear token
    const success = await authService.resetUserPassword(user.id, new_password);
    
    if (!success) {
      return sendApiResponse(res, 500, false, "Failed to reset password", []);
    }

    return sendApiResponse(res, 200, true, "Password reset successfully. You can now login with your new password.", []);

  } catch (error: any) {
    console.error("Reset password error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};


