import { CheckCircle2 } from "lucide-react";

const CMS_PLATFORMS = [
  { name: "WordPress", emoji: "🟦", color: "bg-blue-50 border-blue-100" },
  { name: "Webflow", emoji: "🔷", color: "bg-blue-50 border-blue-100" },
  { name: "Shopify", emoji: "🟩", color: "bg-green-50 border-green-100" },
  { name: "Wix", emoji: "🟨", color: "bg-yellow-50 border-yellow-100" },
  { name: "Ghost", emoji: "⚫", color: "bg-slate-50 border-slate-200" },
  { name: "Custom API", emoji: "⚙️", color: "bg-slate-50 border-slate-200" },
];

const PUBLISH_FEATURES = [
  "Publishes as draft or live — your choice",
  "Schedules posts on your content calendar",
  "Supports multiple sites simultaneously",
  "Auto-sets meta title + description",
  "Tested WordPress application password auth",
];

export function AutoPublishSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-sm font-semibold text-blue-600 tracking-widest uppercase mb-3">
              Auto-Publishing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
              Publish directly to your CMS — no copy-paste
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Connect your WordPress site once and Geek SEO Autopilot publishes
              every generated article automatically — with proper meta tags,
              slug, and formatting.
            </p>
            <ul className="space-y-3">
              {PUBLISH_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-500 mb-4">
              Supported platforms
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CMS_PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${platform.color}`}
                >
                  <span className="text-2xl">{platform.emoji}</span>
                  <span className="font-medium text-slate-700 text-sm">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
