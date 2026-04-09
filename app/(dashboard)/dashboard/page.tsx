export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FileText, Key, TrendingUp, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [sites, articleCount, keywordCount, publishedCount] = await Promise.all(
    [
      prisma.site.findMany({
        where: { userId: session.user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.article.count({
        where: { site: { userId: session.user.id } },
      }),
      prisma.keyword.count({
        where: { site: { userId: session.user.id } },
      }),
      prisma.article.count({
        where: {
          site: { userId: session.user.id },
          status: "published",
        },
      }),
    ]
  );

  const recentArticles = await prisma.article.findMany({
    where: { site: { userId: session.user.id } },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { site: { select: { name: true, id: true } } },
  });

  const stats = [
    {
      label: "Total Articles",
      value: articleCount,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Keywords",
      value: keywordCount,
      icon: Key,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Published",
      value: publishedCount,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Sites",
      value: sites.length,
      icon: Globe,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome back, {session.user.name?.split(" ")[0] ?? "there"} 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with your SEO pipeline.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Your Sites
              <Link
                href="/sites/new"
                className="text-xs text-blue-600 font-normal hover:underline"
              >
                + Add site
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No sites yet</p>
                <Link
                  href="/sites/new"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                >
                  Add your first site →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {site.name}
                      </div>
                      <div className="text-xs text-slate-500">{site.domain}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {site.cmsType}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent articles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Articles</CardTitle>
          </CardHeader>
          <CardContent>
            {recentArticles.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No articles yet</p>
                {sites.length > 0 && (
                  <Link
                    href={`/sites/${sites[0].id}/articles/new`}
                    className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Generate your first article →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/sites/${article.siteId}/articles/${article.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {article.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {article.site.name} · {article.wordCount} words
                      </div>
                    </div>
                    <Badge
                      variant={
                        article.status === "published" ? "default" : "secondary"
                      }
                      className="text-xs capitalize shrink-0 ml-2"
                    >
                      {article.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
