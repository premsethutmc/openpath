/** Real current /curriculum/ and /year/ screens, real Django, synthetic accounts only. No review fixture. */
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { boardFor } from '../../packages/learning/src/curricula.ts';
import { make } from '../../packages/learning/src/session.ts';
import { readRecords } from '../../packages/learning/src/records.ts';
import { evidenceFor } from '../../packages/learning/src/evidence.ts';
const base = process.env.YEAR_URL ?? 'http://127.0.0.1:4297';
const shots = process.env.SHOTS ?? '/tmp/keyboard-dashboard-screens';
mkdirSync(shots, { recursive: true });
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === '' ? undefined : process.env.CHROMIUM_PATH ?? '/usr/bin/chromium' }); });
after(() => browser?.close());
async function call(page, path, body, method) { return page.evaluate(async ({ path, body, method }) => { const token = decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? ''); const r = await fetch('/api' + path, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: await r.json() }; }, { path, body, method }); }
async function account(width) { const context = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true }); const page = await context.newPage(); page.setDefaultTimeout(60000); page.on('pageerror', e => console.error('page error:', e.message)); await page.goto(base + '/curriculum/'); await call(page, '/account/'); assert.equal((await call(page, '/account/register/', { email: `keyboard-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`, password: 'synthetic-keyboard-dashboard-password', consent: true })).status, 201); const p = await call(page, '/pupils/', { display_name: 'Synthetic keyboard learner', consent: true }); assert.equal(p.status, 201); const L = p.data.id; const ctx = { learnerId: L, sessionId: `learn:${L}:keyboard`, at: new Date().toISOString() }; assert.equal((await call(page, `/pupils/${L}/events/`, { subject: 'mathematics', seq: 0, event: make.enrol(ctx, 7, '2026-27', boardFor('cbse', 7)) })).status, 201); return { context, page, L }; }
async function clean(page) { assert.equal(await page.locator('canvas,svg.writing-paper,.sketch-sheet,.writing-settings,.math-keypad').count(), 0); assert.equal(await page.getByRole('button', { name: /write instead|interpret handwriting|eraser|pan|pen tool/i }).count(), 0); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow'); }
async function snap(page, width, name) { await clean(page); await page.screenshot({ path: `${shots}/${width}-${name}.png`, fullPage: true }); }
async function open(page, L, skill) { await page.goto(`${base}/year/?learner=${L}&skill=${skill}`); await page.getByRole('button', { name: 'Open keyboard working', exact: true }).click(); }
async function cursor(page, field) { await page.locator(`.paper-entry[data-entry="${field}"]`).waitFor(); await page.waitForFunction(field => document.querySelector('.paper-cursor')?.getAttribute('aria-label') && document.querySelector(`.paper-entry[data-entry="${field}"]`)?.classList.contains('active'), field); }
for (const width of [360, 393])
    test(`${width}px: Grade 7 tiles → keyboard division, recovery, correction, resume and inadmissible evidence`, async () => {
        const { context, page, L } = await account(width);
        try {
            await page.goto(`${base}/curriculum/?learner=${L}#b=cbse&g=7`);
            await page.getByRole('heading', { name: 'Grade 7 Mathematics', exact: true }).waitFor();
            assert.ok(await page.locator('.tiles > li').count() > 0);
            await snap(page, width, 'grade7-tiles');
            await open(page, L, 'MATH.number.long-division');
            await cursor(page, 'quotient:0');
            assert.equal(await page.locator('.paper-cursor').getAttribute('inputmode'), 'numeric');
            await page.locator('.paper-cursor').pressSequentially('1302');
            await cursor(page, 'product:1');
            await snap(page, width, 'working');
            await page.locator('.paper-cursor').pressSequentially('5');
            await page.getByRole('complementary', { name: 'Help with this number' }).waitFor();
            await snap(page, width, 'incorrect-recovery');
            assert.equal(await page.locator('.paper-entry[data-entry="product:1"]').innerText(), '−\n5');
            await page.getByRole('button', { name: 'Give me a hint', exact: true }).click();
            await page.waitForFunction(() => document.activeElement?.classList.contains('paper-cursor'));
            await page.setViewportSize({ width, height: 500 });
            await clean(page);
            assert.equal(await page.locator('.paper-cursor').evaluate(el => el === document.activeElement), true, 'help and viewport reduction preserve keyboard focus');
            await page.setViewportSize({ width, height: 820 });
            await page.getByRole('button', { name: 'Try again', exact: true }).click();
            await page.locator('.paper-cursor').pressSequentially('6');
            await cursor(page, 'difference:1');
            await page.reload();
            await page.getByRole('button', { name: 'Open keyboard working', exact: true }).click();
            await cursor(page, 'difference:1');
            assert.equal(await page.locator('.paper-entry[data-entry="product:1"]').innerText(), '−\n6');
            await snap(page, width, 'resumed');
            // Backspace is native keyboard editing; the learner supplies the correction.
            await page.locator('.paper-cursor').pressSequentially('1');
            await cursor(page, 'quotient:2');
            await page.locator('.paper-entry[data-entry="product:1"] button').click();
            await page.locator('.paper-cursor').press('Backspace');
            await page.locator('.paper-cursor').pressSequentially('6');
            await cursor(page, 'difference:1');
            assert.equal(await page.locator('.paper-cursor').inputValue(), '1');
            await page.locator('.paper-cursor').press('Backspace');
            await page.locator('.paper-cursor').pressSequentially('16181');
            await page.locator('#division-success').waitFor();
            await snap(page, width, 'corrected-completed');
            const evs = (await call(page, `/pupils/${L}/events/?subject=mathematics`)).data.events;
            const receipts = evs.filter(e => e.kind === 'math_writing');
            assert.ok(receipts.length > 10);
            assert.ok(receipts.every(e => e.admissible === false && e.contentStatus === 'provisional'));
            assert.ok(receipts.some(e => e.assisted));
            const records = readRecords(L, evs, []);
            assert.notEqual(evidenceFor(L, records, Date.now()).get('MATH.number.long-division')?.status, 'verified');
            await page.getByRole('button', { name: 'Back to lesson', exact: true }).click();
            await page.getByRole('button', { name: 'Open keyboard working', exact: true }).waitFor();
            // Returning to the canonical module refreshes its ledger cursor; a subsequent ordinary answer is accepted.
            const input = page.getByRole('textbox', { name: 'Your answer', exact: true });
            if (await input.count()) {
                await input.fill('0');
                const response = page.waitForResponse(r => r.url().includes(`/pupils/${L}/events/`) && r.request().method() === 'POST');
                await page.getByRole('button', { name: 'Check', exact: true }).click();
                assert.equal((await response).status(), 201);
            }
            await clean(page);
        }
        finally {
            await context.close();
        }
    });
test('same current learner journey supports equivalent fractions and guided multiplication without drawing controls', async () => {
    const { context, page, L } = await account(393);
    try {
        await open(page, L, 'MATH.number.equivalent-fractions');
        await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill('3/6');
        await page.getByRole('button', { name: 'Check answer', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Correct!' }).waitFor();
        await clean(page);
        await open(page, L, 'MATH.number.multiplication-tables');
        await page.getByRole('button', { name: 'Help me step by step', exact: true }).click();
        await page.getByRole('region', { name: 'Mathematics lesson', exact: true }).waitFor();
        await clean(page);
        // The original concept and worked example remain in the guided flow.
        await page.getByRole('button', { name: 'See a worked example', exact: true }).click();
        await page.getByRole('button', { name: 'Open my working', exact: true }).click();
        await page.getByRole('textbox', { name: 'Number or expression', exact: true }).fill('24');
        await page.getByRole('button', { name: 'Add typed step', exact: true }).click();
        await page.getByRole('button', { name: /Check my working|Send confirmed steps to validator/ }).click();
        await page.getByRole('region', { name: 'Practice completion', exact: true }).waitFor();
        await clean(page);
    }
    finally {
        await context.close();
    }
});
test('legacy writing and institutional routes cannot expose deferred controls', async () => { const { context, page } = await account(360); try {
    for (const path of ['/writing.html', '/writing/', '/year/?handwriting=1', '/review/', '/maths/', '/mathematics.html']) {
        await page.goto(base + path);
        await clean(page);
    }
}
finally {
    await context.close();
} });
