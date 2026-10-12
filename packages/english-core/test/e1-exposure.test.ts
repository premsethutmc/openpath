/**
 * Fresh items, variants and repeats (E1 final review).
 *
 * Long-term retention tracking must not need an unlimited supply of new questions. So:
 *   - the ledger, not the client, decides whether an answer is on a fresh item, a variant of an item
 *     seen before (same `family`), or a repeat of the same item;
 *   - a repeat is recorded for retention only and never changes the ability estimate;
 *   - a variant is new evidence, flagged;
 *   - assessment and learning only use unseen items; a retention check prefers an unseen item, then an
 *     unseen variant, then a flagged repeat seen at least `repeatAfterDays` ago.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Context, type EvidenceEvent, type Goal, HYBRID, type Item, Ledger, leafView, recommend } from "../src/index.ts";
import { ctx } from "./helpers.ts";

type CodeItem = Extract<Item, { kind: "code" }>;
const SVA = "EN.GRM.VERB.sva";
const day = (d: number, minute = 0) => new Date(Date.UTC(2026, 9, 12, 10, 30) + d * 86_400_000 + minute * 60_000).toISOString();
const goal: Goal = { id: "g", name: "Agreement", weights: { [SVA]: 1 }, targets: { "EN.GRM": 6 } };
const svaItems = (c: Context = ctx()) => [...c.content.items.values()].filter((i): i is CodeItem => i.kind === "code" && i.target === SVA);

function answer(item: CodeItem, id: string, at: string, session: string, right = true): EvidenceEvent {
  const response =
    item.format.startsWith("choice:")
      ? { kind: "choice" as const, choice: right ? item.answer! : (item.answer! + 1) % item.options!.length }
      : { kind: "typed" as const, text: right ? item.answers![0] : "zzz" };
  return { kind: "evidence", id, at, session, item: { id: item.id, version: item.version }, response };
}

/** A copy of the context in which the given items share one family (variants of one another). */
function withFamily(ids: string[], family = "fam.sva"): Context {
  const c = ctx();
  const items = new Map<string, Item>([...c.content.items].map(([id, i]) => [id, ids.includes(id) ? ({ ...i, family } as Item) : i]));
  const byCapability = new Map([...c.content.byCapability].map(([cap, list]) => [cap, list.map((i) => items.get(i.id)!)]));
  return { ...c, content: { ...c.content, items, byCapability } };
}

const sel = (c: Context, l: Ledger, now: string, extra: Record<string, unknown> = {}) =>
  recommend({ index: c.index, content: c.content, composite: l.composite, goal, now, seen: new Set(l.exposures.keys()), exposures: l.exposures, recent: [], writingThisSession: 0, writingAvailable: false, ...extra });

test("a repeated item is flagged by the ledger and recorded for retention only: the estimate does not move", () => {
  const [a, b] = svaItems();
  const l = Ledger.rebuild(ctx(), "x", [answer(a, "e1", day(0), "s0"), answer(b, "e2", day(0, 1), "s0")]);
  const node = l.composite.nodes[SVA];
  const before = structuredClone({ directN: node.directN, contexts: node.contexts, binary: node.binary, demonstrations: node.demonstrations });
  const viewBefore = leafView(l.composite, ctx().index, SVA, day(20));
  // the client sends the same item again, even claiming it is fresh: the ledger decides
  const ds = l.apply({ ...answer(a, "e3", day(20), "s20", false), exposure: "fresh" } as EvidenceEvent);
  assert.equal(ds[0].verdict, "accepted");
  assert.equal(ds[0].observation!.exposure, "repeat");
  assert.match(ds[0].reasons.join(" "), /repeated item: recorded for retention only; the ability estimate is not changed/);
  assert.deepEqual(ds[0].before, ds[0].after);
  const after = { directN: node.directN, contexts: node.contexts, binary: node.binary, demonstrations: node.demonstrations };
  assert.deepEqual(after, before, "evidence count, contexts and demonstrations unchanged");
  // compared at the same moment (uncertainty grows with time whether or not anything is answered)
  const viewAfter = leafView(l.composite, ctx().index, SVA, day(20));
  assert.ok(Math.abs(viewAfter.mean - viewBefore.mean) < 1e-12 && Math.abs(viewAfter.sd - viewBefore.sd) < 1e-12, "the estimate does not move");
  const s = node.sessions!.at(-1)!;
  assert.equal(s.session, "s20");
  assert.equal(s.obs!.length, 1);
  assert.equal(s.obs![0].exposure, "repeat", "the repeat is kept, flagged, as retention evidence");
  assert.deepEqual(l.exposures.get(a.id), { count: 2, lastAt: day(20) });
  // folding the same events again gives the same flags (deterministic, from the ledger alone)
  const again = Ledger.rebuild(ctx(), "x", l.events);
  assert.deepEqual(again.composite, l.composite);
});

