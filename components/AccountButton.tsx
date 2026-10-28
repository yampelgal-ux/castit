"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, LogOut, Cloud, CloudOff, Smartphone, X, LogIn } from "lucide-react";
import { useStore } from "@/lib/store";
import { isCloudConfigured, isRealUserId } from "@/lib/cloud/config";
import { signOutEverywhere } from "@/lib/cloud/auth";
import { useInstallPrompt } from "@/components/InstallPrompt";
import { LanguageToggle } from "@/components/LanguageToggle";

// Gear icon → account sheet: who's signed in, cloud sync status, install the
// app, language, sign out.
export function AccountButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const userId = useStore((s) => s.userId);
  const isAuthed = useStore((s) => s.isAuthed);
  const install = useInstallPrompt();
  const cloud = isCloudConfigured() && isRealUserId(userId);

  async function logout() {
    await signOutEverywhere();
    setOpen(false);
    router.replace("/welcome");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Account" className={`p-2 -mr-2 text-text-muted ${className}`}>
        <Settings className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] rounded-t-3xl bg-bg-elevated border-t border-border p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] space-y-4"
              dir="rtl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">החשבון שלי</h2>
                <button onClick={() => setOpen(false)} className="p-1 text-text-muted" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>

              <div className="rounded-2xl bg-bg-muted p-4">
                <div className="font-semibold">{profile.name || "אורח/ת"}</div>
                <div className="text-xs text-text-muted" dir="ltr">{profile.email || "—"}</div>
                <div className="text-[11px] text-text-subtle mt-1">{profile.role === "Casting Pro" ? "Casting Pro" : "Talent"}</div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border p-4">
                {cloud ? <Cloud className="w-5 h-5 text-gold shrink-0" /> : <CloudOff className="w-5 h-5 text-text-subtle shrink-0" />}
                <div className="text-sm">
                  {cloud ? (
                    <>
                      <div className="font-semibold">מסונכרן לענן</div>
                      <div className="text-xs text-text-muted">הפרויקטים, האודישנים והטייפים שלך זמינים בכל מכשיר שתתחבר/י ממנו.</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">מצב מקומי (דמו)</div>
                      <div className="text-xs text-text-muted">
                        {isCloudConfigured() ? "הנתונים נשמרים רק במכשיר הזה. התחבר/י כדי לשמור אותם בחשבון." : "השרת לא מוגדר — הנתונים נשמרים רק בדפדפן הזה."}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {install.canInstall && (
                <button onClick={install.prompt} className="w-full h-12 rounded-2xl bg-gold text-on-accent font-semibold flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" /> התקן את CastIt כאפליקציה
                </button>
              )}
              {install.iosHint && (
                <div className="text-xs text-text-muted rounded-2xl border border-border p-3">
                  להתקנה באייפון: לחצ/י על כפתור השיתוף <b>⎙</b> ואז &quot;הוסף למסך הבית&quot;.
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                <span className="text-sm">שפה</span>
                <LanguageToggle />
              </div>

              {isAuthed ? (
                <button onClick={logout} className="w-full h-12 rounded-2xl border border-border text-terra font-semibold flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> התנתקות
                </button>
              ) : (
                <button onClick={() => { setOpen(false); router.push("/login"); }} className="w-full h-12 rounded-2xl border border-border font-semibold flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" /> התחברות
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
