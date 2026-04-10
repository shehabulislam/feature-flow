import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const roadmapItems = await prisma.roadmapItem.findMany({
    where: { projectId: project.id },
    include: {
      feedback: {
        select: { id: true, title: true, upvoteCount: true },
      },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return Response.json({ roadmapItems });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });

  const isAdmin = isSuperAdmin(session?.user?.email);
  if (!project || (!isAdmin && project.ownerId !== session.user.id)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, status = "planned", quarter, eta, feedbackId } = body;

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const item = await prisma.roadmapItem.create({
    data: {
      title,
      description: description || null,
      status,
      quarter: quarter || null,
      eta: eta ? new Date(eta) : null,
      feedbackId: feedbackId || null,
      projectId: project.id,
    },
  });

  return Response.json({ roadmapItem: item }, { status: 201 });
}
