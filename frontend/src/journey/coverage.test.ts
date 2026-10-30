import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import test from "node:test";
import { COMPETENCIES, coverage, type Coverage } from "./coverage";

const out: Coverage[] = [];
for (const c of COMPETENCIES) test(`coverage ${c}`, () => { const r = coverage(c); out.push(r); assert.ok(r.support !== "unsupported" || r.limitations.length, "an unsupported competency says why"); });
test.after(() => { if (process.env.M2_COVERAGE) writeFileSync(process.env.M2_COVERAGE, JSON.stringify(out, null, 1)); });
