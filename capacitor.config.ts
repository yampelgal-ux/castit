import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS / Android shell for CastIt.
// The app is a full Next.js server app (API routes for Aria AI, dynamic pages),
// so the native shell loads the live deployment instead of a static bundle.
// Change CASTIT_APP_URL to point a build at staging or your own domain:
//   CASTIT_APP_URL=https://castit.co.il npx cap sync
const APP_URL = process.env.CASTIT_APP_URL || "https://castit.vercel.app";

const config: CapacitorConfig = {
  appId: "com.castit.app",
  appName: "CastIt",
  webDir: "native-shell", // offline fallback screen bundled inside the app
  backgroundColor: "#0F0C09",
  server: {
    url: APP_URL,
    cleartext: false,
    errorPath: "index.html",
    allowNavigation: ["*.supabase.co", "castit.vercel.app"],
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#0F0C09",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#0F0C09",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#0F0C09",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F0C09",
      overlaysWebView: true,
    },
  },
};

export default config;
