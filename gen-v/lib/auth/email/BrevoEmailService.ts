/**
 * Brevo Transactional Email Service — FactoryOS v1
 * 
 * Sends secure, branded password-reset emails using Brevo SMTP with gokul.software domain.
 * Strictly guarantees that passwords, tokens, or debug secrets are never included.
 */

import { sendTransactionalEmail } from "@/lib/mail/transporter";

export interface PasswordResetEmailOptions {
  to: string;
  otp: string;
  expiresInMinutes?: number;
}

export class BrevoEmailService {
  /**
   * Dispatches a 6-digit OTP password reset email.
   */
  static async sendPasswordResetOtp(options: PasswordResetEmailOptions): Promise<boolean> {
    const { to, otp, expiresInMinutes = 15 } = options;
    const subject = "FactoryOS password reset code";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050a12; color: #f5f7fa;">
  <div style="max-width: 520px; margin: 40px auto; padding: 32px; background: #08101b; border: 1px solid #1b2938; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
    <div style="margin-bottom: 24px; text-align: center;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f5f7fa; letter-spacing: -0.5px;">FactoryOS Account Security</h2>
    </div>
    
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #a7b0bc;">
      We received a request to reset the password for your FactoryOS account.
    </p>

    <div style="margin: 28px 0; padding: 20px; background: #0d1622; border: 1px solid #1b2938; border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #667085; margin-bottom: 8px;">Verification Code</div>
      <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1769e8; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${otp}</div>
      <div style="font-size: 13px; color: #667085; margin-top: 8px;">Expires in ${expiresInMinutes} minutes</div>
    </div>

    <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #667085;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <hr style="border: 0; border-top: 1px solid #1b2938; margin: 24px 0;">

    <div style="font-size: 12px; color: #475467; text-align: center;">
      FactoryOS Autonomous AI System • gokul.software
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const delivered = await sendTransactionalEmail(to, subject, htmlContent);
      if (delivered) {
        console.log(`[BrevoEmailService] Password reset email successfully dispatched to ${to}`);
        return true;
      }
      console.warn(`[BrevoEmailService] SMTP delivery returned false for ${to}`);
      return false;
    } catch (err: any) {
      console.error("[BrevoEmailService] Failed to send password reset email:", err.message);
      return false;
    }
  }
}
