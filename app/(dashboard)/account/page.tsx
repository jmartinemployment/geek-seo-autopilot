export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Account</h2>
        <p className="text-slate-500 mt-1">Your profile and subscription</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={session.user.image ?? undefined} />
            <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {session.user.name}
            </div>
            <div className="text-slate-500">{session.user.email}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900 capitalize">
                Free Plan
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Upgrade to unlock unlimited articles and sites
              </div>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
