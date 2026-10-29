"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { isStandalone, useInstallPrompt } from "@/components/InstallPrompt";
import { useT } from "@/lib/i18n";

const KEY = "castit_install_banner_dismissed";

/** Small "get the app" strip on phones that haven't installed CastIt yet. */
export function InstallBanner() {
  const { lang } = useT();
  const he = lang === "he";
  const install = useInstallPrompt();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = Date.now() - Number(localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch {}
    const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setShow(phone && !isStandalone() && !dismissed);
  }, []);

  if (!show) return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch {} };

  return (
    <div className="fixed top-[env(safe-area-inset-top)] inset-x-0 z-[55] max-w-[440px] mx-auto px-3 pt-2" dir={he ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 rounded-2xl bg-bg-elevated border border-border shadow-2xl p-2.5">
        <img src="/brand/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{he ? "CastIt בטלפון" : "CastIt on your phone"}</div>
          <div className="text-[0.6875rem] text-text-muted truncate">{he ? "מסך מלא, אייקון והתראות" : "Full screen, icon and alerts"}</div>
        </div>
        {install.canInstall ? (
          <button onClick={async () => { await install.prompt(); close(); }} className="h-9 px-3 rounded-full bg-gold text-on-accent text-xs font-semibold inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" aria-hidden /> {he ? "התקנה" : "Install"}
          </button>
        ) : (
          <Link href="/install" onClick={close} className="h-9 px-3 rounded-full bg-gold text-on-accent text-xs font-semibold inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" aria-hidden /> {he ? "איך מתקינים" : "How to"}
          </Link>
        )}
        <button onClick={close} aria-label={he ? "סגירה" : "Close"} className="w-9 h-9 grid place-items-center rounded-full text-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
