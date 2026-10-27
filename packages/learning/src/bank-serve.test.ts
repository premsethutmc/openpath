/**
 * bank-serve@1 (acceptance test 11): the bank serves what it has, and says plainly, and logs, what it cannot.
 * Totals are never asserted (variants are being added to some families): only properties.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BANDS, PHASES, jsonlFileSink, loadBank, memoryMissedLog, requestItem, toJsonl, topicCompetencies, writeMissedLog, type Band, type Refused } from "./bank-serve";
import { FAMILIES, pool } from "./families";
import { graph } from "./graph";

const RELEASE = "tn-samacheer-mathematics-grade-5";
const bank = loadBank(RELEASE);
const clockOf = () => {
  let n = 0;
  return () => `2026-09-01T09:${String(n++).padStart(2, "0")}:00.000Z`;
};
const fresh = () => memoryMissedLog(clockOf());
const refused = (o: ReturnType<typeof requestItem>): Refused => {
  assert.equal(o.ok, false, "expected a refusal");
  return o as Refused;
};
/** Plain language: a sentence, no internal ids, no placeholders. */
const plain = (s: string) => {
  assert.ok(s.length > 30 && /[.!]$/.test(s), `a full sentence: ${s}`);
  assert.ok(!/undefined|null|NaN|\[object|MATH\.|gen:|Error/.test(s), `no internals in: ${s}`);
};
const groups = () => {
  const m = new Map<string, typeof bank.items[number][]>();
  for (const i of bank.items) {
    const k = `${i.competency}|${i.phase}|${i.difficulty}`;
    m.set(k, [...(m.get(k) ?? []), i]);
  }
  return m;
};

describe("bank-serve: loadBank", () => {
  it("is the release's families' pools, in a deterministic order, with unique ids", () => {
    assert.ok(bank.items.length > 1000);
    assert.equal(loadBank(RELEASE), bank, "cached");
    const fams = [...new Set(bank.items.map((i) => i.family))];
    assert.deepEqual(fams, [...fams].sort(), "families in id order");
    assert.deepEqual(fams, [...bank.families].filter((f) => pool(f).items.length));
    for (const f of fams) assert.deepEqual(bank.items.filter((i) => i.family === f).map((i) => i.id), pool(f).items.map((p) => p.id), `${f}: pool order`);
    assert.equal(new Set(bank.items.map((i) => i.id)).size, bank.items.length);
    for (const i of bank.items.slice(0, 500)) assert.ok(bank.competencies.includes(i.competency) && FAMILIES.get(i.family)!.competency === i.competency);
    assert.throws(() => loadBank("no-such-release"), /not found/);
  });
});

describe("bank-serve: serving", () => {
  it("serves an item that fits the request, never an excluded one, deterministically", () => {
    const c = "MATH.number.rounding";
    const log = fresh();
    const a = requestItem(bank, { competency: c, phase: "check", difficulty: 2 }, log);
    assert.ok(a.ok);
    if (!a.ok) return;
    assert.deepEqual([a.item.competency, a.item.phase, a.item.difficulty], [c, "check", 2]);
    assert.deepEqual(requestItem(bank, { competency: c, phase: "check", difficulty: 2 }, log), a, "same request, same item");
    const b = requestItem(bank, { competency: c, phase: "check", difficulty: 2, excludeIds: [a.item.id] }, log);
    assert.ok(b.ok && b.item.id !== a.item.id);
    assert.equal(log.entries().length, 0, "a served item writes no log entry");
  });
  it("varies the family: among the items that fit, the family met least comes first", () => {
    const c = "MATH.number.rounding";
    const log = fresh();
    const seen: string[] = [];
    for (let k = 0; k < 6; k++) {
      const r = requestItem(bank, { competency: c, phase: "practice", excludeIds: seen }, log);
      assert.ok(r.ok);
      if (r.ok) seen.push(r.item.id);
    }
    const fams = seen.map((id) => bank.byId.get(id)!.family);
    assert.ok(new Set(fams).size >= 2, `several families: ${fams}`);
  });
  it("filters by answer format", () => {
    const log = fresh();
    for (const format of ["choice", "typed"] as const) {
      const r = requestItem(bank, { competency: "MATH.number.rounding", format }, log);
      assert.ok(r.ok && (r.item.answerType === "choice") === (format === "choice"));
    }
  });
  it("an item carries what a journey needs: the answer, options, and what each wrong answer says", () => {
    const withBug = bank.items.find((i) => i.wrongAnswers.some((w) => w.responses.length))!;
    assert.ok(withBug.question && withBug.answer);
    const w = withBug.wrongAnswers.find((x) => x.responses.length)!;
    assert.ok(w.says && w.id && w.competency && !w.responses.includes(withBug.answer));
  });
  it("topics: a strand or a skill's name finds its skills", () => {
    assert.ok(topicCompetencies(bank, "Geometry").every((c) => c.startsWith("MATH.geometry.")) && topicCompetencies(bank, "geometry").length > 3);
    const r = requestItem(bank, { topic: "geometry", phase: "practice" }, fresh());
    assert.ok(r.ok && r.item.competency.startsWith("MATH.geometry."));
  });
});

describe("bank-serve: every failure is clear and logged", () => {
  const entryFor = (log: ReturnType<typeof fresh>, kind: string) => {
    const e = log.entries().filter((x) => x.kind === kind);
    assert.equal(e.length, 1, `one ${kind} entry`);
    return e[0];
  };
  it("unknown competency", () => {
    const log = fresh();
    const r = refused(requestItem(bank, { competency: "MATH.nonsense.nothing", phase: "check" }, log));
    assert.equal(r.kind, "unknown-competency");
    plain(r.reason);
    const e = entryFor(log, "unknown-competency");
    assert.equal(e.reason, r.reason);
    assert.equal(e.at, "2026-09-01T09:00:00.000Z", "the injected clock");
    assert.equal(e.request.competency, "MATH.nonsense.nothing");
  });
  it("a competency outside the release", () => {
    const outside = graph.competencies.map((c) => c.id).find((id) => !bank.competencies.includes(id))!;
    assert.ok(outside);
    const log = fresh();
    const r = refused(requestItem(bank, { competency: outside }, log));
    assert.equal(r.kind, "outside-release");
    plain(r.reason);
    assert.ok(r.reason.includes(graph.get(outside).name), "names the skill in words");
    assert.equal(entryFor(log, "outside-release").request.competency, outside);
  });
  it("a release competency with no stored items yet", () => {
    const empty = bank.competencies.find((c) => !bank.items.some((i) => i.competency === c));
    if (!empty) return; // every competency of the release has items: nothing to prove
    const log = fresh();
    const r = refused(requestItem(bank, { competency: empty }, log));
    assert.equal(r.kind, "no-items-for-skill");
    plain(r.reason);
    entryFor(log, "no-items-for-skill");
  });
  it("no items left in the band: says which bands still have some", () => {
    const [key, items] = [...groups()].filter(([, v]) => v.length >= 2 && v.length <= 40).sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1))[0];
    const [c, phase, band] = key.split("|");
    const log = fresh();
    const req = { competency: c, phase: phase as never, difficulty: Number(band) as Band };
    const served = new Set<string>();
    for (let k = 0; k < items.length; k++) {
      const r = requestItem(bank, { ...req, excludeIds: [...served] }, log);
      assert.ok(r.ok, "served until the band is empty");
      if (r.ok) {
        assert.ok(!served.has(r.item.id));
        served.add(r.item.id);
      }
    }
    assert.equal(served.size, items.length, "every item of the band served once");
    assert.equal(log.entries().length, 0);
    const r = refused(requestItem(bank, { ...req, excludeIds: [...served] }, log));
    assert.equal(r.kind, "band-exhausted");
    plain(r.reason);
    const others = BANDS.filter((b) => b !== Number(band) && bank.items.some((i) => i.competency === c && i.phase === phase && i.difficulty === b));
    assert.deepEqual(r.otherBands, others);
    if (others.length) assert.ok(r.reason.includes(`level ${others.join(" and ")}`), r.reason);
    const e = entryFor(log, "band-exhausted");
    assert.equal(e.request.excluded, served.size, "ids are counted, not copied");
    // and the next band serves
    for (const b of r.otherBands ?? []) assert.ok(requestItem(bank, { ...req, difficulty: b, excludeIds: [...served] }, log).ok);
  });
  it("no items left at all for that kind of question: a teacher or parent is suggested, nothing is repeated", () => {
    const small = [...new Map([...groups()].map(([k, v]) => [k.split("|").slice(0, 2).join("|"), 0])).keys()]
      .map((k) => ({ k, items: bank.items.filter((i) => `${i.competency}|${i.phase}` === k) }))
      .sort((a, b) => a.items.length - b.items.length || (a.k < b.k ? -1 : 1))[0];
    const [c, phase] = small.k.split("|");
    const log = fresh();
    const r = refused(requestItem(bank, { competency: c, phase: phase as never, excludeIds: small.items.map((i) => i.id) }, log));
    assert.equal(r.kind, "band-exhausted");
    assert.deepEqual(r.otherBands, []);
    plain(r.reason);
    assert.match(r.reason, /teacher or parent/);
    entryFor(log, "band-exhausted");
  });
  it("learner-typed free text is refused, and the text is never kept", () => {
    const log = fresh();
    const typed = "Priya Raman born 12/03/2014 please solve 37 x 48";
    const r = refused(requestItem(bank, { competency: "MATH.number.rounding", freeText: typed }, log));
    assert.equal(r.kind, "free-text");
    plain(r.reason);
    const e = entryFor(log, "free-text");
    assert.equal(e.request.freeTextLength, typed.length);
    const line = toJsonl(log.entries());
    assert.ok(!/Priya|Raman|2014|37 x 48/.test(line), "no name, birth date or typed text in the log");
  });
  it("a topic outside the supported set", () => {
    const log = fresh();
    const r = refused(requestItem(bank, { topic: "calculus" }, log));
    assert.equal(r.kind, "unsupported-topic");
    plain(r.reason);
    assert.equal(entryFor(log, "unsupported-topic").request.topic, "calculus");
    // a topic that is not a short label (could carry a name or a date) is not kept
    const l2 = fresh();
    refused(requestItem(bank, { topic: "Ravi's birthday 01-02-2015" }, l2));
    assert.equal(l2.entries()[0].request.topic, "[not kept]");
  });
  it("a request that is malformed gets a clear refusal too", () => {
    const log = fresh();
    plain(refused(requestItem(bank, { difficulty: 4 as never }, log)).reason);
    plain(refused(requestItem(bank, { phase: "exam" as never }, log)).reason);
    plain(refused(requestItem(bank, { format: "oral" as never }, log)).reason);
    assert.equal(log.entries().length, 3);
    assert.ok(log.entries().every((e) => e.kind === "bad-request"));
  });
  it("the log has an append interface and a JSONL writer; entries read back", () => {
    const dir = mkdtempSync(join(tmpdir(), "bank-serve-"));
    try {
      const file = join(dir, "missed.jsonl");
      const log = memoryMissedLog(clockOf(), jsonlFileSink(file));
      requestItem(bank, { topic: "calculus" }, log);
      requestItem(bank, { freeText: "hello" }, log);
      const back = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      assert.deepEqual(back, log.entries());
      assert.deepEqual(Object.keys(back[0]).sort(), ["at", "kind", "reason", "request"]);
      const file2 = join(dir, "again.jsonl");
      writeMissedLog(file2, log.entries());
      assert.equal(readFileSync(file2, "utf8"), toJsonl(log.entries()));
      const custom: unknown[] = [];
      const log2 = { append: (e: never) => (custom.push(e), { at: "t", ...(e as object) } as never), entries: () => [] };
      requestItem(bank, { topic: "calculus" }, log2);
      assert.equal(custom.length, 1, "any log with append works");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("PHASES and BANDS are the ones the bank actually has", () => {
    assert.deepEqual([...new Set(bank.items.map((i) => i.phase))].sort(), [...PHASES].sort());
    assert.ok(bank.items.every((i) => BANDS.includes(i.difficulty)));
  });
});
