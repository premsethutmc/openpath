import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TeachingVisual } from '../../../packages/learning/src/teaching-presentation';
(globalThis as { React?: unknown }).React = React;
const { TeachingVisualRenderer } = await import('./TeachingPrimitives');
const { TeachingContent } = await import('./TeachingContent');
const render = (visual: TeachingVisual) => renderToStaticMarkup(createElement(TeachingVisualRenderer, { visual }));

test('fraction visual captions distinguish comparison, equivalence and one fraction', () => {
  const unequal = render({ kind: 'fraction-strip', numerator: 1, denominator: 9, comparison: { numerator: 1, denominator: 11 } });
  assert.match(unequal, /1 out of 9 equal parts/);
  assert.match(unequal, /1 out of 11 equal parts/);
  assert.match(unequal, /Compare the shaded lengths/);
  assert.doesNotMatch(unequal, /Equal fractions cover/);
  assert.equal((unequal.match(/class="shaded"/g) ?? []).length, 2);
  const equal = render({ kind: 'fraction-strip', numerator: 1, denominator: 2, comparison: { numerator: 2, denominator: 4 } });
  assert.match(equal, /Equal fractions cover/);
  assert.match(render({ kind: 'fraction-strip', numerator: 3, denominator: 8 }), /fraction of one whole/);
});

test('unsupported strip data is not clamped into a misleading picture', () => {
  for (const [numerator, denominator] of [[2, 1], [-1, 4], [1, 0], [1, 2.5], [1, 1000], [NaN, 4]]) {
    const html = render({ kind: 'fraction-strip', numerator, denominator });
    assert.match(html, /Picture not available/);
    assert.doesNotMatch(html, /fraction-parts/);
  }
  assert.match(render({ kind: 'fraction-strip', numerator: 1, denominator: 2, comparison: { numerator: 5, denominator: 4 } }), /Picture not available/);
});

test('actual curriculum teaching route does not label unequal comparison pictures as equal', () => {
  const html = renderToStaticMarkup(createElement(TeachingContent, {
    competency: 'MATH.number.fraction-comparison',
    topic: { name: 'Compare fractions', breadcrumb: 'Mathematics' }, onPractice: () => {},
  }));
  assert.match(html, /fraction-strip-visual/);
  const figures = html.match(/<figure class="teaching-data-visual fraction-strip-visual"[^>]*>.*?<\/figure>/g) ?? [];
  assert.ok(figures.length > 0);
  assert.ok(figures.some(f => f.includes('Compare the shaded lengths')));
  for (const f of figures) {
    const fractions = [...f.matchAll(/<strong>(\d+)\/(\d+)<\/strong>/g)].map(m => [Number(m[1]), Number(m[2])]);
    if (fractions.length === 2 && fractions[0][0] * fractions[1][1] !== fractions[1][0] * fractions[0][1]) {
      assert.doesNotMatch(f, /Equal fractions cover/);
    }
  }
});
