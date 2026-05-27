"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Library, ChevronRight, Sparkles, FileVideo, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadScenes, countTakes,
  type SavedScene,
} from "@/lib/coach-store";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CoachLibraryPage() {
  const [scenes, setScenes] = useState<SavedScene[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setScenes(loadScenes());
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <Header back title={`ספריית סצנות (${scenes.length})`} />

      {loaded && scenes.length === 0 ? (
        <EmptyState
          icon={Library}
          tone="gold"
          title="עדיין אין סצנות שמורות"
          description="סצנות נשמרות אוטומטית כשאתה מתחיל אימון ב-Coach."
          ctaLabel="פתח Coach"
          ctaHref="/studio/coach"
        />
      ) : (
        <div className="px-4 pt-4 space-y-2.5">
          {scenes.map((s, i) => {
            const takes = countTakes(s.id);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/studio/coach/library/${s.id}`}
                  className="block rounded-2xl bg-bg-elevated border border-border overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-11 h-11 rounded-xl bg-gold/15 grid place-items-center shrink-0">
                      <Sparkles className="w-5 h-5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{s.title}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 truncate">
                        {s.characters.length} דמויות · {s.lines.length} שורות
                        {s.yourCharacter ? ` · אני: ${s.yourCharacter}` : ""}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {takes > 0 && (
                          <span className="text-[10px] text-gold font-semibold inline-flex items-center gap-1">
                            <FileVideo className="w-3 h-3" /> {takes} טייק{takes !== 1 ? "ים" : ""}
                          </span>
                        )}
                        {s.lastPracticedAt && (
                          <span className="text-[10px] text-text-subtle inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(s.lastPracticedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
