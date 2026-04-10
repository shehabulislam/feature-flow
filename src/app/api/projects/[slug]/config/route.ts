import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      feedbackNameRequired: true,
      feedbackEmailRequired: true,
      hideAppName: true,
    },
  });

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ config: project });
}
