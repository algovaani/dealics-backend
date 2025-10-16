import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { User, CreditPurchaseLog } from "../models/index.js";
import { EmailHelperService } from "../services/emailHelper.service.js";
import bcrypt from "bcryptjs";

const authService = new AuthService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

/**
 * Send password reset success email
 * Based on Laravel requirements
 */
const sendPasswordResetSuccessEmail = async (user: any): Promise<void> => {
  try {
    // Validate required parameters
    if (!user || !user.email) {
      console.warn('⚠️ Missing user data for password reset success email:', {
        user: !!user,
        email: !!user?.email
      });
      return;
    }

    // Prepare email data based on Laravel requirements
    const mailInputs = {
      to: user.email,
      name: EmailHelperService.setName(user.first_name || '', user.last_name || ''),
      username: user.username || user.email,
      yourprofilelink: `${process.env.FRONTEND_URL}/profile`
    };

    // Send email using EmailHelperService
    await EmailHelperService.executeMailSender('password-reset -successfully', mailInputs);

  } catch (emailError) {
    console.error('❌ Failed to send password reset success email:', emailError);
    // Don't throw error to avoid breaking the main operation
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return sendApiResponse(res, 400, false, "Email/username and password are required", []);
    }
    
    const user = await authService.validateUser(identifier, password);
    if (!user) {
      // If no user matched credentials, check if account exists at all
      const exists = await authService.findUserByIdentifier(identifier);
      if (!exists) {
        return sendApiResponse(res, 404, false, "No account was found. Please register to proceed.", []);
      }
      return sendApiResponse(res, 401, false, "Invalid credentials", []);
    }
    
    const token = authService.issueToken(user);
    return sendApiResponse(res, 200, true, "Login successful", [{ token }]);
  } catch (error: any) {
    console.error("Login error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    // Handle profile image upload - save only filename
    let profileImageName = '';
    if (req.file) {
      profileImageName = req.file.filename; // Save only filename, not full URL
    }

    // Prepare registration data
    const registrationData = {
      ...req.body,
      cxp_coins:50,
      profile_image: profileImageName
    };

    const user = await authService.register(registrationData);
    const token = authService.issueToken(user);
    return sendApiResponse(res, 201, true, "Registration successful", [{ token }]);
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
    const { email, resetLink } = req.body;

    // Validation
    if (!email) {
      return sendApiResponse(res, 400, false, "Please enter email.", []);
    }

    if (!resetLink) {
      return sendApiResponse(res, 400, false, "Reset link is required.", []);
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

    // Generate recovery token and update user
    const token = authService.generateRecoveryToken(user.id);
    await authService.updateUserRecoveryToken(user.id, token);

    // Create reset link with token and screen parameter
    const resetLinkWithToken = `${resetLink}?token=${token}&screen=forgot`;

    // Send email with reset link
    const emailSent = await authService.sendForgotPasswordEmail(user, resetLinkWithToken);
    
    if (!emailSent) {
      return sendApiResponse(res, 500, false, "Email not sent. Please try again later or contact support.", []);
    }

    // Mask email for response
    const maskEmail = (email: string) => {
      if (!email || typeof email !== 'string') return '';
      const parts = email.split('@');
      if (parts.length !== 2) return '';
      const [name = '', domain = ''] = parts;
      const namePart = name.substring(0, 3) + '*'.repeat(Math.max(0, (name?.length ?? 0) - 3));
      return namePart + '@' + domain;
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

    // Send password reset success email
    await sendPasswordResetSuccessEmail(user);

    return sendApiResponse(res, 200, true, "Password reset successfully. You can now login with your new password.", []);

  } catch (error: any) {
    console.error("Reset password error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};


// POST /api/auth/social-register
// Accepts payload directly from frontend (no Google HTTP call)
// {
//   id: "google",
//   email: string,
//   firstName: string,
//   lastName: string,
//   contactNumber: string,
//   countryCode: string,
//   profile_picture: string
// }
export const socialRegister = async (req: Request, res: Response) => {
  try {
    const {
      id,
      email,
      firstName,
      lastName,
      contactNumber,
      countryCode,
      profile_picture
    } = req.body || {};

    if (!email) {
      return sendApiResponse(res, 400, false, "Email is required", []);
    }

    const provider = (id || '').toString(); // e.g., "google"
    const cleanEmail = String(email).trim().toLowerCase();
    const givenFirst = String(firstName || '').trim();
    const givenLast = String(lastName || '').trim();

    // Find by email
    let user = await authService.findUserByEmail(cleanEmail);
    let isNewUser = false;
    if (!user) {
      const randomPassword = await bcrypt.hash(String(Math.floor(100000 + Math.random() * 900000)), 10);
      user = await User.create({
        first_name: givenFirst || cleanEmail.split('@')[0],
        last_name: givenLast || null,
        email: cleanEmail,
        phone_number: contactNumber || null,
        country_code: countryCode || null,
        profile_picture: profile_picture || null,
        gmail_login: provider === 'google',
        is_email_verified: "1",
        email_verified_at: new Date(),
        user_role: "user",
        user_status: "1",
        cxp_coins: 50,
        password: randomPassword
      } as any);
      // Ensure a username exists
      const baseName = (givenFirst || cleanEmail.split('@')[0] || 'user').replace(/\s+/g, '');
      await user.update({ username: `${baseName}${user.id}` } as any);
      isNewUser = true;
    } else {
      // Existing user: do NOT overwrite profile_picture from social payload
      await user.update({
        first_name: user.first_name || givenFirst || cleanEmail.split('@')[0],
        last_name: user.last_name || givenLast || null,
        phone_number: contactNumber ?? user.phone_number ?? null,
        country_code: countryCode ?? user.country_code ?? null,
        // profile_picture unchanged intentionally
        gmail_login: provider === 'google' ? true : user.gmail_login,
        is_email_verified: "1",
        email_verified_at: new Date(),
        user_status: "1"
      } as any);
      if (!user.username) {
        const baseName = (givenFirst || cleanEmail.split('@')[0] || 'user').replace(/\s+/g, '');
        await user.update({ username: `${baseName}${user.id}` } as any);
      }
    }

    // Reward coins for new social register (mirror normal register)
    if (isNewUser) {
      const rand = Math.floor(Math.random() * 900) + 100;
      const randStr = Math.random().toString(36).substring(2, 5).toUpperCase();
      const invoiceNumber = `INV${rand}${randStr}`;
      const transactionId = `TXN${rand}${randStr}`;

      try {
        await CreditPurchaseLog.create({
          invoice_number: invoiceNumber,
          user_id: (user as any).id,
          amount: 0,
          coins: 50,
          transaction_id: transactionId,
          payment_status: "Success",
          payee_email_address: "Reward",
          merchant_id: "N/A",
          payment_source: "Reward",
          payer_id: "N/A",
          payer_full_name: "N/A",
          payer_email_address: "N/A",
          payer_address: "N/A",
          payer_country_code: "N/A"
        } as any);
      } catch (e) {
        console.error('Failed to record reward coins for social register:', e);
      }
    }

    const jwtToken = authService.issueToken(user);
    return sendApiResponse(res, 200, true, "Login successful", [{ token: jwtToken }]);
  } catch (e: any) {
    console.error('Social register error:', e);
    return sendApiResponse(res, 500, false, "Server error", []);
  }
};


