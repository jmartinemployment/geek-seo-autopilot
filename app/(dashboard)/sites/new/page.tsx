export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AddSiteWizard } from "@/components/dashboard/add-site-wizard";

export default async function NewSitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Add a New Site</h2>
        <p className="text-slate-500 mt-1">
          Connect your website to start automating your SEO content pipeline.
        </p>
      </div>
      <AddSiteWizard />
    </div>
  );
}
