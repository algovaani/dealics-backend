import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User, CreditPurchaseLog } from "../models/index.js";
import { sequelize } from "../config/db.js";
import crypto from "crypto";

export class AuthService {
  // Helper function to generate invoice number and transaction ID
  private generateInvoiceAndTransactionId() {
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    
    const invoiceNumber = `INV${randomNum}${randomStr}`;
    const transactionId = `TXN${randomNum}${randomStr}`;
    
    return { invoiceNumber, transactionId };
  }

  async validateUser(identifier: string, password: string) {
    const foundUser = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!foundUser || !foundUser.password) return null;
    const ok = await bcrypt.compare(password, foundUser.password);
    if (!ok) return null;
    return foundUser;
  }

  issueToken(user: User) {
    const secret = process.env.JWT_SECRET || "dev-secret-change";
    return jwt.sign(
      {
        sub: user.id,
        user_id: user.id,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        email: user.email ?? null,
        user_name: user.username ?? null,
      },
      secret,
      { expiresIn: "7d" }
    );
  }

  async register(input: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    phone_number: string;
    password: string;
    country_code?: string;
    profile_image?: string;
  }) {
    // Basic validations mirroring Laravel rules
    if (!input.first_name?.trim()) throw new Error("Please enter your first name.");
    if (!input.last_name?.trim()) throw new Error("Please enter your last name.");
    if (!input.username?.trim()) throw new Error("Please enter your username.");
    if (!input.email?.trim()) throw new Error("Please enter your email address.");
    
    // Clean email and validate
    const cleanEmail = input.email.trim().toLowerCase();
    console.log('🔍 Email validation:', { original: input.email, cleaned: cleanEmail });
    
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      console.log('❌ Invalid email format:', cleanEmail);
      throw new Error("Please enter a valid email address.");
    }
    if (!input.phone_number?.trim()) throw new Error("Please enter your mobile number.");
    if (input.phone_number.length < 3) throw new Error("Mobile number must be at least 3 digits.");
    if (input.phone_number.length > 12) throw new Error("Mobile number should not exceed 12 digits.");

    // Uniqueness checks
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ email: input.email }, { username: input.username }],
      },
    });
    if (existing) {
      if (existing.email === input.email) throw new Error("This email is already registered.");
      if (existing.username === input.username) throw new Error("This username is already taken.");
    }

    const hashed = await bcrypt.hash(input.password, 10);

    return await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          first_name: input.first_name,
          last_name: input.last_name,
          username: input.username,
          email: input.email,
          country_code: input.country_code ?? null,
          profile_picture: input.profile_image ?? null,
          cxp_coins: 50,
          phone_number: input.phone_number,
          password: hashed,
          is_email_verified: "1",
          email_verified_at: new Date(),
          user_status: "1",
        } as any,
        { transaction: t }
      );

      // Add coin reward entry to CreditPurchaseLog
      const { invoiceNumber, transactionId } = this.generateInvoiceAndTransactionId();
      
      await CreditPurchaseLog.create({
        invoice_number: invoiceNumber,
        user_id: user.id,
        amount: 0,
        coins: 50, // reward coins
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
      } as any, { transaction: t });

      // Send welcome email after successful registration
      try {
        const { EmailHelperService } = await import("../services/emailHelper.service.js");
        await EmailHelperService.sendWelcomeOnboarding(
          user.email || '',
          user.first_name || '',
          user.last_name || ''
        );
        console.log('✅ Welcome email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      return user;
    });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return await User.findOne({
      where: { email: email }
    });
  }

  /**
   * Generate recovery token (simple without expiration for testing)
   */
  generateRecoveryToken(userId: number): string {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('hex');
  }

  /**
   * Update user with recovery token
   */
  async updateUserRecoveryToken(userId: number, token: string) {
    try {
      console.log('🔧 Updating recovery token for user ID:', userId);
      console.log('🔧 Token to save:', token);
      
      const result = await User.update(
        { recover_password_token: token },
        { where: { id: userId } }
      );
      
      console.log('🔧 Update result:', result);
      
      // Verify the token was saved
      const updatedUser = await User.findByPk(userId);
      console.log('🔧 Token in database after update:', updatedUser?.recover_password_token);
      
      return result;
    } catch (error) {
      console.error('❌ Error updating recovery token:', error);
      throw error;
    }
  }

  /**
   * Verify recovery token and get user
   */
  async verifyRecoveryToken(token: string) {
    try {
      console.log('🔍 Verifying token:', token);
      
      // Find user by token
      const user = await User.findOne({
        where: { 
          recover_password_token: token 
        }
      });

      console.log('🔍 User found:', user ? 'Yes' : 'No');

      if (!user) {
        console.log('❌ No user found with this token');
        return null;
      }

      // Check if token is not empty
      if (!user.recover_password_token || user.recover_password_token.trim() === '') {
        console.log('❌ Token is empty in database');
        return null;
      }

      console.log('✅ Token verified successfully');
      return user;
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return null;
    }
  }

  /**
   * Send forgot password email
   */
  async sendForgotPasswordEmail(user: User, resetLink: string): Promise<boolean> {
    try {
      const { EmailHelperService } = await import("../services/emailHelper.service.js");
      
      const name = this.setName(user.first_name || '', user.last_name || '');
      
      return await EmailHelperService.sendForgotPasswordEmail(
        user.email || '',
        resetLink,
        name,
        user.username || ''
      );
    } catch (error) {
      console.error('Error sending forgot password email:', error);
      return false;
    }
  }

  /**
   * Send simple forgot password email (without reset link)
   */
  async sendSimpleForgotPasswordEmail(user: User): Promise<boolean> {
    try {
      const { EmailHelperService } = await import("../services/emailHelper.service.js");
      
      const name = this.setName(user.first_name || '', user.last_name || '');
      
      const emailSent = await EmailHelperService.sendCustomEmail('reset-password-request', {
        to: user.email || '',
        name: name,
        username: user.username || ''
      });

      if (!emailSent) {
        console.error('Failed to send forgot password email to:', user.email);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending simple forgot password email:', error);
      return false;
    }
  }

  /**
   * Reset user password and clear recovery token
   */
  async resetUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await User.update(
        { 
          password: hashedPassword,
          recover_password_token: '' 
        },
        { where: { id: userId } }
      );

      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  /**
   * Helper method to set name
   */
  private setName(firstName: string, lastName: string): string {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    return 'User';
  }
}


