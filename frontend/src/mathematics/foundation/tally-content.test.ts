import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { programs, evaluate } from '../../../../packages/mathematics/src/foundation/programs';
import { TallyRows } from './Tally';
import { tallySVG } from '../../../../packages/learning/src/primary/tally';

const lesson = programs.find(p => p.id === 'tally-g3-draft')!;
test('every tally question labels the actual rows, with answers checked against visible strokes', () => {
  const labels = [['Books'], ['Books'], ['Games'], ['Books', 'Games'], ['Dogs', 'Cats'], ['Books']];
  lesson.questions.forEach((q, index) => {
    assert.ok('tallyCounts' in q && 'tallyLabels' in q);
    const counts = q.tallyCounts as number[], names = q.tallyLabels as string[];
    assert.deepEqual(names, labels[index]);
    assert.equal(names.length, counts.length);
    const strokes = counts.map(n => [...tallySVG(n).matchAll(/<line /g)].length);
    const expected = strokes.length === 1 ? strokes[0] : Math.abs(strokes[0] - strokes[1]);
    assert.equal(q.answer, String(expected));
    assert.equal(evaluate(lesson, q, String(expected)).correct, true);
    const markup = renderToStaticMarkup(React.createElement(TallyRows, { counts, labels: names }));
    for (const name of names) assert.ok(markup.includes(`<th scope="row">${name}</th>`));
    assert.equal((markup.match(/scope="col"/g) ?? []).length, 2);
  });
});
test('zero, crossed groups, comparisons and ties receive relevant feedback', () => {
  const byId = (id: string) => lesson.questions.find(q => q.id === id)!;
  assert.match(byId('guided').solution, /One group of five and one single mark/);
  for (const id of ['guided', 'independent-a', 'retention']) {
    assert.doesNotMatch(byId(id).hint + byId(id).misconception, /how many more|difference|combined total/i);
  }
  const zero = byId('independent-b');
  assert.match(evaluate(lesson, zero, '1').message, /No marks means zero/);
  assert.doesNotMatch(zero.hint + zero.misconception, /diagonal|cross|subtract/i);
  assert.match(byId('application').solution, /13 − 8 = 5/);
  assert.match(byId('transfer').solution, /neither has more/);
  assert.doesNotMatch(byId('transfer').prompt, /larger row/);
});
