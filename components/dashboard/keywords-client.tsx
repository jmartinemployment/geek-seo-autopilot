"use client";

import { useState } from "react";
import { Plus, Search, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KeywordResearchModal } from "./keyword-research-modal";

interface Keyword {
  id: string;
  keyword: string;
  searchVolume: string | null;
  difficulty: number | null;
  intent: string | null;
  status: string;
  topicCluster: string | null;
  longTail: boolean;
  suggestedTitle: string | null;
  createdAt: Date;
}

interface KeywordsClientProps {
  siteId: string;
  siteDomain: string;
  initialKeywords: Keyword[];
}

const DIFFICULTY_LABEL = (d: number | null) => {
  if (d === null) return null;
  if (d <= 30) return { label: "Easy", color: "bg-green-100 text-green-700" };
  if (d <= 60) return { label: "Medium", color: "bg-yellow-100 text-yellow-700" };
  return { label: "Hard", color: "bg-red-100 text-red-700" };
};

const INTENT_COLOR: Record<string, string> = {
  informational: "bg-blue-100 text-blue-700",
  commercial: "bg-purple-100 text-purple-700",
  transactional: "bg-green-100 text-green-700",
  navigational: "bg-slate-100 text-slate-700",
};

export function KeywordsClient({
  siteId,
  siteDomain,
  initialKeywords,
}: KeywordsClientProps) {
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Keywords</h2>
          <p className="text-slate-500 mt-1">{siteDomain}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Research Keywords
        </Button>
      </div>

      {keywords.length === 0 && !showModal ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No keywords yet
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm">
            Use AI-powered keyword research to discover high-value topics for
            your site.
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Research Keywords
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter keywords..."
              className="pl-9"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filtered.map((kw) => {
              const diff = DIFFICULTY_LABEL(kw.difficulty);
              return (
                <Card key={kw.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900">
                          {kw.keyword}
                        </div>
                        {kw.suggestedTitle && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            → {kw.suggestedTitle}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {kw.searchVolume && (
                          <span className="text-xs text-slate-500 capitalize">
                            {kw.searchVolume} vol
                          </span>
                        )}
                        {diff && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}
                          >
                            {diff.label}
                          </span>
                        )}
                        {kw.intent && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              INTENT_COLOR[kw.intent] ??
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {kw.intent}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs capitalize">
                          {kw.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <KeywordResearchModal
        open={showModal}
        onClose={() => setShowModal(false)}
        siteId={siteId}
        onKeywordsAdded={() => {
          // Refresh will happen via router.refresh() — for now optimistic update is skipped
          window.location.reload();
        }}
      />
    </div>
  );
}
