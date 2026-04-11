import prisma from "@/lib/prisma";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendMagicLoginEmail } from "@/lib/email";

// POST: Generate and send a magic login link to the user's email
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
      return Response.json({ message: "If an account exists, a login link has been sent." });
    }

    const loginToken = crypto.randomBytes(32).toString("hex");
    const loginTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { email },
      data: { loginToken, loginTokenExpiry },
    });

    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const emailResult = await sendMagicLoginEmail(email, loginToken, baseUrl);

    if (!emailResult.success) {
      console.error("Failed to send login email:", emailResult.error);
      return Response.json(
        { error: "Failed to send login email. SMTP may not be configured." },
        { status: 500 }
      );
    }

    return Response.json({ message: "If an account exists, a login link has been sent." });
  } catch (error) {
    console.error("Magic login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Verify the token and sign in the user (redirect from email link)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", request.url));
  }

  const user = await prisma.user.findFirst({
    where: {
      loginToken: token,
      loginTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", request.url));
  }

  // Don't clear the token here—it will be cleared by the login-token provider
  // Redirect to a page that auto-completes the sign-in via the token
  return NextResponse.redirect(new URL(`/login?loginToken=${token}`, request.url));
}
