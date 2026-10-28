"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, Share, PlusSquare, MoreVertical, Download, CheckCircle2, ArrowRight } from "lucide-react";
import { Brand } from "@/components/Brand";
import { useInstallPrompt, isStandalone } from "@/components/InstallPrompt";
import { useT } from "@/lib/i18n";

type Platform = "ios" | "android" | "desktop";

function detect(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** How to put CastIt on the phone's home screen, step by step. */
export default function InstallPage() {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const install = useInstallPrompt();
  const [platform, setPlatform] = useState<Platform>("android");
  const [installed, setInstalled] = useState(false);
  const [notSafari, setNotSafari] = useState(false);

  useEffect(() => {
    setPlatform(detect());
    setInstalled(isStandalone());
    const ua = navigator.userAgent;
    setNotSafari(/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|WhatsApp/i.test(ua));
  }, []);

  const Step = ({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) => (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-bg-elevated p-4">
      <span className="w-8 h-8 shrink-0 rounded-full bg-gold text-on-accent font-bold grid place-items-center">{n}</span>
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
      <span className="text-gold shrink-0" aria-hidden>{icon}</span>
    </li>
  );

  return (
    <main className="min-h-dvh max-w-[440px] mx-auto px-5 pt-6 pb-12" dir={he ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-8">
        <Brand size="sm" />
        <Link href="/feed" className="text-sm text-text-muted inline-flex items-center gap-1">
          {L("לאפליקציה", "Open app")} <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>

      <div className="text-center mb-8">
        <img src="/icons/icon-192.png" alt="" className="w-20 h-20 rounded-3xl mx-auto shadow-xl" />
        <h1 className="font-display text-3xl mt-4">{L("הורדת CastIt לטלפון", "Get CastIt on your phone")}</h1>
        <p className="text-sm text-text-muted mt-2">
          {L("האפליקציה תופיע במסך הבית עם אייקון, תיפתח במסך מלא ותשלח התראות, בדיוק כמו אפליקציה מהחנות.",
             "It sits on your home screen with its own icon, opens full screen and sends alerts, just like an app from the store.")}
        </p>
      </div>

      {installed ? (
        <div className="rounded-2xl border border-sage/50 bg-sage/10 p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-sage mx-auto" aria-hidden />
          <p className="font-semibold mt-2">{L("CastIt כבר מותקנת במכשיר הזה", "CastIt is already installed on this device")}</p>
        </div>
      ) : (
        <>
          <div className="flex rounded-full bg-bg-elevated border border-border p-1 mb-5" role="tablist">
            {(["ios", "android", "desktop"] as Platform[]).map((p) => (
              <button key={p} role="tab" aria-selected={platform === p} onClick={() => setPlatform(p)}
                className={`flex-1 h-10 rounded-full text-sm font-semibold ${platform === p ? "bg-gold text-on-accent" : "text-text-muted"}`}>
                {p === "ios" ? "iPhone" : p === "android" ? "Android" : L("מחשב", "Computer")}
              </button>
            ))}
          </div>

          {install.canInstall && platform !== "ios" && (
            <button onClick={install.prompt}
              className="w-full h-14 rounded-2xl bg-gold text-on-accent font-semibold text-base inline-flex items-center justify-center gap-2 mb-5 shadow-lg shadow-gold/20">
              <Download className="w-5 h-5" aria-hidden /> {L("התקנה בלחיצה אחת", "Install in one tap")}
            </button>
          )}

          {platform === "ios" && (
            <>
              {notSafari && (
                <p className="rounded-xl bg-terra/10 border border-terra/40 text-sm p-3 mb-4">
                  {L("באייפון אפשר להתקין רק מ-Safari. העתיקו את הכתובת ופתחו אותה ב-Safari.",
                     "On iPhone you can only install from Safari. Copy this address and open it in Safari.")}
                </p>
              )}
              <ol className="space-y-3">
                <Step n={1} icon={<Share className="w-6 h-6" />}>{L("ב-Safari, לוחצים על כפתור השיתוף בתחתית המסך (ריבוע עם חץ למעלה).", "In Safari, tap the Share button at the bottom (a square with an arrow).")}</Step>
                <Step n={2} icon={<PlusSquare className="w-6 h-6" />}>{L("גוללים למטה ובוחרים ״הוספה למסך הבית״.", "Scroll down and choose “Add to Home Screen”.")}</Step>
                <Step n={3} icon={<Smartphone className="w-6 h-6" />}>{L("לוחצים ״הוספה״. האייקון של CastIt יופיע במסך הבית, ומשם פותחים את האפליקציה.", "Tap “Add”. The CastIt icon appears on your home screen; open the app from there.")}</Step>
              </ol>
            </>
          )}

          {platform === "android" && (
            <ol className="space-y-3">
              <Step n={1} icon={<MoreVertical className="w-6 h-6" />}>{L("ב-Chrome, לוחצים על שלוש הנקודות למעלה.", "In Chrome, tap the three dots at the top.")}</Step>
              <Step n={2} icon={<Download className="w-6 h-6" />}>{L("בוחרים ״התקנת אפליקציה״ (או ״הוספה למסך הבית״).", "Choose “Install app” (or “Add to Home screen”).")}</Step>
              <Step n={3} icon={<Smartphone className="w-6 h-6" />}>{L("מאשרים. CastIt תופיע עם כל שאר האפליקציות שלך.", "Confirm. CastIt appears with the rest of your apps.")}</Step>
            </ol>
          )}

          {platform === "desktop" && (
            <ol className="space-y-3">
              <Step n={1} icon={<Download className="w-6 h-6" />}>{L("ב-Chrome או Edge, לוחצים על אייקון ההתקנה בקצה שורת הכתובת.", "In Chrome or Edge, click the install icon at the end of the address bar.")}</Step>
              <Step n={2} icon={<Smartphone className="w-6 h-6" />}>{L("לטלפון: פותחים את הכתובת הזאת בטלפון וממשיכים לפי ההוראות.", "For your phone: open this address on the phone and follow the steps.")}</Step>
            </ol>
          )}
        </>
      )}
    </main>
  );
}
