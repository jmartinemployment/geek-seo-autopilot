export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Key, FileText, Calendar, BarChart3, Settings, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";

export default async function SiteOverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
    include: {
      _count: {
        select: { articles: true, keywords: true },
      },
    },
  });
  if (!site) notFound();

  const recentArticles = await prisma.article.findMany({
    where: { siteId },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const quickLinks = [
    {
      label: "Keywords",
      href: `/sites/${siteId}/keywords`,
      icon: Key,
      count: site._count.keywords,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Articles",
      href: `/sites/${siteId}/articles`,
      icon: FileText,
      count: site._count.articles,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Calendar",
      href: `/sites/${siteId}/calendar`,
      icon: Calendar,
      count: null,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Analytics",
      href: `/sites/${siteId}/analytics`,
      icon: BarChart3,
      count: null,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{site.name}</h2>
          <p className="text-slate-500 mt-1">{site.domain}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/sites/${siteId}/settings`} variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </ButtonLink>
          <ButtonLink href={`/sites/${siteId}/articles/new`} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Generate Article
          </ButtonLink>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div
                  className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center mb-3`}
                >
                  <link.icon className={`w-5 h-5 ${link.color}`} />
                </div>
                <div className="text-sm font-medium text-slate-900">
                  {link.label}
                </div>
                {link.count !== null && (
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {link.count}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent articles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Recent Articles
            <Link
              href={`/sites/${siteId}/articles`}
              className="text-xs text-blue-600 font-normal hover:underline"
            >
              View all
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">No articles yet</p>
              <ButtonLink href={`/sites/${siteId}/articles/new`} size="sm">
                Generate your first article
              </ButtonLink>
            </div>
          ) : (
            <div className="divide-y">
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/sites/${siteId}/articles/${article.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {article.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {article.targetKeyword} · {article.wordCount} words
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {article.seoScore > 0 && (
                      <span
                        className={`text-xs font-semibold ${
                          article.seoScore >= 70
                            ? "text-green-600"
                            : article.seoScore >= 40
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {article.seoScore}/100
                      </span>
                    )}
                    <Badge
                      variant={
                        article.status === "published" ? "default" : "secondary"
                      }
                      className="text-xs capitalize"
                    >
                      {article.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
