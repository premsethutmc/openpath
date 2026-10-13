/**
 * P1: evidence provenance (docs/english/EVIDENCE_PROVENANCE.md) and end-to-end synthetic learners.
 *
 * Synthetic tests establish software behaviour only, not educational effectiveness. Interventions here are
 * recorded by hand: the planner that would choose them is a proposal, not implemented.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type LedgerEvent, type Provenance, type RuleState, Ledger, englishInflections, projectRuleEvidence } from "../src/index.ts";
import { CAP, engineView, profileContext, runProfile } from "./rule-profiles.ts";

const ctx = profileContext();
const project = (l: Ledger) => projectRuleEvidence(l, ctx.content, englishInflections, engineView(l)).capabilities[CAP];
const rule = (l: Ledger, id: string): RuleState => project(l).rules.find((r) => r.rule === id)!;
/** Every estimate and stage input, without the decision ids (which name the events). */
const nodes = (l: Ledger) => JSON.stringify(Object.fromEntries(Object.entries(l.composite.nodes).map(([k, n]) => [k, { ...n, evidence: n.evidence.length }])));
const IND: Provenance = { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false };
const v = (id: string) => ctx.content.items.get(id)!.version;
const at = (day: number, min: number) => new Date(Date.parse("2026-10-14T09:00:00Z") + day * 86_400_000 + min * 60_000).toISOString();

/** A small script of learner events: independent answers, hints, helped answers and teaching. */
function script(name: string) {
  const events: LedgerEvent[] = [];
  let n = 0;
  const id = (p: string) => `${name}:${p}${n++}`;
  const api = {
    events,
    answer(item: string, text: string, day: number, min: number, session: string, provenance: Provenance | null = IND) {
      events.push({ kind: "evidence", id: id("e"), at: at(day, min), session, item: { id: item, version: v(item) }, response: { kind: "typed", text }, ...(provenance ? { provenance } : {}) });
      return api;
    },
    /** Wrong first, then hints, then a helped answer. */
    helped(item: string, first: string, after: string, day: number, min: number, session: string, intervention?: string) {
      const p = id("p");
      events.push({ kind: "presented", id: p, at: at(day, min), session, item: { id: item, version: v(item) }, purpose: "practice", ...(intervention ? { intervention } : {}) });
      events.push({ kind: "evidence", id: id("e"), at: at(day, min), session, item: { id: item, version: v(item) }, response: { kind: "typed", text: first }, provenance: { ...IND, presented: p, ...(intervention ? { intervention } : {}) } });
      const h1 = id("h");
      events.push({ kind: "hint", id: h1, at: at(day, min), session, item: { id: item, version: v(item) }, presented: p, level: 1, hintType: "rule_reminder" });
      events.push({ kind: "assisted_response", id: id("a"), at: at(day, min), session, item: { id: item, version: v(item) }, presented: p, response: { kind: "typed", text: after }, attempt: 2, hints: [h1], afterFeedback: true, ...(intervention ? { intervention } : {}) });
      return api;
    },
    teach(strategy: string, day: number, min: number, session: string, rule = "double_short") {
      const iv = id("iv");
      events.push({ kind: "intervention", id: iv, at: at(day, min), session, capability: CAP, rule, strategy, content: `lesson:${strategy}` });
      return iv;
    },
    assisted(item: string, text: string, day: number, min: number, session: string, intervention: string, hints = 0) {
      const hs = Array.from({ length: hints }, () => id("h"));
      hs.forEach((h, k) => events.push({ kind: "hint", id: h, at: at(day, min), session, item: { id: item, version: v(item) }, level: k + 1, hintType: "similar_example" }));
      events.push({ kind: "assisted_response", id: id("a"), at: at(day, min), session, item: { id: item, version: v(item) }, response: { kind: "typed", text }, attempt: 1, hints: hs, afterFeedback: false, intervention });
      return api;
    },
    ledger: () => Ledger.rebuild(ctx, name, events),
  };
  return api;
}

// ---------------------------------------------------------------- the schema

