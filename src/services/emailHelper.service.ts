import nodemailer from 'nodemailer';
import { EmailTemplete } from '../models/emailTemplate.model.js';
import { Setting } from '../models/setting.model.js';
import { MailQueue } from '../models/mailQueue.model.js';
import { sequelize } from '../config/db.js';

export class EmailHelperService {
  private static mailInputs: any = {};
  private static emailTemplate: any = null;
  private static to: string = '';
  private static from: string = '';
  private static cc: string[] = [];
  private static bcc: string[] = [];
  private static subject: string = '';
  private static body: string = '';
  private static htmlBody: string = '';

  /**
   * Main email execution function (equivalent to Laravel executeMailSender)
   */
  public static async executeMailSender(alias: string, data: any): Promise<boolean> {
    try {
      // Set mail inputs
      this.mailInputs = data;
      
      // Get email template by alias
      this.emailTemplate = await EmailTemplete.findOne({
        where: { 
          alias: alias, 
          email_status: "1" 
        }
      });

      if (!this.emailTemplate || !this.emailTemplate.id) {
        console.error(`Email template not found for alias: ${alias}`);
        return false;
      }

      // Set basic email properties
      this.to = this.mailInputs.to;
      this.setMailFrom();
      this.setMailCCandBCC();
      this.setMailSubject();
      this.setMailBody();
      this.setMailContent();

      // Check if mail sending is enabled - get first setting record
      const settings = await Setting.findOne({
        where: { id: 1 },
        attributes: ['mail_sent']
      });

      const mailEnabled = settings && settings.mail_sent === 1;

      if (mailEnabled) {
        return await this.sendMail();
      } else {
        return await this.saveToMailQueue();
      }

    } catch (error: any) {
      console.error('Error in executeMailSender:', error);
      
      // Log specific error details
      if (error.message) {
        console.error('Error details:', error.message);
      }
      
      if (error.code) {
        console.error('Error code:', error.code);
      }
      
      return false;
    }
  }

  /**
   * Set mail from address and name
   */
  private static setMailFrom(): void {
    if (this.emailTemplate.email_from) {
      this.from = this.emailTemplate.email_from;
    } else {
      // Default from email from environment or settings
      this.from = process.env.MAIL_FROM_ADDRESS || 'noreply@dealics.com';
    }
  }

  /**
   * Set CC and BCC emails
   */
  private static setMailCCandBCC(): void {
    if (this.emailTemplate.email_cc) {
      this.cc = this.emailTemplate.email_cc.split(',').map((email: string) => email.trim());
    }

    if (this.emailTemplate.email_bcc) {
      this.bcc = this.emailTemplate.email_bcc.split(',').map((email: string) => email.trim());
    }

    // Add CC and BCC from mail inputs if provided
    if (this.mailInputs.cc) {
      this.cc = [...this.cc, ...this.mailInputs.cc];
    }

    if (this.mailInputs.bcc) {
      this.bcc = [...this.bcc, ...this.mailInputs.bcc];
    }
  }

  /**
   * Set mail subject with variable replacement
   */
  private static setMailSubject(): void {
    this.subject = this.replaceVariables(this.emailTemplate.email_subject || '');
  }

  /**
   * Set mail body with variable replacement
   */
  private static setMailBody(): void {
    this.body = this.replaceVariables(this.emailTemplate.email_description || '');
  }

  /**
   * Set mail HTML body with variable replacement
   */
  private static setMailContent(): void {
    this.htmlBody = this.replaceVariables(this.emailTemplate.email_description || '');
  }

