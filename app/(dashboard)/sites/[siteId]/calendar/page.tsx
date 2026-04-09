export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { CalendarClient } from "@/components/dashboard/calendar-client";

export default async function CalendarPage({
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

  const calendarItems = await prisma.contentCalendar.findMany({
    where: { siteId },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <CalendarClient
      siteId={siteId}
      siteName={site.name}
      initialItems={calendarItems}
    />
  );
}
