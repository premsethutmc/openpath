/** Teaching-first syllabus entry backed by the canonical question pools and learner ledger. */
import { useEffect } from 'react';
import { moduleFor } from '../../../packages/learning/src/content';
import { exposureKey } from '../../../packages/learning/src/families';
import { graph } from '../../../packages/learning/src/graph';
import { TeachingContent, teachingPracticeIds } from '../curriculum/TeachingContent';
import { Ask, Feedback, type Ctx, type Fb } from './Learn';
import { useResume } from './resume';
import '../curriculum/TeachingExperience.css';

export function CurriculumPractice({ competency, ctx, resumeKey, back }: { competency: string; ctx: Ctx; resumeKey: string; back: string }) {
  const ids = moduleFor(competency) ? teachingPracticeIds(competency) : [];
  const next = () => ids.find((id) => !ctx.records.attempts.some((attempt) => exposureKey(attempt.questionId) === exposureKey(id))) ?? null;
  const [screen, setScreen] = useResume<'teaching' | 'practice'>(resumeKey + ':screen', 'teaching');
  const [cursor, setCursor] = useResume<{ qid: string | null; fb: Fb | null; hint: boolean }>(resumeKey, { qid: next(), fb: null, hint: false });
  const [retry, setRetry] = useResume<number>(resumeKey + ':retry', 0);
  const node = graph.get(competency);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'teaching') return <article className="experience-preview learner-teaching" aria-label="Mathematics teaching and practice">
    <nav className="teaching-nav" aria-label="Lesson navigation"><a href={back}>← Back</a><span>Mathematics</span><span /></nav>
    <TeachingContent competency={competency} topic={{ name: node.name, description: node.description, breadcrumb: `Mathematics › ${node.strand}` }} onPractice={() => { setScreen('practice'); window.scrollTo(0, 0); }} resumeKey={resumeKey} />
  </article>;

  return <article className="experience-preview practice-open learner-practice" aria-label="Curriculum practice">
    <nav className="teaching-nav" aria-label="Lesson navigation"><button type="button" onClick={() => { setScreen('teaching'); window.scrollTo(0, 0); }}>← Teaching</button><span>Practice</span><span /></nav>
    <main className="practice-workspace real-practice">
      {cursor.qid ? cursor.fb ? <Feedback
        fb={cursor.fb}
        label="Next question"
        onNext={() => { setCursor({ qid: next(), fb: null, hint: false }); setRetry(0); }}
        onRetry={hint => { setCursor({ ...cursor, fb: null, hint: cursor.hint || hint }); setRetry(retry + 1); }}
      /> : <Ask
        key={`${cursor.qid}:${retry}`} qid={cursor.qid} ctx={ctx} activity="practice" hintAllowed
        resumeKey={`${resumeKey}:${cursor.qid}`} showHint={cursor.hint}
        onAnswered={fb => setCursor({ ...cursor, fb })}
      /> : <p role="status">No unseen keyboard practice remains in the existing question pool for this concept.</p>}
      <button className="link" type="button" onClick={() => setScreen('teaching')}>Return to teaching</button>
    </main>
  </article>;
}
