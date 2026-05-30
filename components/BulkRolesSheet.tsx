"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Wand2, FileText, Image as ImageIcon, Loader2, AlertCircle, Plus, X, Check, Camera,
} from "lucide-react";
import { addRoles } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type ParsedRole = {
  name: string;
  description: string;
  sides?: string;
  payRange?: string;
  shootDates?: string;
};

type Props = {
  projectId: string;
  mode: "full" | "quick";
  onClose: () => void;
  onCreated: () => void;
};

export function BulkRolesSheet({ projectId, mode, onClose, onCreated }: Props) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRole[] | null>(null);
  const [keep, setKeep] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function parse(payload: { text?: string; imageBase64?: string; imageMediaType?: string }) {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/aria/parse-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "AI parsing failed");
      }
      const data: { roles: ParsedRole[] } = await res.json();
      if (!data.roles?.length) throw new Error("לא זיהיתי תפקידים. נסה טקסט ברור יותר.");
      setParsed(data.roles);
      setKeep(new Set(data.roles.map((_, i) => i)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setParsing(false);
    }
  }

  async function handleFile(file: File) {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType = (file.type === "image/png" || file.type === "image/webp")
          ? (file.type as "image/png" | "image/webp")
          : "image/jpeg";
        parse({ imageBase64: base64, imageMediaType: mediaType });
      };
      reader.readAsDataURL(file);
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const t = await file.text();
      setText(t);
      parse({ text: t });
    } else {
      setError("פורמט לא נתמך — תמונה (JPG/PNG) או קובץ טקסט.");
    }
  }

  function commit() {
    if (!parsed) return;
    const toCreate = parsed.filter((_, i) => keep.has(i));
    if (toCreate.length === 0) return;
    addRoles(toCreate.map((r) => ({
      projectId,
      name: r.name,
      description: r.description,
      sides: r.sides && r.sides.trim().length > 0 ? r.sides : undefined,
      selfTapeInstructions: undefined,
      deadline: undefined,
      shootDates: r.shootDates && r.shootDates.trim().length > 0 ? r.shootDates : undefined,
      payRange: r.payRange && r.payRange.trim().length > 0 ? r.payRange : undefined,
    })));
    onCreated();
  }

  function toggleKeep(i: number) {
    setKeep((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function patchRole(i: number, patch: Partial<ParsedRole>) {
    if (!parsed) return;
    const next = [...parsed];
    next[i] = { ...next[i], ...patch };
    setParsed(next);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />

        {!parsed ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-gold" />
              <h2 className="font-display text-2xl">AI Bulk Roles</h2>
            </div>
            <p className="text-xs text-text-muted mb-4">
              העלה casting breakdown או הדבק טקסט — Aria תזהה את כל התפקידים.
            </p>

            {/* Upload buttons — camera / gallery / file */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="h-20 rounded-2xl bg-bg border border-border flex flex-col items-center justify-center gap-1 hover:border-gold/40"
              >
                <Camera className="w-5 h-5 text-gold" />
                <span className="text-xs font-semibold">מצלמה</span>
                <span className="text-[9px] text-text-subtle">צלם breakdown</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-20 rounded-2xl bg-bg border border-border flex flex-col items-center justify-center gap-1 hover:border-gold/40"
              >
                <ImageIcon className="w-5 h-5 text-gold" />
                <span className="text-xs font-semibold">גלריה</span>
                <span className="text-[9px] text-text-subtle">צילום מסך</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-20 rounded-2xl bg-bg border border-border flex flex-col items-center justify-center gap-1 hover:border-gold/40"
              >
                <FileText className="w-5 h-5 text-gold" />
                <span className="text-xs font-semibold">קובץ</span>
                <span className="text-[9px] text-text-subtle">.txt / PDF</span>
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            <div className="text-[10px] uppercase tracking-widest text-text-subtle text-center my-2">
              או הדבק
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"MAYA — Lead, 28-32, Hebrew + English, emotional range\nDAVID — Support, 35-45, gritty, military background\nBARTENDER — Day player, 40+, charm"}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-xs leading-relaxed resize-y"
              dir="auto"
            />

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span className="text-xs text-danger">{error}</span>
              </div>
            )}

            <button
              disabled={!text.trim() || parsing}
              onClick={() => parse({ text })}
              className="w-full mt-4 h-12 rounded-2xl bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {parsing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> מנתח...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> נתח עם Aria</>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-xl">סקור ואשר</h2>
                <p className="text-[11px] text-text-muted mt-0.5">
                  זיהיתי <span className="text-gold font-semibold tnum">{parsed.length}</span> תפקידים · {keep.size} נבחרים
                </p>
              </div>
              <button onClick={() => setParsed(null)} className="text-[11px] text-text-muted">
                התחל מחדש
              </button>
            </div>

            <div className="space-y-2 max-h-[55dvh] overflow-y-auto -mx-2 px-2">
              {parsed.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl p-3 border transition",
                    keep.has(i)
                      ? "bg-gold/5 border-gold/30"
                      : "bg-bg border-border opacity-50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleKeep(i)}
                      className={cn(
                        "w-6 h-6 rounded-md grid place-items-center shrink-0 mt-0.5 border",
                        keep.has(i)
                          ? "bg-gold border-gold text-bg"
                          : "bg-bg border-border text-text-muted"
                      )}
                    >
                      {keep.has(i) && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        value={r.name}
                        onChange={(e) => patchRole(i, { name: e.target.value })}
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                      />
                      <textarea
                        value={r.description}
                        onChange={(e) => patchRole(i, { description: e.target.value })}
                        rows={2}
                        className="w-full mt-1 text-[11px] text-text-muted leading-relaxed bg-transparent resize-none outline-none"
                      />
                      {(r.payRange || r.shootDates) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.shootDates && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated border border-border text-text-muted">
                              {r.shootDates}
                            </span>
                          )}
                          {r.payRange && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated border border-border text-gold">
                              {r.payRange}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled={keep.size === 0}
              onClick={commit}
              className={cn(
                "mt-4 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                keep.size > 0 ? "bg-gold text-bg" : "bg-bg text-text-subtle"
              )}
            >
              <Plus className="w-4 h-4" /> צור {keep.size} תפקיד{keep.size !== 1 ? "ים" : ""}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
