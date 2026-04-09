import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  slug: z.string().optional(),
  seoScore: z.number().int().min(0).max(100).optional(),
  readabilityScore: z.number().int().min(0).max(100).optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findFirst({
    where: { id, site: { userId: session.user.id } },
  });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Recalculate word count if content changed
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content) {
    const wordCount = parsed.data.content
      .replace(/[#*`_]/g, "")
      .split(/\s+/)
      .filter(Boolean).length;
    data.wordCount = wordCount;
  }

  const updated = await prisma.article.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findFirst({
    where: { id, site: { userId: session.user.id } },
  });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
