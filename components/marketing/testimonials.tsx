import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "We went from 200 to 4,000 monthly visitors in 90 days. The AI writes better SEO content than our old agency — and it costs 10x less.",
    name: "Sarah M.",
    role: "Owner, Coastal Boutique",
    avatar: "SM",
    rating: 5,
  },
  {
    quote:
      "I was skeptical about AI content but the articles it generates actually rank. We're on page 1 for 12 keywords we never targeted before.",
    name: "Marcus T.",
    role: "Founder, Local HVAC Co.",
    avatar: "MT",
    rating: 5,
  },
  {
    quote:
      "Set it up once, pointed it at my WordPress site, and it just runs. I get 4 new SEO articles a week without touching anything.",
    name: "Jennifer L.",
    role: "Real Estate Agent",
    avatar: "JL",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Real results from real businesses
          </h2>
          <p className="text-slate-500 text-lg">
            Join hundreds of businesses growing with AI-powered SEO.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>

              <blockquote className="text-slate-700 leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {t.name}
                  </div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