test("P1-1 legacy evidence (no provenance) gives a byte-identical composite, and is reported as 'assistance unknown', never as independent", () => {
  const legacy = runProfile("rule_knower", { legacy: true }).ledger;
  const recorded = runProfile("rule_knower").ledger;
  assert.equal(JSON.stringify(legacy.composite), JSON.stringify(recorded.composite));
  const d = rule(legacy, "double_short");
  assert.equal(d.status, "insufficient_evidence");
  assert.equal(d.unknown.total, 9);
  assert.equal(d.current.total, 0);
  assert.ok(d.reasons.some((r) => r.includes("without assistance status")));
  assert.equal(project(legacy).claim.engineMasteryLabelSupported, false);
});

test("P1-2 provenance events never change an estimate", () => {
  const plain = script("plain").answer("spl.infl.18", "chopping", 0, 1, "a").answer("spl.infl.19", "stopped", 0, 2, "a");
  const rich = script("rich");
  const iv = rich.teach("rule_explanation", 0, 0, "a");
  rich.helped("spl.infl.11", "runing", "running", 0, 0, "a", iv).answer("spl.infl.18", "chopping", 0, 1, "a").assisted("spl.infl.20", "bigger", 0, 1, "a", iv, 2).answer("spl.infl.19", "stopped", 0, 2, "a");
  // the helped item's first answer is independent evidence; remove it to compare like with like
  const richEvents = rich.events.filter((e) => !(e.kind === "evidence" && e.item.id === "spl.infl.11"));
  const a = plain.ledger();
  const b = Ledger.rebuild(ctx, "rich", richEvents);
  assert.equal(nodes(b), nodes(a));
});

test("P1-3 an evidence event that says it was helped is held: no estimate change, tracked as assisted", () => {
  const base = script("base").answer("spl.infl.18", "chopping", 0, 1, "a").ledger();
  for (const [label, p] of [
    ["hinted", { ...IND, hints: ["h0"] }],
    ["second attempt", { ...IND, attempt: 2 }],
    ["after feedback", { ...IND, afterFeedback: true }],
  ] as [string, Provenance][]) {
    const s = script(label).answer("spl.infl.18", "chopping", 0, 1, "a").answer("spl.infl.19", "stopped", 0, 2, "a", p);
    const l = s.ledger();
    const d = l.decisions.find((x) => x.source === s.events[1].id)!;
    assert.equal(d.verdict, "held", label);
    assert.match(d.reasons[0], /answered with help/, label);
    assert.equal(JSON.stringify(l.composite.nodes[CAP].direct), JSON.stringify(base.composite.nodes[CAP].direct), label);
    assert.equal(rule(l, "double_short").assisted.total, 1, label);
  }
  // an item displayed by the teaching it follows is not independent either
  const t = script("taught");
  const iv = "taught:iv";
  t.events.push({ kind: "intervention", id: iv, at: at(0, 0), session: "a", capability: CAP, rule: "double_short", strategy: "worked_examples", items: ["spl.infl.18"] });
  t.answer("spl.infl.18", "chopping", 0, 1, "a", { ...IND, intervention: iv });
  assert.equal(t.ledger().decisions.at(-1)!.verdict, "held");
});

test("P1-4 replay with provenance events is deterministic", () => {
  const s = script("replay");
  const iv = s.teach("phonetic_segmentation", 0, 0, "a");
  s.helped("spl.infl.18", "choping", "chopping", 0, 1, "a", iv).answer("spl.infl.19", "stopped", 0, 2, "a").answer("spl.infl.22", "trimming", 1, 1, "b");
  const a = s.ledger();
  const b = Ledger.rebuild(ctx, "replay", [...s.events]);
  assert.equal(JSON.stringify(a.composite), JSON.stringify(b.composite));
  assert.deepEqual(project(a), project(b));
});

