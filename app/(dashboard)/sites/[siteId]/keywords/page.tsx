export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { KeywordsClient } from "@/components/dashboard/keywords-client";

export default async function KeywordsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
  });
  if (!site) notFound();

  const keywords = await prisma.keyword.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <KeywordsClient
      siteId={siteId}
      siteDomain={site.domain}
      initialKeywords={keywords}
    />
  );
}
