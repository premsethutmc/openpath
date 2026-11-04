import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import test from "node:test";
import { CATEGORY, SCENARIOS, checkScenario, runScenario } from "./scenarios";

const matrix: unknown[] = [];
for (const s of SCENARIOS) {
  test(`scenario ${s.id} [${CATEGORY[s.category]}] ${s.note ?? ""}`.trim(), () => {
    const r = runScenario(s);
    const v = checkScenario(r);
    const ev = r.f.session.state().evidence(r.f.session.competency);
    matrix.push({ id: s.id, category: s.category, learner: s.learner().name, start: s.start, entry: s.entry ?? "diagnostic", retry: !!s.retry, later: s.later ?? [], ended: r.f.ended?.phase ?? null, endedWhy: r.f.ended?.why ?? null, status: ev.status, retention: ev.retention, cycles: (ev.retentionHistory ?? []).map((c) => c.result), teaches: r.f.session.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as { strategy: string }).strategy), submissions: r.f.session.replies.length, interactions: r.interactions, checks: v });
    const failed = v.filter((x) => !x.ok);
    assert.deepEqual(failed.map((x) => `${x.property}: ${x.detail}`), []);
  });
}
test.after(() => { if (process.env.M2_MATRIX) writeFileSync(process.env.M2_MATRIX, JSON.stringify(matrix, null, 1)); });
