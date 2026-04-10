import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";

async function verifyOwnership(session: any, id: string) {
  const item = await prisma.roadmapItem.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!item) return null;

  const isAdmin = isSuperAdmin(session?.user?.email);
  if (!isAdmin && item.project.ownerId !== session.user.id) {
    return null;
  }

  return item;
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
  const item = await verifyOwnership(session, id);

  if (!item) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, status, quarter, position, eta } = body;

  const updated = await prisma.roadmapItem.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && {
        status,
        ...(status === "completed" && { completedAt: new Date() }),
      }),
      ...(quarter !== undefined && { quarter }),
      ...(position !== undefined && { position }),
      ...(eta !== undefined && { eta: eta ? new Date(eta) : null }),
    },
  });

  return Response.json({ roadmapItem: updated });
}

// Bulk reorder
export async function PUT(
  request: NextRequest,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { items } = body; // Array of { id, position, status }

  if (!Array.isArray(items)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify all items belong to a project the user owns
  for (const item of items) {
    const dbItem = await verifyOwnership(session, item.id);
    if (!dbItem) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Update positions
  await Promise.all(
    items.map((item: { id: string; position: number; status?: string }) =>
      prisma.roadmapItem.update({
        where: { id: item.id },
        data: {
          position: item.position,
          ...(item.status && { status: item.status }),
        },
      })
    )
  );

  return Response.json({ success: true });
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
  const item = await verifyOwnership(session, id);

  if (!item) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.roadmapItem.delete({ where: { id } });
  return Response.json({ success: true });
}
