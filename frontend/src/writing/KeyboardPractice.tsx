/** Existing keyboard working inside the current lesson; never replaces its planner or evidence. */
import { useState, type ReactNode } from "react";
import type { Api } from "../english/logic/account";
import { WritingLesson } from "./Lesson";
import "./style.css";

const topics: Record<string, { topic: string; parameters: Record<string, number> }> = {
  "MATH.number.long-division": { topic: "division", parameters: { dividend: 379, divisor: 3 } },
  "MATH.number.equivalent-fractions": { topic: "fraction", parameters: {} },
  "MATH.number.multiplication-tables": { topic: "multiplication", parameters: { groups: 4, size: 6 } },
};

type Props = {
  api: Api;
  learner: string;
  competency: string;
  onSaved: () => Promise<void>;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardPractice({ api, learner, competency, onSaved, children, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const topic = topics[competency];
  if (!topic) return children;
  if (open)
    return (
      <WritingLesson
        api={api}
        pupil={learner}
        topic={topic.topic}
        parameters={topic.parameters}
        onExit={async () => {
          // WritingLesson flushes its ordered saves first. Reload the canonical ledger's cursor before resuming it.
          await onSaved();
          setOpen(false);
          onOpenChange(false);
        }}
      />
    );
  return (
    <>
      <section aria-label="Keyboard practice">
        <button className="secondary" onClick={() => { setOpen(true); onOpenChange(true); }}>Open keyboard working</button>
        <p className="muted">Additional formative practice. Completing this working does not complete your current module.</p>
      </section>
      {children}
    </>
  );
}
