import type { Config } from "tailwindcss";

export default {
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
        info: "rgb(var(--rp-info) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.55)"
      },
      borderRadius: { xl: "16px", "2xl": "22px" }
    }
  },
  plugins: [],
} satisfies Config;
