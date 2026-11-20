import { useMemo } from "react";
import type { learnerState } from "../../../packages/learning/src/session";
import { taughtMarks, TAUGHT_WORDS, CONFIDENCE_WORDS, type TaughtMark } from "../../../packages/learning/src/taught";

/** taught@1: per skill, how well OpenPath taught it (its own checklist) and how sure we are {name} knows it. A skill that is
 *  fully taught and still "not yet" is the parent's turn: it is listed first, with what to do. */
export function TaughtAndSure({ name, st }: { name: string; st: Pick<ReturnType<typeof learnerState>, "records" | "evidence"> }) {
  const marks = useMemo(() => taughtMarks(st.records, st.evidence), [st]);
  if (!marks.length) return null;
  const sit = marks.filter((m) => m.sitDown);
  const ICON: Record<TaughtMark["confidence"], string> = { sure: "✅", getting_there: "🌱", not_yet: "🔴", too_early: "⏳" };
  const MARK: Record<string, string> = { done: "✓", to_come: "still to come", not_needed: "not needed", does_not_apply: "does not apply" };
  return (
    <section aria-label="Taught and how sure" data-taught>
      <h2>Taught, and how sure we are</h2>
      {sit.length > 0 && (
        <div className="feedback bad" role="note" data-sit-down>
          <strong>Your turn: sit down with {name} on {sit.length === 1 ? "this one" : `these ${sit.length}`}</strong>
          <p>OpenPath has done everything on its teaching checklist, and {name} is still not getting {sit.length === 1 ? "it" : "them"} right alone.</p>
          <ul>{sit.map((m) => <li key={m.competency}><b>{m.name}.</b> {m.why}</li>)}</ul>
          <p className="small">What helps: open the skill together, and ask {name} to do one question out loud, saying each step. Where they stop is the step to work on. OpenPath keeps bringing the skill back.</p>
        </div>
      )}
      <ul className="topic-rows">
        {marks.map((m) => (
          <li key={m.competency} data-confidence={m.confidence} data-taught-mark={m.taught}>
            <div className="topic-head"><b>{m.name}</b><span className="small">{ICON[m.confidence]} {CONFIDENCE_WORDS[m.confidence]} · {TAUGHT_WORDS[m.taught]}</span></div>
            <p className="small muted">{m.why}</p>
            <details><summary className="small">What OpenPath did</summary>
              <ul className="small taught-checks">{m.checks.map((c) => <li key={c.id}>{c.label}: {MARK[c.state]}{c.id === "explanations" && c.state !== "does_not_apply" ? ` (${c.detail})` : ""}</li>)}</ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

