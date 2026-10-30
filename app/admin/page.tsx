"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Flag, Check, X, Ban, Undo2, ExternalLink, MessageSquareText } from "lucide-react";
import { Header } from "@/components/Header";
import { useT } from "@/lib/i18n";
import {
  adminPros, adminReports, adminSetBanned, adminSetProStatus, adminSetReportStatus, useTrust,
  type AdminPro, type AdminReport, type ProStatus,
} from "@/lib/cloud/trust";
import { cn } from "@/lib/utils";

const REASON_HE: Record<string, string> = {
  harassment: "הטרדה", sexual: "תוכן מיני / פנייה לא הולמת", minor: "פגיעה בקטין/ה", fake: "פרופיל מזויף",
  scam: "הונאה / בקשת כסף", spam: "ספאם", hate: "שנאה / אלימות", other: "אחר",
};
const KIND_HE: Record<string, string> = { user: "משתמש", reel: "סרטון", comment: "תגובה", message: "שיחה", feedback: "משוב" };
const FEEDBACK_HE: Record<string, string> = { bug: "משהו לא עובד", idea: "רעיון", other: "אחר" };
const STATUS_HE: Record<ProStatus, string> = { none: "—", pending: "ממתין", approved: "מאושר", rejected: "נדחה" };

export default function AdminPage() {
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const trust = useTrust();
  const [tab, setTab] = useState<"pros" | "reports" | "feedback">("pros");
  const [pros, setPros] = useState<AdminPro[] | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);

  async function load() {
    const [p, r] = await Promise.all([adminPros(), adminReports()]);
    setPros(p ?? []); setReports(r ?? []);
  }
  useEffect(() => { if (trust.isAdmin) void load(); }, [trust.isAdmin]);

  if (!trust.loadedFor) return <div className="p-8 text-center text-sm text-text-muted">{L("טוען…", "Loading…")}</div>;
  if (!trust.isAdmin) {
    return (
      <div className="min-h-dvh" dir={dir}>
        <Header back title={L("ניהול", "Admin")} />
        <p className="p-8 text-center text-sm text-text-muted">{L("המסך הזה פתוח רק למנהלים.", "This screen is for admins only.")}</p>
      </div>
    );
  }

  const pending = pros?.filter((p) => p.pro_status === "pending").length ?? 0;
  const abuse = reports?.filter((r) => r.target_kind !== "feedback") ?? null;
  const feedback = reports?.filter((r) => r.target_kind === "feedback") ?? null;
  const open = abuse?.filter((r) => r.status === "open").length ?? 0;
  const openFb = feedback?.filter((r) => r.status === "open").length ?? 0;

  async function setPro(id: string, s: ProStatus) {
    if (await adminSetProStatus(id, s)) setPros((cur) => cur?.map((p) => (p.id === id ? { ...p, pro_status: s, verified: s === "approved" } : p)) ?? null);
  }
  async function ban(userId: string, banned: boolean) {
    if (!(await adminSetBanned(userId, banned))) return;
    setPros((cur) => cur?.map((p) => (p.id === userId ? { ...p, banned } : p)) ?? null);
    setReports((cur) => cur?.map((r) => (r.target_user === userId ? { ...r, target_banned: banned } : r)) ?? null);
  }
  async function setReport(id: string, s: "open" | "handled" | "dismissed") {
    if (await adminSetReportStatus(id, s)) setReports((cur) => cur?.map((r) => (r.id === id ? { ...r, status: s } : r)) ?? null);
  }

  return (
    <div className="min-h-dvh bg-bg pb-16" dir={dir}>
      <Header back title={L("ניהול", "Admin")} />
      <div className="px-4 pt-3 flex gap-2">
        {([["pros", ShieldCheck, L("מלהקים", "Casting pros"), pending], ["reports", Flag, L("דיווחים", "Reports"), open], ["feedback", MessageSquareText, L("משוב", "Feedback"), openFb]] as const).map(([id, Icon, label, n]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("flex-1 h-11 rounded-full border text-sm font-semibold flex items-center justify-center gap-2", tab === id ? "bg-gold text-on-accent border-gold" : "border-border")}>
            <Icon className="w-4 h-4" aria-hidden /> {label}
            {n > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[0.6875rem] grid place-items-center">{n}</span>}
          </button>
        ))}
      </div>

      {tab === "pros" && (
        <div className="px-4 pt-4 space-y-3">
          {pros === null && <p className="text-sm text-text-muted text-center py-8">{L("טוען…", "Loading…")}</p>}
          {pros?.length === 0 && <p className="text-sm text-text-muted text-center py-8">{L("עוד אין מלהקים רשומים.", "No casting pros yet.")}</p>}
          {pros?.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl bg-bg-elevated border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name || `@${p.username}`}</div>
                  <div className="text-xs text-text-muted truncate" dir="ltr">{p.email}</div>
                </div>
                <span className={cn("text-[0.6875rem] font-semibold px-2 py-1 rounded-full shrink-0",
                  p.pro_status === "approved" ? "bg-sage/15 text-sage" : p.pro_status === "rejected" ? "bg-danger/10 text-danger" : "bg-gold/15 text-gold")}>
                  {he ? STATUS_HE[p.pro_status] : p.pro_status}{p.banned ? (he ? " · חסום" : " · banned") : ""}
                </span>
              </div>
              <dl className="mt-3 text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {p.company && <><dt className="text-text-muted">{L("חברה", "Company")}</dt><dd>{p.company}</dd></>}
                {p.job_title && <><dt className="text-text-muted">{L("תפקיד", "Title")}</dt><dd>{p.job_title}</dd></>}
                {p.website && <><dt className="text-text-muted">{L("קישור", "Link")}</dt><dd className="truncate"><a href={/^https?:/.test(p.website) ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1" dir="ltr">{p.website} <ExternalLink className="w-3 h-3" aria-hidden /></a></dd></>}
                {p.phone && <><dt className="text-text-muted">{L("טלפון", "Phone")}</dt><dd><a href={`tel:${p.phone}`} className="underline" dir="ltr">{p.phone}</a></dd></>}
                {p.note && <><dt className="text-text-muted">{L("הערה", "Note")}</dt><dd className="whitespace-pre-wrap" dir="auto">{p.note}</dd></>}
                <dt className="text-text-muted">{L("נרשם", "Joined")}</dt><dd>{new Date(p.created_at).toLocaleDateString(he ? "he-IL" : "en-US")}</dd>
              </dl>
              {!p.company && !p.website && !p.phone && (
                <p className="text-xs text-text-subtle mt-2">{L("עוד לא מילא/ה פרטים לבדיקה.", "No review details yet.")}</p>
              )}
              <div className="flex gap-2 mt-3">
                {p.pro_status !== "approved" && (
                  <button onClick={() => setPro(p.id, "approved")} className="flex-1 h-10 rounded-full bg-gold text-on-accent text-xs font-semibold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" aria-hidden /> {L("אישור", "Approve")}
                  </button>
                )}
                {p.pro_status !== "rejected" && (
                  <button onClick={() => setPro(p.id, "rejected")} className="flex-1 h-10 rounded-full border border-border text-xs font-semibold flex items-center justify-center gap-1.5">
                    <X className="w-4 h-4" aria-hidden /> {p.pro_status === "approved" ? L("ביטול אישור", "Revoke") : L("דחייה", "Reject")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="px-4 pt-4 space-y-3">
          {abuse === null && <p className="text-sm text-text-muted text-center py-8">{L("טוען…", "Loading…")}</p>}
          {abuse?.length === 0 && <p className="text-sm text-text-muted text-center py-8">{L("אין דיווחים.", "No reports.")}</p>}
          {abuse?.map((r) => (
            <div key={r.id} className={cn("p-4 rounded-2xl border", r.status === "open" ? "bg-bg-elevated border-border-strong" : "border-border opacity-70")}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{he ? `${KIND_HE[r.target_kind] ?? r.target_kind} · ${REASON_HE[r.reason] ?? r.reason}` : `${r.target_kind} · ${r.reason}`}</span>
                <span className="text-text-muted shrink-0">{new Date(r.created_at).toLocaleString(he ? "he-IL" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm mt-2">
                {L("על: ", "About: ")}
                {r.target_username
                  ? <Link href={`/profile/${r.target_username}`} className="underline font-semibold">{r.target_name || `@${r.target_username}`}</Link>
                  : L("משתמש שנמחק", "deleted user")}
                {r.target_banned && <span className="text-danger text-xs"> · {L("חסום", "banned")}</span>}
              </p>
              <p className="text-xs text-text-muted mt-1">{L("מדווח/ת: ", "Reported by: ")}{r.reporter_name || L("משתמש שנמחק", "deleted user")}</p>
              {r.details && <p className="text-sm mt-2 p-2 rounded-lg bg-bg whitespace-pre-wrap" dir="auto">{r.details}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {r.status === "open" ? (
                  <>
                    <button onClick={() => setReport(r.id, "handled")} className="h-9 px-3 rounded-full bg-gold text-on-accent text-xs font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden /> {L("טופל", "Handled")}</button>
                    <button onClick={() => setReport(r.id, "dismissed")} className="h-9 px-3 rounded-full border border-border text-xs font-semibold">{L("לא רלוונטי", "Dismiss")}</button>
                  </>
                ) : (
                  <button onClick={() => setReport(r.id, "open")} className="h-9 px-3 rounded-full border border-border text-xs font-semibold flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" aria-hidden /> {L("לפתוח מחדש", "Reopen")}</button>
                )}
                {r.target_user && (
                  <button onClick={() => ban(r.target_user!, !r.target_banned)}
                    className={cn("h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1", r.target_banned ? "border border-border" : "bg-danger text-white")}>
                    <Ban className="w-3.5 h-3.5" aria-hidden /> {r.target_banned ? L("ביטול חסימה", "Unban") : L("חסימת המשתמש", "Ban user")}
                  </button>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-text-subtle px-1">
            {L("חסימה מסתירה את המשתמש מהחיפוש ומהפיד ומונעת ממנו לשלוח הודעות והזמנות.", "Banning hides the user from search and the feed and stops them from sending messages and invites.")}
          </p>
        </div>
      )}

      {tab === "feedback" && (
        <div className="px-4 pt-4 space-y-3">
          {feedback === null && <p className="text-sm text-text-muted text-center py-8">{L("טוען…", "Loading…")}</p>}
          {feedback?.length === 0 && <p className="text-sm text-text-muted text-center py-8">{L("עוד אין משוב.", "No feedback yet.")}</p>}
          {feedback?.map((r) => (
            <div key={r.id} className={cn("p-4 rounded-2xl border", r.status === "open" ? "bg-bg-elevated border-border-strong" : "border-border opacity-70")}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{he ? FEEDBACK_HE[r.reason] ?? r.reason : r.reason} · {r.reporter_name || L("משתמש/ת", "user")}</span>
                <span className="text-text-muted shrink-0">{new Date(r.created_at).toLocaleString(he ? "he-IL" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {r.target_id && <p className="text-[0.6875rem] text-text-muted mt-1" dir="ltr">{r.target_id}</p>}
              {r.details && <p className="text-sm mt-2 whitespace-pre-wrap" dir="auto">{r.details}</p>}
              <div className="flex gap-2 mt-3">
                {r.status === "open"
                  ? <button onClick={() => setReport(r.id, "handled")} className="h-9 px-3 rounded-full bg-gold text-on-accent text-xs font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden /> {L("טופל", "Done")}</button>
                  : <button onClick={() => setReport(r.id, "open")} className="h-9 px-3 rounded-full border border-border text-xs font-semibold flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" aria-hidden /> {L("לפתוח מחדש", "Reopen")}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
