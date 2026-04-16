import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!feedback) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }

  if (feedback.project.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, category, title, description, isHidden } = body;

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(category && { category }),
      ...(title && { title }),
      ...(description && { description }),
      ...(isHidden !== undefined && { isHidden }),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      board: { select: { name: true, slug: true } },
      _count: { select: { comments: true, upvotes: true } },
    },
  });

  return Response.json({ feedback: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!feedback) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }

  if (feedback.project.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.feedback.delete({ where: { id } });
  return Response.json({ success: true });
}