test("P1-5 a hint or teaching earlier in a delayed session ends that session's delayed check", () => {
  const shown = (s: ReturnType<typeof script>) => s.answer("spl.infl.18", "chopping", 0, 1, "a").answer("spl.infl.19", "stopped", 0, 2, "a").answer("spl.infl.22", "trimming", 0, 3, "a").answer("spl.infl.21", "digging", 0, 4, "a").answer("spl.infl.24", "jumping", 0, 5, "a");
  const clean = shown(script("clean")).answer("spl.infl.20", "bigger", 9, 1, "b").answer("spl.infl.23", "wettest", 9, 2, "b");
  assert.equal(rule(clean.ledger(), "double_short").status, "verified");
  const hinted = shown(script("hinted"));
  hinted.events.push({ kind: "hint", id: "hinted:h", at: at(9, 0), session: "b", item: { id: "spl.infl.11", version: v("spl.infl.11") }, level: 1, hintType: "rule_reminder" });
  hinted.answer("spl.infl.20", "bigger", 9, 1, "b").answer("spl.infl.23", "wettest", 9, 2, "b");
  assert.equal(rule(hinted.ledger(), "double_short").retention.state, "not_checked");
  const taught = shown(script("taught2"));
  taught.teach("rule_explanation", 9, 0, "b");
  taught.answer("spl.infl.20", "bigger", 9, 1, "b").answer("spl.infl.23", "wettest", 9, 2, "b");
  assert.equal(rule(taught.ledger(), "double_short").retention.state, "not_checked");
});

// ---------------------------------------------------------------- end-to-end learners (the ten requested)

test("E1 knows all rules: doubling, silent e and y to i verified; plain endings and -es unchecked, so the engine's label is not supported", () => {
  const l = runProfile("rule_knower").ledger;
  for (const id of ["double_short", "drop_e", "y_to_i"]) assert.equal(rule(l, id).status, "verified", id);
  for (const id of ["plain", "es_plural"]) assert.equal(rule(l, id).status, "insufficient_evidence", id);
  assert.equal(project(l).claim.engineMasteryLabelSupported, false);
});

test("E2 never doubles: doubling weak with no_doubling active; other rules verified", () => {
  const l = runProfile("never_doubles").ledger;
  const d = rule(l, "double_short");
  assert.deepEqual([d.status, d.misconceptions.find((m) => m.tag === "no_doubling")?.state], ["weak", "active"]);
});

test("E3 memoriser: weak on new words, right in practice: a transfer gap, not a misconception", () => {
  const d = rule(runProfile("memoriser").ledger, "double_short");
  assert.deepEqual([d.status, d.transferGap, d.misconceptions.every((m) => m.state === "suspected")], ["weak", true, true]);
});

test("E4 guesser: inconsistent, no rule demonstrated, no active misconception", () => {
  const rules = project(runProfile("guesser").ledger).rules.filter((r) => ["double_short", "drop_e", "y_to_i"].includes(r.rule));
  assert.ok(rules.every((r) => !["demonstrated", "verified"].includes(r.status) && r.misconceptions.every((m) => m.state !== "active")));
});

test("E5 occasional slips: recorded as slips, no misconception, no rule weak", () => {
  const rules = project(runProfile("careless").ledger).rules.filter((r) => ["double_short", "drop_e", "y_to_i"].includes(r.rule));
  assert.ok(rules.reduce((t, r) => t + r.slips, 0) > 0);
  assert.ok(rules.every((r) => r.status !== "weak" && r.misconceptions.length === 0));
});

