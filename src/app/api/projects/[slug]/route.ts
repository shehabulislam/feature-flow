import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      boards: { orderBy: { position: "asc" } },
      _count: {
        select: {
          feedbacks: true,
          roadmapItems: true,
          changelogs: true,
        },
      },
    },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json({ project });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { 
    name, description, websiteUrl, primaryColor, isPublic,
    logoUrl, customCss, customDomain, webhookUrl,
    hideAppName, feedbackNameRequired, feedbackEmailRequired
  } = body;

  const updated = await prisma.project.update({
    where: { slug },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(websiteUrl !== undefined && { websiteUrl }),
      ...(primaryColor && { primaryColor }),
      ...(isPublic !== undefined && { isPublic }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(customCss !== undefined && { customCss }),
      ...(customDomain !== undefined && { customDomain }),
      ...(webhookUrl !== undefined && { webhookUrl }),
      ...(hideAppName !== undefined && { hideAppName }),
      ...(feedbackNameRequired !== undefined && { feedbackNameRequired }),
      ...(feedbackEmailRequired !== undefined && { feedbackEmailRequired }),
    },
  });

  return Response.json({ project: updated });
}
