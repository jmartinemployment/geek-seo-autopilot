import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId, keywords } = await req.json();
  if (!siteId || !Array.isArray(keywords)) {
    return NextResponse.json({ error: "siteId and keywords required" }, { status: 400 });
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const created = await prisma.keyword.createMany({
    data: keywords.map((kw) => ({
      siteId,
      keyword: kw.keyword,
      searchVolume: kw.searchVolume,
      difficulty: typeof kw.difficulty === "number" ? kw.difficulty : null,
      intent: kw.intent,
      longTail: kw.longTail ?? false,
      suggestedTitle: kw.suggestedTitle,
      topicCluster: kw.topicCluster,
      status: "discovered",
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ count: created.count });
}
