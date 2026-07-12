"use client";

import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

const REPO_URL = "https://github.com/yousefsaid/formulaforge";
const DESIGN_NOTES_URL = `${REPO_URL}/blob/main/docs/DESIGN_DECISIONS.md`;

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > window.innerHeight * 0.6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled
          ? "border-b border-line bg-surface-0/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 text-[15px] font-semibold text-ink"
        >
          <span className="font-mono text-sm text-accent" aria-hidden="true">
            ƒx
          </span>
          FormulaForge
        </a>
        <nav className="flex min-w-0 items-center gap-3 text-sm text-ink-2 sm:gap-6">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            GitHub ↗
          </a>
          <a
            href={DESIGN_NOTES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            Design notes
          </a>
        </nav>
      </div>
    </header>
  );
}
