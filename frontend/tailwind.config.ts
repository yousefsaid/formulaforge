import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        line: "var(--line)",
        accent: "var(--accent)",
        verified: "var(--verified)",
        abstain: "var(--abstain)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
      maxWidth: {
        content: "1120px",
      },
      borderRadius: {
        panel: "12px",
        input: "8px",
      },
      spacing: {
        section: "clamp(4rem, 8vw, 8rem)",
      },
      fontSize: {
        display: [
          "clamp(2.6rem, 1.8rem + 3.5vw, 4.5rem)",
          { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "600" },
        ],
        formula: [
          "clamp(1.25rem, 2.5vw, 1.75rem)",
          { lineHeight: "1.3", fontWeight: "500" },
        ],
        eyebrow: [
          "11px",
          { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" },
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
