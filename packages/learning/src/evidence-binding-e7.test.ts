/** E7 repair, Invariant A: evidence establishes the claim it names, under the premises it was produced under. Properties over generated claims, not fixed strings. */
import { describe, expect, test } from "bun:test";
import { buildObligations } from "./proof-obligations.ts";
import { evidenceBinds, claimIdentity, typedIdentities, containsClaim } from "./evidence-binding.ts";
import { structuredObligations } from "./certification-authority.ts";
import type { AssessmentEnvelope } from "./unified-math-engine.ts";

// deterministic generator (independent of any engine code)
let seed = 12345; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const VARS = ["x", "y", "z", "t", "m", "k"], OPS = ["+", "-", "*"];
const term = () => (rnd(2) ? String(1 + rnd(40)) : `${1 + rnd(9)}${VARS[rnd(VARS.length)]}`);
const expr = () => Array.from({ length: 2 + rnd(3) }, term).reduce((a, t) => `${a} ${OPS[rnd(3)]} ${t}`);
const claim = () => `${expr()} = ${expr()}`;

const oneLine = (text: string, evidence: { claim: string; checker?: string; premises?: string | null; claimIdentity?: string | null }[], taskDigest?: string) =>
  buildObligations({ text, claims: [{ line: 1, start: 0, end: text.length, text, kind: "relation", outcome: "proven", reason: "r" }], relations: [],
    records: [{ role: "claim-step", text, id: "l1", line: 1, span: { start: 0, end: text.length }, status: "verified-valid", dependencies: [], premiseEligible: true, reason: "r" }],
    evidence: evidence.map((e) => ({ line: 1, claim: e.claim, checker: e.checker ?? "u4+exact-solution-set", scope: "s", outcome: "verified", premises: e.premises, claimIdentity: e.claimIdentity })),
    taskDigest, grounded: [], verdict: { classification: "verified", complete: true, independentlyVerified: true, route: "algebra-text", justification: "j" }, reasoners: [] }).obligations[0];

describe("A: evidence is bound to the claim, not to the line", () => {
  test("generated: evidence for the same claim proves it; evidence for a different claim on the same line never does", () => {
    for (let i = 0; i < 300; i++) {
      const c = claim(); let other = claim(); if (claimIdentity(other) === claimIdentity(c)) other += " + 1";
      expect(oneLine(c, [{ claim: c }]).status).toBe("proven");
      expect(oneLine(c, [{ claim: other }]).status).not.toBe("proven");
      expect(oneLine(c, [{ claim: other }, { claim: c }]).status).toBe("proven"); // the right item is found among wrong ones
    }
  });
  test("presentational differences (spacing, case, unicode minus/times) do not change the identity; any change of an operand does", () => {
    for (let i = 0; i < 200; i++) {
      const c = claim(), v = c.replace(/-/g, "−").replace(/\*/g, "×").replace(/ /g, "  ").toUpperCase();
      expect(claimIdentity(v)).toBe(claimIdentity(c));
      const m = c.replace(/\d+/, (d) => String(Number(d) + 1)); expect(claimIdentity(m)).not.toBe(claimIdentity(c));
    }
  });
  test("a sub-expression of the evidence's claim is not the evidence's claim (x+1 inside (x+1)^2 = 4)", () => {
    expect(containsClaim("(x+1)^2 = 4", "x+1")).toBe(false);
    expect(containsClaim("a = 3, b = 4", "b = 4")).toBe(true);
  });
  test("evidence produced under other premises is not evidence under the certifier's premises", () => {
    for (let i = 0; i < 100; i++) { const c = claim();
      expect(oneLine(c, [{ claim: c, premises: "P1" }], "P2").status).not.toBe("proven");
      expect(oneLine(c, [{ claim: c, premises: "P1" }], "P1").status).toBe("proven"); }
  });
  test("a valid proof of x = 1 never establishes an unrelated geometry claim (or any non-x claim)", () => {
    for (const g of ["∠A + ∠B + ∠C = 180°", "AB = CA", "∠C = 80°", "BC = 5 cm", "y = 1", "x = 2", "x = 11"]) {
      const o = oneLine(g, [{ claim: "x = 1" }, { claim: "x = 1", checker: "e5-independent-geocalc" }]); expect(o.status).not.toBe("proven"); expect(o.evidence?.bound).not.toBe(true);
    }
  });
  test("evidence from an unregistered or wrong-route mechanism never proves, even for the exact claim", () => {
    for (let i = 0; i < 100; i++) { const c = claim();
      expect(oneLine(c, [{ claim: c, checker: "trust-me" }]).status).not.toBe("proven");
      expect(oneLine(c, [{ claim: c, checker: "e5-independent-geocalc" }]).status).not.toBe("proven"); } // registered, but not a producer on this route
  });
  test("evidenceBinds: an explicit identity must equal the expected one", () => {
    const a = claimIdentity("x = 1"), b = claimIdentity("x = 2");
    expect(evidenceBinds({ claim: "s", claimIdentity: a } as never, "t", null, a).ok).toBe(true);
    expect(evidenceBinds({ claim: "s", claimIdentity: b } as never, "t", null, a).ok).toBe(false);
    expect(evidenceBinds({ claim: "s" } as never, "t", null, a).ok).toBe(false);
  });
});

