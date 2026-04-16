import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import crypto from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { feedbackId: id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!feedback) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content, authorName, authorEmail } = body;

  if (!content) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  // Require name and email for non-authenticated users
  if (!session?.user?.id && (!authorName || !authorEmail)) {
    return Response.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  let userId = session?.user?.id || null;
  let autoLoginToken: string | null = null;

  // Auto-create/find customer account if not logged in
  if (!userId && authorEmail) {
    let existingUser = await prisma.user.findUnique({
      where: { email: authorEmail },
    });

    if (!existingUser) {
      const randomPassword = Math.random().toString(36).slice(-12) + "Aa1!";
      const hashedPassword = await hash(randomPassword, 12);

      existingUser = await prisma.user.create({
        data: {
          email: authorEmail,
          name: authorName,
          password: hashedPassword,
          role: "customer",
        },
      });
    }

    userId = existingUser.id;

    // Generate a one-time login token for auto sign-in
    const loginToken = crypto.randomBytes(32).toString("hex");
    const loginTokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { loginToken, loginTokenExpiry },
    });
    autoLoginToken = loginToken;
  }

  const isOfficial = session?.user?.id === feedback.project.ownerId;

  const comment = await prisma.comment.create({
    data: {
      content,
      feedbackId: id,
      authorId: userId,
      isOfficial,
      authorName: authorName || session?.user?.name || "Anonymous",
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return Response.json({
    comment,
    autoSignIn: !!autoLoginToken,
    loginToken: autoLoginToken,
  }, { status: 201 });
}
