import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audience = await prisma.audience.findFirst({
    where: { id, site: { userId: session.user.id } },
  });
  if (!audience)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.audience.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
