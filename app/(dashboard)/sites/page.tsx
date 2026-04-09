export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, Plus, ExternalLink, Settings } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const sites = await prisma.site.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true, keywords: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sites</h2>
          <p className="text-slate-500 mt-1">
            Manage your connected websites and CMS integrations.
          </p>
        </div>
        <ButtonLink href="/sites/new">
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </ButtonLink>
      </div>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No sites yet
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm">
            Connect your first website to start generating SEO content and
            tracking performance.
          </p>
          <ButtonLink href="/sites/new">
            <Plus className="w-4 h-4 mr-2" />
            Add your first site
          </ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {site.name}
                      </h3>
                      <a
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        {site.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {site.cmsType}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {site._count.articles}
                    </div>
                    <div className="text-xs text-slate-500">Articles</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {site._count.keywords}
                    </div>
                    <div className="text-xs text-slate-500">Keywords</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <ButtonLink
                    href={`/sites/${site.id}`}
                    size="sm"
                    className="flex-1"
                  >
                    Open
                  </ButtonLink>
                  <ButtonLink
                    href={`/sites/${site.id}/settings`}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="w-4 h-4" />
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
