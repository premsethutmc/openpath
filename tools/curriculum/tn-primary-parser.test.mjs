import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extractStructured } from '../../packages/learning/src/extract.ts';
for (const term of [1, 2]) {
const intake = JSON.parse(readFileSync(new URL(`../../content/learning/ingestion/tn-primary-2026-term${term}.json`, import.meta.url)));
for (const book of intake.books) test(`Term ${term}, grade ${book.grade}: existing structured parser retains all intake outcomes and printed pages`, () => {
  const text = execFileSync('python', [new URL('./validate_tn_primary.py', import.meta.url).pathname, '--structured-grade', String(book.grade), '--term', String(term)], { encoding: 'utf8' });
  const doc = extractStructured(text);
  assert.equal(doc.meta.grade, String(book.grade));
  assert.match(doc.meta.coverage, /partial/);
  assert.match(doc.meta.status, /draft/);
  assert.equal(doc.meta.source, book.source.url);
  assert.equal(doc.meta.sha, book.source.sha256);
  assert.equal(doc.provenance.cost, 0);
  assert.equal(doc.chapters.length, book.lessons.length);
  for (const [i, chapter] of doc.chapters.entries()) {
    const lesson = book.lessons[i];
    assert.equal(chapter.title, lesson.title);
    assert.equal(chapter.unit.number, lesson.unit);
    assert.equal(chapter.outcomes.length, lesson.outcomes.length);
    for (const [j, outcome] of chapter.outcomes.entries()) {
      const expected = lesson.outcomes[j];
      assert.equal(outcome.text, expected.statement);
      const [a, z] = expected.provenance.printedPages;
      assert.equal(outcome.pages, `${a}–${z}`);
      assert.equal(outcome.location.page, a);
    }
  }
});

}
