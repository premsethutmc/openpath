/**
 * Question preview for educators (loaded on demand): a few of a module's own questions, with the same answer input
 * learners use (typed, choice, written or drawn). Checking a preview answer marks it with the app's own checker and
 * records nothing: a preview is never evidence. Written and drawn answers are marked by an educator, so a preview only
 * shows the rubric.
 */
import { useState } from "react";
import { creditOf } from "../../../packages/learning/src/grade";
import { question } from "../../../packages/learning/src/content";
import { writtenTask } from "../../../packages/learning/src/written";
import { AnswerInput } from "../year/Learn";
import { Figure } from "../year/Figure";

export function Preview({ ids, label }: { ids: string[]; label: string }) {
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const qid = ids[i];
  const q = question(qid);
  const task = q.type === "written" ? writtenTask(qid) : null;
  const go = (k: number) => {
    setI(k);
    setValue("");
    setChecked(null);
  };
  return (
    <div className="preview qcard" data-qid={qid}>
      <p className="muted small">
        {label} · question {i + 1} of {ids.length} · preview only: nothing is recorded
      </p>
      <p className="prompt">{q.prompt}</p>
      {q.figure ? <Figure v={q.figure as never} /> : null}
      <AnswerInput q={{ ...q, id: qid }} value={value} setValue={(v) => (setValue(v), setChecked(null))} disabled={false} />
      {task ? (
        <details className="rubric">
          <summary>How an educator marks it</summary>
          <ul>
            {task.rubric.map((r, k) => (
              <li key={k}>
                {r.criterion} ({r.points})
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <button type="button" className="secondary" disabled={!value.trim()} onClick={() => setChecked(creditOf(q.id, value) === true)}>
          Check (preview)
        </button>
      )}
      {checked !== null ? (
        <p role="status" className={checked ? "good" : "bad"}>
          {checked ? "Right." : `Not this time. The answer is ${q.type === "choice" ? q.options?.["ABCD".indexOf(q.answer)] : q.answer}.`}
        </p>
      ) : null}
      <div className="row">
        <button type="button" className="secondary" disabled={i === 0} onClick={() => go(i - 1)}>
          Previous
        </button>
        <button type="button" className="secondary" disabled={i === ids.length - 1} onClick={() => go(i + 1)}>
          Next question
        </button>
      </div>
    </div>
  );
}
