import { useEffect, useMemo, useState } from "react";
import { creditOf } from "../../../packages/learning/src/grade";
import { misconceptionOf, moduleFor, question } from "../../../packages/learning/src/content";
import { familyOf } from "../../../packages/learning/src/intervention";
import { problemOf } from "../../../packages/learning/src/families";
import { canCheckWorking, checkWorking } from "../../../packages/learning/src/working";
import { AnswerInput } from "../year/Learn";
import { Figure } from "../year/Figure";
import { TeachingContent, teachingPracticeIds } from "./TeachingContent";
import type { DashRelease } from "../../../packages/learning/src/dashboard";
import { chapterExplanation, contentEligibility } from "../../../packages/learning/src/explanation-review";

type View = "teaching" | "practice" | "complete";
type Result = "wrong" | "right" | null;

export function PreviewExperience({ release, competency, home, back }: { release: DashRelease; competency: string; home: () => void; back: () => void }) {
  const c = release.competencies[competency];
  const module = moduleFor(c?.evidenceTarget ?? competency);
  const practice = useMemo(() => teachingPracticeIds(c?.evidenceTarget ?? competency), [c?.evidenceTarget, competency]);
  const [view, setView] = useState<View>("teaching");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [hint, setHint] = useState(false);
  const [working, setWorking] = useState("");
  useEffect(() => { setView("teaching"); setIndex(0); setAnswer(""); setResult(null); setHint(false); setWorking(""); }, [competency]);
  if (!c) return <p>This topic is not available in this curriculum.</p>;

  const q = practice[index] ? question(practice[index]) : null;
  const family = q ? familyOf(q.id) : null;
  const familyProblem = family ? problemOf(family) : null;
  const workable = !!familyProblem && canCheckWorking(familyProblem);
  const workingLines = working.split("\n").map((line) => line.trim()).filter(Boolean);
  const workingResult = result && workable && workingLines.length ? checkWorking(familyProblem!, workingLines) : null;
  const usefulFigure = q?.figure?.type !== "numberline" || ("jumps" in (q?.figure ?? {}) && Array.isArray(q?.figure?.jumps) && q.figure.jumps.length > 0);
  const focusedIdea = module && contentEligibility(module, chapterExplanation(module), { competency: module.competency, usage: "lesson" }).eligible ? module.chapter[0]?.text[0]?.split(/ A relation from/i)[0] : undefined;
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

    {view === "teaching" ? <TeachingContent competency={c.evidenceTarget ?? competency} topic={{ name: c.name, description: c.description, breadcrumb: `${release.release.boardLabel} › Grade ${release.release.grade} › ${c.strand}` }} onPractice={goPractice} /> : null}

    {view === "practice" ? <main className="practice-workspace" data-qid={q?.id}>
      <div className="practice-progress" aria-label={`Question ${index + 1}`}><div>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i <= index ? "done" : ""} />)}</div><b>{index + 1} / …</b></div>
      <header className="practice-head"><p className="practice-kicker">{c.name}</p><h2>{q?.prompt ?? "No keyboard practice is available for this topic yet."}</h2></header>
      {q ? <>
        {q.figure && usefulFigure ? <Figure v={q.figure} /> : null}
        <div className={result === "wrong" ? "answer-area has-error" : "answer-area"}>
          <AnswerInput q={q} value={answer} setValue={(value) => { setAnswer(value); setResult(null); }} disabled={false} />
          <label className="working-area">Your working (optional)<textarea aria-label="Your working" rows={3} value={working} onChange={(event) => setWorking(event.target.value)} placeholder={workable ? "Write one step per line" : "Use this space for your steps"} /></label>
          {!result ? <button className="primary check-answer" type="button" disabled={!answer.trim()} onClick={() => setResult(creditOf(q.id, answer) === true ? "right" : "wrong")}>Check answer</button> : null}
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
