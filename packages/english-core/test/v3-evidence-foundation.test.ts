/**
 * V3: Assessment Evidence v1 — item identity, word families, assessment roles, evidence eligibility, evidence
 * integrity, the research boundary and compatibility with everything that existed before.
 * Synthetic answers only: these are software checks, not evidence about learning.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  type EvidenceEvent,
  type Item,
  type LedgerEvent,
  Ledger,
  RULE_EVIDENCE_POLICY_DRAFT,
  RULE_EVIDENCE_POLICY_V1_DRAFT,
  checkItemEvidence,
  contentStatus,
  countsAsVerified,
  englishInflections,
  evidenceEligibility,
  evidenceOf,
  INFLECTION_RULES,
  inflect,
  misconceptionForms,
  researchBatch,
  researchMode,
  reservedLemmaProblems,
  ruleRecord,
  ruleState,
  withItemEvidence,
} from "../src/index.ts";
import { CONTENT, REPO, loadBundle } from "../../../tools/english/load.ts";
import { identityProblems, readLock, readRenames } from "../../../tools/english/evidence/identity.ts";
import { BANK_FILE, loadEvidenceContent } from "../../../tools/english/evidence/load.ts";
import { audit, markdown } from "../../../tools/english/evidence/audit.ts";
import { snapshot } from "../../../tools/english/evidence/rule-evidence-snapshot.ts";

const CAP = "EN.FND.SPL.inflections";
const IND = { schema: "provenance@1" as const, attempt: 1, hints: [] as string[], afterFeedback: false };
const ec = loadEvidenceContent();
const subject = withItemEvidence(englishInflections, ec.evidence);
const T = (day: number, min = 0) => new Date(Date.parse("2026-10-20T09:00:00Z") + day * 86_400_000 + min * 60_000).toISOString();
const item = (id: string) => ec.ctx.content.items.get(id) as Extract<Item, { kind: "code" }>;
const typed = (id: string, text: string, day: number, min: number, session: string, n: string): EvidenceEvent => ({
  kind: "evidence", id: n, at: T(day, min), session, item: { id, version: item(id).version }, response: { kind: "typed", text }, provenance: IND,
});
const choose = (id: string, choice: number, day: number, min: number, session: string, n: string): EvidenceEvent => ({
  kind: "evidence", id: n, at: T(day, min), session, item: { id, version: item(id).version }, response: { kind: "choice", choice }, provenance: IND,
});
/** Treat chosen items as educator-validated (a test double; nothing on disk is validated). */
function validatedCopy(ids: string[]) {
  const content = { ...ec.ctx.content, items: new Map(ec.ctx.content.items) };
  for (const id of ids) content.items.set(id, { ...item(id), evidence_status: "validated" } as Item);
  return { ...ec.ctx, content };
}
const observe = (events: LedgerEvent[], ctx = ec.ctx) => {
  const l = Ledger.rebuild(ctx, "v3", events);
  return ruleRecord(l.events, l.decisions, ctx.content, subject).observations;
};
const stateOf = (events: LedgerEvent[], rule: string, policy = RULE_EVIDENCE_POLICY_DRAFT, ctx = ec.ctx) => {
  const l = Ledger.rebuild(ctx, "v3", events);
  const { observations, interventions } = ruleRecord(l.events, l.decisions, ctx.content, subject, policy);
  return ruleState(INFLECTION_RULES.find((r) => r.id === rule)!, observations.filter((o) => o.rule === rule), policy, interventions.filter((i) => i.rule === rule));
};

// ---------------------------------------------------------------- identity and historical compatibility

test("V3-1 item identity: no id@version names two questions, nothing locked changed or vanished", () => {
  assert.deepEqual(identityProblems(), []);
});

