/** Teaching-first syllabus entry backed by the canonical question pools and learner ledger: Learn → Practice → Assessment. */
import { useEffect, useRef, useState } from 'react';
import { moduleFor } from '../../../packages/learning/src/content';
import { exposureKey } from '../../../packages/learning/src/families';
import { graph } from '../../../packages/learning/src/graph';
import { familyOf } from '../../../packages/learning/src/intervention';
import { TeachingContent, teachingPracticeIds, teachingExposureStrategy } from '../curriculum/TeachingContent';
import { Ask, Feedback, type Ctx, type Fb } from './Learn';
import { useResume } from './resume';
import '../curriculum/TeachingExperience.css';

type Screen = 'teaching' | 'practice';

/** The three stages of a lesson, always visible, so a learner can see where they are and move between them. */
function LessonStages({ here, onLearn, onPractice, onAssess }: { here: Screen; onLearn: () => void; onPractice?: () => void; onAssess?: () => void }) {
  const stages: { key: Screen | 'assess'; label: string; go?: () => void }[] = [
    { key: 'teaching', label: 'Learn', go: onLearn },
    { key: 'practice', label: 'Practice', go: onPractice },
    { key: 'assess', label: 'Assessment', go: onAssess },
  ];
  return <ol className="lesson-stages" aria-label="Lesson stages">
    {stages.map((s, k) => <li key={s.key} className={s.key === here ? 'here' : ''}>
      <button type="button" aria-current={s.key === here ? 'step' : undefined} disabled={!s.go} onClick={s.go}><span aria-hidden="true">{k + 1}</span>{s.label}</button>
    </li>)}
  </ol>;
}

export function CurriculumPractice({ competency, ctx, resumeKey, back, initialStage, onAssess, onStuck }: { competency: string; ctx: Ctx; resumeKey: string; back: string; initialStage?: Screen; onAssess?: () => void; onStuck?: (qid: string) => void }) {
  const ids = moduleFor(competency) ? teachingPracticeIds(competency) : [];
  const next = () => ids.find((id) => !ctx.records.attempts.some((attempt) => exposureKey(attempt.questionId) === exposureKey(id))) ?? null;
  const [screen, setScreen] = useResume<Screen>(resumeKey + ':screen', initialStage ?? 'teaching');
  const [cursor, setCursor] = useResume<{ qid: string | null; fb: Fb | null; hint: boolean }>(resumeKey, { qid: next(), fb: null, hint: false });
  const [retry, setRetry] = useResume<number>(resumeKey + ':retry', 0);
  const node = graph.get(competency);
  const exposureStrategy = teachingExposureStrategy(competency);
  const exposureSaved = ctx.records.teaching.some(t => t.competency === competency && t.session === ctx.session && t.rule === 'foundation-lesson-review@1');
  const [exposureError, setExposureError] = useState(false);
  const exposurePending = useRef(false);
  const recordExposure = async () => {
    if (exposureSaved || exposurePending.current || !exposureStrategy) return;
    exposurePending.current = true;
    setExposureError(false);
    try { setExposureError(!await ctx.teach(competency, exposureStrategy, 'foundation-lesson-review@1')); }
    catch { setExposureError(true); }
    finally { exposurePending.current = false; }
  };
  useEffect(() => { void recordExposure(); }, [competency, ctx.session]);
  // Reading remains available during a failed save. Do not turn that help into independent evidence.
  const canLeaveTeaching = exposureSaved;
  const exposureNotice = !canLeaveTeaching && (!exposureStrategy
    ? <p role="status">Saved lesson practice is not available for this content yet. You can still read the teaching that is available.</p>
    : exposureError
    ? <p role="alert">Your lesson is still open, but its progress could not be saved. <button type="button" onClick={() => void recordExposure()}>Retry saving lesson</button></p>
    : <p role="status">Saving lesson progress before practice or assessment…</p>);
  // a stage chosen on the lesson page (Learn or Practice) opens that stage once; otherwise the lesson resumes where it was left
  useEffect(() => { if (initialStage && initialStage !== screen) setScreen(initialStage); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  const learn = () => { setScreen('teaching'); window.scrollTo(0, 0); };
  const practise = () => { if (canLeaveTeaching) { setScreen('practice'); window.scrollTo(0, 0); } };

  if (screen === 'teaching') return <article className="experience-preview learner-teaching" aria-label="Mathematics teaching and practice">
    <nav className="teaching-nav" aria-label="Lesson navigation"><a href={back}>← Back</a><span>Mathematics</span><span /></nav>
    <LessonStages here="teaching" onLearn={learn} onPractice={canLeaveTeaching ? practise : undefined} onAssess={canLeaveTeaching ? onAssess : undefined} />
    {exposureNotice}
    <TeachingContent competency={competency} topic={{ name: node.name, description: node.description, breadcrumb: `Mathematics › ${node.strand}` }} onPractice={practise} practiceDisabled={!canLeaveTeaching} resumeKey={resumeKey} />
  </article>;

  return <article className="experience-preview practice-open learner-practice" aria-label="Curriculum practice">
    <nav className="teaching-nav" aria-label="Lesson navigation"><button type="button" onClick={learn}>← Teaching</button><span>Practice</span><span /></nav>
    <LessonStages here="practice" onLearn={learn} onPractice={canLeaveTeaching ? practise : undefined} onAssess={canLeaveTeaching ? onAssess : undefined} />
    {exposureNotice}
    <main className="practice-workspace real-practice">
      {!canLeaveTeaching ? null : cursor.qid ? cursor.fb ? <Feedback
        fb={cursor.fb}
        label="Next question"
        onNext={() => { setCursor({ qid: next(), fb: null, hint: false }); setRetry(0); }}
        onRetry={hint => { setCursor({ ...cursor, fb: null, hint: cursor.hint || hint }); setRetry(retry + 1); }}
        onInvestigate={onStuck && familyOf(cursor.qid) ? () => onStuck(cursor.qid!) : undefined}
      /> : <Ask
        key={`${cursor.qid}:${retry}`} qid={cursor.qid} ctx={ctx} activity="practice" hintAllowed
        resumeKey={`${resumeKey}:${cursor.qid}`} showHint={cursor.hint}
        onAnswered={fb => setCursor({ ...cursor, fb })}
      /> : <div role="status" className="practice-done">
        <p>You have worked through every practice question for this lesson.</p>
        {onAssess ? <button type="button" className="primary" onClick={onAssess}>Check my understanding</button> : null}
      </div>}
      <button className="link" type="button" onClick={learn}>Return to teaching</button>
    </main>
  </article>;
}
