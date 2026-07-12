const REPO_URL = "https://github.com/yousefsaid/formulaforge";
const DOCS_BASE = `${REPO_URL}/blob/main/docs`;

const LINKS = [
  { label: "Eval report", href: `${DOCS_BASE}/EVAL_REPORT.md` },
  { label: "Model card", href: `${DOCS_BASE}/MODEL_CARD.md` },
  { label: "Data card", href: `${DOCS_BASE}/DATA_CARD.md` },
  { label: "Architecture", href: `${DOCS_BASE}/ARCHITECTURE.md` },
  { label: "GitHub repo", href: REPO_URL },
];

export function EvidenceStrip() {
  return (
    <section className="mx-auto w-full max-w-content border-t border-line px-6 py-section">
      <p className="font-mono text-eyebrow text-ink-3">ENGINEERING EVIDENCE</p>
      <nav
        aria-label="Engineering evidence"
        className="mt-6 flex flex-col gap-3 font-mono text-sm sm:flex-row sm:flex-wrap sm:gap-x-8"
      >
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-2 underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-2">
        The numbers above are a pipeline smoke test against a tiny in-repo
        seed set — not a benchmark claim. They prove the evaluation harness
        runs correctly end to end, not that the model is state of the art.
      </p>
    </section>
  );
}
