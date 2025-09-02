import { Request, Response } from "express";
import { EmailHelperService } from "../services/emailHelper.service.js";
import { EmailTemplete } from "../models/emailTemplate.model.js";
import { Setting } from "../models/setting.model.js";
import { MailQueue } from "../models/mailQueue.model.js";

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

/**
 * Send email using template alias
 * POST /api/email/send
 */
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { alias, data } = req.body;

    if (!alias || !data) {
      return sendApiResponse(res, 400, false, "Template alias and data are required", []);
    }

    if (!data.to) {
      return sendApiResponse(res, 400, false, "Recipient email (to) is required", []);
    }

    const success = await EmailHelperService.executeMailSender(alias, data);

    if (success) {
      return sendApiResponse(res, 200, true, "Email sent successfully", []);
    } else {
      return sendApiResponse(res, 500, false, "Failed to send email", []);
    }

  } catch (error: any) {
    console.error("Error sending email:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Send welcome onboarding email (equivalent to Laravel example)
 * POST /api/email/welcome-onboarding
 */
export const sendWelcomeOnboardingEmail = async (req: Request, res: Response) => {
  try {
    const { email, first_name, last_name } = req.body;

    if (!email || !first_name || !last_name) {
      return sendApiResponse(res, 400, false, "Email, first name, and last name are required", []);
    }

    const mailInputs = {
      to: email,
      name: EmailHelperService.setName(first_name, last_name),
      addProductLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/add-product`,
      myAddressesLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-addresses`,
      yourprofilelink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
      editProfileLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/edit-profile`,
      payPalBusinessEmailLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/paypal-business-account`,
      buyCoinsLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/buy-els-coins`,
      loginLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    };

    const success = await EmailHelperService.executeMailSender('welcome-onboarding-guide', mailInputs);

    if (success) {
      return sendApiResponse(res, 200, true, "Welcome onboarding email sent successfully", []);
    } else {
      return sendApiResponse(res, 500, false, "Failed to send welcome onboarding email", []);
    }

  } catch (error: any) {
    console.error("Error sending welcome onboarding email:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Get email template by alias
 * GET /api/email/template/:alias
 */
export const getEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { alias } = req.params;

    if (!alias) {
      return sendApiResponse(res, 400, false, "Template alias is required", []);
    }

    const template = await EmailHelperService.getEmailTemplate(alias);

    if (!template) {
      return sendApiResponse(res, 404, false, "Email template not found", []);
    }

    return sendApiResponse(res, 200, true, "Email template retrieved successfully", [template]);

  } catch (error: any) {
    console.error("Error getting email template:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

  /**
   * Create or update email template
   * POST /api/email/template
   */
  export const createOrUpdateEmailTemplate = async (req: Request, res: Response) => {
    try {
      const templateData = req.body;

      if (!templateData.alias || !templateData.email_subject || !templateData.email_description) {
        return sendApiResponse(res, 400, false, "Alias, email_subject, and email_description are required", []);
      }

      const template = await EmailHelperService.createOrUpdateTemplate(templateData);

      return sendApiResponse(res, 200, true, "Email template saved successfully", [template]);

    } catch (error: any) {
      console.error("Error creating/updating email template:", error);
      return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
  };

  /**
   * Get all email templates
   * GET /api/email/templates
   */
  export const getAllEmailTemplates = async (req: Request, res: Response) => {
    try {
      const templates = await EmailTemplete.findAll({
        order: [['alias', 'ASC']]
      });

      return sendApiResponse(res, 200, true, "Email templates retrieved successfully", templates);

    } catch (error: any) {
      console.error("Error getting email templates:", error);
      return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
  };

  /**
   * Delete email template
   * DELETE /api/email/template/:id
   */
  export const deleteEmailTemplate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return sendApiResponse(res, 400, false, "Valid template ID is required", []);
      }

      const template = await EmailTemplete.findByPk(parseInt(id));

      if (!template) {
        return sendApiResponse(res, 404, false, "Email template not found", []);
      }

      await template.destroy();

      return sendApiResponse(res, 200, true, "Email template deleted successfully", []);

    } catch (error: any) {
      console.error("Error deleting email template:", error);
      return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
  };

/**
 * Process mail queue manually
 * POST /api/email/process-queue
 */
export const processMailQueue = async (req: Request, res: Response) => {
  try {
    await EmailHelperService.processMailQueue();

    return sendApiResponse(res, 200, true, "Mail queue processed successfully", []);

  } catch (error: any) {
    console.error("Error processing mail queue:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

  /**
   * Get mail queue status
   * GET /api/email/queue-status
   */
  export const getMailQueueStatus = async (req: Request, res: Response) => {
    try {
      const totalPending = await MailQueue.count({
        where: { status: 0 } // 0 = pending
      });

      const totalProcessed = await MailQueue.count({
        where: { status: 1 } // 1 = not send (processed)
      });

      const status = {
        totalPending,
        totalProcessed
      };

      return sendApiResponse(res, 200, true, "Mail queue status retrieved successfully", [status]);

    } catch (error: any) {
      console.error("Error getting mail queue status:", error);
      return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
  };

/**
 * Unified Email API - Send any type of email
 * POST /api/email/send-unified
 */
export const sendUnifiedEmail = async (req: Request, res: Response) => {
  try {
    const { 
      type, 
      email, 
      name, 
      firstName, 
      lastName,
      data 
    } = req.body;

    if (!email || !type) {
      return sendApiResponse(res, 400, false, "Email and type are required", []);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendApiResponse(res, 400, false, "Please enter a valid email address");
    }

    let success = false;
    let message = "";

    switch (type) {
      case 'verification':
        if (!data?.verifyLink) {
          return sendApiResponse(res, 400, false, "verifyLink is required for verification email", []);
        }
        success = await EmailHelperService.sendEmailVerification(email, data.verifyLink, name);
        message = "Verification email sent successfully";
        break;

      case 'welcome':
        if (!firstName || !lastName) {
          return sendApiResponse(res, 400, false, "firstName and lastName are required for welcome email", []);
        }
        success = await EmailHelperService.sendWelcomeOnboarding(email, firstName, lastName);
        message = "Welcome email sent successfully";
        break;

      case 'password-reset':
        if (!data?.resetLink) {
          return sendApiResponse(res, 400, false, "resetLink is required for password reset email", []);
        }
        success = await EmailHelperService.sendPasswordReset(email, data.resetLink, name);
        message = "Password reset email sent successfully";
        break;

      case 'forgot-password':
        if (!data?.resetLink) {
          return sendApiResponse(res, 400, false, "resetLink is required for forgot password email", []);
        }
        success = await EmailHelperService.sendForgotPasswordEmail(email, data.resetLink, name, data?.username);
        message = "Forgot password email sent successfully";
        break;

      case 'order-confirmation':
        if (!data?.orderData) {
          return sendApiResponse(res, 400, false, "orderData is required for order confirmation email", []);
        }
        success = await EmailHelperService.sendOrderConfirmation(email, data.orderData, name);
        message = "Order confirmation email sent successfully";
        break;

      case 'account-activation':
        if (!data?.activationLink) {
          return sendApiResponse(res, 400, false, "activationLink is required for account activation email", []);
        }
        success = await EmailHelperService.sendAccountActivation(email, data.activationLink, name);
        message = "Account activation email sent successfully";
        break;

      case 'notification':
        if (!data?.title || !data?.message) {
          return sendApiResponse(res, 400, false, "title and message are required for notification email", []);
        }
        success = await EmailHelperService.sendNotification(email, data, name);
        message = "Notification email sent successfully";
        break;

      case 'custom':
        if (!data?.templateAlias) {
          return sendApiResponse(res, 400, false, "templateAlias is required for custom email", []);
        }
        success = await EmailHelperService.sendCustomEmail(data.templateAlias, { to: email, name, ...data });
        message = "Custom email sent successfully";
        break;

      default:
        return sendApiResponse(res, 400, false, `Invalid email type: ${type}. Supported types: verification, welcome, password-reset, order-confirmation, account-activation, notification, custom`, []);
    }

    if (success) {
      return sendApiResponse(res, 200, true, message, []);
    } else {
      return sendApiResponse(res, 500, false, `Email not sent. Please try again later or contact support.`, []);
    }

  } catch (error: any) {
    console.error("Error sending unified email:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Send email verification link (equivalent to Laravel emaillinkSent)
 * POST /api/email/send-verification
 */
export const sendEmailVerification = async (req: Request, res: Response) => {
  try {
    const { email, verifyLink } = req.body;

    if (!email || !verifyLink) {
      return sendApiResponse(res, 400, false, "Email and verifyLink are required", []);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendApiResponse(res, 400, false, "Please enter a valid email address");
    }

    const mailInputs = {
      to: email,
      name: EmailHelperService.setName('User', ''),
      verifylink: verifyLink,
    };
console.log("mailInputs====",mailInputs);
    const success = await EmailHelperService.executeMailSender('verify-email-on-register', mailInputs);

    if (success) {
      return sendApiResponse(res, 200, true, "Verification email sent successfully", []);
    } else {
      return sendApiResponse(res, 500, false, "Email not sent. Please try again later or contact support.", []);
    }

  } catch (error: any) {
    console.error("Error sending email verification:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Test email configuration
 * POST /api/email/test-config
 */
export const testEmailConfig = async (req: Request, res: Response) => {
  try {
    const isValid = await EmailHelperService.testEmailConfig();

    if (isValid) {
      return sendApiResponse(res, 200, true, "Email configuration is valid", []);
    } else {
      return sendApiResponse(res, 400, false, "Email configuration is invalid", []);
    }

  } catch (error: any) {
    console.error("Error testing email configuration:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

  /**
   * Update mail settings
   * PUT /api/email/settings
   */
  export const updateMailSettings = async (req: Request, res: Response) => {
    try {
      const { mail_sent } = req.body;

      if (mail_sent === undefined) {
        return sendApiResponse(res, 400, false, "mail_sent setting is required", []);
      }

      // Update the first setting record (assuming it's the main settings)
      const setting = await Setting.findByPk(1);

      if (!setting) {
              // Create first setting record if it doesn't exist
      await Setting.create({
        user_id: 1, // Default user ID
        mail_sent: mail_sent,
        sitename: 'Dealics',
        site_slogan: 'Your Trading Card Platform'
      } as any);
      } else {
        await setting.update({ mail_sent: mail_sent });
      }

      return sendApiResponse(res, 200, true, "Mail settings updated successfully", [{ mail_sent }]);

    } catch (error: any) {
      console.error("Error updating mail settings:", error);
      return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
  };
