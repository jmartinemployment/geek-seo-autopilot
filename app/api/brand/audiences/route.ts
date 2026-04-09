import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  demographics: z.string().optional(),
  painPoints: z.string().optional(),
  goals: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const site = await prisma.site.findFirst({
    where: { id: parsed.data.siteId, userId: session.user.id },
  });
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const audience = await prisma.audience.create({ data: parsed.data });
  return NextResponse.json(audience, { status: 201 });
}
