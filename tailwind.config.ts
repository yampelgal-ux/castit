import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral palette — backed by CSS vars so it inverts when
        // [data-theme="light"] is set on <html>. See app/globals.css.
        bg: {
          DEFAULT:  "rgb(var(--bg) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          muted:    "rgb(var(--bg-muted) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong:  "rgb(var(--border-strong) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--text) / <alpha-value>)",
          muted:   "rgb(var(--text-muted) / <alpha-value>)",
          subtle:  "rgb(var(--text-subtle) / <alpha-value>)",
        },
        // Refined gold — brass, less yellow, more sophisticated
        gold: {
          DEFAULT: "#C9A961",      // antique brass
          dark: "#9B824A",
          light: "#E4C57E",
        },
        // Deep burgundy — drama, theater curtain, passion
        wine: {
          DEFAULT: "#8B3A3A",
          dark: "#5C2424",
          light: "#B25555",
        },
        // Terracotta — warmth, emotion, sunset
        terra: {
          DEFAULT: "#C75D3F",
          dark: "#9B4530",
          light: "#E07B5B",
        },
        // Sage — unexpected editorial accent (fashion, indie film)
        sage: {
          DEFAULT: "#7A8C66",
          dark: "#5C6B4D",
          light: "#A0AE8E",
        },
        // Plum — creative, artistic, mysterious
        plum: {
          DEFAULT: "#5C4861",
          dark: "#3F303F",
          light: "#7E6685",
        },
        // Keep violet as alias for backward compat
        violet: {
          DEFAULT: "#7C5CFF",
          dark: "#5B3FE0",
        },
        success: "#7A8C66",   // sage-based success (warmer than green)
        danger: "#C75D3F",    // terracotta-based (warmer than red)
      },
      fontFamily: {
        // Single-family typography. Both body + display share Heebo —
        // hierarchy carried by weight + size, like Bank Hapoalim's app.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
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
