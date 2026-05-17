import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/frontend/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // --radius = 4px; scale up for larger containers
        sm:  "var(--radius)",                   // 4px
        DEFAULT: "calc(var(--radius) + 2px)",   // 6px
        md:  "calc(var(--radius) + 2px)",       // 6px
        lg:  "calc(var(--radius) + 4px)",       // 8px
        xl:  "calc(var(--radius) + 8px)",       // 12px
        "2xl": "calc(var(--radius) + 12px)",    // 16px
        full: "9999px",
      },
      boxShadow: {
        panel:    "var(--shadow-panel)",
        card:     "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        glow:     "var(--shadow-glow)",
      },
      keyframes: {
        "dice-spin": {
          "0%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "25%": { transform: "rotateY(180deg) rotateX(90deg)" },
          "50%": { transform: "rotateY(360deg) rotateX(180deg)" },
          "75%": { transform: "rotateY(540deg) rotateX(270deg)" },
          "100%": { transform: "rotateY(720deg) rotateX(360deg)" },
        },
        "dice-settle": {
          "0%": { transform: "scale(1.3) rotateY(720deg) rotateX(360deg)" },
          "60%": { transform: "scale(1.1) rotateY(740deg) rotateX(370deg)" },
          "100%": { transform: "scale(1) rotateY(720deg) rotateX(360deg)" },
        },
        "level-up-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.7)" },
          "50%": { boxShadow: "0 0 0 12px hsl(var(--primary) / 0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "dice-spin": "dice-spin 1.2s ease-in-out",
        "dice-settle": "dice-settle 0.4s ease-out forwards",
        "level-up-pulse": "level-up-pulse 1s ease-in-out 3",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out forwards",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