test("V3-2 historical ids keep their meaning: the doubling journey's spl.infl.26-31 are unchanged; only fixture drafts were renamed", () => {
  const journey = JSON.parse(readFileSync(join(CONTENT, "web", "doubling-journey.json"), "utf8")).items as { id: string; answers: string[] }[];
  const words = Object.fromEntries(journey.filter((i) => /^spl\.infl\.(2[6-9]|3[01])$/.test(i.id)).map((i) => [i.id, i.answers[0]]));
  assert.deepEqual(words, { "spl.infl.26": "melted", "spl.infl.27": "cooked", "spl.infl.28": "fastest", "spl.infl.29": "shouted", "spl.infl.30": "dreaming", "spl.infl.31": "darker" });
  const lock = readLock();
  for (const id of Object.keys(words)) assert.ok(lock.items[`${id}@1`].sources.includes("content/english/web/doubling-journey.json"));
  const fixture = readFileSync(join(REPO, "packages/english-core/test/fixtures/inflection-drafts.json"), "utf8");
  assert.doesNotMatch(fixture, /"id": "spl\.infl\.(2[6-9]|3[0-9]|4[01])"/);
  for (const r of readRenames()) assert.match(r.where, /test\/fixtures/, "only test fixtures are ever renamed");
  // an answer recorded against the journey question replays to the same item and the same scoring
  const ev = typed("spl.infl.26", "melted", 0, 1, "s", "h1");
  const [o] = observe([ev]);
  assert.deepEqual([o.item, o.correct, o.role, o.rule], ["spl.infl.26", true, "contrast", "double_short"]);
});

test("V3-3 the identity check refuses a changed, a vanished and a conflicting id@version", () => {
  const lock = readLock();
  const k = "spl.infl.02@1";
  const changed = { ...lock, items: { ...lock.items, [k]: { ...lock.items[k], fingerprint: "0000000000000000" } } };
  assert.ok(identityProblems(changed).some((p) => p.startsWith(`${k} changed content`)));
  const ghost = { ...lock, items: { ...lock.items, "spl.gone.99@1": { fingerprint: "x", sources: [] } } };
  assert.ok(identityProblems(ghost).some((p) => p.startsWith("spl.gone.99@1 is locked but no longer exists")));
  const { [k]: _drop, ...rest } = lock.items;
  assert.ok(identityProblems({ ...lock, items: rest }).some((p) => p.startsWith(`${k} is new`)));
});

test("V3-4 the production planner and the default rule evidence decide exactly as before for every fixed profile", () => {
  const baseline = JSON.parse(readFileSync(new URL("./fixtures/rule-evidence-baseline.json", import.meta.url), "utf8"));
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot())), baseline);
});

// ---------------------------------------------------------------- word families and metadata

test("V3-5 every spelling inflection item has a lemma, and every recorded entry is linguistically consistent", () => {
  const problems: string[] = [];
  let n = 0;
  for (const { item: i } of ec.items) {
    if (i.kind !== "code" || i.target !== CAP) continue;
    const m = evidenceOf(i, ec.evidence);
    if (!m) problems.push(`no lemma for ${i.id}`);
    else if (ec.evidence.has(`${i.id}@${i.version}`)) {
      n++;
      problems.push(...checkItemEvidence(i, m));
    }
  }
  for (const [k, m] of ec.evidence) if (m.morphology === "derivational") problems.push(...checkItemEvidence(item(k.split("@")[0]), m));
  assert.deepEqual(problems, []);
  assert.ok(n >= 230, `checked ${n} recorded entries`);
});

