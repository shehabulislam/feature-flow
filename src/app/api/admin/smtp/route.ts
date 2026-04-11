import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

// GET: Retrieve SMTP settings
export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
    });

    // Mask password for security
    if (settings) {
      return Response.json({
        settings: {
          ...settings,
          pass: settings.pass ? "••••••••" : "",
        },
      });
    }

    return Response.json({ settings: null });
  } catch {
    return Response.json({ settings: null });
  }
}

// POST: Save SMTP settings
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { host, port, secure, user, pass, fromEmail, fromName } = body;

    if (!host || !user || !fromEmail) {
      return Response.json(
        { error: "Host, user, and from email are required" },
        { status: 400 }
      );
    }

    // Check if existing settings exist, only update password if a new one is provided
    const existing = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
    }).catch(() => null);

    const passwordToStore = pass && pass !== "••••••••"
      ? pass
      : existing?.pass || "";

    const settings = await prisma.smtpSettings.upsert({
      where: { id: "singleton" },
      update: {
        host,
        port: parseInt(port) || 587,
        secure: !!secure,
        user,
        pass: passwordToStore,
        fromEmail,
        fromName: fromName || "FeatureFlow",
      },
      create: {
        id: "singleton",
        host,
        port: parseInt(port) || 587,
        secure: !!secure,
        user,
        pass: passwordToStore,
        fromEmail,
        fromName: fromName || "FeatureFlow",
      },
    });

    return Response.json({
      settings: { ...settings, pass: "••••••••" },
    });
  } catch (error) {
    console.error("SMTP settings error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Test SMTP connection
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { testEmail } = body;

    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      return Response.json(
        { error: "SMTP settings not configured. Save settings first." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email if address provided
    if (testEmail) {
      await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: testEmail,
        subject: "FeatureFlow SMTP Test",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; line-height: 48px; color: white; font-size: 24px;">⚡</div>
            <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1a1a2e;">SMTP Test Successful!</h1>
            <p style="color: #64748b; line-height: 1.6;">Your FeatureFlow email setup is working correctly.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
              Host: ${settings.host}:${settings.port}<br>
              From: ${settings.fromName} &lt;${settings.fromEmail}&gt;
            </p>
          </div>
        `,
        text: "FeatureFlow SMTP Test: Your email setup is working correctly.",
      });

      return Response.json({
        message: `SMTP connection verified and test email sent to ${testEmail}`,
      });
    }

    return Response.json({ message: "SMTP connection verified successfully" });
  } catch (error) {
    console.error("SMTP test error:", error);
    return Response.json(
      {
        error: `SMTP connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }
}
