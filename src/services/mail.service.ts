import nodemailer from "nodemailer";

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com",
      port: (() => {
        try {
          const portString = (process.env.MAIL_PORT || '587').replace(/[^0-9]/g, '');
          const port = parseInt(portString, 10);
          return isNaN(port) ? 587 : port;
        } catch (error) {
          console.warn('⚠️ Error parsing MAIL_PORT, using default 587:', error);
          return 587;
        }
      })(),
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendMail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.MAIL_USERNAME,
      to,
      subject,
      text,
      html,
    };
    return await this.transporter.sendMail(mailOptions);
  }
}