test("V3-6 the morphology check really checks: wrong transformations and wrong misconception tags are caught", () => {
  assert.equal(inflect("hop", "-ing", "double"), "hopping");
  assert.equal(inflect("hope", "-ing", "drop_e"), "hoping");
  assert.equal(inflect("carry", "-ed", "y_to_i"), "carried");
  assert.equal(inflect("play", "-ed", "y_to_i"), null, "vowel + y never changes");
  assert.equal(inflect("lie", "-ing", "ie_to_y"), "lying");
  assert.equal(inflect("panic", "-ed", "ck"), "panicked");
  assert.deepEqual(misconceptionForms("no_doubling", "swim", "-ing"), ["swiming"]);
  const swim = item("spl.infl.02");
  const m = evidenceOf(swim, ec.evidence)!;
  assert.deepEqual(checkItemEvidence(swim, m), []);
  assert.ok(checkItemEvidence(swim, { ...m, transformation: "none" }).length > 0);
  assert.ok(checkItemEvidence(swim, { ...m, lemma: "swam", lexeme_family: "lemma:swam" }).length > 0);
  assert.ok(checkItemEvidence({ ...swim, wrong: { swimmming: "no_doubling" } } as Item, { ...m }).some((p) => p.includes("tagged no_doubling")));
});

test("V3-7 word-family leakage: reserved transfer and retention lemmas appear in no other spelling item", () => {
  assert.deepEqual(reservedLemmaProblems(ec.items.map((x) => x.item), ec.evidence), []);
  const reserved = [...ec.evidence.values()].filter((m) => m.reserved);
  assert.ok(reserved.length >= 40);
  assert.ok(reserved.every((m) => m.uses.includes("unseen_transfer") || m.uses.includes("delayed_retention")));
});

test("V3-8 word-family leakage: another form of a lemma met before is not a new word under lemma independence (and was under the old rule)", () => {
  // hopping, then hops: another word of the same lemma
  const evs = [typed("spl.dx.ds.01", "hopping", 0, 1, "a", "e1"), typed("spl.dx.ds.20", "hops", 0, 2, "a", "e2")];
  const obs = observe(evs);
  assert.deepEqual(obs.map((o) => [o.lemma, o.newWord, o.newLemma]), [["hop", true, true], ["hop", true, false]]);
  assert.equal(obs[0].independenceKey.split("#").at(-1), "hop");
  assert.equal(obs[0].independenceKey, obs[1].independenceKey, "one lemma, one unit of independent evidence for the rule");
});

test("V3-9 duplicate evidence: one lemma counts once towards a rule under the v1 policy; the default policy is unchanged", () => {
  // forgetting and forgotten are two words of one lemma; admitted twice is one word
  const evs = [typed("spl.infl.13", "forgetting", 0, 1, "a", "e1"), typed("spl.dict.029", "forgotten", 0, 2, "a", "e2"), typed("spl.dx.sd.02", "admitted", 0, 3, "a", "e3"), typed("spl.dict.030", "admitted", 0, 4, "a", "e4")];
  const v0 = stateOf(evs, "stress_doubling");
  const v1 = stateOf(evs, "stress_doubling", RULE_EVIDENCE_POLICY_V1_DRAFT);
  assert.equal(v1.current.total, 2, "forget and admit: two independent lemmas");
  assert.equal(v0.current.total, 3, "the default policy (unchanged) counts forgotten as a new word");
  // one answer is one observation, however many roles the item has
  const multi = observe([typed("spl.dx.ds.15", "helped", 0, 1, "a", "m1")]);
  assert.equal(multi.length, 1);
  assert.deepEqual(evidenceOf(item("spl.dx.ds.15"), ec.evidence)!.uses.sort(), ["contrast", "misconception_probe"]);
});

// ---------------------------------------------------------------- eligibility and claims

test("V3-10 unreviewed content: generated items are practice only, bank items provisional, owner approval never validates", () => {
  const gen = ec.items.find((x) => x.origin === "generated")!.item;
  assert.deepEqual(evidenceEligibility(gen), { status: "practice", practiceOnly: true, updatesEstimate: false, demonstrates: false, verifies: false });
  const bank = JSON.parse(readFileSync(BANK_FILE, "utf8")).items as Item[];
  assert.ok(bank.length >= 130);
  for (const b of bank) assert.equal(contentStatus(b), "provisional", b.id);
  const reviews = JSON.parse(readFileSync(join(CONTENT, "pilot", "reviews.json"), "utf8")) as { id: string; version: string; authority: string; decision: string }[];
  const owner = reviews.filter((r) => r.authority === "product-owner" && r.decision === "approve");
  assert.ok(owner.length >= 291);
  for (const r of owner) {
    const i = ec.ctx.content.items.get(r.id);
    if (i) assert.equal(evidenceEligibility(i).verifies, false, `${r.id}: owner approval is not educator validation`);
  }
  for (const { item: i } of ec.items) assert.notEqual(contentStatus(i), "validated", `${i.id}: nothing on disk is educator-validated`);
});

