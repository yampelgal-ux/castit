"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n";
import { fetchGuardianInfo, guardianDecide, type GuardianInfo } from "@/lib/cloud/trust";

// A parent opens this from the link their child sent. No account needed.
export default function GuardianPage() {
  const { token } = useParams<{ token: string }>();
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [info, setInfo] = useState<GuardianInfo | null | undefined>(undefined);
  const [parent, setParent] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => { fetchGuardianInfo(token).then(setInfo); }, [token]);

  async function decide(approve: boolean) {
    setBusy(true); setErr(false);
    const ok = await guardianDecide(token, parent, approve);
    setBusy(false);
    if (!ok) { setErr(true); return; }
    setInfo(await fetchGuardianInfo(token));
  }

  const child = info?.name || (info?.username ? `@${info.username}` : "");

  return (
    <div className="min-h-dvh bg-bg px-6 pt-6 pb-16" dir={dir}>
      <div className="flex items-center justify-between">
        <Brand size="md" />
        <LanguageToggle />
      </div>

      {info === undefined ? (
        <p className="text-sm text-text-muted mt-16 text-center">{L("טוען…", "Loading…")}</p>
      ) : info === null ? (
        <div className="mt-16 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-text-subtle" aria-hidden />
          <p className="mt-3 text-sm text-text-muted">{L("הקישור לא תקין או שפג תוקפו. בקשו מהילד/ה לשלוח קישור חדש מהאפליקציה.", "This link isn't valid. Ask your child to send a new one from the app.")}</p>
        </div>
      ) : (
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            {info.photo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={info.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              : <div className="w-14 h-14 rounded-full bg-hi text-on-hi grid place-items-center font-display text-xl">{(child || "?").replace("@", "").slice(0, 1)}</div>}
            <div>
              <h1 className="font-display text-2xl leading-tight">{L(`אישור הורה עבור ${child}`, `Parent approval for ${child}`)}</h1>
              {info.approved && <p className="text-xs text-sage flex items-center gap-1 mt-1"><Check className="w-3.5 h-3.5" aria-hidden /> {L(`אושר על ידי ${info.parent_name ?? "הורה"}`, `Approved by ${info.parent_name ?? "a parent"}`)}</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-relaxed">
            <p>{L(
              "CastIt היא אפליקציה שבה שחקנים מעלים פרופיל, תמונות וסרטונים, ואנשי ליהוק מחפשים אותם ומזמינים אותם לאודישנים.",
              "CastIt is an app where actors post a profile, photos and videos, and casting professionals find them and invite them to auditions."
            )}</p>
            <p>{L(
              `בגלל ש${child} מתחת לגיל 18, הפרופיל מוסתר ממלהקים עד שהורה או אפוטרופוס מאשרים. אחרי האישור, מלהקים מאומתים יוכלו לראות את הפרופיל, לשלוח הודעות ולהזמין לאודישנים.`,
              `Because ${child} is under 18, the profile is hidden from casting directors until a parent or guardian approves. After approval, verified casting directors can see the profile, message and invite to auditions.`
            )}</p>
            <ul className="list-disc ps-5 text-text-muted space-y-1">
              <li>{L("רק מלהקים שאישרנו ידנית יכולים לפנות לשחקנים.", "Only casting directors we approved by hand can contact actors.")}</li>
              <li>{L("לעולם אל תשלמו כדי לקבל אודישן. אודישן אמיתי לא עולה כסף.", "Never pay to get an audition. A real audition is free.")}</li>
              <li>{L("לפגישה פיזית, כדאי שמבוגר/ת יתלווה.", "For in-person meetings, an adult should come along.")}</li>
              <li>{L("אפשר לבטל את האישור בכל רגע מהקישור הזה, והפרופיל יוסתר שוב.", "You can withdraw approval at any time from this link, and the profile will be hidden again.")}</li>
            </ul>
            <p className="text-xs text-text-muted">
              <Link href="/terms" className="underline">{L("תנאי השימוש", "Terms of use")}</Link>{" · "}
              <Link href="/privacy" className="underline">{L("מדיניות הפרטיות", "Privacy policy")}</Link>
            </p>
          </div>

          {info.approved ? (
            <button onClick={() => decide(false)} disabled={busy}
              className="mt-8 w-full h-12 rounded-full border border-danger/50 text-danger font-semibold disabled:opacity-50">
              {L("ביטול האישור והסתרת הפרופיל", "Withdraw approval and hide the profile")}
            </button>
          ) : (
            <div className="mt-8 space-y-3">
              <label className="block text-sm font-semibold" htmlFor="parent-name">{L("השם המלא שלך", "Your full name")}</label>
              <input id="parent-name" value={parent} onChange={(e) => setParent(e.target.value)} dir="auto"
                className="w-full h-12 px-4 rounded-2xl bg-bg-elevated border border-border outline-none focus:border-gold" />
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{L(`אני ההורה או האפוטרופוס של ${child}, קראתי את ההסבר ואני מאשר/ת את השימוש ב-CastIt.`, `I'm ${child}'s parent or guardian, I read the above and I approve using CastIt.`)}</span>
              </label>
              <button onClick={() => decide(true)} disabled={busy || !agree || parent.trim().length < 2}
                className="w-full h-12 rounded-full bg-gold text-on-accent font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                <ShieldCheck className="w-4 h-4" aria-hidden /> {busy ? "…" : L("אישור", "Approve")}
              </button>
            </div>
          )}
          {err && <p className="text-xs text-terra mt-3" role="alert">{L("משהו השתבש. נסו שוב.", "Something went wrong. Try again.")}</p>}
        </div>
      )}
    </div>
  );
}
