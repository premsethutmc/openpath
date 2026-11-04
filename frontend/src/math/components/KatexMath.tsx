/**
 * KaTeX-powered mathematical display component.
 *
 * Renders LaTeX expressions using KaTeX for proper mathematical typography.
 * Falls back to plain text when LaTeX is unavailable.
 */
import { useEffect, useRef } from "react";
import type { MathContent } from "../types";

let katex: { renderToString: (expr: string, opts?: Record<string, unknown>) => string } | null = null;

try {
  // KaTeX is linked from /opt/npm-tools/node_modules/
  katex = require("katex") as typeof katex;
} catch {
  // KaTeX unavailable — will use plain text fallback
}

export function KatexMath({ content, display = false }: { content: MathContent; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null!);  // non-null assertion for ref init

  useEffect(() => {
    if (!ref.current) return;
    const latex = content.latex ?? content.plain;
    if (katex) {
      try {
        ref.current.innerHTML = katex.renderToString(latex, {
          displayMode: display,
          throwOnError: false,
          strict: false,
        });
        return;
      } catch {
        // Fall through to plain text
      }
    }
    ref.current.textContent = content.plain;
  }, [content.latex, content.plain, display]);

  return (
    <span
      ref={ref}
      className={`math-expr${display ? " math-expr-display" : ""}`}
      aria-label={content.plain}
    />
  );
}

/** Render a raw LaTeX string */
export function KatexRaw({ latex, display = false }: { latex: string; display?: boolean }) {
  return <KatexMath content={{ plain: latex, latex }} display={display} />;
}
