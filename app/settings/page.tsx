"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, Upload, Trash2, Bell, Accessibility, Globe, User, Film, Cloud, CloudOff,
  LogOut, LogIn, Smartphone, Check, Type,
} from "lucide-react";
import { Header } from "@/components/Header";
import { PhotoPicker } from "@/components/PhotoPicker";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useInstallPrompt } from "@/components/InstallPrompt";
import { useStore } from "@/lib/store";
import { useSettings, type TextSize } from "@/lib/settings-store";
import { useReelStats } from "@/lib/cloud/social";
import { useMyReels, type MyReel } from "@/lib/reels-store";
import { getTapePlaybackUrl } from "@/lib/tape-storage";
import { lastPublishStatus, type PublishStatus } from "@/lib/cloud/profile";
import { lastUploadError, mediaPublicUrl } from "@/lib/cloud/media";
import { usePoster, posterPathFor } from "@/lib/video-poster";
import { photoToDataUrl } from "@/lib/image";
import { isCloudConfigured, isRealUserId } from "@/lib/cloud/config";
import { signOutEverywhere } from "@/lib/cloud/auth";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { lang, dir } = useT();
  const L = (he: string, en: string) => (lang === "he" ? he : en);

  return (
    <div className="min-h-dvh bg-bg pb-16" dir={dir}>
      <Header back title={L("הגדרות", "Settings")} />
      <div className="px-4 pt-4 space-y-6">
        <ProfileSection L={L} />
        <VideosSection L={L} />
        <RemindersSection L={L} />
        <AccessibilitySection L={L} />
        <Section icon={Globe} title={L("שפה", "Language")}>
          <Row label={L("שפת הממשק", "App language")}>
            <LanguageToggle />
          </Row>
        </Section>
        <AccountSection L={L} />
      </div>
    </div>
  );
}

type LFn = (he: string, en: string) => string;

