"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Globe, Code, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const schema = z.object({
  name: z.string().min(1, "Site name is required"),
  domain: z.string().min(1, "Domain is required"),
  language: z.string().min(1),
  cmsType: z.enum(["wordpress", "webflow", "wix", "shopify", "custom"]),
  cmsApiUrl: z.string().optional(),
  cmsApiKey: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CMS_OPTIONS = [
  { value: "wordpress", label: "WordPress", icon: "🟦" },
  { value: "webflow", label: "Webflow", icon: "🔷" },
  { value: "wix", label: "Wix", icon: "🟨" },
  { value: "shopify", label: "Shopify", icon: "🟩" },
  { value: "custom", label: "Custom API", icon: "⚙️" },
] as const;

const STEPS = [
  { label: "Basic Info", icon: Globe },
  { label: "CMS Setup", icon: Code },
  { label: "Launch", icon: Zap },
];

export function AddSiteWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      domain: "",
      language: "en",
      cmsType: "wordpress",
      cmsApiUrl: "",
      cmsApiKey: "",
    },
  });

  const { watch, setValue, register, formState: { errors } } = form;
  const cmsType = watch("cmsType");

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/sites", data);
      toast.success("Site created successfully!");
      router.push(`/sites/${res.data.id}`);
    } catch {
      toast.error("Failed to create site. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                i === step
                  ? "bg-blue-600 text-white"
                  : i < step
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <s.icon className="w-4 h-4" />
              )}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6",
                  i < step ? "bg-green-400" : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div>
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  placeholder="My Coffee Shop Blog"
                  className="mt-1"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="mycoffeeshop.com"
                  className="mt-1"
                  {...register("domain")}
                />
                {errors.domain && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.domain.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="language">Content Language</Label>
                <select
                  id="language"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("language")}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const valid = await form.trigger(["name", "domain"]);
                    if (valid) setStep(1);
                  }}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: CMS Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">CMS Integration</h3>
              <div>
                <Label>Select your CMS</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {CMS_OPTIONS.map((cms) => (
                    <button
                      key={cms.value}
                      type="button"
                      onClick={() => setValue("cmsType", cms.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-colors",
                        cmsType === cms.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="text-xl mb-1">{cms.icon}</div>
                      <div className="text-sm font-medium">{cms.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(cmsType === "wordpress" || cmsType === "custom") && (
                <>
                  <div>
                    <Label htmlFor="cmsApiUrl">
                      {cmsType === "wordpress"
                        ? "WordPress Site URL"
                        : "API Endpoint URL"}
                    </Label>
                    <Input
                      id="cmsApiUrl"
                      placeholder={
                        cmsType === "wordpress"
                          ? "https://mycoffeeshop.com"
                          : "https://api.example.com/posts"
                      }
                      className="mt-1"
                      {...register("cmsApiUrl")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cmsApiKey">
                      {cmsType === "wordpress"
                        ? "Application Password"
                        : "API Key"}
                    </Label>
                    <Input
                      id="cmsApiKey"
                      type="password"
                      placeholder={
                        cmsType === "wordpress"
                          ? "username:xxxx xxxx xxxx xxxx"
                          : "sk-..."
                      }
                      className="mt-1"
                      {...register("cmsApiKey")}
                    />
                    {cmsType === "wordpress" && (
                      <p className="text-xs text-slate-500 mt-1">
                        Generate in WordPress Admin → Users → Application
                        Passwords
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={() => setStep(2)}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Launch */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ready to Launch</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Site Name</span>
                  <span className="font-medium">{watch("name")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Domain</span>
                  <span className="font-medium">{watch("domain")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">CMS</span>
                  <span className="font-medium capitalize">
                    {watch("cmsType")}
                  </span>
                </div>
                {watch("cmsApiUrl") && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">API URL</span>
                    <span className="font-medium truncate ml-4">
                      {watch("cmsApiUrl")}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500">
                After creating your site, you can run keyword research and start
                generating articles right away.
              </p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Create Site
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
