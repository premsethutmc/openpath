import { useEffect, useMemo, useState } from "react";
import { moduleFor, question, type Screen } from "../../../packages/learning/src/content";
import { fromPool } from "../../../packages/learning/src/intervention";
import { readRecords } from "../../../packages/learning/src/records";
import { AnswerInput, Lesson } from "../year/Learn";
import { Figure } from "../year/Figure";
import type { DashRelease } from "../../../packages/learning/src/dashboard";

type Stage = "overview" | "teaching" | "example" | "question" | "mistake" | "correct" | "complete";
const stages: { id: Stage; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "teaching", label: "Teaching" },
  { id: "example", label: "Example" },
  { id: "question", label: "Question" },
  { id: "mistake", label: "Mistake" },
  { id: "correct", label: "Correct" },
  { id: "complete", label: "Complete" },
];

const one = (title: string, screen: Screen) => ({ title, screens: [screen] });

export function PreviewExperience({ release, competency, home, back }: { release: DashRelease; competency: string; home: () => void; back: () => void }) {
  const c = release.competencies[competency];
  const module = moduleFor(c?.evidenceTarget ?? competency);
  const qid = useMemo(() => module ? fromPool(module, "practice", readRecords("preview", [])) : null, [module]);
  const q = qid ? question(qid) : null;
  const allScreens = module ? [...module.chapter, ...module.strategies.flatMap((s) => s.screens)] : [];
  const teaching = allScreens[0];
  const example = allScreens.find((s) => s.math?.length) ?? allScreens[1] ?? allScreens[0];
  const [stage, setStage] = useState<Stage>("overview");
  const [answer, setAnswer] = useState("");
  useEffect(() => { setStage("overview"); setAnswer(""); }, [competency]);
  if (!c) return <p>This competency is not available in this curriculum.</p>;

  const jump = (next: Stage) => { setStage(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const prompt = q ? <div className="preview-workspace">
    <p className="eyebrow">Try it</p>
    <p className="prompt">{q.prompt}</p>
    {q.figure ? <Figure v={q.figure} /> : null}
    <AnswerInput q={q} value={answer} setValue={setAnswer} disabled={false} />
    <p className="small muted">Preview only. Typing here never submits an answer or changes progress.</p>
  </div> : <p className="note">This competency has no keyboard question in the existing content.</p>;

  return <article className="experience-preview" aria-label="Mathematics experience preview">
    <nav className="preview-nav" aria-label="Preview navigation">
      <button className="link" type="button" onClick={back}>← Back</button>
      <button className="link" type="button" onClick={home}>Home</button>
    </nav>
    <div className="preview-head">
      <p className="eyebrow">{release.release.boardLabel} · Grade {release.release.grade}</p>
      <h2>{c.name}</h2>
      <span className="preview-badge">Read-only preview</span>
    </div>
    <div className="preview-stages" role="group" aria-label="Experience states">
      {stages.map((s) => <button key={s.id} type="button" aria-pressed={stage === s.id} onClick={() => jump(s.id)}>{s.label}</button>)}
    </div>

    {stage === "overview" ? <section className="preview-sheet">
      <p className="eyebrow">Skill overview</p><h3>{module?.title ?? c.name}</h3>
      <p>{c.description || "Explore the concept, see a worked example and try a representative question."}</p>
      <div className="preview-progress"><span /><span /><span /><span /></div>
      <p className="small muted">Sample journey · no learner progress is shown or changed.</p>
      <button className="primary" type="button" onClick={() => jump("teaching")} disabled={!teaching}>Start preview</button>
    </section> : null}
    {stage === "teaching" && teaching ? <Lesson s={one(module?.title ?? c.name, teaching)} saving={false} onDone={() => jump("example")} /> : null}
    {stage === "example" && example ? <Lesson s={one("Worked example", example)} saving={false} onDone={() => jump("question")} /> : null}
    {stage === "question" ? <section>{prompt}<div className="preview-actions"><button className="secondary" type="button" onClick={() => jump("mistake")}>Preview mistake</button><button className="primary" type="button" onClick={() => jump("correct")}>Preview correct</button></div></section> : null}
    {stage === "mistake" ? <section>{prompt}<div className="feedback bad" role="status"><strong>Not this time.</strong><p>Your work stays here. Look at one part and try again, or ask for a hint.</p><div className="preview-actions"><button className="secondary" type="button" onClick={() => jump("question")}>Try again</button><button className="link" type="button" onClick={() => jump("teaching")}>Give me a hint</button></div></div></section> : null}
    {stage === "correct" ? <section>{prompt}<div className="feedback good" role="status"><strong>Right.</strong><p>{q?.solution ?? "This answer follows the method shown in the example."}</p></div><button className="primary" type="button" onClick={() => jump("complete")}>Continue</button></section> : null}
    {stage === "complete" ? <section className="preview-sheet completion"><div className="success-mark" aria-hidden="true">✓</div><p className="eyebrow">Preview complete</p><h3>Nice work</h3><p>You explored teaching, a worked example, practice and feedback.</p><p className="small muted">No answer, evidence, progress or mastery was recorded.</p><div className="preview-actions"><button className="secondary" type="button" onClick={home}>Choose another topic</button><button className="primary" type="button" onClick={() => jump("overview")}>Preview again</button></div></section> : null}
  </article>;
}
