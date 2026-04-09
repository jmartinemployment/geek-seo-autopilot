import { CheckCircle2, XCircle } from "lucide-react";

const SEO_CHECKS = [
  { label: "Focus keyword in title", status: "good" },
  { label: "Focus keyword in introduction", status: "good" },
  { label: "Keyword density 0.5–2.5%", status: "good" },
  { label: "Meta description length", status: "good" },
  { label: "Content length 1,500+ words", status: "good" },
  { label: "Internal links", status: "good" },
  { label: "Image alt text with keyword", status: "warning" },
  { label: "Outbound links", status: "good" },
];

export function ContentQualitySection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* SEO score mockup */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900">SEO Analysis</h3>
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * 0.12}`}
                      strokeLinecap="round"
                      className="stroke-green-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-600">
                    88
                  </div>
                </div>
                <span className="text-sm text-slate-500">/ 100</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {SEO_CHECKS.map((check) => (
                <div key={check.label} className="flex items-center gap-3">
                  {check.status === "good" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-yellow-400 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">{check.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copy */}
          <div>
            <div className="text-sm font-semibold text-blue-600 tracking-widest uppercase mb-3">
              Content Quality
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
              11-point SEO scoring built right in
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              Every article is automatically scored against 11 SEO checks —
              keyword placement, content length, meta tags, internal links, and
              more — ported from our Geek-SEO WordPress plugin.
            </p>
            <p className="text-slate-500 leading-relaxed">
              The live score updates as you edit, so you can fix issues before
              publishing. Readability is also scored using the Flesch Reading
              Ease algorithm.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
