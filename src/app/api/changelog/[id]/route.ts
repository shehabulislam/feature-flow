import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";

async function verifyOwnership(session: any, id: string) {
  const entry = await prisma.changelogEntry.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!entry) return null;

  const isAdmin = isSuperAdmin(session?.user?.email);
  if (!isAdmin && entry.project.ownerId !== session.user.id) {
    return null;
  }

  return entry;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await verifyOwnership(session, id);

  if (!entry) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, content, version, type, isPublished, date: displayDate } = body;

  const updated = await prisma.changelogEntry.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(version !== undefined && { version }),
      ...(type && { type }),
      ...(displayDate !== undefined && { displayDate: displayDate ? new Date(displayDate) : new Date() }),
      ...(isPublished !== undefined && {
        isPublished,
        publishedAt: isPublished && !entry.publishedAt ? new Date() : entry.publishedAt,
      }),
    },
  });

  return Response.json({ changelog: updated });
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
  const entry = await verifyOwnership(session, id);

  if (!entry) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.changelogEntry.delete({ where: { id } });
  return Response.json({ success: true });
}