test("V3-11 mastery claims: a 'verified' rule on unreviewed (candidate) questions no longer supports a claim; the v1 policy does not even call it verified", () => {
  const ids = ["spl.infl.02", "spl.infl.11", "spl.dict.010", "spl.dict.012", "spl.dict.015", "spl.dict.013"];
  const words = ["swimming", "running", "stopped", "shopping", "sitting", "clapped"];
  const evs: LedgerEvent[] = [];
  ids.slice(0, 4).forEach((id, k) => evs.push(typed(id, words[k], 0, k, "d0", `a${k}`)));
  evs.push(typed("spl.infl.24", "jumping", 0, 9, "d0", "c1")); // contrast (journey, provisional)
  ids.slice(4).forEach((id, k) => evs.push(typed(id, words[4 + k], 9, k, "d9", `b${k}`))); // delayed check
  const v0 = stateOf(evs, "double_short");
  assert.equal(v0.status, "verified", "the default policy's status is unchanged");
  assert.equal(countsAsVerified(v0), false, "...but unreviewed questions never support a mastery claim");
  const v1 = stateOf(evs, "double_short", RULE_EVIDENCE_POLICY_V1_DRAFT);
  assert.equal(v1.status, "demonstrated");
  assert.ok(v1.reasons.some((r) => r.includes("not yet validated by an educator")));
  // with every item validated (a test double) the same evidence verifies under v1, and supports a claim
  const ctx = validatedCopy([...ids, "spl.infl.24"]);
  const ok = stateOf(evs, "double_short", RULE_EVIDENCE_POLICY_V1_DRAFT, ctx);
  assert.equal(ok.status, "verified");
  assert.equal(countsAsVerified(ok), true);
});

test("V3-12 familiar words alone never verify: repeating one lemma gives one application at most under v1", () => {
  const evs: LedgerEvent[] = [];
  const same = ["spl.infl.02", "spl.infl.j02", "spl.infl.02"]; // swimming three times (bank, journey copy, repeat)
  same.forEach((id, k) => evs.push(typed(id, "swimming", k * 10, 0, `s${k}`, `r${k}`)));
  const v1 = stateOf(evs, "double_short", RULE_EVIDENCE_POLICY_V1_DRAFT, validatedCopy(["spl.infl.02", "spl.infl.j02"]));
  assert.ok(v1.current.total <= 1);
  assert.notEqual(v1.status, "verified");
  assert.equal(countsAsVerified(v1), false);
});

// ---------------------------------------------------------------- recorded evidence fields

test("V3-13 recognition versus production is recorded on every answer", () => {
  const obs = observe([typed("spl.dx.ds.01", "hopping", 0, 1, "a", "p1"), choose("spl.dx.ds.21", 1, 0, 2, "a", "r1")]);
  assert.deepEqual(obs.map((o) => o.mode), ["production", "recognition"]);
  const recognitionOnly = observe([choose("spl.dx.ds.21", 1, 0, 1, "a", "r1"), choose("spl.dx.ds.23", 1, 0, 2, "a", "r2"), typed("spl.dx.ds.03", "siting", 0, 3, "a", "p1"), typed("spl.dx.ds.04", "droped", 0, 4, "a", "p2")]);
  const byMode = (m: string) => recognitionOnly.filter((o) => o.mode === m).map((o) => o.correct);
  assert.deepEqual([byMode("recognition"), byMode("production")], [[true, true], [false, false]]);
});

