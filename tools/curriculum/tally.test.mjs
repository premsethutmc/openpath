import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeTally, decodeTally, tallySVG, recordAction, gradeRecord, gradeNumber, tallyLesson, tallyReadFamily as read, tallyDifferenceFamily as diff } from '../../packages/learning/src/primary/tally.ts';

test('all counts 0–20: model, actual rendered strokes, independent family validator', () => {
  for (let n = 0; n <= 20; n++) {
    const tally = encodeTally(n);
    assert.equal(decodeTally(tally), n);
    const svg = tallySVG(n);
    assert.equal((svg.match(/<line /g) || []).length, n);
    assert.equal(read.validate([n], read.solve([n]).answer), true);
    for (let wrong = -1; wrong <= 25; wrong++) if (wrong !== n) assert.equal(read.validate([n], wrong), false);
  }
});
test('all 441 table pairs: compare by independent pairing, not the solver formula', () => {
  for (let a = 0; a <= 20; a++) for (let b = 0; b <= 20; b++) {
    const expected = Array.from({length:20}, (_, i) => (i < a) !== (i < b)).filter(Boolean).length;
    assert.equal(diff.solve([a, b]).answer, expected);
    assert.equal(diff.validate([a, b], expected), true);
    assert.equal(diff.validate([a, b], expected + 1), false);
  }
});
test('recording boundary: fifth stroke crosses four; undo restores four', () => {
  let state = {count:0};
  for (let n=1;n<=20;n++) { state=recordAction(state,'add'); assert.equal(gradeRecord(n,state),true); }
  assert.equal(recordAction(state,'add').count,20);
  assert.deepEqual(encodeTally(recordAction({count:5},'undo').count), {bundles:0,singles:4});
  assert.deepEqual(encodeTally(recordAction({count:4},'add').count), {bundles:1,singles:0});
  assert.equal(recordAction({count:0},'undo').count,0);
  assert.equal(recordAction(state,'clear').count,0);
});
test('reject malformed counts, noncanonical groups, out-of-range and malformed numeric answers', () => {
  for (const n of [-1,21,NaN,Infinity,1.2]) assert.throws(()=>encodeTally(n));
  for (const t of [{bundles:1,singles:5},{bundles:-1,singles:0},{bundles:5,singles:0}]) assert.throws(()=>decodeTally(t));
  for (const raw of ['', '5x', '5.0', '2+3', '+5', 5, null]) assert.equal(gradeNumber(5,raw),false);
  assert.equal(gradeNumber(5,' 5 '),true);
  assert.notEqual(read.reject([5,6]),null); assert.equal(read.validate([21],21),false);
  assert.equal(diff.validate([1],0),false);
});
test('SVG is accessible, escapes labels and does not print hidden numeric answer', () => {
  const svg=tallySVG(13,'<script>bad</script>');
  assert.ok(svg.includes('role="img"'));assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('>13<'));
});
test('misconception predictions are always wrong, including ties and zeros', () => {
  for(let n=0;n<=20;n++) for(const bug of read.bugs([n])) assert.equal(read.validate([n],bug.predict),false);
  for(let a=0;a<=20;a++) for(let b=0;b<=20;b++) for(const bug of diff.bugs([a,b])) assert.equal(diff.validate([a,b],bug.predict),false);
});
test('lesson example and stage samples agree with model and keep delayed items fresh', () => {
  assert.equal(decodeTally(encodeTally(tallyLesson.worked.count)),13);
  assert.equal(diff.solve([...tallyLesson.worked.comparison]).answer,5);
  assert.equal(new Set([...tallyLesson.guided,...tallyLesson.independent,...tallyLesson.delayed]).size,11);
  assert.equal(tallyLesson.educatorReviewed,false);
});

test('draft family explanations use singular grammar and do not invent a larger row in a tie', () => {
  assert.equal(read.explain(read.solve([6]).steps[0]), '1 group of five and 1 single mark make 6.');
  assert.match(diff.explain(diff.solve([10, 10]).steps[0]), /neither row has more/);
  assert.doesNotMatch(diff.prompt([10, 10]), /larger row/);
});

test('short tally rows retain readable intrinsic size and every stroke stays in the viewBox', () => {
  for (let n = 0; n <= 20; n++) {
    const svg = tallySVG(n);
    const width = Number(svg.match(/viewBox="0 0 (\d+) 80"/)[1]);
    assert.ok(width >= 120 && width <= 320);
    if (n <= 5) assert.equal(width, 120);
    assert.ok(svg.includes(`style="max-width:${width}px"`));
    for (const coordinate of svg.matchAll(/x[12]="(\d+)"/g)) assert.ok(Number(coordinate[1]) < width);
  }
});
