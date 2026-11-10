/** The pool registry and offline-research boundary run under Node CI as well as Bun. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importsOf, inspectSelectionBoundary, REGISTERED_SELECTORS } from "../../../tools/question-selection-boundary.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
function fixture(files: Record<string, string>, check: (result: ReturnType<typeof inspectSelectionBoundary>) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openpath-selection-boundary-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(dir, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    check(inspectSelectionBoundary(dir, ["src"]));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("all application pool readers are registered and no application module can reach offline recovery research", () => {
  const result = inspectSelectionBoundary(root);
  assert.deepEqual(result.readers, [...REGISTERED_SELECTORS].sort());
  assert.deepEqual(result.violations, []);
});

test("selector aliases, multiline imports, re-exports and namespace/dynamic access cannot evade the registry", () => {
  for (const text of [
    'import { phasePool as fresh } from "./families";',
    'import {\n type Phase,\n pool as raw\n} from "./families";',
    'export { modulePhasePool as items } from "./library";',
    'export * from "./intervention";',
    'import * as bank from "./families";',
    'const bank = require("./families");',
    'const bank = await import("./library");',
    'import bank = require("./families");',
    'import * as learning from "../../../packages/learning/src/index";',
    'const learning = await import("../../../packages/learning/src/index.ts");',
    'const learning = require("../../../packages/learning/src");',
  ]) assert.ok(importsOf(text).some((entry: { selectors: boolean }) => entry.selectors), text);
  assert.ok(importsOf('import * as learning from "./index";', '/repo/packages/learning/src/consumer.ts').some((entry: { selectors: boolean }) => entry.selectors));
  assert.deepEqual(importsOf('import type { pool } from "./families";'), []);
  assert.ok(!importsOf('import { type pool, type Phase } from "./families";').some((entry: { selectors: boolean }) => entry.selectors));
  assert.deepEqual(importsOf('// import { pool } from "./families";\nconst description = "import(\\\"research\\\")";'), []);
});

test("offline research imports are rejected for every runtime import form", () => {
  for (const text of [
    'import { old } from "../research/deep-recovery/frozen/old";',
    'export { old } from "../research/deep-recovery/frozen/old";',
    'export * from "../research/deep-recovery/frozen/old";',
    'await import("../research/deep-recovery/frozen/old");',
    'require("../research/deep-recovery/frozen/old");',
  ]) fixture({ "src/app.ts": text, "research/deep-recovery/frozen/old.ts": "export const old = true;" }, (result) => {
    assert.deepEqual(result.violations, ["src/app.ts -> research/deep-recovery/frozen/old.ts"], text);
  });
});

test("an intermediary outside src cannot hide offline research from an application import", () => fixture({
  "src/app.ts": 'export { old } from "../tools/bridge";',
  "tools/bridge.ts": 'export { old } from "../research/deep-recovery/frozen/old";',
  "research/deep-recovery/frozen/old.ts": "export const old = true;",
}, (result) => assert.deepEqual(result.violations, ["tools/bridge.ts -> research/deep-recovery/frozen/old.ts"])));

test("an application cannot import a test as a bridge, but tests may exercise research directly", () => fixture({
  "src/app.ts": 'import "./bridge.test";',
  "src/bridge.test.ts": 'import "../research/deep-recovery/frozen/old";',
  "research/deep-recovery/frozen/old.ts": "export const old = true;",
}, (result) => assert.deepEqual(result.violations, ["src/app.ts -> src/bridge.test.ts"])));

test("test-only research imports remain allowed without registering offline pool readers", () => fixture({
  "src/app.ts": "export const live = true;",
  "src/recovery.test.ts": 'import "../research/deep-recovery/tools/sim";',
  "research/deep-recovery/tools/sim.ts": 'import { pool } from "../../../src/families";',
  "src/families.ts": "export const pool = () => [];",
}, (result) => assert.deepEqual(result, { readers: [], violations: [] })));

test("unknown dynamic imports and unresolved local imports fail closed, existing CSS does not", () => fixture({
  "src/app.ts": 'import "./style.css"; import "./missing"; import(target);',
  "src/style.css": "body {}",
}, (result) => assert.deepEqual(result.violations, [
  "src/app.ts: non-literal runtime import cannot be checked",
  "src/app.ts: unresolved local import ./missing",
])));

test("the relocated phase-2 comparison implementation is unchanged apart from its imports", () => {
  const frozen = readFileSync(join(root, "research/deep-recovery/frozen/deep-recovery-d98ba668.ts"), "utf8");
  const body = frozen.replace(/^import .*\n/gm, "");
  assert.equal(createHash("sha256").update(body).digest("hex"), "9c18f9f20bf5dea4ec2df7db47a8199f516453a3b00eb00d9e3b4d9a4e6259a5");
});