test("V3-14 misconception classification: listed wrong answers become tags, swaps are slips, others are unclassified", () => {
  const obs = observe([
    typed("spl.dx.ds.02", "planed", 0, 1, "a", "w1"), // no_doubling
    typed("spl.dx.ds.15", "helpped", 0, 2, "a", "w2"), // over_doubling on a contrast
    typed("spl.dx.de.01", "bakeing", 0, 3, "a", "w3"), // kept_silent_e
    typed("spl.dx.yi.02", "studyed", 0, 4, "a", "w4"), // y_not_changed
    typed("spl.dx.ds.06", "gettnig", 0, 5, "a", "w5"), // adjacent swap: slip
    typed("spl.dx.ds.03", "sittin", 0, 6, "a", "w6"), // unclassified
    choose("spl.dx.ds.21", 0, 0, 7, "a", "w7"), // distractor tagged no_doubling
  ]);
  assert.deepEqual(obs.map((o) => o.misconception), ["no_doubling", "over_doubling", "kept_silent_e", "y_not_changed", null, null, "no_doubling"]);
  assert.deepEqual(obs.map((o) => o.signature.kind), ["misconception", "misconception", "misconception", "misconception", "slip", "unclassified", "misconception"]);
  assert.equal(obs[1].role, "contrast");
});

test("V3-15 retention timing: delayed only in a later session at least 7 days on, never after practice or teaching in that session", () => {
  const obs = observe([
    typed("spl.dx.ds.01", "hopping", 0, 1, "s0", "t1"),
    typed("spl.dx.ds.02", "planned", 6, 1, "s6", "t2"), // 6 days: not delayed
    typed("spl.dx.ds.03", "sitting", 14, 1, "s14", "t3"), // 8 days later: delayed
    { kind: "intervention", id: "iv", at: T(30, 0), session: "s30", capability: CAP, rule: "double_short", strategy: "worked_examples" },
    typed("spl.dx.ds.04", "dropped", 30, 5, "s30", "t4"), // 16 days, but after teaching in the session
  ]);
  assert.deepEqual(obs.map((o) => o.delayed), [false, false, true, false]);
  assert.deepEqual(obs.map((o) => o.afterInstruction), [false, false, false, true]);
});

test("V3-16 every recorded field is present: principle, lemma, families, mode, contrast, validation, instruction, delay, misconception", () => {
  const [o] = observe([typed("spl.dx.ds.15", "helpped", 0, 1, "a", "f1")]);
  for (const k of ["rule", "lemma", "lexemeFamily", "exposureFamily", "newWord", "newLemma", "mode", "role", "educatorValidated", "afterInstruction", "delayed", "misconception", "independenceKey", "content"] as const)
    assert.ok(k in o, k);
  assert.deepEqual([o.rule, o.lemma, o.lexemeFamily, o.exposureFamily, o.role, o.educatorValidated, o.content], ["double_short", "help", "lemma:help", "lex.help.contrast", "contrast", false, "provisional"]);
});

// ---------------------------------------------------------------- the audit and the research boundary

test("V3-17 the diagnostic audit is current and never calls a rule ready on coverage alone", () => {
  const a = audit();
  assert.equal(readFileSync(join(REPO, "docs/english/evidence/EVIDENCE_AUDIT.md"), "utf8"), markdown(a));
  assert.equal(a.rows.length, INFLECTION_RULES.length);
  for (const r of a.rows) {
    assert.equal(r.unmapped, 0, r.principle);
    assert.equal(r.masteryClaimPossible, false, `${r.principle}: no rule supports a reliable claim today`);
    assert.equal(r.reliabilityDemonstrated, false);
    assert.equal(r.byTier.validated, 0);
  }
  const ready = a.rows.filter((r) => r.coverageAllContent.length === 0).map((r) => r.principle);
  for (const p of ["plain", "double_short", "drop_e", "y_to_i", "stress_doubling", "no_double_unstressed"]) assert.ok(ready.includes(p), `${p} has complete provisional coverage`);
});

