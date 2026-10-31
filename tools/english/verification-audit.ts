/**
 * Compatibility audit for verification@2: which derived claims change, on the repository's own scenario records and on
 * random histories. Nothing is stored or rewritten; both readings come from the same events and the same engine.
 *
 *   node tools/english/verification-audit.ts        Markdown summary
 *
 * "@1" here is the claim as it was derived before this change: the schedule status "verified" and the supported level
 * at or above the target. "@2" is engineClaim now (developer policy, so only the definition differs, not eligibility).
 */
import { applyDirect, binaryUpdate, createComposite, DEVELOPER_VERIFICATION, engineClaim, Ledger, leafView, PILOT_VERIFICATION } from "../../packages/english-core/src/index.ts";
import { runScenarios, scenarioRecord, SVA } from "./assessment-simulations.ts";
import { loadContext } from "./load.ts";

export async function verificationAudit() {
  const rows: { bank: string; id: string; old: boolean; v2: boolean; pilot: boolean }[] = [];
  for (const bank of ["app", "core", "reviewed-supplement"] as const) {
    for (const r of await runScenarios(bank)) {
      const { events, ectx } = scenarioRecord(r);
      const now = events.at(-1)!.at;
      const L = Ledger.rebuild(ectx.ctx, "sim", events);
      const v = leafView(L.composite, ectx.ctx.index, SVA, now);
      const target = ectx.profile.byCapability.get(SVA)!.expectedBand!;
      const old = v.verification.status === "verified" && (v.verification.currentLevel ?? -1) >= target;
      const v2 = engineClaim({ ...ectx, verification: DEVELOPER_VERIFICATION }, SVA, v, events, now).level === "verified";
      const pilot = engineClaim({ ...ectx, verification: PILOT_VERIFICATION }, SVA, v, events, now).level === "verified";
      rows.push({ bank, id: r.id, old, v2, pilot });
    }
  }
  // random histories on the engine alone: how often the schedule's "verified" band was a band first shown in the check itself
  const ctx = loadContext();
  let seed = 11;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let verifiedNow = 0;
  let early = 0;
  for (let run = 0; run < 500; run++) {
    const c = createComposite(ctx.index, `a${run}`);
    let d = 0;
    for (let s = 0; s < 8; s++) {
      d += Math.floor(rnd() * 9);
      const b = 2 + Math.round(rnd() * 10) / 2;
      const n = 1 + Math.floor(rnd() * 5);
      const right = Math.floor(rnd() * (n + 1));
      for (let k = 0; k < n; k++) {
        const correct = k < right;
        const at = new Date(Date.UTC(2026, 9, 1) + d * 86_400_000 + (s * 60 + k) * 60_000).toISOString();
        applyDirect(c, ctx.index, { capability: SVA, at, session: `s${s}`, context: k % 2 ? "typed:cloze" : "choice:grammar", decisionId: `${run}:${s}:${k}`, update: (e) => binaryUpdate(e, { a: 1.3, c: 0, b }, correct), misconceptions: [], binary: { b, correct, a: 1.3, c: 0 } });
      }
    }
    const v = leafView(c, ctx.index, SVA, new Date(Date.UTC(2026, 9, 1) + (d + 1) * 86_400_000).toISOString());
    if (v.verification.status !== "verified") continue;
    verifiedNow++;
    if ((v.verification.verifiedLevel ?? -Infinity) < (v.verification.currentLevel ?? -Infinity)) early++;
  }
  return { rows, random: { histories: 500, verifiedNow, early } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = await verificationAudit();
  const yes = (b: boolean) => (b ? "yes" : "no");
  console.log("| Bank | Scenario | Verified @1 | Verified @2 (developer policy) | Verified for the pilot |\n|---|---|---|---|---|");
  for (const r of a.rows) console.log(`| ${r.bank} | ${r.id} | ${yes(r.old)} | ${yes(r.v2)} | ${yes(r.pilot)} |`);
  const changed = a.rows.filter((r) => r.old !== r.v2);
  console.log(`\n${changed.length} of ${a.rows.length} scenario claims change under verification@2${changed.length ? ` (${changed.map((r) => `${r.bank} ${r.id}`).join(", ")})` : ""}.`);
  console.log(`Random histories: ${a.random.verifiedNow} of ${a.random.histories} end with the schedule "verified"; in ${a.random.early} of them the band the old summary called confirmed (the supported level) is above the band a delayed check actually verified.`);
}
