/** term-links@1: a paragraph whose terms can be tapped to open the earlier skill's own rule and example, in place. */
import { useState } from "react";
import { cardFor } from "../../../packages/learning/src/step-help";
import { linkTerms } from "../../../packages/learning/src/terms";
import { classOfSkill } from "./StepCoach";

/** A word is linked when its skill has a card, is not the skill being read, and is taught no later than it. */
export function allowTerm(reading: string | undefined) {
  const here = classOfSkill(reading);
  return (skill: string) => { if (skill === reading || !cardFor(skill)) return false; const there = classOfSkill(skill); return there !== null && (here === null || there <= here); };
}

export function TermText({ text, competency }: { text: string; competency?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const pieces = linkTerms(text, allowTerm(competency));
  const card = open ? cardFor(open) : null;
  return (
    <>
      <p>{pieces.map((p, i) => (p.skill
        ? <button key={i} type="button" className="term" aria-expanded={open === p.skill} data-term={p.skill} onClick={() => setOpen(open === p.skill ? null : p.skill!)}>{p.text}</button>
        : <span key={i}>{p.text}</span>))}</p>
      {card && (
        <aside className="coach-card term-card" aria-label={card.name}>
          <p className="eyebrow">From an earlier lesson: {card.name}</p>
          {card.rule.map((t, i) => <p key={i}>{t}</p>)}
          {card.example && <><p className="small muted">For example: {card.example.prompt}</p><ol className="recipe-steps">{card.example.steps.map((t, i) => <li key={i}>{t}</li>)}</ol></>}
          <button type="button" className="link" onClick={() => setOpen(null)}>Close</button>
        </aside>
      )}
    </>
  );
}
