import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const projectSlug = searchParams.get("project");
  const search = searchParams.get("search") || "";

  // Get all projects owned by this user
  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, slug: true, name: true },
  });

  if (projects.length === 0) {
    return Response.json({ customers: [], projects: [] });
  }

  const projectIds = projectSlug
    ? projects.filter((p) => p.slug === projectSlug).map((p) => p.id)
    : projects.map((p) => p.id);

  // Find all customers who submitted feedback on these projects
  const feedbackAuthors = await prisma.feedback.findMany({
    where: {
      projectId: { in: projectIds },
      authorId: { not: null },
    },
    select: {
      authorId: true,
    },
    distinct: ["authorId"],
  });

  const authorIds = feedbackAuthors
    .map((f) => f.authorId)
    .filter((id): id is string => id !== null);

  // Also find comment authors
  const commentAuthors = await prisma.comment.findMany({
    where: {
      feedback: {
        projectId: { in: projectIds },
      },
      authorId: { not: null },
    },
    select: { authorId: true },
    distinct: ["authorId"],
  });

  const commentAuthorIds = commentAuthors
    .map((c) => c.authorId)
    .filter((id): id is string => id !== null);

  const allCustomerIds = [...new Set([...authorIds, ...commentAuthorIds])];

  // Filter out the owner themselves
  const filteredIds = allCustomerIds.filter((id) => id !== session.user!.id);

  if (filteredIds.length === 0) {
    return Response.json({ customers: [], projects });
  }

  const whereClause: Record<string, unknown> = {
    id: { in: filteredIds },
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          feedbacks: {
            where: { projectId: { in: projectIds } },
          },
          comments: {
            where: {
              feedback: { projectId: { in: projectIds } },
            },
          },
          upvotes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ customers, projects });
}
