import { useEffect, useMemo, useState } from "react";
import { isCorrect, misconceptionOf, moduleFor, needsMarking, question, type Screen } from "../../../packages/learning/src/content";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { familyOf } from "../../../packages/learning/src/intervention";
import { problemOf } from "../../../packages/learning/src/families";
import { canCheckWorking, checkWorking } from "../../../packages/learning/src/working";
import { AnswerInput } from "../year/Learn";
import { Figure } from "../year/Figure";
import { ProgressiveWorkedExample, teachingVisualFor, workedExampleFor } from "./TeachingPrimitives";
import type { DashRelease } from "../../../packages/learning/src/dashboard";

type View = "teaching" | "practice" | "complete";
type Result = "wrong" | "right" | null;

function TeachingBlock({ screen, index, total, focusProduct, problem, q, visualProblem }: { screen: Screen; index: number; total: number; focusProduct: boolean; problem: ReturnType<typeof problemOf>; q: ReturnType<typeof question> | null; visualProblem: ReturnType<typeof problemOf> }) {
  const lines = focusProduct
    ? screen.text.map((line) => line.split(/ A relation from| For the number of relations|; a relation/i)[0]).filter(Boolean)
    : screen.text;
  const title = focusProduct ? screen.title.replace(/ and relations from A to B/i, "") : screen.title;
  const worked = workedExampleFor(problem, q, screen);
  const visual = teachingVisualFor(visualProblem ?? problem);
  return <section className="teaching-block">
    <div className="teaching-step"><p className="teaching-label">{index === 0 ? "The idea" : `Example ${index}`}</p>{index > 0 ? <span>{index} of {Math.max(1, total - 1)}</span> : null}</div>
    <h3>{title}</h3>
    {lines.map((line, i) => <p key={i}>{line}</p>)}
    {visual ?? (screen.widget ? <Figure v={screen.widget} /> : null)}
    {worked ? <ProgressiveWorkedExample example={worked} /> : null}
  </section>;
}

