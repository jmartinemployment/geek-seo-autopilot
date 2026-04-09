"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SEOAnalysisResult } from "@/lib/seo-analysis";
import type { ReadabilityResult } from "@/lib/readability";

// Dynamically import the markdown editor (no SSR)
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface ArticleEditorProps {
  article: {
    id: string;
    siteId: string;
    title: string;
    slug: string;
    content: string;
    targetKeyword: string;
    metaTitle: string;
    metaDescription: string;
    wordCount: number;
    seoScore: number;
    readabilityScore: number;
    status: string;
    siteName: string;
    cmsType: string;
  };
}

const STATUS_ICON = {
  good: CheckCircle2,
  warning: AlertCircle,
  danger: XCircle,
};

const STATUS_COLOR = {
  good: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

function ScoreGauge({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const color =
    score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600";
  const ring =
    score >= 70
      ? "stroke-green-500"
      : score >= 40
      ? "stroke-yellow-500"
      : "stroke-red-500";

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={cn("transition-all duration-500", ring)}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm font-bold",
            color
          )}
        >
          {score}
        </div>
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(article.content);
  const [metaTitle, setMetaTitle] = useState(article.metaTitle);
  const [metaDescription, setMetaDescription] = useState(article.metaDescription);
  const [slug, setSlug] = useState(article.slug);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [seoResult, setSeoResult] = useState<SEOAnalysisResult | null>(null);
  const [readabilityResult, setReadabilityResult] =
    useState<ReadabilityResult | null>(null);

  const analyze = useCallback(async () => {
    if (!content) return;
    setIsAnalyzing(true);
    try {
      const res = await axios.post("/api/seo/analyze-content", {
        keyword: article.targetKeyword,
        title: metaTitle,
        metaDescription,
        slug,
        content,
      });
      setSeoResult(res.data.seo);
      setReadabilityResult(res.data.readability);
    } catch {
      // silent
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, metaTitle, metaDescription, slug, article.targetKeyword]);

  // Debounce analysis on content change
  useEffect(() => {
    const timer = setTimeout(analyze, 1000);
    return () => clearTimeout(timer);
  }, [analyze]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await axios.patch(
        `/api/seo/articles/${article.id}`,
        {
          content,
          metaTitle,
          metaDescription,
          slug,
          seoScore: seoResult?.score,
          readabilityScore: readabilityResult?.score,
        }
      );
      toast.success("Article saved");
    } catch {
      toast.error("Failed to save article");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    try {
      await axios.post(`/api/seo/publish/wordpress`, {
        articleId: article.id,
        siteId: article.siteId,
      });
      toast.success("Published to WordPress!");
      router.refresh();
    } catch {
      toast.error("Failed to publish. Check your CMS settings.");
    }
  }

  const wordCount = content
    .replace(/[#*`_]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {article.title}
            </h2>
            <p className="text-sm text-slate-500">
              {article.siteName} · {article.targetKeyword} · {wordCount} words
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {article.cmsType === "wordpress" && (
              <Button size="sm" onClick={handlePublish}>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-xs">SEO Title ({metaTitle.length}/60)</Label>
            <Input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">URL Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">
              Meta Description ({metaDescription.length}/160)
            </Label>
            <Input
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        {/* Markdown editor */}
        <div className="flex-1 overflow-hidden" data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(v) => setContent(v ?? "")}
            height="100%"
            preview="edit"
          />
        </div>
      </div>

      {/* SEO Sidebar */}
      <div className="w-72 shrink-0 overflow-y-auto space-y-4">
        {/* Scores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              SEO Scores
              {isAnalyzing && (
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around">
              <ScoreGauge
                score={seoResult?.score ?? article.seoScore}
                label="SEO"
              />
              <ScoreGauge
                score={readabilityResult?.score ?? article.readabilityScore}
                label="Readability"
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Checks */}
        {seoResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SEO Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {seoResult.checks.map((check) => {
                const Icon = STATUS_ICON[check.status];
                return (
                  <div
                    key={check.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 mt-0.5 shrink-0",
                        STATUS_COLOR[check.status]
                      )}
                    />
                    <div>
                      <div className="font-medium text-slate-700">
                        {check.label}
                      </div>
                      <div className="text-slate-500 leading-snug">
                        {check.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Readability checks */}
        {readabilityResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Readability</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {readabilityResult.checks.map((check) => {
                const Icon = STATUS_ICON[check.status];
                return (
                  <div
                    key={check.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 mt-0.5 shrink-0",
                        STATUS_COLOR[check.status]
                      )}
                    />
                    <div>
                      <div className="font-medium text-slate-700">
                        {check.label}
                      </div>
                      <div className="text-slate-500 leading-snug">
                        {check.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Article info */}
        <Card>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <Badge
                variant={
                  article.status === "published" ? "default" : "secondary"
                }
                className="capitalize text-xs"
              >
                {article.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Keyword</span>
              <span className="font-medium">{article.targetKeyword}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Words</span>
              <span className="font-medium">{wordCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
