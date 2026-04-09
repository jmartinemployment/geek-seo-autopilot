export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
// ButtonLink renders an <a> — Link only used for card links below
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ArticlesPage({
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

  const articles = await prisma.article.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Articles</h2>
          <p className="text-slate-500 mt-1">{site.name}</p>
        </div>
        <ButtonLink href={`/sites/${siteId}/articles/new`}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Article
        </ButtonLink>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No articles yet
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm">
            Generate SEO-optimized articles from your keywords using Claude AI.
          </p>
          <ButtonLink href={`/sites/${siteId}/articles/new`}>
            Generate your first article
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link
                  href={`/sites/${siteId}/articles/${article.id}`}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{article.targetKeyword}</span>
                      <span>·</span>
                      <span>{article.wordCount} words</span>
                      {article.seoScore > 0 && (
                        <>
                          <span>·</span>
                          <span
                            className={
                              article.seoScore >= 70
                                ? "text-green-600 font-medium"
                                : article.seoScore >= 40
                                ? "text-yellow-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            SEO {article.seoScore}/100
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      article.status === "published" ? "default" : "secondary"
                    }
                    className="capitalize ml-4 shrink-0"
                  >
                    {article.status}
                  </Badge>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