test("a variant (same family, different item) is new evidence, flagged as a variant", () => {
  const items = svaItems();
  const c = withFamily([items[1].id, items[2].id]);
  const l = Ledger.rebuild(c, "x", [answer(items[1] as CodeItem, "e1", day(0), "s0")]);
  const n0 = l.composite.nodes[SVA].directN;
  const ds = l.apply(answer(c.content.items.get(items[2].id) as CodeItem, "e2", day(0, 1), "s0"));
  assert.equal(ds[0].observation!.exposure, "variant");
  assert.match(ds[0].reasons.join(" "), /variant of an item seen before/);
  assert.equal(l.composite.nodes[SVA].directN, n0 + 1, "a variant updates the estimate like any unseen item");
  assert.notDeepEqual(ds[0].before, ds[0].after);
});

/** Every SVA item answered correctly on day 0: demonstrated, nothing unseen left, retention check due on day 7. */
function exhausted(c: Context = ctx()) {
  return Ledger.rebuild(c, "x", svaItems(c).map((i, k) => answer(i, `e${k}`, day(0, k), "s0")));
}

test("with no unseen item left, assessment and learning never repeat an item", () => {
  const l = exhausted();
  for (const mode of ["assessment", "learning"] as const) {
    const rec = sel(ctx(), l, day(30), { mode });
    assert.ok(!rec.choice || !l.exposures.has(rec.choice.item), `${mode} chose a seen item`);
  }
});

test("an overdue retention check falls back to a flagged repeat, but only after the minimum gap", () => {
  const l = exhausted();
  const v = leafView(l.composite, ctx().index, SVA, day(30));
  assert.equal(v.retention.status, "overdue");
  // without the ledger's exposure history, the check is blocked as before (backwards compatible)
  const blocked = sel(ctx(), l, day(30), { exposures: undefined });
  assert.notEqual(blocked.path, "retention_check");
  assert.ok(blocked.bankGaps.some((g) => g.capability === SVA && g.note.startsWith("retention check")));
  // too soon after the items were seen: still blocked
  const soon = sel(ctx(), l, day(30), { scheduler: { repeatAfterDays: 31 } });
  assert.notEqual(soon.path, "retention_check");
  // after the gap: a flagged repeat runs the check
  assert.equal(HYBRID.repeatAfterDays, 14);
  const rec = sel(ctx(), l, day(30));
  assert.equal(rec.path, "retention_check");
  assert.equal(rec.choice!.exposure, "repeat");
  assert.ok(l.exposures.has(rec.choice!.item));
  assert.match(rec.explanation, /repeat of an item last seen on 2026-10-12: it counts towards the retention check only and does not change the estimate/);
  // answering it completes the check on its own session evidence; the estimate is untouched
  const est = leafView(l.composite, ctx().index, SVA, day(30));
  const item = ctx().content.items.get(rec.choice!.item) as CodeItem;
  const ds = l.apply(answer(item, "check", day(30), "s30"));
  assert.equal(ds[0].observation!.exposure, "repeat");
  const now = leafView(l.composite, ctx().index, SVA, day(30));
  assert.ok(Math.abs(now.mean - est.mean) < 1e-12 && Math.abs(now.sd - est.sd) < 1e-12, "the check does not move the estimate");
  const r = leafView(l.composite, ctx().index, SVA, day(30, 1)).retention;
  assert.equal(r.checks.length, 1);
  assert.equal(r.checks[0].passed, true);
  assert.equal(r.status, "current");
});

test("a retention check prefers an unseen item, then an unseen variant, then a repeat", () => {
  const items = svaItems();
  // leave two items unseen; make one of them a variant of a seen item
  const c = withFamily([items[0].id, items[7].id]);
  const l = Ledger.rebuild(c, "x", items.slice(0, 6).map((i, k) => answer(c.content.items.get(i.id) as CodeItem, `e${k}`, day(0, k), "s0")));
  const first = sel(c, l, day(30));
  assert.equal(first.path, "retention_check");
  assert.equal(first.choice!.exposure, "fresh");
  assert.equal(first.choice!.item, items[6].id);
  const only = new Set([...l.exposures.keys(), items[7].id]);
  const second = sel(c, l, day(30), { only });
  assert.equal(second.choice!.exposure, "variant");
  assert.equal(second.choice!.item, items[7].id);
  const third = sel(c, l, day(30), { only: new Set(l.exposures.keys()) });
  assert.equal(third.choice!.exposure, "repeat");
});
