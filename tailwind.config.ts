import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

/**
 * A theme colour that still honours Tailwind's opacity modifier.
 *
 * The tokens are complete `oklch(...)` values, so a bare `"var(--primary)"`
 * gives Tailwind no channels to apply alpha to -- and Tailwind 3 then emits
 * NOTHING for `bg-primary/10`, `border-border/40`, `hover:bg-accent/30` and the
 * like. Not a fallback colour; the class silently does not exist. Mixing with
 * `transparent` in OKLCH applies the alpha without needing the channels.
 * `<alpha-value>` is 1 when no modifier is used, which yields the plain token.
 */
const token = (name: string) =>
  `color-mix(in oklch, var(${name}) calc(<alpha-value> * 100%), transparent)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/frontend/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: token("--border"),
        input: token("--input"),
        ring: token("--ring"),
        background: token("--background"),
        foreground: token("--foreground"),
        primary: {
          DEFAULT: token("--primary"),
          foreground: token("--primary-foreground"),
        },
        secondary: {
          DEFAULT: token("--secondary"),
          hover: token("--secondary-hover"),
          foreground: token("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: token("--destructive"),
          foreground: token("--destructive-foreground"),
        },
        muted: {
          DEFAULT: token("--muted"),
          foreground: token("--muted-foreground"),
        },
        accent: {
          DEFAULT: token("--accent"),
          foreground: token("--accent-foreground"),
        },
        popover: {
          DEFAULT: token("--popover"),
          foreground: token("--popover-foreground"),
        },
        card: {
          DEFAULT: token("--card"),
          foreground: token("--card-foreground"),
        },
        success: token("--success"),
        "accent-turn": token("--accent-turn"),
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
  plugins: [typography, animate],
} satisfies Config;
