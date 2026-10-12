/**
 * E2b cleanup: revising an item (reordered options, rewritten distractors) creates a new version, and the
 * earlier version is kept, so evidence recorded against it is still scored exactly as it was answered.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { type CodeItem, type Item, Ledger, itemVersion, validateRetired } from "../src/index.ts";
import { CONTENT, REPO, loadBundle, loadContext } from "../../../tools/english/load.ts";

type Code = Extract<Item, { kind: "code" }>;
const ctx = loadContext();
const retired = JSON.parse(readFileSync(join(CONTENT, "items", "retired-versions.json"), "utf8")) as Code[];
const at = "2026-10-12T10:00:00.000Z";

test("every revised item has a new version, and its earlier version is kept but never selected", () => {
  assert.ok(retired.length > 0);
  for (const r of retired) {
    const cur = ctx.content.items.get(r.id) as Code;
    assert.ok(cur && cur.version > r.version, r.id);
    assert.deepEqual(itemVersion(ctx.content, r.id, r.version), r, `${r.id}@${r.version} resolves to the retired version`);
    assert.equal(itemVersion(ctx.content, r.id, cur.version), cur);
    // only current versions are selectable
    assert.ok(!(ctx.content.byCapability.get(cur.target) ?? []).some((i) => i.id === r.id && i.version === r.version));
    // the keyed option is the same text in both versions: the revision changed presentation, not the key
    if (r.format.startsWith("choice:")) assert.equal(cur.options![cur.answer!], r.options![r.answer!], r.id);
  }
});

test("an answer to an earlier version is scored against that version, before and after a rebuild", () => {
  // a reordered E2a item: the old keyed index now points at a different option
  const r = retired.find((x) => x.format.startsWith("choice:") && (ctx.content.items.get(x.id) as Code).answer !== x.answer)!;
  const cur = ctx.content.items.get(r.id) as Code;
  const old = (choice: number, id: string) => ({ kind: "evidence" as const, id, at, session: "s", item: { id: r.id, version: r.version }, response: { kind: "choice" as const, choice } });
  const l = new Ledger(ctx, "x");
  assert.equal(l.apply(old(r.answer!, "e1"))[0].observation!.value, 1, "the old key is right for the old version");
  const wrongIndex = cur.answer!; // the new key, which was a distractor in the old version
  assert.equal(l.apply(old(wrongIndex, "e2"))[0].observation!.value, 0, "the new key is not right for an answer to the old version");
  // a rebuild from the event log reaches the same decisions
  const rebuilt = Ledger.rebuild(ctx, "x", l.events);
  assert.deepEqual(rebuilt.composite, l.composite);
  // the current version scores its own key
  const [d] = new Ledger(ctx, "y").apply({ kind: "evidence", id: "e3", at, session: "s", item: { id: cur.id, version: cur.version }, response: { kind: "choice", choice: cur.answer! } });
  assert.equal(d.observation!.value, 1);
  // a version that never existed is still rejected
  const [u] = new Ledger(ctx, "z").apply({ kind: "evidence", id: "e4", at, session: "s", item: { id: cur.id, version: cur.version + 5 }, response: { kind: "choice", choice: 0 } });
  assert.equal(u.verdict, "rejected");
});

test("retired versions are exactly the versions on main before the revision, and are checked", () => {
  for (const f of ["code-items.json", "e2a-items.json"]) {
    let before: Code[];
    try {
      before = JSON.parse(execFileSync("git", ["show", `9f8f235:content/english/items/${f}`], { cwd: REPO, encoding: "utf8" }));
    } catch {
      return; // no git history available (e.g. a source archive): the other tests still apply
    }
    const now = new Map((JSON.parse(readFileSync(join(CONTENT, "items", f), "utf8")) as Code[]).map((i) => [i.id, i]));
    for (const b of before) {
      const cur = now.get(b.id)!;
      if (cur.version === b.version) assert.deepEqual({ ...cur, review: undefined }, { ...b, review: undefined }, `${b.id}: unchanged items keep their version`);
      else assert.deepEqual(retired.find((r) => r.id === b.id && r.version === b.version), b, `${b.id}: the earlier version is kept as it was`);
    }
  }
  const bundle = loadBundle();
  const bad = { ...retired[0], version: 99 } as Item;
  assert.match(validateRetired({ ...bundle, retired: [bad] }, ctx.index).join(), /not older than the current version/);
  void ({} as CodeItem);
});
