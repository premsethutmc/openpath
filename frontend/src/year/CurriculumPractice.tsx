/** Syllabus entry into existing family pools, answer UI and canonical ledger; no session-plan gate. */
import { moduleFor, question } from '../../../packages/learning/src/content';
import { fromPool } from '../../../packages/learning/src/intervention';
import { graph } from '../../../packages/learning/src/graph';
import { nativeItem } from '../../../packages/learning/src/evidence';
import { Ask, Feedback, STATUS_WORD, type Ctx, type Fb } from './Learn';
import { useResume } from './resume';

export function CurriculumPractice({ competency, ctx, resumeKey, back }: { competency: string; ctx: Ctx; resumeKey: string; back: string }) {
  const m = moduleFor(competency);
  const next = () => m ? fromPool(m, 'practice', ctx.records) : null;
  const [cursor, setCursor] = useResume<{ qid: string | null; fb: Fb | null; hint: boolean }>(resumeKey, { qid: next(), fb: null, hint: false });
  const [retry, setRetry] = useResume<number>(resumeKey + ':retry', 0);
  const evidence = ctx.evidence(competency);
  const item = cursor.qid ? nativeItem(question(cursor.qid)) : null;
  return <section className="stack" aria-label="Curriculum practice">
    <p className="eyebrow">Mathematics · competency practice</p>
    <h1>{graph.get(competency).name}</h1>
    <p className="small muted">{item?.evidence_status === 'validated' ? 'Educator-reviewed and released' : 'Provisional · not educator-reviewed'}</p>
    <details>
      <summary>Learning progress: {STATUS_WORD[evidence.status]}</summary>
      <p className="small">Formative performance: {evidence.independent.right}/{evidence.independent.total} correct without help; {evidence.assisted.right}/{evidence.assisted.total} correct with help or repeat exposure.</p>
      <p className="small muted">Activity completion is separate from verified mastery. Content review and any method requirements are shown in the syllabus. Unreviewed generated practice cannot grant verified mastery.</p>
    </details>
    {cursor.qid ? cursor.fb ? <Feedback
      fb={cursor.fb}
      label="Next question"
      onNext={() => { setCursor({ qid: next(), fb: null, hint: false }); setRetry(0); }}
      onRetry={hint => { setCursor({ ...cursor, fb: null, hint: cursor.hint || hint }); setRetry(retry + 1); }}
    /> : <Ask
      key={`${cursor.qid}:${retry}`} qid={cursor.qid} ctx={ctx} activity="practice" hintAllowed
      resumeKey={`${resumeKey}:${cursor.qid}`} showHint={cursor.hint}
      onAnswered={fb => setCursor({ ...cursor, fb })}
    /> : <p role="status">No unseen keyboard practice remains in the existing question pool for your grade. Choose another competency or open its teaching module.</p>}
    <a className="link" href={back}>Back to syllabus</a>
  </section>;
}
