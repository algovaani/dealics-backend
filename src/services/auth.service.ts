import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User } from "../models/user.model.js";
import { sequelize } from "../config/db.js";

export class AuthService {
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
  }) {
    // Basic validations mirroring Laravel rules
    if (!input.first_name?.trim()) throw new Error("Please enter your first name.");
    if (!input.last_name?.trim()) throw new Error("Please enter your last name.");
    if (!input.username?.trim()) throw new Error("Please enter your username.");
    if (!input.email?.trim()) throw new Error("Please enter your email address.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("Please enter a valid email address.");
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
          cxp_coins: 50,
          phone_number: input.phone_number,
          password: hashed,
          is_email_verified: "1",
          email_verified_at: new Date(),
          user_status: "1",
        } as any,
        { transaction: t }
      );

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
   * Generate recovery token (equivalent to Laravel encrypt)
   */
  generateRecoveryToken(userId: number): string {
    const data = `${userId}|${new Date().toISOString()}`;
    const secret = process.env.JWT_SECRET || "dev-secret-change";
    return jwt.sign({ data }, secret, { expiresIn: "1h" });
  }

  /**
   * Update user with recovery token
   */
  async updateUserRecoveryToken(userId: number, token: string) {
    return await User.update(
      { recover_password_token: token },
      { where: { id: userId } }
    );
  }

  /**
   * Verify recovery token and get user
   */
  async verifyRecoveryToken(token: string) {
    try {
      const secret = process.env.JWT_SECRET || "dev-secret-change";
      const decoded = jwt.verify(token, secret) as any;
      
      if (!decoded || !decoded.data) {
        return null;
      }

      const [userId] = decoded.data.split('|');
      const user = await User.findOne({
        where: { 
          id: parseInt(userId),
          recover_password_token: token 
        }
      });

      return user;
    } catch (error) {
      console.error('Token verification error:', error);
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
      
      const emailSent = await EmailHelperService.sendCustomEmail('forgot-password-notification', {
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
          recover_password_token: undefined 
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


