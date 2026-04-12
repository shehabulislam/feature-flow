import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tab = searchParams.get("tab") || "users";
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  if (tab === "overview") {
    const [totalUsers, totalProjects, totalFeedback, totalComments, totalUpvotes] =
      await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.feedback.count(),
        prisma.comment.count(),
        prisma.upvote.count(),
      ]);

    // Recent signups (last 7 days)
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Users by role
    const owners = await prisma.user.count({ where: { role: "owner" } });
    const customers = await prisma.user.count({ where: { role: "customer" } });

    // Users by plan
    const freePlan = await prisma.user.count({ where: { plan: "free" } });
    const proPlan = await prisma.user.count({ where: { plan: "pro" } });
    const teamPlan = await prisma.user.count({ where: { plan: "team" } });

    return Response.json({
      overview: {
        totalUsers,
        totalProjects,
        totalFeedback,
        totalComments,
        totalUpvotes,
        recentUsers,
        byRole: { owners, customers },
        byPlan: { free: freePlan, pro: proPlan, team: teamPlan },
      },
    });
  }

  if (tab === "users") {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          createdAt: true,
          _count: {
            select: {
              projects: true,
              feedbacks: true,
              comments: true,
              upvotes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return Response.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (tab === "projects") {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              feedbacks: true,
              roadmapItems: true,
              changelogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return Response.json({
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  return Response.json({ error: "Invalid tab" }, { status: 400 });
}
