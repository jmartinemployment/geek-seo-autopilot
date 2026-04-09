"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Site {
  id: string;
  name: string;
  domain: string;
  cmsType: string;
  cmsApiUrl: string | null;
  cmsApiKey: string | null;
  language: string;
  postFrequency: string;
  autoPublish: boolean;
}

const schema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  language: z.string(),
  postFrequency: z.string(),
  cmsApiUrl: z.string().optional(),
  cmsApiKey: z.string().optional(),
  autoPublish: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function SiteSettingsClient({ site }: { site: Site }) {
  const router = useRouter();
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: site.name,
      domain: site.domain,
      language: site.language,
      postFrequency: site.postFrequency,
      cmsApiUrl: site.cmsApiUrl ?? "",
      cmsApiKey: site.cmsApiKey ?? "",
      autoPublish: site.autoPublish,
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = form;

  async function onSubmit(data: FormData) {
    setIsSaving(true);
    try {
      await axios.patch(`/api/sites/${site.id}`, data);
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function testConnection() {
    setTestStatus("testing");
    try {
      const apiUrl = watch("cmsApiUrl");
      const apiKey = watch("cmsApiKey");
      await axios.post("/api/seo/test-cms", {
        cmsType: site.cmsType,
        cmsApiUrl: apiUrl,
        cmsApiKey: apiKey,
      });
      setTestStatus("ok");
    } catch {
      setTestStatus("fail");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Site Settings</h2>
        <p className="text-slate-500 mt-1">{site.name}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Site Name</Label>
              <Input className="mt-1" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Domain</Label>
              <Input className="mt-1" {...register("domain")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Language</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("language")}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              <div>
                <Label>Post Frequency</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("postFrequency")}
                >
                  <option value="daily">Daily</option>
                  <option value="3xweek">3x per week</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CMS */}
        {(site.cmsType === "wordpress" || site.cmsType === "custom") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                CMS Integration
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testStatus === "testing"}
                  className="text-xs text-blue-600 hover:underline font-normal flex items-center gap-1"
                >
                  {testStatus === "testing" && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {testStatus === "ok" && (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
                  {testStatus === "fail" && (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  Test Connection
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Site URL</Label>
                <Input
                  className="mt-1"
                  placeholder="https://mysite.com"
                  {...register("cmsApiUrl")}
                />
              </div>
              <div>
                <Label>
                  {site.cmsType === "wordpress"
                    ? "Application Password"
                    : "API Key"}
                </Label>
                <Input
                  type="password"
                  className="mt-1"
                  {...register("cmsApiKey")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Publishing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Publishing</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-600"
                {...register("autoPublish")}
              />
              <div>
                <div className="text-sm font-medium">Auto-publish</div>
                <div className="text-xs text-slate-500">
                  Automatically publish generated articles to your CMS
                </div>
              </div>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