test("V3-18 research boundary: off by default, shadow only with consent of scope, never active, never mutating", () => {
  assert.equal(researchMode(), "off");
  assert.equal(researchBatch([], ec.ctx.content, ec.evidence), null);
  assert.throws(() => researchMode({ mode: "active" as never, learners: "synthetic" }), /not supported/);
  assert.throws(() => researchMode({ mode: "shadow", learners: "real" }), /approval/);
  const evs: LedgerEvent[] = [typed("spl.dx.ds.02", "planed", 0, 1, "a", "x1"), typed("spl.infl.02", "swimming", 0, 2, "a", "x2"), { kind: "evidence", id: "x3", at: T(0, 3), session: "a", item: { id: "grm.art.01", version: 1 }, response: { kind: "choice", choice: 0 } }];
  const copy = structuredClone(evs);
  const b = researchBatch(evs, ec.ctx.content, ec.evidence, { mode: "shadow", learners: "synthetic" })!;
  assert.equal(b.actionable, false);
  assert.deepEqual(b.events.map((e) => e.id), ["x1", "x2"], "only spelling inflection evidence crosses the boundary");
  assert.deepEqual(evs, copy);
  const e = b.itemIndex["spl.dx.ds.02@1"];
  assert.deepEqual([e.rule, e.role, e.mode, e.lemma, e.status, e.eligibility.verifies], ["double_short", "apply", "production", "plan", "provisional", false]);
  assert.equal(b.itemIndex[Object.keys(b.itemIndex).find((k) => k.startsWith("gen.infl."))!].eligibility.practiceOnly, true);
  assert.ok(researchBatch(evs, ec.ctx.content, ec.evidence, { mode: "shadow", learners: "real", approval: { by: "owner", date: "2026-01-01", record: "decision-1" } }));
});

// ---------------------------------------------------------------- the child's experience is unchanged

test("V3-19 mobile spelling flow: the diagnostic bank reaches no child — not the engine's default bundle, the app's content or the pilot allowlist", () => {
  const ids = new Set((JSON.parse(readFileSync(BANK_FILE, "utf8")).items as Item[]).map((i) => i.id));
  for (const i of loadBundle().items) assert.ok(!ids.has(i.id), i.id);
  const appContent = readFileSync(join(REPO, "frontend/src/english/logic/content.ts"), "utf8");
  assert.doesNotMatch(appContent, /diagnostic-bank|spelling\/evidence\//, "the app does not import the bank");
  const allow = JSON.parse(readFileSync(join(CONTENT, "pilot", "allowlist.json"), "utf8")).items as { id: string }[];
  assert.ok(!allow.some((x) => ids.has(x.id)));
  // the app's own spelling items are untouched by this change: identical identities to the lock, same sources
  const lock = readLock();
  for (const id of ["spl.dict.001@1", "spl.infl.01@1", "spl.infl.j02@1", "plt.infl.05@1"]) assert.ok(lock.items[id], id);
});

test("V3-20 replay is deterministic and the default projection ignores the new fields", () => {
  const evs = [typed("spl.dx.ds.01", "hopping", 0, 1, "a", "d1"), typed("spl.dx.ds.20", "hopps", 0, 2, "a", "d2")];
  assert.deepEqual(observe(evs), observe(evs));
  const plain = Ledger.rebuild(ec.ctx, "v3", evs);
  const a = ruleRecord(plain.events, plain.decisions, ec.ctx.content, englishInflections).observations.map((o) => [o.track, o.newWord, o.correct, o.role]);
  const b = ruleRecord(plain.events, plain.decisions, ec.ctx.content, subject).observations.map((o) => [o.track, o.newWord, o.correct, o.role]);
  assert.deepEqual(a.map((x) => x.slice(0, 3)), b.map((x) => x.slice(0, 3)));
});
