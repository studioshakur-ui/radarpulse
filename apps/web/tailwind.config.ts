import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--rp-bg) / <alpha-value>)",
        surface: "rgb(var(--rp-surface) / <alpha-value>)",
        elevated: "rgb(var(--rp-elevated) / <alpha-value>)",
        border: "rgb(var(--rp-border) / <alpha-value>)",
        text: "rgb(var(--rp-text) / <alpha-value>)",
        muted: "rgb(var(--rp-muted) / <alpha-value>)",
        accent: "rgb(var(--rp-accent) / <alpha-value>)",
        accent2: "rgb(var(--rp-accent2) / <alpha-value>)",
        good: "rgb(var(--rp-good) / <alpha-value>)",
        warn: "rgb(var(--rp-warn) / <alpha-value>)",
        bad: "rgb(var(--rp-bad) / <alpha-value>)",
        info: "rgb(var(--rp-info) / <alpha-value>)",
      },
      boxShadow: {
        soft: "var(--rp-shadow-soft)",
        glow: "var(--rp-shadow-glow)",
      },
      borderRadius: { xl: "16px", "2xl": "22px" },
    },
  },
  plugins: [],
} satisfies Config;
