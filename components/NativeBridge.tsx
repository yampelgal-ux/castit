"use client";
import { useEffect } from "react";

// Native-shell niceties when running inside the iOS / Android app (Capacitor):
// full-bleed layout, dark status bar, hardware back button → in-app back.
export function NativeBridge() {
  useEffect(() => {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    document.documentElement.classList.add("native-app");
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      } catch {}
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
        remove = () => { void h.remove(); };
      } catch {}
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {}
    })();
    return () => remove?.();
  }, []);
  return null;
}
