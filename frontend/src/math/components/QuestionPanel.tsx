import type { QuestionContent, MathContent } from "../types";

/** Renders a mathematical expression with optional LaTeX-like styling. */
export function MathDisplay({ content }: { content: MathContent }) {
  // Stage 1: plain text rendering. LaTeX rendering can be added in Stage 2
  // via KaTeX or similar — the component interface stays the same.
  return <span className="math-expr" aria-label={content.plain}>{content.plain}</span>;
}

export function QuestionPanel({ question }: { question: QuestionContent }) {
  return (
    <section className="lr-panel lr-question" role="region" aria-label="Question">
      <p className="lr-prompt">{question.prompt}</p>
      <div className="lr-expression">
        <MathDisplay content={question.expression} />
      </div>
    </section>
  );
}