function Section({ id, icon: Icon, title, children }: {
  id?: string; icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id ?? title}-h`} className="space-y-2 scroll-mt-16">
      <h2 id={`${id ?? title}-h`} className="flex items-center gap-2 font-display text-lg">
        <Icon className="w-5 h-5" /> {title}
      </h2>
      <div className="sheet rounded-xl divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
      <div className="min-w-0">
        {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label> : <div className="text-sm font-semibold">{label}</div>}
        {hint && <div className="text-xs text-text-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => { haptic("light"); onChange(!checked); }}
      className={cn(
        "relative w-12 h-7 rounded-full border-2 border-border-strong transition-colors",
        checked ? "bg-hi" : "bg-bg-muted"
      )}
    >
      <span className={cn(
        "absolute top-0.5 w-5 h-5 rounded-full bg-text transition-all",
        checked ? "start-[22px]" : "start-0.5"
      )} />
    </button>
  );
}

// ── Profile ──────────────────────────────────────────────
function ProfileSection({ L }: { L: LFn }) {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const initials = (profile.name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2);

  async function onPhoto(file: File) {
    setErr("");
    try {
      setProfile({ photoUrl: await photoToDataUrl(file) });
      haptic("success");
      flash();
    } catch {
      setErr(L("לא הצלחנו לקרוא את התמונה. נסו קובץ JPG או PNG.", "Couldn't read that image. Try a JPG or PNG."));
    }
  }
  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }

  return (
    <Section icon={User} title={L("פרופיל", "Profile")}>
      <div className="flex items-center gap-4 px-4 py-4">
        <PhotoPicker onPick={onPhoto} title={L("תמונת פרופיל", "Profile photo")} className="relative shrink-0 rounded-full" >
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt={L("תמונת הפרופיל שלך", "Your profile photo")} className="w-20 h-20 rounded-full object-cover border-2 border-border-strong" />
          ) : (
            <span className="w-20 h-20 rounded-full bg-hi text-on-hi grid place-items-center font-display text-2xl border-2 border-border-strong">{initials}</span>
          )}
          <span className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-gold text-on-accent grid place-items-center border-2 border-bg">
            <Camera className="w-4 h-4" aria-hidden />
          </span>
          <span className="sr-only">{L("החלפת תמונת פרופיל", "Change profile photo")}</span>
        </PhotoPicker>
        <div className="min-w-0 text-sm">
          <div className="font-semibold">{L("תמונת פרופיל", "Profile photo")}</div>
          <div className="text-xs text-text-muted">{L("לחצו על התמונה כדי לצלם או לבחור מהגלריה. מלהקים רואים אותה ראשונה.", "Tap to take or choose a photo. Casting pros see it first.")}</div>
          {saved && <div className="text-xs text-sage mt-1 flex items-center gap-1" role="status"><Check className="w-3.5 h-3.5" /> {L("נשמר", "Saved")}</div>}
          {err && <div className="text-xs text-terra mt-1" role="alert">{err}</div>}
        </div>
      </div>
      <Field id="set-name" label={L("שם מלא", "Full name")} value={profile.name} onSave={(v) => { setProfile({ name: v }); flash(); }} />
      <Field id="set-username" label={L("שם משתמש", "Username")} value={profile.username} ltr onSave={(v) => { setProfile({ username: v.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase() }); flash(); }} />
      <Field id="set-bio" label={L("כמה מילים עליי", "Bio")} value={profile.bio ?? ""} multiline onSave={(v) => { setProfile({ bio: v }); flash(); }} />
      {profile.role !== "Casting Pro" && (
        <Link href="/typecast" className="flex items-center justify-between px-4 py-3 min-h-[56px] text-sm font-semibold">
          {L("נתונים פיזיים ומראה (Typecast)", "Physical details (Typecast)")}
          <span aria-hidden>‹</span>
        </Link>
      )}
    </Section>
  );
}

function Field({ id, label, value, onSave, multiline, ltr }: {
  id: string; label: string; value: string; onSave: (v: string) => void; multiline?: boolean; ltr?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const common = {
    id, value: v,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: () => { if (v.trim() !== value) onSave(v.trim()); },
    dir: ltr ? "ltr" : undefined,
    className: "w-full mt-1 rounded-lg bg-bg-muted border border-border px-3 py-2.5 text-base focus:border-border-strong",
  };
  return (
    <div className="px-4 py-3">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {multiline ? <textarea rows={3} {...common} /> : <input {...common} />}
    </div>
  );
}

// ── Videos ───────────────────────────────────────────────
function VideosSection({ L }: { L: LFn }) {
  const reels = useMyReels((s) => s.reels);
  return (
    <Section id="videos" icon={Film} title={L("הסרטונים שלי", "My videos")}>
      <div className="px-4 py-3 text-xs text-text-muted">
        {L("שואוריל, מונולוגים וקטעי עבודה. הסרטונים נשמרים בחשבון ומוצגים למלהקים בפרופיל שלך.", "Showreels, monologues and clips. Saved to your account and shown to casting pros on your profile.")}
      </div>
      {reels.map((r) => <ReelRow key={r.id} reel={r} L={L} />)}
      {reels.length > 0 && <PublishLine L={L} />}
      <div className="p-4">
        <Link href="/studio/upload" className="w-full h-12 rounded-lg bg-gold text-on-accent font-semibold flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" aria-hidden /> {L("העלאת סרטון", "Upload a video")}
        </Link>
      </div>
    </Section>
  );
}

function PublishLine({ L }: { L: LFn }) {
  const [st, setSt] = useState<PublishStatus>(null);
  useEffect(() => {
    const on = () => setSt(lastPublishStatus());
    on();
    window.addEventListener("castit:profile-published", on);
    return () => window.removeEventListener("castit:profile-published", on);
  }, []);
  if (!st) return null;
  return (
    <div className={cn("px-4 pb-3 text-xs", st.ok ? "text-sage" : "text-terra")} role="status">
      {st.ok
        ? L(`הפרופיל הציבורי עודכן · ${st.reels} סרטונים גלויים לכולם`, `Public profile updated · ${st.reels} videos visible to everyone`)
        : st.error === "missing-name"
          ? L("כדי שאחרים יראו את הסרטונים צריך שם בפרופיל (למעלה).", "Add a name to your profile (above) so others can see your videos.")
          : L(`פרסום הפרופיל נכשל: ${st.error}`, `Publishing your profile failed: ${st.error}`)}
    </div>
  );
}

function ReelRow({ reel, L }: { reel: MyReel; L: LFn }) {
  const remove = useMyReels((s) => s.remove);
  const retry = useMyReels((s) => s.retry);
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const stats = useReelStats(reel.id);
  useEffect(() => {
    let revoke: (() => void) | undefined;
    getTapePlaybackUrl({ blobKey: reel.blobKey }).then((r) => { setUrl(r.url); revoke = r.revoke; });
    return () => revoke?.();
  }, [reel.blobKey]);
  const poster = usePoster(url, reel.cloud && reel.poster ? mediaPublicUrl(posterPathFor(reel.blobKey)) : null);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-16 h-24 rounded-md bg-black overflow-hidden shrink-0">
        {url && <video src={url} poster={poster} className="w-full h-full object-cover" controls preload="metadata" aria-label={reel.caption || L("סרטון", "Video")} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{reel.caption || L("ללא כותרת", "Untitled")}</div>
        <div className="text-xs text-text-muted">{new Date(reel.createdAt).toLocaleDateString()} · {(reel.sizeBytes / 1048576).toFixed(1)}MB</div>
        {reel.cloud ? (
          <>
            <div className="text-xs text-sage font-semibold mt-0.5">{L("מפורסם בפרופיל ובפיד", "Live on your profile and feed")}</div>
            <div className="text-xs text-text-muted mt-0.5 tnum">
              {L(`${stats.views} צפיות · ${stats.likes} לייקים · ${stats.comments} תגובות`, `${stats.views} views · ${stats.likes} likes · ${stats.comments} comments`)}
            </div>
          </>
        ) : (
          <div className="text-xs text-terra mt-0.5">
            {retryFailed ? L(`ההעלאה נכשלה שוב (${lastUploadError() || "unknown"}).`, `Upload failed again (${lastUploadError() || "unknown"}).`) : L("רק במכשיר הזה, אחרים לא רואים אותו", "Only on this device, others can't see it")}
            {" "}
            <button
              disabled={retrying}
              onClick={async () => { setRetrying(true); setRetryFailed(!(await retry(reel.id))); setRetrying(false); }}
              className="underline font-semibold disabled:opacity-50"
            >
              {retrying ? L("מעלה…", "Uploading…") : L("פרסום", "Publish")}
            </button>
          </div>
        )}
      </div>
      {confirm ? (
        <div className="flex gap-1">
          <button onClick={() => remove(reel.id)} className="h-10 px-3 rounded-lg bg-terra text-white text-xs font-semibold">{L("מחיקה", "Delete")}</button>
          <button onClick={() => setConfirm(false)} className="h-10 px-3 rounded-lg border border-border text-xs">{L("ביטול", "Cancel")}</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} aria-label={L("מחיקת הסרטון", "Delete video")} className="w-11 h-11 grid place-items-center rounded-lg text-terra">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ── Reminders ────────────────────────────────────────────
function RemindersSection({ L }: { L: LFn }) {
  const s = useSettings();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function enableSystem(v: boolean) {
    if (!v) { s.set({ systemNotifications: false }); return; }
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    s.set({ systemNotifications: p === "granted" });
  }

  const hourOpts = [1, 2, 3, 6, 12, 24, 48];
  return (
    <Section id="reminders" icon={Bell} title={L("תזכורות והתראות", "Reminders & alerts")}>
      <Row label={L("תזכורת לפני דדליין של טייפ", "Self-tape deadline reminder")}>
        <Switch checked={s.remindDeadlines} onChange={(v) => s.set({ remindDeadlines: v })} label={L("תזכורת לפני דדליין", "Deadline reminder")} />
      </Row>
      {s.remindDeadlines && (
        <Row label={L("כמה זמן לפני", "How long before")} htmlFor="set-dl-h">
          <select id="set-dl-h" value={s.deadlineReminderHours} onChange={(e) => s.set({ deadlineReminderHours: +e.target.value })}
            className="h-10 rounded-lg bg-bg-muted border border-border px-2 text-sm">
            {hourOpts.map((h) => <option key={h} value={h}>{h} {L("שעות", "hours")}</option>)}
          </select>
        </Row>
      )}
      <Row label={L("תזכורת לפני אודישן / קולבק ביומן", "Audition / callback reminder")}>
        <Switch checked={s.remindEvents} onChange={(v) => s.set({ remindEvents: v })} label={L("תזכורת לפני אודישן", "Event reminder")} />
      </Row>
      {s.remindEvents && (
        <Row label={L("כמה זמן לפני", "How long before")} htmlFor="set-ev-h">
          <select id="set-ev-h" value={s.eventReminderHours} onChange={(e) => s.set({ eventReminderHours: +e.target.value })}
            className="h-10 rounded-lg bg-bg-muted border border-border px-2 text-sm">
            {hourOpts.map((h) => <option key={h} value={h}>{h} {L("שעות", "hours")}</option>)}
          </select>
        </Row>
      )}
      <Row
        label={L("התראות גם מחוץ לאפליקציה", "Notifications outside the app")}
        hint={perm === "denied"
          ? L("ההתראות חסומות בדפדפן. אפשר לאשר אותן בהגדרות האתר.", "Blocked in the browser. Allow them in site settings.")
          : perm === "unsupported" ? L("המכשיר הזה לא תומך בהתראות מערכת.", "This device doesn't support system notifications.") : undefined}
      >
        <Switch checked={s.systemNotifications && perm === "granted"} onChange={enableSystem} label={L("התראות מערכת", "System notifications")} />
      </Row>
    </Section>
  );
}

// ── Accessibility ────────────────────────────────────────
function AccessibilitySection({ L }: { L: LFn }) {
  const s = useSettings();
  const sizes: { id: TextSize; label: string }[] = [
    { id: "normal", label: L("רגיל", "Normal") },
    { id: "large", label: L("גדול", "Large") },
    { id: "xlarge", label: L("גדול מאוד", "Extra large") },
  ];
  return (
    <Section icon={Accessibility} title={L("נגישות", "Accessibility")}>
      <div className="px-4 py-3">
        <div className="text-sm font-semibold flex items-center gap-2" id="ts-label"><Type className="w-4 h-4" aria-hidden /> {L("גודל טקסט", "Text size")}</div>
        <div role="radiogroup" aria-labelledby="ts-label" className="mt-2 grid grid-cols-3 gap-2">
          {sizes.map((o) => (
            <button key={o.id} role="radio" aria-checked={s.textSize === o.id} onClick={() => s.set({ textSize: o.id })}
              className={cn("h-11 rounded-lg border-2 text-sm font-semibold",
                s.textSize === o.id ? "bg-hi border-border-strong text-on-hi" : "border-border")}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Row label={L("ניגודיות גבוהה", "High contrast")} hint={L("טקסט וקווים כהים יותר", "Darker text and outlines")}>
        <Switch checked={s.highContrast} onChange={(v) => s.set({ highContrast: v })} label={L("ניגודיות גבוהה", "High contrast")} />
      </Row>
      <Row label={L("הפחתת אנימציות", "Reduce motion")}>
        <Switch checked={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} label={L("הפחתת אנימציות", "Reduce motion")} />
      </Row>
    </Section>
  );
}

// ── Account ──────────────────────────────────────────────
function AccountSection({ L }: { L: LFn }) {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const userId = useStore((s) => s.userId);
  const isAuthed = useStore((s) => s.isAuthed);
  const install = useInstallPrompt();
  const cloud = isCloudConfigured() && isRealUserId(userId);

  return (
    <Section icon={cloud ? Cloud : CloudOff} title={L("חשבון", "Account")}>
      <Row label={profile.email || L("אורח/ת", "Guest")}
        hint={cloud
          ? L("מסונכרן לענן. הנתונים והסרטונים זמינים בכל מכשיר.", "Synced. Your data and videos are on every device.")
          : L("הנתונים נשמרים רק במכשיר הזה. התחברו כדי לשמור אותם בחשבון.", "Saved on this device only. Sign in to keep them in your account.")}>
        <span />
      </Row>
      <div className="p-4">
        {install.canInstall ? (
          <button onClick={install.prompt} className="w-full h-12 rounded-lg border-2 border-border-strong font-semibold flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4" aria-hidden /> {L("התקנת CastIt כאפליקציה", "Install CastIt as an app")}
          </button>
        ) : (
          <Link href="/install" className="w-full h-12 rounded-lg border-2 border-border-strong font-semibold flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4" aria-hidden /> {L("הורדת האפליקציה לטלפון", "Get the app on your phone")}
          </Link>
        )}
      </div>
      <div className="p-4">
        {isAuthed ? (
          <button onClick={async () => { await signOutEverywhere(); router.replace("/welcome"); }}
            className="w-full h-12 rounded-lg border border-border text-terra font-semibold flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" aria-hidden /> {L("התנתקות", "Sign out")}
          </button>
        ) : (
          <Link href="/login" className="w-full h-12 rounded-lg bg-gold text-on-accent font-semibold flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" aria-hidden /> {L("התחברות", "Sign in")}
          </Link>
        )}
      </div>
    </Section>
  );
}
