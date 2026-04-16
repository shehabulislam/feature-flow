import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const { feedbackIds } = body;

  if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
    return Response.json({ upvotedIds: [] });
  }

  // Cap to prevent abuse
  const ids = feedbackIds.slice(0, 100);

  if (session?.user?.id) {
    // Logged-in user: check by userId
    const upvotes = await prisma.upvote.findMany({
      where: {
        feedbackId: { in: ids },
        userId: session.user.id,
      },
      select: { feedbackId: true },
    });
    return Response.json({ upvotedIds: upvotes.map((u) => u.feedbackId) });
  }

  // Anonymous: check by IP-based fingerprint
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for") ||
    headersList.get("x-real-ip") ||
    "unknown";

  // Generate anonymous IDs for each feedback
  const anonymousIds = ids.map((id: string) => ({
    feedbackId: id,
    anonymousId: createHash("sha256")
      .update(`${ip}-${id}`)
      .digest("hex")
      .slice(0, 16),
  }));

  const upvotes = await prisma.upvote.findMany({
    where: {
      OR: anonymousIds.map((a) => ({
        feedbackId: a.feedbackId,
        anonymousId: a.anonymousId,
      })),
    },
    select: { feedbackId: true },
  });

  return Response.json({ upvotedIds: upvotes.map((u) => u.feedbackId) });
}
