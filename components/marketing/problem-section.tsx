import { Clock, DollarSign, TrendingDown, AlertTriangle } from "lucide-react";

const PROBLEMS = [
  {
    icon: Clock,
    title: "SEO takes hours every week",
    description:
      "Keyword research, writing, editing, publishing — it's a full-time job just to stay competitive.",
  },
  {
    icon: DollarSign,
    title: "Agencies charge $3,000+/month",
    description:
      "Most small businesses can't afford an SEO agency. DIY tools have a steep learning curve.",
  },
  {
    icon: TrendingDown,
    title: "Content goes stale fast",
    description:
      "Google rewards fresh, consistent content. Posting once a month isn't enough anymore.",
  },
  {
    icon: AlertTriangle,
    title: "AI content gets penalized",
    description:
      "Generic AI content is easy to spot. You need SEO-optimized articles that actually rank.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Running a business is hard enough.
            <br />
            <span className="text-blue-600">SEO shouldn&apos;t be too.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Most business owners know they need SEO — but don&apos;t have the
            time, budget, or expertise to do it consistently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
