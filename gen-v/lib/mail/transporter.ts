import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: '"FactoryOS" <noreply@gokul.software>',
      to,
      subject,
      html: htmlContent,
    });
    console.log("Email sent successfully: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