describe("A: typed evidence is bound to the submitted step", () => {
  const prob = { domain: "symbolic", task: "x" }, stepsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ rule: "r", expression: `e${i}` }));
  const cand = (n: number, ids: (string | null)[]): AssessmentEnvelope => ({ contractVersion: "openpath-unified-math@1", domain: "symbolic", classification: "verified", correct: true, complete: true, firstInvalidStep: null,
    steps: Array.from({ length: n }, (_, i) => ({ index: i, classification: "verified", justification: "j", reasoner: "symbolic:m3", dependencies: i ? [`s${i - 1}`] : ["problem"] })), proofDependencies: [], domainRestrictions: [], outstandingObligations: [], skills: [], reasoners: [{ id: "symbolic:m3" }], justification: "j", domainPayload: {},
    acceptanceGate: { evidence: ids.map((id, i) => ({ line: i + 1, claimIdentity: id, claim: `typed step ${i + 1}`, checker: "symbolic:m3", scope: "s", outcome: "verified" })) } } as never);
  test("matching identities prove every step; a tampered, missing or misaligned identity proves none", () => {
    for (let n = 1; n <= 6; n++) {
      const w = stepsOf(n), good = typedIdentities(prob, w, n).identities;
      expect(structuredObligations(cand(n, good), { problem: prob, working: w }).obligations.filter((o) => o.kind === "derivation").every((o) => o.status === "proven")).toBe(true);
      const bad = good.map((g, i) => (i === n - 1 ? g + "0" : g));
      expect(structuredObligations(cand(n, bad), { problem: prob, working: w }).obligations.find((o) => o.kind === "derivation" && o.line === n)!.status).not.toBe("proven");
      expect(structuredObligations(cand(n, good), { problem: prob, working: [...w, { rule: "r", expression: "extra" }] }).obligations.some((o) => o.kind === "derivation" && o.status === "proven")).toBe(false); // reasoner steps ≠ submitted steps
      expect(structuredObligations(cand(n, good)).obligations.some((o) => o.kind === "derivation" && o.status === "proven")).toBe(false); // no submission to compare with
      expect(structuredObligations(cand(n, good), { problem: { ...prob, task: "other" }, working: w }).obligations.some((o) => o.kind === "derivation" && o.status === "proven")).toBe(false); // evidence about another problem
    }
  });
});

import { extractLedger } from "./claim-ledger.ts";
describe("E: the claim ledger keeps the whole relation the student wrote (a truncated claim cannot be bound to anything)", () => {
  const NAMES = ["A", "B", "C", "AB", "DE", "DBC", "ABD", "BOD", "x", "y", "k"];
  test("generated relations in several notations are each one claim covering the full line", () => {
    for (let i = 0; i < 200; i++) {
      const l = NAMES[rnd(NAMES.length)], r = NAMES[rnd(NAMES.length)], n = 10 + rnd(170);
      for (const line of [`${l} + ${r} = ${n}°`, `angle ${l} = ${n}° - angle ${r}`, `∠${l} = ∠${r} (given)`, `${l} = ${r} + ${n}`, `${n} + ${l} = ${n + 1}`]) {
        const cl = extractLedger(line).lines[0].claims.filter((c) => c.kind !== "assumption");
        expect(cl.length).toBe(1);
        expect(normalizeEnds(line)).toContain(normalizeEnds(cl[0].text));
        expect(cl[0].text.replace(/\s+/g, "").length).toBeGreaterThanOrEqual(line.replace(/\(given\)/, "").replace(/\s+/g, "").length - 0); // nothing of the relation is cut off
      }
    }
  });
});
const normalizeEnds = (s: string) => s.replace(/\s+/g, "");
