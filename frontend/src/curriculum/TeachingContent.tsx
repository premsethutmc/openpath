import { useMemo } from "react";
import { moduleFor, needsMarking, question, type Question, type Screen } from "../../../packages/learning/src/content";
import { problemOf, parseProblem, type Problem as FamilyProblem } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { teachingPresentationFrom, teachingScopeFor, type TeachingPresentation } from "../../../packages/learning/src/teaching-presentation";
import { Figure } from "../year/Figure";
import { ProgressiveWorkedExample, TeachingVisualRenderer } from "./TeachingPrimitives";

interface TopicCopy {
  name: string;
  description?: string;
  breadcrumb: string;
}

const displayedLines = (screen: Screen) => screen.text.map((line) => line.replace(/larger size/gi, "larger absolute value"));

function problemFromScreen(screen: Screen): FamilyProblem | null {
  const parsed = screen.math?.[0] ? parseProblem(screen.math[0]) : null;
  return parsed?.supported ? parsed.problem : null;
}

function TeachingBlock({ module, screen, index, total, problem, q, practiceIds, resumeKey }: {
  module: NonNullable<ReturnType<typeof moduleFor>>;
  screen: Screen;
  index: number;
  total: number;
  problem: FamilyProblem | null;
  q: Question | null;
  practiceIds: string[];
  resumeKey?: string;
}) {
  const ownProblem = problem ?? problemFromScreen(screen);
  const presentation: TeachingPresentation | null = ownProblem ? teachingPresentationFrom({ module, screen, problem: ownProblem, question: q, practiceIds }) : null;
  const worked = presentation?.workedExample ?? null;
  const visual = presentation?.visual ? <TeachingVisualRenderer visual={presentation.visual} /> : null;
  return <section className="teaching-block">
    <div className="teaching-step"><p className="teaching-label">{index === 0 ? "The idea" : `Example ${index}`}</p>{index > 0 ? <span>{index} of {Math.max(1, total - 1)}</span> : null}</div>
    <h3>{screen.title}</h3>
    {displayedLines(screen).map((line, i) => <p key={i}>{line}</p>)}
    {visual ?? (screen.widget ? <Figure v={screen.widget} /> : null)}
    {worked ? <ProgressiveWorkedExample example={worked} storageKey={resumeKey && `${resumeKey}:example:${index}`} /> : <p className="teaching-support-note">{presentation?.unsupportedReason ?? "A checked worked example is not available for this concept yet."}</p>}
  </section>;
}

export function teachingPracticeIds(competency: string) {
  const module = moduleFor(competency);
  if (!module) return [];
  const scope = teachingScopeFor(module);
  const ids = [...modulePhasePool(module, "practice"), ...module.practice, ...module.transfer];
  return [...new Set(ids)].filter((id) => {
    if (needsMarking(question(id))) return false;
    const problem = problemOf(id);
    return !!problem && scope.accepts(problem);
  });
}

/** Shared teaching-first content for preview and authenticated learner journeys. */
export function TeachingContent({ competency, topic, onPractice, resumeKey }: { competency: string; topic: TopicCopy; onPractice: () => void; resumeKey?: string }) {
  const module = moduleFor(competency);
  const scope = useMemo(() => module ? teachingScopeFor(module) : null, [module]);
  const teaching = useMemo(() => {
    if (!module || !scope) return [];
    const scopedStrategies = module.strategies.filter((strategy) => {
      const problem = problemOf(strategy.guided);
      return !!problem && scope.accepts(problem);
    }).flatMap((strategy) => strategy.screens);
    const seen = new Set<string>();
    return [module.chapter[0], ...scopedStrategies].filter((screen): screen is Screen => {
      if (!screen) return false;
      const key = JSON.stringify([screen.title, screen.text, screen.math, screen.widget]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [module, scope]);
  const practice = useMemo(() => teachingPracticeIds(competency), [competency]);
  const exampleId = scope?.strategyId ? module?.strategies.find((strategy) => strategy.id === scope.strategyId)?.guided : undefined;
  const exampleProblem = exampleId ? problemOf(exampleId) : null;
  const primaryId = exampleId && exampleProblem && scope?.accepts(exampleProblem) ? exampleId : practice[0];
  const primaryQ = primaryId ? question(primaryId) : null;
  const primaryProblem = primaryQ ? problemOf(primaryQ.id) : null;
  return <main className="teaching-page">
    <header className="teaching-head">
      <p className="teaching-crumb">{topic.breadcrumb}</p>
      <h2>{scope?.title ?? module?.title ?? topic.name}</h2>
      <p className="teaching-intro">{scope?.introduction ?? topic.description}</p>
    </header>
    {module && teaching.length ? teaching.map((screen, i) => <TeachingBlock key={`${competency}-${screen.title}-${i}`} module={module} screen={screen} index={i} total={teaching.length} problem={i === 0 ? primaryProblem : null} q={i === 0 ? primaryQ : null} practiceIds={practice} resumeKey={resumeKey} />) : <section className="teaching-block unavailable"><h3>Teaching is being prepared</h3><p>This topic does not yet have suitable teaching content.</p></section>}
    <section className="practice-invitation">
      <h3>Ready to try it?</h3>
      <p>Work through one question at a time. You can return to this explanation whenever you need it.</p>
      <button className="primary" type="button" disabled={!primaryQ} onClick={onPractice}>Practice this concept</button>
    </section>
  </main>;
}