test("E6 responds to a different strategy: the record shows the first teaching followed by errors and the second by correct new-word answers", () => {
  const s = script("responds");
  s.answer("spl.infl.18", "choping", 0, 1, "a").answer("spl.infl.19", "stoped", 0, 2, "a").answer("spl.infl.22", "triming", 0, 3, "a");
  const iv1 = s.teach("rule_explanation", 0, 10, "a");
  s.assisted("spl.infl.02", "swiming", 0, 11, "a", iv1, 2).answer("spl.infl.21", "diging", 0, 20, "a");
  const iv2 = s.teach("phonetic_segmentation", 1, 0, "b");
  s.assisted("spl.infl.11", "running", 1, 1, "b", iv2, 1).answer("spl.infl.20", "bigger", 1, 10, "b").answer("spl.infl.24", "jumping", 1, 11, "b").answer("spl.infl.23", "wettest", 2, 1, "c");
  const d = rule(s.ledger(), "double_short");
  assert.deepEqual(d.interventions.map((i) => [i.strategy, i.independentAfter.newWordRight, i.independentAfter.newWordTotal]), [
    ["rule_explanation", 0, 1],
    ["phonetic_segmentation", 2, 2],
  ]);
  const m = d.misconceptions.find((x) => x.tag === "no_doubling")!;
  assert.equal(m.state, "improving");
  // two correct answers after four errors are not yet enough to call the rule shown
  assert.ok(!["demonstrated", "verified"].includes(d.status));
});

test("E7 fails multiple strategies: three interventions, each followed by errors; the misconception stays active", () => {
  const s = script("fails");
  s.answer("spl.infl.18", "choping", 0, 1, "a").answer("spl.infl.19", "stoped", 0, 2, "a");
  const items = [["spl.infl.22", "triming"], ["spl.infl.21", "diging"], ["spl.infl.20", "biger"]];
  ["rule_explanation", "phonetic_segmentation", "morphology_word_building"].forEach((strategy, k) => {
    const iv = s.teach(strategy, k + 1, 0, `s${k}`);
    s.assisted("spl.infl.02", "swiming", k + 1, 1, `s${k}`, iv, 2).answer(items[k][0], items[k][1], k + 1, 10, `s${k}`);
  });
  const d = rule(s.ledger(), "double_short");
  assert.equal(d.interventions.length, 3);
  assert.ok(d.interventions.every((i) => i.independentAfter.right === 0 && i.during.right === 0));
  assert.equal(d.status, "weak");
  assert.equal(d.misconceptions.find((x) => x.tag === "no_doubling")!.state, "active");
});

test("E8 succeeds, then forgets after a week: needs reconfirmation, retention failed, first demonstration kept", () => {
  const d = rule(runProfile("forgets").ledger, "double_short");
  assert.deepEqual([d.status, d.retention.state, d.history.firstDemonstratedAt?.slice(0, 10)], ["needs_reconfirmation", "failed", "2026-10-14"]);
});

test("E9 succeeds only after hints: independent answers wrong, helped answers right; reported as 'right with help', never as shown", () => {
  const s = script("hints");
  const pairs = [["spl.infl.18", "choping", "chopping"], ["spl.infl.19", "stoped", "stopped"], ["spl.infl.22", "triming", "trimming"], ["spl.infl.21", "diging", "digging"], ["spl.infl.20", "biger", "bigger"]];
  pairs.forEach(([item, first, after], k) => s.helped(item, first, after, 0, k + 1, "a"));
  const l = s.ledger();
  const d = rule(l, "double_short");
  assert.equal(d.status, "weak");
  assert.deepEqual([d.assisted.right, d.assisted.total, d.assisted.hints], [5, 5, 5]);
  assert.equal(d.succeedsWithHelp, true);
  // the helped answers never reached the estimate: only the five wrong first answers did
  assert.equal(l.decisions.filter((x) => x.verdict === "accepted").length, 5);
});

test("E10 historical assistance status unknown: nothing confirmed, engine numbers unchanged", () => {
  const legacy = runProfile("never_doubles", { legacy: true }).ledger;
  const rules = project(legacy).rules;
  assert.ok(rules.every((r) => r.status === "insufficient_evidence"));
  assert.ok(rules.find((r) => r.rule === "double_short")!.unknown.total > 0);
  assert.equal(JSON.stringify(legacy.composite), JSON.stringify(runProfile("never_doubles").ledger.composite));
});

test.todo("planner (proposal, not implemented): after a failed teaching block, choose a different strategy and reassess independently");
test.todo("planner (proposal, not implemented): after the configured number of failed strategies, recommend human support");
test.todo("planner (proposal, not implemented): schedule a delayed retention check after a rule is demonstrated");