  /**
   * Replace variables in template with actual values
   */
  private static replaceVariables(content: string): string {
    let processedContent = content;

    // Replace common variables
    const commonVariables: { [key: string]: string } = {
      '{{name}}': this.mailInputs.name || '',
      '{{email}}': this.mailInputs.to || '',
      '{{date}}': new Date().toLocaleDateString(),
      '{{year}}': new Date().getFullYear().toString(),
    };

    // Replace common variables
    Object.keys(commonVariables).forEach(key => {
      const value = commonVariables[key];
      if (value !== undefined) {
        processedContent = processedContent.replace(new RegExp(key, 'g'), value);
      }
    });

    // Replace custom variables from mailInputs (safely handle null/undefined)
    Object.keys(this.mailInputs).forEach(key => {
      const placeholder = `{{${key}}}`;
      const raw = this.mailInputs[key];
      const safeValue = (raw === undefined || raw === null) ? '' : String(raw);
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), safeValue);
    });

    return processedContent;
  }

  /**
   * Send email using nodemailer
   */
  private static async sendMail(): Promise<boolean> {
    try {
      // Check if email password is configured
      const emailPassword = process.env.MAIL_PASSWORD;
      if (!emailPassword || emailPassword === '') {
        console.error('Email password not configured. Please set MAIL_PASSWORD in .env file');
        return false;
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'mail.hitpacks.com',
        port: (() => {
          try {
            const portString = (process.env.MAIL_PORT || '465').replace(/[^0-9]/g, '');
            const port = parseInt(portString, 10);
            return isNaN(port) ? 465 : port;
          } catch (error) {
            console.warn('⚠️ Error parsing MAIL_PORT, using default 465:', error);
            return 465;
          }
        })(),
        secure: true, // true for 465 (SSL), false for other ports
        auth: {
          user: process.env.MAIL_USERNAME || 'support@hitpacks.com',
          pass: emailPassword,
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      // Prepare mail options
      const mailOptions = {
        from: this.from,
        to: this.to,
        cc: this.cc.length > 0 ? this.cc.join(',') : undefined,
        bcc: this.bcc.length > 0 ? this.bcc.join(',') : undefined,
        subject: this.subject,
        text: this.body,
        html: this.htmlBody,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);
      
      return true;

    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Provide specific error messages based on error type
      if (error.code === 'EAUTH') {
        console.error('Email authentication failed. Check MAIL_USERNAME and MAIL_PASSWORD');
      } else if (error.code === 'ECONNECTION') {
        console.error('Email connection failed. Check MAIL_HOST and MAIL_PORT');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Email timeout. Check network connection');
      } else {
        console.error('Unknown email error:', error.message);
      }
      
      return false;
    }
  }

  /**
   * Save email to queue for later processing
   */
  private static async saveToMailQueue(): Promise<boolean> {
    try {
      await MailQueue.create({
        mail_to: this.to,
        mail_subject: this.subject,
        mail_body: this.body,
        mail_from: this.from,
        mail_from_name: this.emailTemplate.email_from_name || '',
        mail_title: this.subject,
        status: 0, // 0 = pending
      } as any);

      return true;

    } catch (error) {
      console.error('Error saving to mail queue:', error);
      return false;
    }
  }

  /**
   * Process mail queue (to be called by cron job or manually)
   */
  public static async processMailQueue(): Promise<void> {
    try {
      const pendingEmails = await MailQueue.findAll({
        where: { 
          status: 0 // 0 = pending
        },
        order: [['created_at', 'ASC']],
        limit: 50
      });

      for (const email of pendingEmails) {
        try {
          // Update status to processing (1 = not send)
          await email.update({ status: 1 });

          // Set mail properties
          this.to = email.mail_to || '';
          this.subject = email.mail_subject || '';
          this.body = email.mail_body || '';
          this.htmlBody = email.mail_body || '';
          this.from = email.mail_from || process.env.MAIL_FROM_ADDRESS || 'noreply@dealics.com';

          // Send email
          const success = await this.sendMail();

          if (success) {
            await email.update({ 
              status: 1 // 1 = not send (processed)
            });
          } else {
            await email.update({ 
              status: 1 // 1 = not send (failed but marked as processed)
            });
          }

        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          await email.update({ 
            status: 1 // 1 = not send (failed but marked as processed)
          });
        }
      }

    } catch (error) {
      console.error('Error processing mail queue:', error);
    }
  }

  /**
   * Helper function to set name (equivalent to Laravel setName)
   */
  public static setName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Get email template by alias
   */
  public static async getEmailTemplate(alias: string): Promise<EmailTemplete | null> {
    return await EmailTemplete.findOne({
      where: { 
        alias: alias, 
        email_status: "1" 
      }
    });
  }

  /**
   * Create or update email template
   */
  public static async createOrUpdateTemplate(templateData: any): Promise<EmailTemplete> {
    const [template, created] = await EmailTemplete.findOrCreate({
      where: { alias: templateData.alias },
      defaults: templateData
    });

    if (!created) {
      await template.update(templateData);
    }

    return template;
  }

  /**
   * Test email configuration
   */
  public static async testEmailConfig(): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'mail.hitpacks.com',
        port: (() => {
          try {
            const portString = (process.env.MAIL_PORT || '465').replace(/[^0-9]/g, '');
            const port = parseInt(portString, 10);
            return isNaN(port) ? 465 : port;
          } catch (error) {
            console.warn('⚠️ Error parsing MAIL_PORT, using default 465:', error);
            return 465;
          }
        })(),
        secure: true, // true for 465 (SSL), false for other ports
        auth: {
          user: process.env.MAIL_USERNAME || 'support@hitpacks.com',
          pass: process.env.MAIL_PASSWORD || '',
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      await transporter.verify();
      return true;

    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }

  /**
   * Send email verification (equivalent to Laravel emaillinkSent)
   */
  public static async sendEmailVerification(email: string, verifyLink: string, name?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      verifylink: verifyLink,
    };

    return await this.executeMailSender('verify-email-on-register', mailInputs);
  }

  /**
   * Send welcome onboarding email
   */
  public static async sendWelcomeOnboarding(email: string, firstName: string, lastName: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      addProductLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/products/add`,
      myAddressesLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/shipping/addresses`,
      yourprofilelink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
      editProfileLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
      payPalBusinessEmailLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/paypal-account`,
      buyCoinsLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/coin-purchase-history`,
      loginLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    };

    return await this.executeMailSender('welcome-onboarding-guide', mailInputs);
  }

  /**
   * Send password reset email
   */
  public static async sendPasswordReset(email: string, resetLink: string, name?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      resetlink: resetLink,
    };

    return await this.executeMailSender('password-reset', mailInputs);
  }

  /**
   * Send forgot password email (equivalent to Laravel recovery_password1)
   */
  public static async sendForgotPasswordEmail(email: string, resetLink: string, name?: string, username?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      username: username || '',
      resetlink: resetLink,
    };

    return await this.executeMailSender('reset-password-request', mailInputs);
  }

  /**
   * Send order confirmation email
   */
  public static async sendOrderConfirmation(email: string, orderData: any, name?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      orderNumber: orderData.orderNumber,
      orderTotal: orderData.orderTotal,
      orderDate: orderData.orderDate,
      orderItems: orderData.orderItems,
      trackingNumber: orderData.trackingNumber,
    };

    return await this.executeMailSender('order-confirmation', mailInputs);
  }

  /**
   * Send account activation email
   */
  public static async sendAccountActivation(email: string, activationLink: string, name?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      activationlink: activationLink,
    };

    return await this.executeMailSender('account-activation', mailInputs);
  }

  /**
   * Send notification email
   */
  public static async sendNotification(email: string, notificationData: any, name?: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: name || this.setName('User', ''),
      title: notificationData.title,
      message: notificationData.message,
      actionLink: notificationData.actionLink,
      actionText: notificationData.actionText,
    };

    return await this.executeMailSender('notification', mailInputs);
  }

  /**
   * Send profile updated email
   */
  public static async sendProfileUpdatedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      yourprofilelink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
    };

    return await this.executeMailSender('profile-updated', mailInputs);
  }

  /**
   * Send password changed email
   */
  public static async sendPasswordChangedEmail(email: string, firstName: string, lastName: string, username: string): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      username: username,
      yourprofilelink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
    };

    return await this.executeMailSender('password-changed', mailInputs);
  }

  /**
   * Send purchase successful email to buyer
   */
  public static async sendPurchaseSuccessfulEmail(
    email: string, 
    firstName: string, 
    lastName: string, 
    cardName: string, 
    itemAmount: number, 
    shippingFee: number, 
    totalAmount: number, 
    transactionId: string, 
    otherUserName: string, 
    viewPurchaseDetailsLink: string
  ): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      cardname: cardName,
      item_amount: itemAmount,
      shipping_fee: shippingFee,
      amount: totalAmount,
      transaction_id: transactionId,
      other_user_name: otherUserName,
      view_purchase_details_link: viewPurchaseDetailsLink,
    };

    return await this.executeMailSender('purchase-successful', mailInputs);
  }

  /**
   * Send card sold email to seller
   */
  public static async sendCardSoldEmail(
    email: string, 
    firstName: string, 
    lastName: string, 
    buyerName: string, 
    cardName: string, 
    itemAmount: number, 
    shippingFee: number, 
    totalAmount: number, 
    transactionId: string, 
    viewSaleDetailsLink: string
  ): Promise<boolean> {
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      buyer_name: buyerName,
      cardname: cardName,
      item_amount: itemAmount,
      shipping_fee: shippingFee,
      amount: totalAmount,
      transaction_id: transactionId,
      view_sale_details_link: viewSaleDetailsLink,
    };

    return await this.executeMailSender('your-card-has-been-sold', mailInputs);
  }

  /**
   * Send email verification when email is updated
   */
  public static async sendEmailUpdatedVerificationEmail(verifyLink: string, email: string, firstName: string, lastName: string, userId: number): Promise<boolean> {
    // Create verification link (equivalent to Laravel encrypt and route)
    // const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?id=${userId}&screen=email-updated`;
    
    const mailInputs = {
      to: email,
      name: this.setName(firstName, lastName),
      verifylink: verifyLink,
    };

    return await this.executeMailSender('email-updated-verify-to-login', mailInputs);
  }

  /**
   * Send custom email with any template
   */
  public static async sendCustomEmail(templateAlias: string, emailData: any): Promise<boolean> {
    return await this.executeMailSender(templateAlias, emailData);
  }

}
