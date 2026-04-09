"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mic, Users, Trash2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Site {
  id: string;
  name: string;
}

interface BrandVoice {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  toneWords: string[];
  examples: string | null;
  isDefault: boolean;
  site: { name: string };
}

interface Audience {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  demographics: string | null;
  painPoints: string | null;
  goals: string | null;
  isDefault: boolean;
  site: { name: string };
}

const brandVoiceSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  toneWords: z.string(), // comma-separated
  examples: z.string().optional(),
});

const audienceSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  demographics: z.string().optional(),
  painPoints: z.string().optional(),
  goals: z.string().optional(),
});

type BrandVoiceForm = z.infer<typeof brandVoiceSchema>;
type AudienceForm = z.infer<typeof audienceSchema>;

interface Props {
  sites: Site[];
  initialBrandVoices: BrandVoice[];
  initialAudiences: Audience[];
}

const TONE_SUGGESTIONS = [
  "Professional", "Friendly", "Authoritative", "Casual",
  "Witty", "Educational", "Empathetic", "Bold", "Conversational",
];

export function BrandHubClient({ sites, initialBrandVoices, initialAudiences }: Props) {
  const [tab, setTab] = useState<"voices" | "audiences">("voices");
  const [brandVoices, setBrandVoices] = useState(initialBrandVoices);
  const [audiences, setAudiences] = useState(initialAudiences);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);

  const voiceForm = useForm<BrandVoiceForm>({
    resolver: zodResolver(brandVoiceSchema),
    defaultValues: { siteId: sites[0]?.id ?? "", name: "", toneWords: "" },
  });

  const audienceForm = useForm<AudienceForm>({
    resolver: zodResolver(audienceSchema),
    defaultValues: { siteId: sites[0]?.id ?? "", name: "" },
  });

  async function createBrandVoice(data: BrandVoiceForm) {
    try {
      const res = await axios.post("/api/brand/voices", {
        ...data,
        toneWords: data.toneWords.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setBrandVoices((prev) => [res.data, ...prev]);
      toast.success("Brand voice created");
      setShowVoiceModal(false);
      voiceForm.reset();
    } catch {
      toast.error("Failed to create brand voice");
    }
  }

  async function createAudience(data: AudienceForm) {
    try {
      const res = await axios.post("/api/brand/audiences", data);
      setAudiences((prev) => [res.data, ...prev]);
      toast.success("Audience created");
      setShowAudienceModal(false);
      audienceForm.reset();
    } catch {
      toast.error("Failed to create audience");
    }
  }

  async function deleteVoice(id: string) {
    try {
      await axios.delete(`/api/brand/voices/${id}`);
      setBrandVoices((prev) => prev.filter((v) => v.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function deleteAudience(id: string) {
    try {
      await axios.delete(`/api/brand/audiences/${id}`);
      setAudiences((prev) => prev.filter((a) => a.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Brand Hub</h2>
          <p className="text-slate-500 mt-1">
            Define your brand voice and target audiences for AI-generated content.
          </p>
        </div>
        <Button onClick={() => tab === "voices" ? setShowVoiceModal(true) : setShowAudienceModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {tab === "voices" ? "Add Brand Voice" : "Add Audience"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["voices", "audiences"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "voices" ? (
              <span className="flex items-center gap-2">
                <Mic className="w-4 h-4" /> Brand Voices
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Audiences
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Brand Voices */}
      {tab === "voices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brandVoices.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Mic className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 mb-4">No brand voices yet</p>
              <Button size="sm" onClick={() => setShowVoiceModal(true)}>
                Create your first brand voice
              </Button>
            </div>
          ) : (
            brandVoices.map((voice) => (
              <Card key={voice.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {voice.name}
                        {voice.isDefault && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{voice.site.name}</div>
                    </div>
                    <button
                      onClick={() => deleteVoice(voice.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {voice.description && (
                    <p className="text-sm text-slate-600 mb-3">{voice.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {voice.toneWords.map((word) => (
                      <Badge key={word} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Audiences */}
      {tab === "audiences" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {audiences.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 mb-4">No audiences yet</p>
              <Button size="sm" onClick={() => setShowAudienceModal(true)}>
                Create your first audience
              </Button>
            </div>
          ) : (
            audiences.map((audience) => (
              <Card key={audience.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-900">{audience.name}</div>
                      <div className="text-xs text-slate-500">{audience.site.name}</div>
                    </div>
                    <button
                      onClick={() => deleteAudience(audience.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {audience.description && (
                    <p className="text-sm text-slate-600 mb-2">{audience.description}</p>
                  )}
                  {audience.demographics && (
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Demographics:</span> {audience.demographics}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Brand Voice Modal */}
      <Dialog open={showVoiceModal} onOpenChange={setShowVoiceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Brand Voice</DialogTitle>
          </DialogHeader>
          <form onSubmit={voiceForm.handleSubmit(createBrandVoice)} className="space-y-4">
            <div>
              <Label>Site</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...voiceForm.register("siteId")}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Voice Name</Label>
              <Input className="mt-1" placeholder="e.g. Professional Blog" {...voiceForm.register("name")} />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" placeholder="Short description of this voice" {...voiceForm.register("description")} />
            </div>
            <div>
              <Label>Tone Words (comma-separated)</Label>
              <Input className="mt-1" placeholder="Professional, Friendly, Authoritative" {...voiceForm.register("toneWords")} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TONE_SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const current = voiceForm.getValues("toneWords");
                      const words = current ? current.split(",").map((w) => w.trim()) : [];
                      if (!words.includes(t)) {
                        voiceForm.setValue("toneWords", [...words, t].join(", "));
                      }
                    }}
                    className="text-xs px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Example Copy (optional)</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-24 resize-none"
                placeholder="Paste example copy in this brand voice..."
                {...voiceForm.register("examples")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowVoiceModal(false)}>Cancel</Button>
              <Button type="submit">Create Voice</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audience Modal */}
      <Dialog open={showAudienceModal} onOpenChange={setShowAudienceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Audience</DialogTitle>
          </DialogHeader>
          <form onSubmit={audienceForm.handleSubmit(createAudience)} className="space-y-4">
            <div>
              <Label>Site</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...audienceForm.register("siteId")}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Audience Name</Label>
              <Input className="mt-1" placeholder="e.g. Local Business Owners" {...audienceForm.register("name")} />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" placeholder="Who are they?" {...audienceForm.register("description")} />
            </div>
            <div>
              <Label>Demographics</Label>
              <Input className="mt-1" placeholder="Age 35-55, small business owners, US" {...audienceForm.register("demographics")} />
            </div>
            <div>
              <Label>Pain Points</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-20 resize-none"
                placeholder="What problems do they face?"
                {...audienceForm.register("painPoints")}
              />
            </div>
            <div>
              <Label>Goals</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-20 resize-none"
                placeholder="What do they want to achieve?"
                {...audienceForm.register("goals")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAudienceModal(false)}>Cancel</Button>
              <Button type="submit">Create Audience</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
