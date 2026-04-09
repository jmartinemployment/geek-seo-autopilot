"use client";

import { SignInButton } from "./sign-in-button";
import { CheckCircle2, Star } from "lucide-react";

const TRUST_SIGNALS = [
  "No credit card required",
  "Free to start",
  "Cancel anytime",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-20 pb-28">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-sm font-medium mb-6">
          <Star className="w-3.5 h-3.5" />
          Powered by Claude claude-opus-4-6 AI
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Rank #1 on Google
          <br />
          <span className="text-blue-400">Without Lifting a Finger</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Geek SEO Autopilot researches keywords, writes 1,500-word SEO
          articles, and auto-publishes to WordPress — all on autopilot using
          Claude AI.
        </p>

        <div className="flex flex-col items-center gap-4 mb-10">
          <SignInButton />
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {TRUST_SIGNALS.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 bg-slate-700 rounded-full h-5 ml-4 max-w-xs" />
            </div>
            {/* Dashboard mockup */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-40 bg-slate-900 p-3 space-y-1 hidden sm:block">
                {["Dashboard", "Keywords", "Articles", "Calendar", "Analytics"].map(
                  (item, i) => (
                    <div
                      key={item}
                      className={`px-3 py-2 rounded-lg text-xs ${
                        i === 2
                          ? "bg-blue-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Articles", value: "24" },
                    { label: "Keywords", value: "147" },
                    { label: "SEO Score", value: "87" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-slate-700/50 rounded-lg p-3"
                    >
                      <div className="text-lg font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    "Best Coffee Shops in Delray Beach — 87/100",
                    "Top 10 SEO Tips for Small Businesses — 92/100",
                    "How to Rank on Google in 2025 — 79/100",
                  ].map((title) => (
                    <div
                      key={title}
                      className="bg-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">{title.split(" — ")[0]}</span>
                      <span className="text-green-400 shrink-0 ml-2">
                        {title.split(" — ")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
