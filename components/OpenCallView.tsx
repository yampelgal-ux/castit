"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, Clock, DollarSign, Clapperboard } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { isRealUserId } from "@/lib/cloud/config";
import { claimInvite, fetchInvite, rememberInvite, type InviteLink } from "@/lib/cloud/invites";

/**
 * One role a casting director invites actors to: from a WhatsApp link (/join)
 * or from the open auditions board (/auditions). No account needed to read it.
 */
export function OpenCallView({ code, board = false }: { code: string; board?: boolean }) {
  const router = useRouter();
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const isAuthed = useStore((s) => s.isAuthed);
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.profile.role);
  const [inv, setInv] = useState<InviteLink | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const signedIn = isAuthed && isRealUserId(userId);

  useEffect(() => { fetchInvite(code).then(setInv); }, [code]);
  useEffect(() => { if (inv && !inv.closed && !signedIn) rememberInvite(code); }, [inv, signedIn, code]);

  async function join() {
    setBusy(true); setErr(false);
    const id = await claimInvite(code);
    setBusy(false);
    if (!id) { setErr(true); return; }
    router.push("/inbox");
  }

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString(he ? "he-IL" : "en-US", { day: "numeric", month: "long" }) : "";

  return (
    <div className={board ? "px-5 pt-2 pb-16" : ""} dir={dir}>

      {inv === undefined ? (
        <p className="text-sm text-text-muted mt-16 text-center">{L("טוען…", "Loading…")}</p>
      ) : inv === null || inv.closed ? (
        <div className="mt-16 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-text-subtle" aria-hidden />
          <p className="mt-3 text-sm text-text-muted">{L("ההזמנה הזאת כבר לא פעילה. אפשר לבקש קישור חדש ממי ששלח אותה.", "This invite isn't active anymore. Ask whoever sent it for a new link.")}</p>
          <Link href="/welcome" className="inline-block mt-6 text-sm underline">{L("מה זה CastIt?", "What's CastIt?")}</Link>
        </div>
      ) : (
        <div className={board ? "mt-2" : "mt-8 max-w-md mx-auto"}>
          <p className="text-[0.6875rem] uppercase tracking-widest text-gold">{board ? L("אודישן פתוח", "Open audition") : L("הזמנה לאודישן", "Audition invite")}</p>
          <h1 className="font-display text-3xl leading-tight mt-1">{inv.role.name}</h1>
          {inv.project?.title && (
            <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5"><Clapperboard className="w-4 h-4" aria-hidden /> {inv.project.title}{inv.studio ? ` · ${inv.studio}` : ""}</p>
          )}
          <p className="text-xs text-text-muted mt-1">{L(`מאת ${inv.proName}`, `From ${inv.proName}`)}</p>

          {inv.message && <p className="mt-5 p-4 rounded-2xl bg-bg-elevated border border-border text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{inv.message}</p>}
          {inv.role.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{inv.role.description}</p>}

          {(inv.role.deadline || inv.role.shootDates || inv.role.payRange) && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              {inv.role.deadline && <><dt className="text-text-muted flex items-center gap-1.5"><Clock className="w-4 h-4" aria-hidden /> {L("טייפ עד", "Tape due")}</dt><dd>{fmt(inv.role.deadline)}</dd></>}
              {inv.role.shootDates && <><dt className="text-text-muted flex items-center gap-1.5"><Calendar className="w-4 h-4" aria-hidden /> {L("צילומים", "Shoot")}</dt><dd dir="auto">{inv.role.shootDates}</dd></>}
              {inv.role.payRange && <><dt className="text-text-muted flex items-center gap-1.5"><DollarSign className="w-4 h-4" aria-hidden /> {L("שכר", "Pay")}</dt><dd dir="auto">{inv.role.payRange}</dd></>}
            </dl>
          )}

          <div className="mt-8 space-y-3">
            {signedIn ? (
              role === "Talent" ? (
                <button onClick={join} disabled={busy}
                  className="w-full h-12 rounded-full bg-gold text-on-accent font-semibold disabled:opacity-50">
                  {busy ? "…" : board ? L("הגשת מועמדות", "Apply") : L("להצטרף לאודישן", "Join this audition")}
                </button>
              ) : (
                <p className="text-sm p-3 rounded-2xl bg-bg-elevated border border-border">{L("הקישור הזה מיועד לשחקנים. את/ה מחובר/ת כחשבון ליהוק.", "This link is for actors. You're signed in as a casting account.")}</p>
              )
            ) : (
              <>
                <Link href="/signup" className="w-full h-12 rounded-full bg-gold text-on-accent font-semibold grid place-items-center">
                  {L("הרשמה והגשה", "Sign up and apply")}
                </Link>
                <Link href="/login" className="w-full h-12 rounded-full border border-border font-semibold grid place-items-center">
                  {L("כבר יש לי חשבון", "I already have an account")}
                </Link>
                <p className="text-xs text-text-muted text-center leading-relaxed">
                  {L("ההרשמה חינם. אחרי ההרשמה ההזמנה תחכה לך בתיבת האודישנים, ומשם מעלים את הטייפ.", "Signing up is free. After that the invite waits in your auditions inbox, where you upload your tape.")}
                </p>
              </>
            )}
            {err && <p className="text-xs text-terra" role="alert">{L("לא הצלחנו לצרף אותך. ייתכן שהקישור נסגר. נסו שוב או בקשו קישור חדש.", "Couldn't add you. The link may be closed. Try again or ask for a new link.")}</p>}
          </div>

          <p className="mt-8 text-[0.6875rem] text-text-subtle leading-relaxed">
            {L("אודישן אמיתי לא עולה כסף. אם מבקשים ממך לשלם, דווחו לנו.", "A real audition never costs money. If anyone asks you to pay, report it to us.")}{" "}
            <Link href="/terms" className="underline">{L("תנאי שימוש", "Terms")}</Link>
          </p>
        </div>
      )}
    </div>
  );
}
