import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      createdAt: true,
      updatedAt: true,
      projects: {
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          isPublic: true,
          createdAt: true,
          _count: {
            select: {
              feedbacks: true,
              roadmapItems: true,
              changelogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      feedbacks: {
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          upvoteCount: true,
          createdAt: true,
          project: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          feedback: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      entitlements: {
        select: {
          fsLicenseId: true,
          fsPlanId: true,
          type: true,
          expiration: true,
          isCanceled: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          projects: true,
          feedbacks: true,
          comments: true,
          upvotes: true,
        },
      },
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}

// PATCH: update user role or plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role, plan } = body;

  const data: Record<string, string> = {};
  if (role && ["owner", "customer"].includes(role)) data.role = role;
  if (plan && ["free", "pro", "team"].includes(plan)) data.plan = plan;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, plan: true },
  });

  return Response.json({ user });
}
