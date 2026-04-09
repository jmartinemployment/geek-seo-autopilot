"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Keyword {
  id: string;
  keyword: string;
  intent: string | null;
}

interface GenerateArticleWizardProps {
  siteId: string;
  keywords: Keyword[];
}

type GenerationStep = {
  label: string;
  status: "pending" | "running" | "done" | "error";
};

export function GenerateArticleWizard({
  siteId,
  keywords,
}: GenerateArticleWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [customKeyword, setCustomKeyword] = useState("");
  const [wordCount, setWordCount] = useState(1500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { label: "Researching top-ranking articles", status: "pending" },
    { label: "Building outline & structure", status: "pending" },
    { label: "Writing full article", status: "pending" },
    { label: "Analyzing SEO score", status: "pending" },
  ]);

  const finalKeyword = keyword || customKeyword;

  async function handleGenerate() {
    if (!finalKeyword) return;
    setStep(2);
    setIsGenerating(true);

    const steps = [...generationSteps];

    try {
      const response = await fetch("/api/seo/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, keyword: finalKeyword, wordCount }),
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.step !== undefined) {
              steps[data.step] = {
                ...steps[data.step],
                status: data.status,
              };
              setGenerationSteps([...steps]);
            }
            if (data.articleId) {
              toast.success("Article generated!");
              router.push(`/sites/${siteId}/articles/${data.articleId}`);
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      toast.error("Generation failed. Please try again.");
      setIsGenerating(false);
      setStep(1);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Select Keyword", "Configure", "Generating"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                i === step
                  ? "bg-blue-600 text-white"
                  : i < step
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {label}
            </div>
            {i < 2 && (
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
          {/* Step 0: Select keyword */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select a Keyword</h3>

              {keywords.length > 0 && (
                <div>
                  <Label>From your keyword list</Label>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {keywords.slice(0, 20).map((kw) => (
                      <button
                        key={kw.id}
                        type="button"
                        onClick={() => {
                          setKeyword(kw.keyword);
                          setCustomKeyword("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition-colors",
                          keyword === kw.keyword
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className="font-medium">{kw.keyword}</span>
                        {kw.intent && (
                          <span className="text-xs text-slate-500 ml-2 capitalize">
                            {kw.intent}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="customKeyword">Or enter a keyword</Label>
                <Input
                  id="customKeyword"
                  placeholder="e.g. best coffee shops delray beach"
                  className="mt-1"
                  value={customKeyword}
                  onChange={(e) => {
                    setCustomKeyword(e.target.value);
                    setKeyword("");
                  }}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={!finalKeyword}
                  onClick={() => setStep(1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Configure */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configure Article</h3>

              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-slate-500">Keyword: </span>
                <span className="font-medium">{finalKeyword}</span>
              </div>

              <div>
                <Label>Target Word Count: {wordCount}</Label>
                <input
                  type="range"
                  min={800}
                  max={3000}
                  step={100}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full mt-2 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>800</span>
                  <span>3000</span>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Article
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Generating your article</h3>
              <p className="text-sm text-slate-500">
                Claude is writing a {wordCount}-word article for &ldquo;
                {finalKeyword}&rdquo;. This takes 30–60 seconds.
              </p>

              <div className="space-y-3">
                {generationSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {s.status === "done" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : s.status === "running" ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        s.status === "done"
                          ? "text-slate-900"
                          : s.status === "running"
                          ? "text-blue-600 font-medium"
                          : "text-slate-400"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {!isGenerating && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGenerating(false);
                    setStep(1);
                    setGenerationSteps(
                      generationSteps.map((s) => ({ ...s, status: "pending" }))
                    );
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
