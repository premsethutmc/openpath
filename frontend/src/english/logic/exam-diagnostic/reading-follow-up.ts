/** Small, deterministic reading transfer loop. No model, score prediction or mastery write. */
import { LESSONS, report, validSession, type Session } from './session.ts';

// Separate from the legacy preview's CHECKS, whose exposures were never recorded.
// Private bank: no answer keys or explanations are returned before submission.
const bank = [
  {id:'journey-reading-main-1',skill:'main_argument',passage:'A town planted trees to cool its streets. Trees can help, but young saplings provide little shade. Officials should track actual summer temperatures rather than celebrate the number planted alone.',prompt:'What is the main argument?',options:['Planting trees cannot cool streets.','Tree counts alone do not establish cooling; measure temperatures too.','Young trees should never be planted.'],answer:1,explanation:'The author supports trees while distinguishing the activity from its intended result.',quote:'Officials should track actual summer temperatures'},
  {id:'journey-reading-inference-1',skill:'supported_inference',passage:'A museum extended its opening hours. Evening attendance rose, but the report did not record whether visitors had previously come during the day.',prompt:'Which conclusion is supported?',options:['More visits occurred in the evening; the change in total visits is unknown.','Every evening visitor was new to the museum.','Total attendance must have doubled.'],answer:0,explanation:'The observation establishes evening attendance, not whether those visits replaced daytime visits.',quote:'the report did not record whether visitors had previously come during the day'},
  {id:'journey-reading-example-1',skill:'example_function',passage:'Convenience does not guarantee equal access. For example, moving appointment booking online may save time for many people while excluding those without an internet connection. Service design must consider who can use it.',prompt:'What role does the online-booking example play?',options:['It proves all online services should close.','It introduces an unrelated technology trend.','It illustrates how a convenient change can still exclude some users.'],answer:2,explanation:'The example supports the broader distinction between convenience and access.',quote:'while excluding those without an internet connection'},
  {id:'journey-reading-evidence-1',skill:'evidence_limits',passage:'A language club reports success because membership rose from twenty to forty. It has not checked whether members can understand new conversations better than before.',prompt:'What additional evidence best tests the claimed learning benefit?',options:['Count the membership forms again.','Compare members’ understanding on equivalent unfamiliar listening tasks before and after.','Ask how many chairs the club owns.'],answer:1,explanation:'Comparable unfamiliar tasks address learning, whereas membership measures participation.',quote:'It has not checked whether members can understand new conversations better than before'},
];
const lessons = { ...LESSONS };
export type ReadingTransferOutcome = 'supported_after_lesson' | 'needs_more_practice' | 'no_fresh_item';
export interface ReadingTransferResult {
  skill: string;
  outcome: ReadingTransferOutcome;
  initial: 'possible_gap';
  itemId: string | null;
  explanation: string;
  quote: string;
  scope: string;
}
export interface ReadingFollowUpState {
  phase: 'lesson' | 'check' | 'feedback' | 'complete';
  /** Only skills with an incorrect initial response are included. */
  skills: string[];
  position: number;
  lesson: { skill: string; text: string } | null;
  /** No answer key or explanation is exposed before submission. */
  question: { id: string; skill: string; passage: string; prompt: string; options: string[] } | null;
  answer: number | null;
  results: ReadingTransferResult[];
  seenIds: string[];
}
const scope = 'This is one new question immediately after a lesson, not proof of lasting improvement, independent proficiency, mastery or an exam score.';

/**
 * A visit-scoped controller. Persist seenIds outside this class before rendering a check if
 * freshness must survive reload. A supplied seen ID includes display without submission.
 * Completing a lesson acknowledges display; it does not claim the learner understood it.
 */
export class ReadingFollowUp {
  private state: ReadingFollowUpState;
  constructor(session: Session, previouslySeen: readonly string[] = []) {
    if (!validSession(session) || session.phase !== 'report') throw new Error('Finish the initial diagnostic first.');
    this.state = {
      phase: 'complete', skills: report(session).filter(r => r.status === 'possible_gap').map(r => r.skill),
      position: 0, lesson: null, question: null, answer: null, results: [], seenIds: [...new Set(previouslySeen)],
    };
    this.nextLesson();
  }
  snapshot(): ReadingFollowUpState { return structuredClone(this.state); }
  private nextLesson(): void {
    while (this.state.position < this.state.skills.length) {
      const skill = this.state.skills[this.state.position];
      const q = bank.find(q => q.skill === skill && !this.state.seenIds.includes(q.id));
      if (q && lessons[skill]) {
        this.state = { ...this.state, phase: 'lesson', lesson: { skill, text: lessons[skill] }, question: null, answer: null };
        return;
      }
      this.state = { ...this.state, position: this.state.position + 1, results: [...this.state.results, {
        skill, initial: 'possible_gap', outcome: 'no_fresh_item', itemId: null, explanation: 'No unseen transfer question is available. Previously displayed items cannot count as fresh evidence.', quote: '', scope,
      }] };
    }
    this.state = { ...this.state, phase: 'complete', lesson: null, question: null, answer: null };
  }
  /** Transition before displaying the item; record its exposure even if the learner abandons it. */
  completeLesson(): void {
    if (this.state.phase !== 'lesson' || !this.state.lesson) return;
    const q = bank.find(q => q.skill === this.state.lesson!.skill && !this.state.seenIds.includes(q.id));
    if (!q) return;
    this.state = { ...this.state, phase: 'check', lesson: null,
      question: { id: q.id, skill: q.skill, passage: q.passage, prompt: q.prompt, options: [...q.options] },
      seenIds: [...this.state.seenIds, q.id],
    };
  }
  answer(id: string, index: number): void {
    if (this.state.phase !== 'check' || this.state.question?.id !== id) return;
    const q = bank.find(q => q.id === id);
    if (!q || !Number.isInteger(index) || index < 0 || index >= q.options.length) return;
    this.state = { ...this.state, phase: 'feedback', answer: index, results: [...this.state.results, {
      skill: q.skill, initial: 'possible_gap', itemId: q.id,
      outcome: index === q.answer ? 'supported_after_lesson' : 'needs_more_practice',
      explanation: `${q.explanation} Matching answer: ${q.options[q.answer]}`, quote: q.quote, scope,
    }] };
  }
  next(): void {
    if (this.state.phase !== 'feedback') return;
    this.state = { ...this.state, position: this.state.position + 1 };
    this.nextLesson();
  }
}
