import { useMemo } from "react";
import { moduleFor, needsMarking, question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { teachingLesson, type LessonBlock } from "../../../packages/learning/src/teaching-contract";
import { teachingScopeFor } from "../../../packages/learning/src/teaching-presentation";
import { Figure } from "../year/Figure";
import { ProgressiveWorkedExample, RepresentationRenderer, TeachingVisualRenderer } from "./TeachingPrimitives";

interface TopicCopy {
  name: string;
  description?: string;
  breadcrumb: string;
}

const displayed = (line: string) => line.replace(/larger size/gi, "larger absolute value");

/** One lesson section (teaching-contract@1): labelled by its role; "Worked example" only for a complete, checked solution. */
function TeachingBlock({ block, index, resumeKey, repeatsHeading = false }: { block: LessonBlock; index: number; resumeKey?: string; repeatsHeading?: boolean }) {
  const worked = block.worked;
  return <section className={`teaching-block role-${block.role}`} data-role={block.role} data-instance={block.instance ?? undefined} data-verified={worked ? String(worked.verified) : undefined}>
    <div className="teaching-step"><p className="teaching-label">{block.label}</p></div>
    {repeatsHeading ? null : <h3>{block.title}</h3>}
    {block.text.map((line, i) => <p key={i}>{displayed(line)}</p>)}
    {block.representation ? <RepresentationRenderer representation={block.representation} /> : block.visual ? <TeachingVisualRenderer visual={block.visual} /> : block.widget ? <Figure v={block.widget} /> : null}
    {worked ? <>
      {block.role !== "worked-example" ? <p className="teaching-label worked-label">{worked.verified ? "Worked example" : "The steps"}</p> : null}
      <ProgressiveWorkedExample example={worked} storageKey={resumeKey && `${resumeKey}:example:${index}`} />
    </> : null}
  </section>;
}

const lessonCache = new Map<string, ReturnType<typeof teachingLesson> | null>();
function lessonFor(competency: string) {
  if (!lessonCache.has(competency)) { const module = moduleFor(competency); lessonCache.set(competency, module ? teachingLesson(module, candidatesFor(module)) : null); }
  return lessonCache.get(competency)!;
}
/** Practice candidates: the lesson's practice pool, minus questions needing marking and questions outside the taught scope. */
function candidatesFor(module: NonNullable<ReturnType<typeof moduleFor>>) {
  const scope = teachingScopeFor(module);
  return [...new Set([...modulePhasePool(module, "practice"), ...module.practice, ...module.transfer])].filter((id) => {
    if (needsMarking(question(id))) return false;
    const problem = problemOf(id);
    return !!problem && scope.accepts(problem);
  });
}
/** Practice queue for a lesson: the kind of question the lesson worked through first, never a question it already solved first. */
export function teachingPracticeIds(competency: string) {
  return lessonFor(competency)?.practice ?? [];
}

/** Shared teaching-first content for preview and authenticated learner journeys. */
export function TeachingContent({ competency, topic, onPractice, resumeKey }: { competency: string; topic: TopicCopy; onPractice: () => void; resumeKey?: string }) {
  const module = moduleFor(competency);
  const scope = useMemo(() => module ? teachingScopeFor(module) : null, [module]);
  const lesson = useMemo(() => lessonFor(competency), [competency]);
  const practice = lesson?.practice ?? [];
  const blocks = lesson?.blocks ?? [];
  const exampleId = scope?.strategyId ? module?.strategies.find((strategy) => strategy.id === scope.strategyId)?.guided : undefined;
  const exampleProblem = exampleId ? problemOf(exampleId) : null;
  const primaryId = exampleId && exampleProblem && scope?.accepts(exampleProblem) ? exampleId : practice[0];
  const primaryQ = primaryId ? question(primaryId) : null;
  const heading = scope?.title ?? module?.title ?? topic.name;
  const intro = scope?.introduction ?? (module && blocks.length ? null : topic.description);
  const first = blocks[0];
  // the first section is the idea itself: when it says exactly what the page heading and introduction say, say it once
  const introRepeats = !!first && !!intro && first.text.map(displayed).join(" ").trim() === intro.trim();
  return <main className="teaching-page">
    <header className="teaching-head">
      <p className="teaching-crumb">{topic.breadcrumb}</p>
      <h2>{heading}</h2>
      {intro && !introRepeats ? <p className="teaching-intro">{intro}</p> : null}
    </header>
    {module && blocks.length ? blocks.map((block, i) => <TeachingBlock key={`${competency}-${block.title}-${i}`} block={block} index={i} resumeKey={resumeKey} repeatsHeading={i === 0 && block.title === heading} />) : <section className="teaching-block unavailable"><h3>Teaching is being prepared</h3><p>This topic does not yet have suitable teaching content.</p></section>}
    <section className="practice-invitation">
      <h3>Ready to try it?</h3>
      <p>Work through one question at a time. You can return to this explanation whenever you need it.</p>
      <button className="primary" type="button" disabled={!primaryQ} onClick={onPractice}>Practice this concept</button>
    </section>
  </main>;
}
