import { useMemo } from "react";
import { moduleFor, needsMarking, question, type Question, type Screen } from "../../../packages/learning/src/content";
import { problemOf, parseProblem, type Problem as FamilyProblem } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { Figure } from "../year/Figure";
import { ProgressiveWorkedExample, teachingVisualFor, workedExampleFor } from "./TeachingPrimitives";

interface TopicCopy {
  name: string;
  description?: string;
  breadcrumb: string;
}

const displayedLines = (screen: Screen, focusProduct: boolean) => (focusProduct
  ? screen.text.map((line) => line.split(/ A relation from| For the number of relations|; a relation/i)[0]).filter(Boolean)
  : screen.text
).map((line) => line.replace(/larger size/gi, "larger absolute value"));

function problemFromScreen(screen: Screen): FamilyProblem | null {
  const parsed = screen.math?.[0] ? parseProblem(screen.math[0]) : null;
  return parsed?.supported ? parsed.problem : null;
}

function TeachingBlock({ screen, index, total, focusProduct, problem, q, visualProblem, resumeKey }: {
  screen: Screen;
  index: number;
  total: number;
  focusProduct: boolean;
  problem: FamilyProblem | null;
  q: Question | null;
  visualProblem: FamilyProblem | null;
  resumeKey?: string;
}) {
  const ownProblem = problem ?? problemFromScreen(screen);
  const title = focusProduct ? screen.title.replace(/ and relations from A to B/i, "") : screen.title;
  const worked = workedExampleFor(ownProblem, q, screen);
  const visual = teachingVisualFor(visualProblem ?? ownProblem);
  return <section className="teaching-block">
    <div className="teaching-step"><p className="teaching-label">{index === 0 ? "The idea" : `Example ${index}`}</p>{index > 0 ? <span>{index} of {Math.max(1, total - 1)}</span> : null}</div>
    <h3>{title}</h3>
    {displayedLines(screen, focusProduct).map((line, i) => <p key={i}>{line}</p>)}
    {visual ?? (screen.widget ? <Figure v={screen.widget} /> : null)}
    {worked ? <ProgressiveWorkedExample example={worked} storageKey={resumeKey && `${resumeKey}:example:${index}`} /> : null}
  </section>;
}

export function teachingPracticeIds(competency: string) {
  const module = moduleFor(competency);
  if (!module) return [];
  const focusProduct = !!module.chapter[0]?.text.some((line) => line.includes("n(A × B)"));
  const ids = [...modulePhasePool(module, "practice"), ...module.practice, ...module.transfer];
  return [...new Set(ids)].filter((id) => {
    if (needsMarking(question(id))) return false;
    const problem = problemOf(id);
    return !focusProduct || (problem?.family === "aocart" && problem.params.at(-1) !== 1);
  });
}

/** Shared teaching-first content for preview and authenticated learner journeys. */
export function TeachingContent({ competency, topic, onPractice, resumeKey }: { competency: string; topic: TopicCopy; onPractice: () => void; resumeKey?: string }) {
  const module = moduleFor(competency);
  const teaching = useMemo(() => module ? [module.chapter[0], module.strategies.find((strategy) => strategy.id === "worked_steps")?.screens[0]].filter((screen): screen is Screen => !!screen) : [], [module]);
  const practice = useMemo(() => teachingPracticeIds(competency), [competency]);
  const focusProduct = !!teaching[0]?.text.some((line) => line.includes("n(A × B)"));
  const primaryQ = practice[0] ? question(practice[0]) : null;
  const primaryProblem = primaryQ ? problemOf(primaryQ.id) : null;
  const gridId = module?.strategies.find((strategy) => strategy.id === "grid")?.guided;
  const primaryVisualProblem = gridId ? problemOf(gridId) : primaryProblem;
  return <main className="teaching-page">
    <header className="teaching-head">
      <p className="teaching-crumb">{topic.breadcrumb}</p>
      <h2>{focusProduct ? "Counting elements in A × B" : module?.title ?? topic.name}</h2>
      <p className="teaching-intro">{focusProduct ? "Each element of A can be paired with each element of B. Multiplication counts all the ordered pairs." : topic.description}</p>
    </header>
    {teaching.length ? teaching.map((screen, i) => <TeachingBlock key={`${competency}-${screen.title}-${i}`} screen={screen} index={i} total={teaching.length} focusProduct={focusProduct} problem={i === 0 ? primaryProblem : null} q={i === 0 ? primaryQ : null} visualProblem={i === 0 ? primaryVisualProblem : null} resumeKey={resumeKey} />) : <section className="teaching-block unavailable"><h3>Teaching is being prepared</h3><p>This topic does not yet have suitable teaching content.</p></section>}
    <section className="practice-invitation">
      <h3>Ready to try it?</h3>
      <p>Work through one question at a time. You can return to this explanation whenever you need it.</p>
      <button className="primary" type="button" disabled={!primaryQ} onClick={onPractice}>Practice this concept</button>
    </section>
  </main>;
}
