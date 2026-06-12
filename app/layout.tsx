import type { Metadata, Viewport } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingTour } from "@/components/OnboardingTour";
import { DemoSeeder } from "@/components/DemoSeeder";
import { LanguageHydrator } from "@/components/LanguageToggle";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-inter",
  display: "swap",
});

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["latin", "hebrew"],
  variable: "--font-playfair",
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
    <html lang="en" className={`${heebo.variable} ${frankRuhl.variable}`}>
      <body className="font-sans">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div className="device-frame">
          <div className="device-screen">
            <main id="main-content">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <LanguageHydrator />
            <DemoSeeder />
            <OnboardingTour />
          </div>
        </div>
      </body>
    </html>
  );
}
