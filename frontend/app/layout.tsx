import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormulaForge",
  description: "Local-first Excel formula copilot",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
