"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, Link2, Users, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Project, Role } from "@/lib/projects-store";
import { isCloudConfigured } from "@/lib/cloud/config";
import { useCanContactTalent } from "@/lib/cloud/trust";
import { createInviteLink, inviteUrl, loadInviteLink, setInviteClosed, type InviteLink } from "@/lib/cloud/invites";
import { NotApprovedNotice } from "@/components/TrustBanners";

/** A link for one role that the casting director sends on WhatsApp to actors not on CastIt yet. */
export function InviteLinkSheet({ role, project, onClose }: { role: Role; project: Project | null; onClose: () => void }) {
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const can = useCanContactTalent();
  const proName = useStore((s) => s.profile.name);
  const [link, setLink] = useState<InviteLink | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const deadline = role.deadline
    ? new Date(role.deadline).toLocaleDateString(he ? "he-IL" : "en-US", { day: "numeric", month: "long" })
    : "";
  const [message, setMessage] = useState(() => L(
    `היי! ${proName ? `כאן ${proName}. ` : ""}אני מלהק/ת ל${project?.title ? `"${project.title}"` : "פרויקט חדש"} ומזמין/ה אותך לשלוח סלף-טייפ לתפקיד ${role.name}.${deadline ? ` אפשר עד ${deadline}.` : ""} כל הפרטים והחומרים בקישור:`,
    `Hi! ${proName ? `It's ${proName}. ` : ""}I'm casting ${project?.title ? `"${project.title}"` : "a new project"} and I'd like you to send a self-tape for the role of ${role.name}.${deadline ? ` Due ${deadline}.` : ""} All the details are here:`
  ));

  useEffect(() => {
    if (!isCloudConfigured()) { setLink(null); return; }
    loadInviteLink(role.id).then((l) => { setLink(l); if (l?.message) setMessage(l.message); });
  }, [role.id]);

  async function ensureLink(): Promise<InviteLink | null> {
    if (link && !link.closed) return link;
    if (link?.closed) { const l = await setInviteClosed(link, false); if (l) setLink(l); return l; }
    setBusy(true); setFailed(false);
    const l = await createInviteLink(role, project, message.trim());
    setBusy(false);
    if (!l) { setFailed(true); return null; }
    setLink(l);
    return l;
  }

  async function sendWhatsApp() {
    // Open the window first so mobile browsers don't block it as a popup.
    const w = window.open("about:blank", "_blank");
    const l = await ensureLink();
    if (!l) { w?.close(); return; }
    const url = `https://wa.me/?text=${encodeURIComponent(`${message.trim()}\n${inviteUrl(l.code)}`)}`;
    if (w) w.location.href = url; else window.location.href = url;
  }

  async function copy() {
    const l = await ensureLink();
    if (!l) return;
    try { await navigator.clipboard.writeText(`${message.trim()}\n${inviteUrl(l.code)}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  async function toggleClosed() {
    if (!link) return;
    const l = await setInviteClosed(link, !link.closed);
    if (l) setLink(l);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto" dir={dir}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} role="dialog" aria-modal="true" aria-labelledby="invite-link-title"
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 id="invite-link-title" className="font-display text-2xl">{L("הזמנה בוואטסאפ", "Invite on WhatsApp")}</h2>
          <button onClick={onClose} aria-label={L("סגירה", "Close")} className="w-9 h-9 grid place-items-center rounded-full hover:bg-bg"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">
          {L("לשחקנים שעוד לא ב-CastIt. הם פותחים את הקישור, נרשמים, וההזמנה לתפקיד מחכה להם באפליקציה. כל מי שמצטרף מופיע כאן ברשימה.",
             "For actors who aren't on CastIt yet. They open the link, sign up, and the invite for this role is waiting in the app. Everyone who joins shows up in this list.")}
        </p>

        {!isCloudConfigured() ? (
          <p className="mt-4 text-sm p-3 rounded-2xl bg-bg border border-border">{L("קישורי הזמנה עובדים בחשבון אמיתי בלבד, לא במצב הדגמה.", "Invite links work with a real account only, not in demo mode.")}</p>
        ) : !can.ok ? (
          <div className="mt-4"><NotApprovedNotice /></div>
        ) : link === undefined ? (
          <p className="mt-6 text-sm text-text-muted text-center">{L("טוען…", "Loading…")}</p>
        ) : (
          <>
            <label htmlFor="invite-msg" className="block text-[0.6875rem] uppercase tracking-widest text-text-muted mt-4">{L("ההודעה", "Message")}</label>
            <textarea id="invite-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} dir="auto"
              className="mt-1 w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
            <p className="text-[0.6875rem] text-text-subtle mt-1">{L("הקישור יתווסף בסוף ההודעה.", "The link is added at the end.")}</p>

            {link && (
              <div className="mt-3 p-3 rounded-2xl bg-bg border border-border text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gold shrink-0" aria-hidden />
                <span className="truncate flex-1" dir="ltr">{inviteUrl(link.code)}</span>
                <span className="text-xs text-text-muted inline-flex items-center gap-1 shrink-0"><Users className="w-3.5 h-3.5" aria-hidden /> {link.joined ?? 0}</span>
              </div>
            )}
            {link?.closed && <p className="text-xs text-terra mt-2">{L("הקישור סגור כרגע. שליחה תפתח אותו מחדש.", "The link is closed. Sending opens it again.")}</p>}

            <button onClick={sendWhatsApp} disabled={busy || !message.trim()}
              className="mt-4 w-full h-12 rounded-2xl bg-[#25D366] text-black font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? "…" : L("שליחה בוואטסאפ", "Send on WhatsApp")}
            </button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={copy} disabled={busy}
                className="h-11 rounded-2xl border border-border text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                {copied ? <><CheckCircle2 className="w-4 h-4 text-sage" aria-hidden /> {L("הועתק", "Copied")}</> : <><Copy className="w-4 h-4" aria-hidden /> {L("העתקה", "Copy")}</>}
              </button>
              <button onClick={toggleClosed} disabled={!link}
                className="h-11 rounded-2xl border border-border text-sm font-semibold disabled:opacity-40">
                {link?.closed ? L("פתיחת הקישור", "Reopen link") : L("סגירת הקישור", "Close link")}
              </button>
            </div>
            {failed && <p className="text-xs text-terra mt-2" role="alert">{L("לא הצלחנו ליצור קישור. נסו שוב.", "Couldn't create the link. Try again.")}</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
