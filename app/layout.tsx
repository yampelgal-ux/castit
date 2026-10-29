import type { Metadata, Viewport } from "next";
import { Assistant, Secular_One } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingTour } from "@/components/OnboardingTour";
import { DemoSeeder } from "@/components/DemoSeeder";
import { LanguageHydrator } from "@/components/LanguageToggle";
import { CloudSync } from "@/components/CloudSync";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NativeBridge } from "@/components/NativeBridge";
import { A11yHydrator } from "@/components/A11yHydrator";
import { ReminderEngine } from "@/components/ReminderEngine";

// Fonts with full Hebrew + Latin coverage. next/font downloads them at build
// time and serves them from our own domain, so they also work offline and
// inside the native (Capacitor) shell.
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-body",
  display: "swap",
});

const secularOne = Secular_One({
  subsets: ["hebrew", "latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CastIt — Where talent meets opportunity",
  description: "The social platform for actors, models, and casting professionals. Discover talent, cast roles, and practice scenes with AI.",
  applicationName: "CastIt",
  keywords: ["casting", "actors", "talent", "auditions", "self-tape", "AI", "scene partner"],
  authors: [{ name: "CastIt" }],
  creator: "CastIt",
  appleWebApp: {
    capable: true,
    title: "CastIt",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/brand/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/brand/splash-1242x2208.png", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/brand/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/brand/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    ],
  },
  openGraph: {
    title: "CastIt — Where talent meets opportunity",
    description: "Discover talent. Cast roles. Practice scenes with AI. Built for the next era of casting.",
    type: "website",
    siteName: "CastIt",
  },
  twitter: {
    card: "summary_large_image",
    title: "CastIt — Where talent meets opportunity",
    description: "Discover talent. Cast roles. Practice scenes with AI.",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${assistant.variable} ${secularOne.variable}`}>
      <body className="font-sans">
        <a href="#main-content" className="skip-link">דילוג לתוכן</a>
        <div className="device-frame">
          <div className="device-screen">
            <main id="main-content">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <LanguageHydrator />
            <CloudSync />
            <ServiceWorker />
            <NativeBridge />
            <A11yHydrator />
            <ReminderEngine />
            <DemoSeeder />
            <OnboardingTour />
          </div>
        </div>
      </body>
    </html>
  );
}
