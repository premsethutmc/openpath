/**
 * "This looks wrong?": one tap under an answer lets a child or parent report a question whose marking or wording
 * seems wrong. The report is a reason chosen from three (no typing, nothing in the child's own words), stored as a
 * `flag` event on the learner's record and counted in the owner's usage summary, so wrong content is found and fixed.
 */
import { useState } from "react";
import type { Learner } from "../logic/learner.ts";

export const FLAG_REASONS = [
  { id: "marked_wrong", text: "My answer was right but marked wrong" },
  { id: "confusing", text: "The question is confusing" },
  { id: "other", text: "Something else is wrong" },
] as const;

let current: Learner | null = null;
/** The learner whose record takes reports (set by the app when a learner opens). */
export function setFlagLearner(l: Learner | null): void {
  current = l;
}

export function Flag({ stream, id }: { stream: string; id: string }) {
  const [state, setState] = useState<"closed" | "open" | "sent" | "failed">("closed");
  if (!current || current.content.gate) return null;
  const learner = current;
  if (state === "sent")
    return (
      <p className="flag small" role="status" data-flag="sent">
        Thank you. We will check this question.
      </p>
    );
  if (state === "closed")
    return (
      <p className="flag small">
        <button type="button" className="link" onClick={() => setState("open")}>
          This looks wrong?
        </button>
      </p>
    );
  return (
    <div className="flag flag-open" role="group" aria-label="What looks wrong?">
      <p className="small">What looks wrong?</p>
      {FLAG_REASONS.map((r) => (
        <button
          key={r.id}
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              await learner.flagContent(stream, id, r.id);
              setState("sent");
            } catch {
              setState("failed");
            }
          }}
        >
          {r.text}
        </button>
      ))}
      {state === "failed" && (
        <p className="warning small" role="alert">
          This could not be sent. Try again later.
        </p>
      )}
      <button type="button" className="link" onClick={() => setState("closed")}>
        Cancel
      </button>
    </div>
  );
}
