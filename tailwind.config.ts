import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/frontend/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          hover: "var(--secondary-hover)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        success: "var(--success)",
        "accent-turn": "var(--accent-turn)",
      },
      borderRadius: {
        // --radius: 0px — sharp corners everywhere
        DEFAULT: "var(--radius)",
        sm: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        full: "9999px",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        glow: "var(--shadow-glow)",
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
          "0%, 100%": {
            boxShadow: "0 0 0 0 color-mix(in oklch, var(--primary) 70%, transparent)",
          },
          "50%": {
            boxShadow: "0 0 0 12px color-mix(in oklch, var(--primary) 0%, transparent)",
          },
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
