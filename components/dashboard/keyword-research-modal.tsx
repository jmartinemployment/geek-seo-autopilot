"use client";

import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ResearchKeyword {
  keyword: string;
  searchVolume: string;
  difficulty: number;
  intent: string;
  longTail: boolean;
  suggestedTitle: string;
}

interface KeywordResearchModalProps {
  open: boolean;
  onClose: () => void;
  siteId: string;
  onKeywordsAdded: () => void;
}

export function KeywordResearchModal({
  open,
  onClose,
  siteId,
  onKeywordsAdded,
}: KeywordResearchModalProps) {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchKeyword[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function handleResearch() {
    if (!topic.trim()) return;
    setIsLoading(true);
    setResults([]);
    try {
      const res = await axios.post("/api/seo/keyword-research", {
        siteId,
        topic,
      });
      setResults(res.data.keywords ?? []);
      setSelected(new Set(res.data.keywords.map((_: unknown, i: number) => i)));
    } catch {
      toast.error("Keyword research failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddSelected() {
    const toAdd = results.filter((_, i) => selected.has(i));
    try {
      await axios.post(`/api/seo/keyword-research/save`, {
        siteId,
        keywords: toAdd,
      });
      toast.success(`Added ${toAdd.length} keywords`);
      onKeywordsAdded();
      handleClose();
    } catch {
      toast.error("Failed to save keywords.");
    }
  }

  function handleClose() {
    setTopic("");
    setResults([]);
    setSelected(new Set());
    onClose();
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((_, i) => i)));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyword Research</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="topic">Topic or Niche</Label>
              <Input
                id="topic"
                placeholder="e.g. coffee shops delray beach"
                className="mt-1"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleResearch}
                disabled={isLoading || !topic.trim()}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Research"
                )}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500">
                Claude is researching keywords...
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {results.length} keywords found
                </span>
                <button
                  onClick={toggleAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selected.size === results.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.map((kw, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const next = new Set(selected);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      setSelected(next);
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selected.has(i)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {selected.has(i) && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                          )}
                          <span className="font-medium text-sm">
                            {kw.keyword}
                          </span>
                          {kw.longTail && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              long-tail
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {kw.suggestedTitle}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span className="text-slate-500 capitalize">
                          {kw.searchVolume}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded capitalize ${
                            kw.difficulty <= 30
                              ? "bg-green-100 text-green-700"
                              : kw.difficulty <= 60
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {kw.difficulty <= 30
                            ? "Easy"
                            : kw.difficulty <= 60
                            ? "Med"
                            : "Hard"}
                        </span>
                        <span className="text-slate-500 capitalize">
                          {kw.intent}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selected.size === 0}
                >
                  Add {selected.size} keyword{selected.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
