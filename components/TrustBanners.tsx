"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Clock, Send, Check, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { guardianLink, loadProApplication, saveProApplication, useTrust, type ProApplication } from "@/lib/cloud/trust";

/** For a minor whose parent hasn't approved yet: explains and shares the parent link. */
export function GuardianBanner() {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const t = useTrust();
  const birthYear = useStore((s) => s.profile.birthYear);
  const name = useStore((s) => s.profile.name);
  const [state, setState] = useState<"idle" | "busy" | "copied" | "failed">("idle");
  if (!t.available || !t.isMinor || t.guardianOk) return null;

  async function share() {
    setState("busy");
    const url = await guardianLink(birthYear);
    if (!url) { setState("failed"); return; }
    const text = L(
      `היי, נרשמתי ל-CastIt, אפליקציה לאודישנים. בגלל שאני מתחת לגיל 18 צריך את האישור שלך כדי שמלהקים יוכלו לראות את הפרופיל שלי: ${url}`,
      `Hi, I signed up to CastIt, an audition app. Since I'm under 18, I need your approval before casting directors can see my profile: ${url}`
    );
    try {
      if (navigator.share) { await navigator.share({ title: "CastIt", text }); setState("idle"); return; }
    } catch { setState("idle"); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    try { await navigator.clipboard.writeText(url); } catch {}
    setState("copied");
  }

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl border border-gold/40 bg-gold/10" role="status">
      <p className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" aria-hidden /> {L("מחכים לאישור של הורה", "Waiting for a parent's approval")}</p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">
        {L(`${name ? name + ", " : ""}כי את/ה מתחת לגיל 18, מלהקים יראו את הפרופיל שלך רק אחרי שהורה או אפוטרופוס יאשרו. שלחו להם את הקישור.`,
           `${name ? name + ", " : ""}since you're under 18, casting directors will see your profile only after a parent or guardian approves. Send them the link.`)}
      </p>
      <button onClick={share} disabled={state === "busy"}
        className="mt-3 h-11 px-5 rounded-full bg-gold text-on-accent text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
        <Send className="w-4 h-4" aria-hidden /> {L("שליחת קישור להורה", "Send link to a parent")}
      </button>
      {state === "copied" && <p className="text-xs text-sage mt-2">{L("הקישור גם הועתק.", "The link was copied too.")}</p>}
      {state === "failed" && <p className="text-xs text-terra mt-2" role="alert">{L("לא הצלחנו ליצור קישור. נסו שוב.", "Couldn't create the link. Try again.")}</p>}
    </div>
  );
}

/** For a casting director not approved yet: what that means, plus the details we review. */
export function ProApprovalBanner() {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const t = useTrust();
  const role = useStore((s) => s.profile.role);
  const studio = useStore((s) => s.profile.studio);
  const [app, setApp] = useState<ProApplication>({});
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!t.available || t.proStatus === "approved") return;
    loadProApplication().then((a) => setApp(a ?? { company: studio }));
  }, [t.available, t.proStatus, studio]);

  if (role !== "Casting Pro" || !t.available || t.proStatus === "approved") return null;
  const rejected = t.proStatus === "rejected";
  const filled = !!(app.company && (app.website || app.phone));

  async function save() {
    if (await saveProApplication(app)) { setSaved(true); setOpen(false); }
  }

  return (
    <div className={`mx-4 mt-3 p-4 rounded-2xl border ${rejected ? "border-danger/40 bg-danger/5" : "border-gold/40 bg-gold/10"}`} role="status">
      <p className="font-semibold text-sm flex items-center gap-2">
        {rejected ? <XCircle className="w-4 h-4 text-danger" aria-hidden /> : <Clock className="w-4 h-4 text-gold" aria-hidden />}
        {rejected ? L("החשבון לא אושר", "Account not approved") : L("החשבון שלך בבדיקה", "Your account is being reviewed")}
      </p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">
        {rejected
          ? L("לא הצלחנו לאמת שמדובר באיש/אשת ליהוק. אפשר לעדכן את הפרטים ונבדוק שוב.", "We couldn't verify you as a casting professional. Update your details and we'll check again.")
          : L("כדי לשמור על השחקנים, אנחנו מאשרים כל מלהק/ת ידנית. בינתיים אפשר לחפש שחקנים ולבנות פרויקטים, ואחרי האישור תוכלו לשלוח הזמנות והודעות ותקבלו תג מאומת.",
              "To keep talent safe we approve every casting professional by hand. Meanwhile you can search and build projects; once approved you can send invites and messages and get a verified badge.")}
      </p>
      {saved && <p className="text-xs text-sage mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden /> {L("הפרטים נשמרו", "Details saved")}</p>}
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 h-10 px-4 rounded-full border border-border-strong text-xs font-semibold">
          {filled ? L("עדכון הפרטים לבדיקה", "Update review details") : L("השלמת פרטים לבדיקה", "Add details for review")}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          {([
            ["company", L("חברה / סוכנות / הפקה", "Company / agency / production")],
            ["job_title", L("תפקיד", "Job title")],
            ["website", L("אתר, IMDb או לינקדאין", "Website, IMDb or LinkedIn")],
            ["phone", L("טלפון (רק לבדיקה, לא מוצג)", "Phone (for review only, not shown)")],
            ["note", L("פרויקטים אחרונים או הערה", "Recent projects or a note")],
          ] as const).map(([k, label]) => (
            <input key={k} value={(app as any)[k] ?? ""} onChange={(e) => setApp({ ...app, [k]: e.target.value })}
              placeholder={label} aria-label={label} dir="auto" inputMode={k === "phone" ? "tel" : undefined}
              className="w-full h-11 px-3 rounded-lg bg-bg border border-border text-sm outline-none focus:border-gold" />
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-full border border-border text-sm font-semibold">{L("ביטול", "Cancel")}</button>
            <button onClick={save} disabled={!app.company} className="flex-1 h-11 rounded-full bg-gold text-on-accent text-sm font-semibold disabled:opacity-40">{L("שמירה", "Save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline notice where a not-yet-approved casting director tries to contact talent. */
export function NotApprovedNotice() {
  const { lang } = useT();
  const he = lang === "he";
  return (
    <div className="p-4 rounded-2xl border border-gold/40 bg-gold/10 text-sm" role="alert">
      <p className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-gold" aria-hidden /> {he ? "החשבון עוד בבדיקה" : "Account still under review"}</p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">
        {he ? "שליחת הזמנות והודעות לשחקנים נפתחת אחרי שנאשר את החשבון. אפשר להשלים פרטים בלוח הבקרה." : "Inviting and messaging talent opens once we approve your account. You can add details on the dashboard."}
      </p>
    </div>
  );
}