export function PreviewExperience({ release, competency, home, back }: { release: DashRelease; competency: string; home: () => void; back: () => void }) {
  const c = release.competencies[competency];
  const module = moduleFor(c?.evidenceTarget ?? competency);
  const teaching = useMemo(() => module ? [module.chapter[0], ...module.strategies.flatMap((s) => s.screens.slice(0, 1))].filter(Boolean).slice(0, 3) : [], [module]);
  const focusProduct = !!teaching[0]?.text.some((line) => line.includes("n(A × B)"));
  const practice = useMemo(() => {
    if (!module) return [];
    const ids = [...modulePhasePool(module, "practice"), ...module.practice, ...module.transfer];
    return [...new Set(ids)].filter((id) => {
      if (needsMarking(question(id))) return false;
      const problem = problemOf(id);
      return !focusProduct || problem?.family !== "aocart" || problem.params.at(-1) !== 1;
    });
  }, [module, focusProduct]);
  const [view, setView] = useState<View>("teaching");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [hint, setHint] = useState(false);
  const [working, setWorking] = useState("");
  useEffect(() => { setView("teaching"); setIndex(0); setAnswer(""); setResult(null); setHint(false); setWorking(""); }, [competency]);
  if (!c) return <p>This topic is not available in this curriculum.</p>;

  const q = practice[index] ? question(practice[index]) : null;
  const primaryQ = practice[0] ? question(practice[0]) : null;
  const primaryProblem = primaryQ ? problemOf(primaryQ.id) : null;
  const gridProblem = module?.strategies.find((strategy) => strategy.id === "grid")?.guided;
  const primaryVisualProblem = gridProblem ? problemOf(gridProblem) : primaryProblem;
  const family = q ? familyOf(q.id) : null;
  const familyProblem = family ? problemOf(family) : null;
  const workable = !!familyProblem && canCheckWorking(familyProblem);
  const workingLines = working.split("\n").map((line) => line.trim()).filter(Boolean);
  const workingResult = result && workable && workingLines.length ? checkWorking(familyProblem!, workingLines) : null;
  const usefulFigure = q?.figure?.type !== "numberline" || ("jumps" in (q?.figure ?? {}) && Array.isArray(q?.figure?.jumps) && q.figure.jumps.length > 0);
  const focusedIdea = focusProduct
    ? teaching[0]?.text[0]?.split(/ A relation from/i)[0]
    : teaching[0]?.text[0];
  const goPractice = () => { setView("practice"); setResult(null); setHint(false); window.scrollTo(0, 0); };
  const goTeaching = () => { setView("teaching"); setResult(null); setHint(false); window.scrollTo(0, 0); };
  const next = () => {
    if (index + 1 >= practice.length) { setView("complete"); window.scrollTo(0, 0); return; }
    setIndex(index + 1); setAnswer(""); setWorking(""); setResult(null); setHint(false); window.scrollTo(0, 0);
  };

  return <article className={`experience-preview ${view === "practice" ? "practice-open" : ""}`} aria-label="Mathematics teaching and practice preview">
    <nav className="teaching-nav" aria-label="Lesson navigation">
      <button type="button" onClick={view === "teaching" ? back : goTeaching}>← {view === "teaching" ? "Back" : "Teaching"}</button>
      <span>{view === "practice" ? "Practice" : "Mathematics"}</span>
      <button type="button" onClick={home}>Grade {release.release.grade}⌄</button>
    </nav>

    {view === "teaching" ? <main className="teaching-page">
      <header className="teaching-head">
        <p className="teaching-crumb">{release.release.boardLabel} › Grade {release.release.grade} › {c.strand}</p>
        <h2>{focusProduct ? "Counting elements in A × B" : module?.title ?? c.name}</h2>
        <p className="teaching-intro">{focusProduct ? "Each element of A can be paired with each element of B. Multiplication counts all the ordered pairs." : c.description}</p>
      </header>
      {teaching.length ? teaching.map((screen, i) => <TeachingBlock key={`${competency}-${screen.title}-${i}`} screen={screen} index={i} total={teaching.length} focusProduct={focusProduct} problem={i === 0 ? primaryProblem : null} q={i === 0 ? primaryQ : null} visualProblem={i === 0 ? primaryVisualProblem : null} />) : <section className="teaching-block unavailable"><h3>Teaching is being prepared</h3><p>This topic does not yet have suitable teaching content.</p></section>}
      <section className="practice-invitation">
        <h3>Ready to try it?</h3>
        <p>Work through one question at a time. You can return to this explanation whenever you need it.</p>
        <button className="primary" type="button" disabled={!q} onClick={goPractice}>Practice this concept</button>
      </section>
    </main> : null}

    {view === "practice" ? <main className="practice-workspace">
      <div className="practice-progress" aria-label={`Question ${index + 1}`}><div>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i <= index ? "done" : ""} />)}</div><b>{index + 1} / …</b></div>
      <header className="practice-head"><p className="practice-kicker">{c.name}</p><h2>{q?.prompt ?? "No keyboard practice is available for this topic yet."}</h2></header>
      {q ? <>
        {q.figure && usefulFigure ? <Figure v={q.figure} /> : null}
        <div className={result === "wrong" ? "answer-area has-error" : "answer-area"}>
          <AnswerInput q={q} value={answer} setValue={(value) => { setAnswer(value); setResult(null); }} disabled={false} />
          <label className="working-area">Your working (optional)<textarea aria-label="Your working" rows={3} value={working} onChange={(event) => setWorking(event.target.value)} placeholder={workable ? "Write one step per line" : "Use this space for your steps"} /></label>
          {!result ? <button className="primary check-answer" type="button" disabled={!answer.trim()} onClick={() => setResult(isCorrect(q, answer) ? "right" : "wrong")}>Check answer</button> : null}
        </div>
        {workingResult ? <aside className={`working-feedback ${workingResult.valid ? "right" : "wrong"}`}><strong>Your working</strong><p>{workingResult.note}</p></aside> : null}
        {hint ? <aside className="practice-hint"><strong>A little help</strong><p>{q.hint ?? focusedIdea ?? "Look back at the worked example and take one step at a time."}</p></aside> : null}
        {result === "wrong" ? <aside className="practice-feedback wrong" role="status"><strong>Not quite yet.</strong><p>{misconceptionOf(q, answer)?.says ?? q.hint ?? focusedIdea ?? "Use the rule from the worked example, then check each step."}</p><div><button className="secondary" type="button" onClick={() => setResult(null)}>Try again</button><button className="link" type="button" onClick={() => setHint(true)}>Give me a hint</button></div></aside> : null}
        {result === "right" ? <aside className="practice-feedback right" role="status"><strong>That’s right.</strong><p>{q.solution}</p><button className="primary" type="button" onClick={next}>{index + 1 < practice.length ? "Another question" : "Finish practice"}</button></aside> : null}
      </> : null}
    </main> : null}

    {view === "complete" ? <main className="practice-complete"><div className="success-mark" aria-hidden="true">✓</div><h2>Good practice</h2><p>You explored the idea and worked through practice questions.</p><p className="preview-note">Preview only. No answer, progress or mastery was recorded.</p><button className="primary" type="button" onClick={goTeaching}>Back to teaching</button>{index + 1 < practice.length ? <button className="secondary" type="button" onClick={goPractice}>Keep practising</button> : <p className="preview-note">You reached the end of the suitable question variations currently available here.</p>}</main> : null}
  </article>;
}
