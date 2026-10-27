import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingTour } from "@/components/OnboardingTour";
import { DemoSeeder } from "@/components/DemoSeeder";
import { LanguageHydrator } from "@/components/LanguageToggle";
import { CloudSync } from "@/components/CloudSync";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NativeBridge } from "@/components/NativeBridge";

// Self-hosted fonts: no runtime dependency on Google Fonts, so the app
// also renders correctly offline / inside the native (Capacitor) shell.
const inter = localFont({
  src: "./fonts/Inter.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const playfair = localFont({
  src: "./fonts/PlayfairDisplay.woff2",
  variable: "--font-playfair",
  display: "swap",
  weight: "400 900",
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
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div className="device-frame">
          <div className="device-screen">
            <main id="main-content">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <LanguageHydrator />
            <CloudSync />
            <ServiceWorker />
            <NativeBridge />
            <DemoSeeder />
            <OnboardingTour />
          </div>
        </div>
      </body>
    </html>
  );
}
