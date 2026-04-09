import {
  Brain,
  Image,
  Link2,
  Mic,
  Users,
  Calendar,
  BarChart3,
  Globe,
  FileText,
  Zap,
  Shield,
  Sparkles,
  Target,
  BookOpen,
  Layers,
} from "lucide-react";

const FEATURES = [
  { icon: Brain, label: "AI Keyword Research", color: "text-blue-500 bg-blue-50" },
  { icon: FileText, label: "1,500+ Word Articles", color: "text-purple-500 bg-purple-50" },
  { icon: Target, label: "11-Point SEO Scoring", color: "text-green-500 bg-green-50" },
  { icon: Link2, label: "Internal Link Suggestions", color: "text-orange-500 bg-orange-50" },
  { icon: Image, label: "Auto Image Alt Text", color: "text-pink-500 bg-pink-50" },
  { icon: Mic, label: "Brand Voice AI", color: "text-indigo-500 bg-indigo-50" },
  { icon: Users, label: "Audience Targeting", color: "text-teal-500 bg-teal-50" },
  { icon: Calendar, label: "Content Calendar", color: "text-yellow-600 bg-yellow-50" },
  { icon: BarChart3, label: "Analytics Dashboard", color: "text-red-500 bg-red-50" },
  { icon: Globe, label: "WordPress Auto-Publish", color: "text-blue-600 bg-blue-50" },
  { icon: Sparkles, label: "Readability Analysis", color: "text-violet-500 bg-violet-50" },
  { icon: BookOpen, label: "Knowledge Base", color: "text-emerald-500 bg-emerald-50" },
  { icon: Zap, label: "Meta Tag Generation", color: "text-amber-500 bg-amber-50" },
  { icon: Shield, label: "Topic Cluster Planning", color: "text-cyan-500 bg-cyan-50" },
  { icon: Layers, label: "Multi-Site Management", color: "text-fuchsia-500 bg-fuchsia-50" },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to dominate search
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            A complete AI SEO platform — not just a content generator.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-4 py-2.5 hover:shadow-sm transition-shadow"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${f.color.split(" ")[1]}`}>
                <f.icon className={`w-3.5 h-3.5 ${f.color.split(" ")[0]}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
