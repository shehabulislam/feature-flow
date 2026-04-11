import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

// POST: Request password reset (generates token + sends email)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return Response.json({ message: "If an account exists, a password reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });

    // Get the base URL from the request
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Send reset email via SMTP
    const emailResult = await sendPasswordResetEmail(email, resetToken, baseUrl);

    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      return Response.json(
        { error: "Failed to send reset email. SMTP may not be configured." },
        { status: 500 }
      );
    }

    return Response.json({
      message: "If an account exists, a password reset link has been sent to their email.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Actually reset password with token
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return Response.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return Response.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
