/** Original CC0 draft. Source-linked in the TN intake, not educator-reviewed or registered in learner releases.
 * A reusable tally model, recording controller, SVG and existing-Def adapters. No network/model calls.
 */
import type { Def, Value } from '../family-kit.ts';
export const MAX_TALLY = 20;
export type Tally = { bundles: number; singles: number };
export type RecordState = { count: number };
const integer = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
export function checkCount(n: number): void {
  if (!integer(n) || n < 0 || n > MAX_TALLY) throw new RangeError('Use a whole-number count from 0 to 20.');
}
export function encodeTally(n: number): Tally {
  checkCount(n);
  return { bundles: Math.floor(n / 5), singles: n % 5 };
}
export function decodeTally(t: Tally): number {
  if (!t || !integer(t.bundles) || !integer(t.singles) || t.bundles < 0 || t.singles < 0 || t.singles > 4) throw new RangeError('Use complete fives and 0–4 single marks.');
  const n = t.bundles * 5 + t.singles;
  checkCount(n);
  return n;
}
/** The fifth press crosses four marks; undoing it restores four upright marks. */
export function recordAction(state: RecordState, action: 'add' | 'undo' | 'clear'): RecordState {
  checkCount(state.count);
  if (!['add', 'undo', 'clear'].includes(action)) throw new RangeError('Unknown recording action.');
  return { count: action === 'clear' ? 0 : action === 'add' ? Math.min(MAX_TALLY, state.count + 1) : Math.max(0, state.count - 1) };
}
export function gradeRecord(target: number, state: RecordState): boolean {
  checkCount(target); checkCount(state.count);
  return state.count === target;
}
export function gradeNumber(expected: number, raw: unknown): boolean {
  checkCount(expected);
  // No parseInt truncation: decimals, signs, expressions and empty answers are not accepted.
  return typeof raw === 'string' && /^\d{1,2}$/.test(raw.trim()) && Number(raw.trim()) === expected;
}
export function describeTally(t: Tally): string {
  decodeTally(t);
  return t.bundles === 0 && t.singles === 0 ? 'No tally marks.' :
    `${t.bundles} crossed ${t.bundles === 1 ? 'bundle' : 'bundles'} of four upright strokes and one diagonal stroke; ${t.singles} separate upright ${t.singles === 1 ? 'stroke' : 'strokes'}.`;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
/** Every line is one observation. Four uprights + one crossing stroke make exactly five, never six. */
export function tallySVG(n: number, label = 'Tally marks'): string {
  const t = encodeTally(n);
  const segments: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number) => segments.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  for (let g = 0; g < t.bundles; g++) {
    const x = 16 + 74 * g;
    for (let j = 0; j < 4; j++) line(x + j * 13, 18, x + j * 13, 60);
    line(x - 5, 56, x + 44, 22);
  }
  for (let j = 0; j < t.singles; j++) line(16 + t.bundles * 74 + j * 13, 18, 16 + t.bundles * 74 + j * 13, 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 80" role="img" aria-label="${escape(label + '. ' + describeTally(t))}"><g stroke="#163a59" stroke-width="3.5" stroke-linecap="round">${segments.join('')}</g>${n === 0 ? '<text x="16" y="47" fill="#163a59" font-size="18">No marks</text>' : ''}</svg>`;
}
export const tallyLesson = {
  title: 'Keep a count with tally marks',
  status: 'draft', educatorReviewed: false,
  sourceOutcomeIds: ['tn-g03-2026-t1-em-l05-o01', 'tn-g03-2026-t1-em-l05-o02'],
  steps: [
    'Make one upright mark for each thing you count. An empty row means none.',
    'After four upright marks, draw the fifth mark across them. The crossed bundle means five, not six.',
    'Start a new bundle for the next thing. Count complete bundles in fives, then add the separate marks.',
    'Keep a separate row for each category. Write the number beside its tally marks.',
    'Compare the row counts. The larger count tells you which has more. Equal counts mean a tie. Subtract the smaller count from the larger to find how many more.'
  ],
  worked: { count: 13, text: 'Two crossed bundles and three separate marks: 5 + 5 + 3 = 13.', comparison: [13, 8], comparisonText: 'The first row has 13 and the second has 8. The first has more: 13 − 8 = 5.' },
  guided: [4, 5, 6], independent: [0, 9, 10, 14, 20], delayed: [7, 15, 19],
  misconception: 'The diagonal is the fifth mark, not a line drawn after five uprights. Count the four uprights and the diagonal: five marks.'
} as const;
const C = 'MATH.statistics.tables';
const valid = (p: number[], length: number) => p.length === length && p.every(n => integer(n) && n >= 0 && n <= MAX_TALLY);
// Independent reference counts each stroke rather than calling encodeTally or the family solver.
function countStrokes(n: number): number { let result = 0; for (let i = 0; i < n; i++) result++; return result; }
const numeric = (v: Value) => typeof v === 'number' && Number.isInteger(v);
export const tallyReadFamily: Def = {
  id: 'draft_tally_read', arity: 1, competency: C, type: 'integer', title: 'Read tally marks in groups of five',
  parse: () => null, reject: p => valid(p, 1) ? null : 'Count must be 0–20.',
  prompt: () => 'How many tally marks are in this row?',
  solve: ([n]) => ({ answer: n, steps: [{ id: 'count', op: 'count', competency: C, inputs: [Math.floor(n / 5), n % 5], value: n }] }),
  validate: (p, answer) => valid(p, 1) && numeric(answer) && answer === countStrokes(p[0]),
  bugs: ([n]) => n < 5 ? [] : [{ id: 'cross-counted-twice', kind: 'conceptual', competency: C, says: 'The crossed bundle has four upright marks and one crossing mark: five altogether.', predict: n + Math.floor(n / 5) }],
  variants: ([n]) => [0, 4, 5, 6, 9, 10, 14, 19, 20].filter(x => x !== n).map(x => [x]),
  explain: s => `${s.inputs[0]} ${s.inputs[0] === 1 ? 'group' : 'groups'} of five and ${s.inputs[1]} single ${s.inputs[1] === 1 ? 'mark' : 'marks'} make ${s.value}.`,
  figure: ([n]) => ({ type: 'table', head: ['Tally row (text description)'], rows: [[describeTally(encodeTally(n))]] }),
  domain: [[0, 20]], grade: () => 3, difficulty: ([n]) => n < 5 ? 1 : n < 11 ? 2 : 3,
  teach: { idea: tallyLesson.steps[1], method: tallyLesson.steps[2] }
};
export const tallyDifferenceFamily: Def = {
  id: 'draft_tally_difference', arity: 2, competency: C, type: 'integer', title: 'Compare two tally rows',
  parse: () => null, reject: p => valid(p, 2) ? null : 'Both counts must be 0–20.',
  prompt: () => 'How many more marks are in one row than the other? Write 0 if the counts are equal.',
  solve: ([a, b]) => ({ answer: Math.abs(a - b), steps: [{ id: 'difference', op: 'subtract', competency: C, inputs: [Math.max(a, b), Math.min(a, b)], value: Math.abs(a - b) }] }),
  validate: (p, answer) => {
    if (!valid(p, 2) || !numeric(answer)) return false;
    // Pair one mark from each row; count only the unpaired marks.
    let unpaired = 0;
    for (let i = 0; i < MAX_TALLY; i++) if ((i < p[0]) !== (i < p[1])) unpaired++;
    return answer === unpaired;
  },
  bugs: ([a, b]) => Math.min(a, b) === 0 ? [] : [{ id: 'total-for-difference', kind: 'conceptual', competency: C, says: 'How many more asks for the marks left after pairing the rows, not all marks together.', predict: a + b }],
  variants: ([a, b]) => [[0, 0], [5, 5], [4, 6], [13, 8], [8, 13], [20, 0]].filter(([x, y]) => x !== a || y !== b),
  explain: s => `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}. ${s.value === 0 ? 'The counts are equal, so neither row has more.' : 'That is how many more marks the larger row has.'}`,
  figure: ([a, b]) => ({ type: 'table', head: ['Category', 'Tallies (text description)'], rows: [['Books', describeTally(encodeTally(a))], ['Games', describeTally(encodeTally(b))]] }),
  domain: [[0, 20], [0, 20]], grade: () => 3, difficulty: () => 2,
  teach: { idea: tallyLesson.steps[4], method: 'Read each tally row first. Pair their marks. Count the marks left in the larger row.' }
};
/** Kept separate from fam/index.ts until runtime visual/grade checks and release review are complete. */
export const DRAFT_TALLY_FAMILIES = [tallyReadFamily, tallyDifferenceFamily];
