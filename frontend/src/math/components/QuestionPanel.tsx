import type { QuestionContent } from "../types";
import { KatexMath } from "./KatexMath";

export function QuestionPanel({ question }: { question: QuestionContent }) {
  return (
    <section className="lr-panel lr-question" role="region" aria-label="Question">
      <p className="lr-prompt">{question.prompt}</p>
      <div className="lr-expression">
        <KatexMath content={question.expression} display={true} />
      </div>
    </section>
  );
}
