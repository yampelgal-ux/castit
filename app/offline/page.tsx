import { Brand } from "@/components/Brand";

// Shown by the service worker when a page isn't cached and there's no network.
export default function OfflinePage() {
  return (
    <div className="min-h-dvh grid place-items-center p-8 text-center bg-bg">
      <div className="space-y-4">
        <Brand size="lg" />
        <h1 className="font-display text-2xl">You&apos;re offline</h1>
        <p className="text-text-muted text-sm" dir="rtl">
          אין חיבור לאינטרנט כרגע. מסכים שכבר פתחת זמינים גם בלי רשת, ושינויים יסונכרנו אוטומטית כשהחיבור יחזור.
        </p>
        <a href="/welcome" className="inline-flex h-12 px-6 items-center rounded-2xl bg-gold text-on-accent font-semibold">Try again</a>
      </div>
    </div>
  );
}
