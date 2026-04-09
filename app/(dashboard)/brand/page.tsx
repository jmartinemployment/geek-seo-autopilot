export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrandHubClient } from "@/components/dashboard/brand-hub-client";

export default async function BrandHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const sites = await prisma.site.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  const [brandVoices, audiences] = await Promise.all([
    prisma.brandVoice.findMany({
      where: { site: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      include: { site: { select: { name: true } } },
    }),
    prisma.audience.findMany({
      where: { site: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      include: { site: { select: { name: true } } },
    }),
  ]);

  return (
    <BrandHubClient
      sites={sites}
      initialBrandVoices={brandVoices}
      initialAudiences={audiences}
    />
  );
}
