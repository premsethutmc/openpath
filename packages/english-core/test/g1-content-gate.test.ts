/**
 * G1: the content-validation gate. Provisional (unreviewed demonstration) items are recorded and shown at
 * rule level, marked provisional, but never change an estimate and never count as verified.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Item, Ledger, contentStatus, countsAsVerified, englishInflections, indexContent, projectRuleEvidence } from "../src/index.ts";
import { loadBundle, loadContext, viewFor } from "../../../tools/english/load.ts";
import { CAP, engineView, profileContext, runProfile } from "./rule-profiles.ts";

const IND = { schema: "provenance@1" as const, attempt: 1, hints: [] as string[], afterFeedback: false };

/** The profile context, with the draft questions marked provisional. */
function provisionalContext() {
  const base = profileContext();
  const items = [...base.content.items.values()].map((i) => (((i.id >= "spl.infl.18" && i.id <= "spl.infl.25") || i.id.startsWith("spl.infl.fx")) && i.kind === "code" ? ({ ...i, evidence_status: "provisional" } as Item) : i));
  const ctx = loadContext();
  const b = loadBundle();
  return { ...base, content: indexContent(viewFor({ ...b, items: items as Item[] }, ctx.index), ctx.index) };
}

test("G1-1 an answer to a provisional item is held: no estimate change, the reason says why", () => {
  const ctx = provisionalContext();
  const l = new Ledger(ctx, "gate");
  const before = JSON.stringify(l.composite.nodes[CAP]);
  const [d] = l.apply({ kind: "evidence", id: "e1", at: "2026-10-14T09:00:00.000Z", session: "s", item: { id: "spl.infl.18", version: 1 }, response: { kind: "typed", text: "chopping" }, provenance: IND });
  assert.equal(d.verdict, "held");
  assert.match(d.reasons[0], /provisional item/);
  assert.equal(JSON.stringify(l.composite.nodes[CAP]), before);
  assert.equal(contentStatus(ctx.content.items.get("spl.infl.18")!), "provisional");
  assert.equal(contentStatus(ctx.content.items.get("spl.infl.02")!), "candidate");
});

test("G1-2 provisional answers still count at rule level as independent, marked provisional; a 'verified' rule on them never supports a claim", () => {
  const ctx = provisionalContext();
  const run = runProfile("rule_knower");
  const l = Ledger.rebuild(ctx, "gate", run.events);
  const p = projectRuleEvidence(l, ctx.content, englishInflections, engineView(l)).capabilities[CAP];
  const d = p.rules.find((r) => r.rule === "double_short")!;
  assert.equal(d.status, "verified");
  assert.ok(d.evidenceBasis.provisional >= 7);
  assert.equal(countsAsVerified(d), false);
  assert.ok((p.claim.rulesVerifiedThroughBand ?? 0) < 4);
  // and the engine never saw those answers: only the 3 bank anchors moved the estimate
  assert.equal(l.composite.nodes[CAP].directN, 3);
});

test("G1-3 the existing bank is unchanged by the gate: no bank item is provisional", () => {
  const ctx = loadContext();
  for (const i of ctx.content.items.values()) assert.notEqual(i.kind === "code" ? i.evidence_status : undefined, "provisional", i.id);
});
