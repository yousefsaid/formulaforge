import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormulaForge",
  description:
    "A local-first Excel formula copilot: a fine-tuned model proposes formulas, a deterministic evaluator verifies every one.",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--ink)",
              color: "var(--surface-0)",
              border: "none",
              fontFamily: "var(--font-geist-mono)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
