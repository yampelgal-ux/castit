import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Every color is a CSS variable (RGB triplet) defined in app/globals.css,
      // so the whole app re-themes from one place and opacity modifiers
      // (bg-gold/20) keep working. Class names are kept stable; "gold" is the
      // primary accent, "wine" the secondary accent, whatever their hue.
      colors: {
        bg: { DEFAULT: v("bg"), elevated: v("bg-elevated"), muted: v("bg-muted") },
        border: { DEFAULT: v("border"), strong: v("border-strong") },
        text: { DEFAULT: v("text"), muted: v("text-muted"), subtle: v("text-subtle") },
        gold: { DEFAULT: v("gold"), dark: v("gold-dark"), light: v("gold-light") },
        wine: { DEFAULT: v("wine"), dark: v("wine-dark"), light: v("wine-light") },
        terra: { DEFAULT: v("terra"), dark: v("terra-dark"), light: v("terra-light") },
        sage: { DEFAULT: v("sage"), dark: v("sage-dark"), light: v("sage-light") },
        plum: { DEFAULT: v("plum"), dark: v("plum-dark"), light: v("plum-light") },
        violet: { DEFAULT: v("violet"), dark: v("violet-dark") },
        // Text/icon color that sits on a solid accent fill (bg-gold, bg-wine…)
        "on-accent": v("on-accent"),
        success: v("sage"),
        danger: v("terra"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      letterSpacing: {
        "editorial": "-0.02em",
      },
      animation: {
        "pop": "pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
