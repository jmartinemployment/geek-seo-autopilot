import { Search, PenLine, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Research",
    description:
      "Claude AI searches the web for the best keywords in your niche — sorted by search volume, difficulty, and intent.",
    color: "bg-blue-500",
    detail: "20 keywords in 30 seconds",
  },
  {
    icon: PenLine,
    step: "02",
    title: "Write",
    description:
      "A 3-stage pipeline researches top-ranking articles, builds an outline, then writes a full 1,500+ word SEO article.",
    color: "bg-purple-500",
    detail: "1,500+ words in 60 seconds",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Publish",
    description:
      "One click publishes directly to WordPress (or Webflow, Shopify, custom). Schedule for auto-publish on a cadence.",
    color: "bg-green-500",
    detail: "Auto-publish to WordPress",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            From keyword to published in{" "}
            <span className="text-blue-600">under 2 minutes</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            A fully automated pipeline that handles every step of the SEO
            content process.
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {/* Step number */}
                <div
                  className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6 shadow-lg relative z-10`}
                >
                  <step.icon className="w-7 h-7 text-white" />
                </div>

                <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2">
                  Step {step.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-500 leading-relaxed mb-4">
                  {step.description}
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {step.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
