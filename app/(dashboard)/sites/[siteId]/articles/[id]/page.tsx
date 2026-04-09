export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ArticleEditor } from "@/components/dashboard/article-editor";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; id: string }>;
}) {
  const { siteId, id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const article = await prisma.article.findFirst({
    where: { id, siteId, site: { userId: session.user.id } },
    include: { site: { select: { name: true, cmsType: true } } },
  });
  if (!article) notFound();

  return (
    <ArticleEditor
      article={{
        id: article.id,
        siteId,
        title: article.title,
        slug: article.slug,
        content: article.content,
        targetKeyword: article.targetKeyword,
        metaTitle: article.metaTitle ?? "",
        metaDescription: article.metaDescription ?? "",
        wordCount: article.wordCount,
        seoScore: article.seoScore,
        readabilityScore: article.readabilityScore,
        status: article.status,
        siteName: article.site.name,
        cmsType: article.site.cmsType,
      }}
    />
  );
}
