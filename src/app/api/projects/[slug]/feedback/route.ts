import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { fireWebhooks } from "@/lib/webhooks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "newest";
  const boardSlug = searchParams.get("board");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { boards: true },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const where: Record<string, unknown> = { projectId: project.id };
  if (status) where.status = status;
  if (category) where.category = category;
  if (boardSlug) {
    const board = project.boards.find((b) => b.slug === boardSlug);
    if (board) where.boardId = board.id;
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "most_voted") orderBy = { upvoteCount: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };

  const feedbacks = await prisma.feedback.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      board: { select: { name: true, slug: true } },
      _count: { select: { comments: true, upvotes: true } },
    },
    orderBy,
  });

  return Response.json({ feedbacks });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { boards: true },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, category = "feature", boardSlug, authorName, authorEmail } = body;

  if (!title || !description) {
    return Response.json(
      { error: "Title and description are required" },
      { status: 400 }
    );
  }

  // Name and email are conditionally required based on project settings
  if (!session?.user?.id) {
    if (project.feedbackNameRequired && !authorName) {
      return Response.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (project.feedbackEmailRequired && !authorEmail) {
      return Response.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
  }

  let userId = session?.user?.id || null;
  let customerToken: string | null = null;

  // Auto-create customer account if not logged in
  if (!userId && authorEmail) {
    let existingUser = await prisma.user.findUnique({
      where: { email: authorEmail },
    });

    if (!existingUser) {
      // Create a customer account with a random password (they can reset later)
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
    // Return a flag so the frontend can auto-sign-in this user
    customerToken = existingUser.email;
  }

  const boardId = boardSlug
    ? project.boards.find((b) => b.slug === boardSlug)?.id
    : project.boards[0]?.id;

  const feedback = await prisma.feedback.create({
    data: {
      title,
      description,
      category,
      projectId: project.id,
      authorId: userId,
      boardId: boardId || null,
      authorName: authorName || session?.user?.name || "Anonymous",
      authorEmail: authorEmail || (session?.user as { email?: string })?.email || null,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      board: { select: { name: true, slug: true } },
    },
  });

  // Fire webhooks for feedback.created event
  fireWebhooks(project.id, "feedback.created", {
    id: feedback.id,
    title: feedback.title,
    description: feedback.description,
    status: feedback.status,
    category: feedback.category,
    authorName: feedback.authorName,
    authorEmail: feedback.authorEmail,
    projectSlug: slug,
    projectName: project.name,
    createdAt: feedback.createdAt,
  });

  return Response.json({
    feedback,
    autoSignIn: customerToken ? true : false,
    customerEmail: customerToken,
  }, { status: 201 });
}

