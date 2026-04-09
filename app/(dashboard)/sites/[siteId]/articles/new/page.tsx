export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { GenerateArticleWizard } from "@/components/dashboard/generate-article-wizard";

export default async function NewArticlePage({
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
    select: { id: true, keyword: true, intent: true },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Generate Article</h2>
        <p className="text-slate-500 mt-1">{site.name}</p>
      </div>
      <GenerateArticleWizard siteId={siteId} keywords={keywords} />
    </div>
  );
}
