import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // RadarPulse core tokens (marketing / product)
        bg: "rgb(var(--rp-bg) / <alpha-value>)",
        surface: "rgb(var(--rp-surface) / <alpha-value>)",
        elevated: "rgb(var(--rp-elevated) / <alpha-value>)",
        text: "rgb(var(--rp-text) / <alpha-value>)",

        // Brand tokens (use these on the landing to avoid relying on the shadcn palette)
        brand: "rgb(var(--rp-accent) / <alpha-value>)",
        brand2: "rgb(var(--rp-accent2) / <alpha-value>)",
        line: "rgb(var(--rp-border) / <alpha-value>)",
        subtext: "rgb(var(--rp-muted) / <alpha-value>)",
        ink: "rgb(var(--rp-ink) / <alpha-value>)",
        veil: "rgb(var(--rp-veil) / <alpha-value>)",

        // Keep shadcn/ui palette (used across the app)
        border: "hsl(var(--border))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Existing RadarPulse tokens already used in the app
        accent2: "rgb(var(--rp-accent2) / <alpha-value>)",
        good: "rgb(var(--rp-good) / <alpha-value>)",
        warn: "rgb(var(--rp-warn) / <alpha-value>)",
        bad: "rgb(var(--rp-bad) / <alpha-value>)",
        info: "rgb(var(--rp-info) / <alpha-value>)",

        // shadcn/ui semantic colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      boxShadow: {
        soft: "var(--rp-shadow-soft)",
        glow: "var(--rp-shadow-glow)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "22px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
