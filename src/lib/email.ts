import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get SMTP settings from the database.
 * Returns null if not configured.
 */
async function getSmtpSettings() {
  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
    });
    return settings;
  } catch {
    return null;
  }
}

/**
 * Send an email using SMTP settings stored in the database.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const settings = await getSmtpSettings();
  if (!settings) {
    return { success: false, error: "SMTP not configured. Please configure SMTP settings in Admin → SMTP." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string) {
  const resetLink = `${baseUrl}/login?reset=${resetToken}`;

  return sendEmail({
    to: email,
    subject: "Reset your FeatureFlow password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; line-height: 48px; color: white; font-size: 24px;">⚡</div>
          <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1a1a2e;">FeatureFlow</h1>
        </div>
        <h2 style="font-size: 20px; margin-bottom: 16px; color: #1a1a2e;">Reset your password</h2>
        <p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
          Sent by FeatureFlow · <a href="${baseUrl}" style="color: #6366f1; text-decoration: none;">${baseUrl}</a>
        </p>
      </div>
    `,
    text: `Reset your password: ${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

/**
 * Send a magic login link email to a customer.
 */
export async function sendMagicLoginEmail(email: string, loginToken: string, baseUrl: string) {
  const loginLink = `${baseUrl}/api/auth/magic-login?token=${loginToken}`;

  return sendEmail({
    to: email,
    subject: "Sign in to FeatureFlow",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; line-height: 48px; color: white; font-size: 24px;">⚡</div>
          <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1a1a2e;">FeatureFlow</h1>
        </div>
        <h2 style="font-size: 20px; margin-bottom: 16px; color: #1a1a2e;">Sign in to your account</h2>
        <p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to sign in. This link will expire in 15 minutes.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${loginLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Sign In</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          If you didn't request this link, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
          Sent by FeatureFlow · <a href="${baseUrl}" style="color: #6366f1; text-decoration: none;">${baseUrl}</a>
        </p>
      </div>
    `,
    text: `Sign in to FeatureFlow: ${loginLink}\n\nThis link expires in 15 minutes.`,
  });
}
