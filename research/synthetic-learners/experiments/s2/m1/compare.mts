// M1 (subskill-gated-mastery@1, shadow): existing vs proposed mastery decisions on S2's recorded learner histories.
// usage (from frontend/): node --import tsx ../research/synthetic-learners/experiments/s2/m1/compare.mts [cohort ...]
// Re-runs S2's frozen protocol (config.json, profiles, seeds, bounds: unchanged) with a read-only visit observer, checks every re-run journey is
// byte-identical to the frozen trace (traces/<cohort>.jsonl.gz), and at the end of every visit computes BOTH policies over the same stored events.
// Writes m1/results/<cohort>.json (metrics) and m1/results/<cohort>-visits.jsonl.gz (per-visit decisions, for audit).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { runS2Journey, type JourneyTrace } from "../src/journey.ts";
import { weak, strong, COMP_KINDS } from "../src/metrics.ts";
import { compareMastery, proposedRetentionPlan, VARIANTS, type Variant } from "../../../../../packages/learning/src/gated-mastery.ts";
import { INDEPENDENT_MIN } from "../../../../../packages/learning/src/evidence.ts";
import type { Profile } from "../../../src/model.ts";

const here = new URL("../", import.meta.url), out = new URL("results/", import.meta.url);
const cfg = JSON.parse(readFileSync(new URL("config.json", here), "utf8"));
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cfg.cohorts);
mkdirSync(out, { recursive: true });
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const K = (id: string) => id.split(".")[1].replace("@1", "");
const CLAIM = (s: string) => s === "independently-demonstrated" || s === "retention-due";
type Hidden = { abilities: Record<string, number>; misconceptions: Record<string, number> };

interface VisitRow {
  j: string; v: number; at: string; attempts: number;
  hidden: { weak: string[]; strong: string[] };
  existing: { status: string; claims: boolean; retention: string; recovery: boolean };
  proposed: Record<Variant, { status: string; missing: string[]; recovery: string[]; due: string[]; extra: number }>;
  sub: Record<string, { status: string; indRight: number; distinct: number; ind: number; ret: number; earlyWrong: number }>;
  plan: { sub: string; n: number; unchecked: boolean }[];
}

for (const cohort of want) {
  const cc = cfg.cohorts[cohort];
  const frozen = gunzipSync(readFileSync(new URL(`traces/${cohort}.jsonl.gz`, here))).toString().trim().split("\n");
  const frozenHash = new Set(frozen.map(sha));
  const rows: VisitRow[] = [], traces: JourneyTrace[] = [];
  let identical = 0, existingDrift = 0;
  for (const id of cc.profiles) {
    const p = JSON.parse(readFileSync(new URL(`${cc.profileDir}/${id}.json`, here), "utf8")) as Profile;
    for (let i = 0; i < cc.seedsPerProfile; i++) {
      const pending: Omit<VisitRow, "hidden" | "at" | "attempts">[] = [];
      const t = runS2Journey(p, p.seed + 7919 * i, cohort, { onVisit: ({ visit, learnerId, events, now }) => {
        const c = compareMastery(learnerId, events, now);
        const g = c.proposed.gated;
        const ret = (events as unknown as { record?: string; activity?: string; questionId?: string; competency?: string }[]).filter((e) => e.record === "attempt" && e.activity === "retention");
        pending.push({ j: learnerId, v: visit,
          existing: { status: c.existing.status, claims: c.existing.claimsCompetence, retention: c.existing.retention, recovery: c.existing.recoveryRequired },
          proposed: Object.fromEntries(VARIANTS.map((vv) => { const x = c.proposed[vv]; return [vv, { status: x.status, missing: x.missing.map(K), recovery: x.recoveryRequired.map(K), due: x.retentionDue.map(K),
            // additional questions (lower bound: each one answered right alone on a fresh variant) for every sub-skill not currently shown
            // (a sub-skill with enough distinct right answers that is still not shown, e.g. undone by status@2, needs at least one more)
            extra: x.subSkills.filter((s) => !s.currentDemonstration).reduce((n, s) => n + (s.recoveryRequired ? INDEPENDENT_MIN : Math.max(1, INDEPENDENT_MIN - s.independent.distinctVariantsRight)), 0) }]; })) as VisitRow["proposed"],
          sub: Object.fromEntries(g.subSkills.map((s) => { const mine = ret.filter((e) => s.evidence.includes((e as unknown as { id: string }).id)) as unknown as { at: string; decision?: { verdict?: string } }[];
            // a wrong delayed-check answer on this sub-skill BEFORE its own check was due (E1 counts a check from the sub-skill's own due date)
            const due = (s.retentionHistory[0] as { due?: string } | undefined)?.due;
            return [K(s.id), { status: s.status, indRight: s.independent.right, distinct: s.independent.distinctVariantsRight, ind: s.independent.answers, ret: mine.length,
              earlyWrong: mine.filter((a) => a.decision?.verdict === "incorrect" && (!due || Date.parse(a.at) < Date.parse(due))).length }]; })),
          plan: proposedRetentionPlan(learnerId, events, now).map((x) => ({ sub: K(x.subSkill), n: x.questions.length, unchecked: x.unchecked })) });
      } });
      if (frozenHash.has(sha(JSON.stringify(t)))) identical++;
      traces.push(t);
      // the comparison's "existing" column must be what the journey recorded (no drift from ordering or decisions)
      pending.forEach((r) => { if (r.existing.status !== t.visits[r.v - 1].openpath.evidence.status) existingDrift++; });
      for (const r of pending) { const v = t.visits[r.v - 1]; rows.push({ ...r, at: v.at, attempts: v.openpath.attempts.length, hidden: { weak: COMP_KINDS.filter((k) => weak(v.hiddenAfter as Hidden, k)), strong: COMP_KINDS.filter((k) => strong(v.hiddenAfter as Hidden, k)) } }); }
    }
    console.log(cohort, id, "done");
  }
  writeFileSync(new URL(`${cohort}-visits.jsonl.gz`, out), gzipSync(rows.map((r) => JSON.stringify(r)).join("\n") + "\n"));
  writeFileSync(new URL(`${cohort}.json`, out), JSON.stringify({ cohort, label: cc.label, journeys: traces.length, reproducedIdentically: identical, existingStatusDrift: existingDrift, ...analyse(rows, traces) }, null, 1) + "\n");
}

function analyse(rows: VisitRow[], traces: JourneyTrace[]) {
  const R = (n: number, d: number) => ({ n, d, rate: d ? Math.round((n / d) * 1000) / 1000 : null });
  const byJ = new Map<string, VisitRow[]>(); for (const r of rows) (byJ.get(r.j) ?? byJ.set(r.j, []).get(r.j)!).push(r);
  const pol = (r: VisitRow, p: "existing" | Variant) => (p === "existing" ? r.existing.claims : CLAIM(r.proposed[p].status));
  const P = ["existing", ...VARIANTS] as const;
  const falseMastery = Object.fromEntries(P.map((p) => {
    const claims = rows.filter((r) => pol(r, p)), fals = claims.filter((r) => r.hidden.weak.length);
    const js = [...byJ.values()].filter((vs) => vs.some((r) => pol(r, p))), jf = js.filter((vs) => vs.some((r) => pol(r, p) && r.hidden.weak.length));
    const weakVisits = rows.filter((r) => r.hidden.weak.length);
    return [p, { claimVisits: claims.length, falseClaimVisits: R(fals.length, claims.length), journeysWithFalseClaim: R(jf.length, js.length), journeysWithFalseClaimOfAll: R(jf.length, byJ.size), weakVisitsClaimed: R(weakVisits.filter((r) => pol(r, p)).length, weakVisits.length),
      falseByWeakKind: Object.fromEntries(COMP_KINDS.map((k) => [k, fals.filter((r) => r.hidden.weak.includes(k)).length])) }];
  }));
  // genuine competence: all four kinds strong (hidden). S2's journey-level definition (metrics.ts: all kinds strong at the end, ≥ 4 unassisted
  // answers in total), a stricter one (each kind answered alone at least INDEPENDENT_MIN times: the learner had a chance to show each), and the
  // visit level. Per kind: S2's competentPairs (strong at the end, ≥ 4 unassisted answers of that kind).
  const competentVisits = rows.filter((r) => r.hidden.strong.length === COMP_KINDS.length);
  const finals = [...byJ.values()].map((vs) => vs.at(-1)!);
  const tr = new Map(traces.map((t) => [t.learnerId, t]));
  const competentJourneys = finals.filter((r) => { const t = tr.get(r.j)!; return COMP_KINDS.every((k) => strong(t.finalHidden as Hidden, k)) && t.visits.flatMap((v) => v.openpath.attempts).filter((a) => a.hints === 0 && a.activity !== "guided").length >= 4; });
  const askedEach = competentJourneys.filter((r) => COMP_KINDS.every((k) => r.sub[k].ind >= INDEPENDENT_MIN));
  const missed = Object.fromEntries(P.map((p) => [p, { visits: R(competentVisits.filter((r) => !pol(r, p)).length, competentVisits.length), journeysFinalVisitS2: R(competentJourneys.filter((r) => !pol(r, p)).length, competentJourneys.length), journeysFinalVisitAskedEachKind: R(askedEach.filter((r) => !pol(r, p)).length, askedEach.length) }]));
  const pairs = finals.flatMap((r) => { const t = tr.get(r.j)!; const atts = t.visits.flatMap((v) => v.openpath.attempts); return COMP_KINDS.filter((k) => strong(t.finalHidden as Hidden, k) && atts.filter((a) => a.kind === k && a.hints === 0 && a.activity !== "guided").length >= 4).map((k) => ({ r, k })); });
  const missedPairs = Object.fromEntries(VARIANTS.map((v) => [v, R(pairs.filter(({ r, k }) => !CLAIM(r.sub[k].status) || r.proposed[v].missing.includes(k)).length, pairs.length)]));
  // why the proposed (gated) policy withholds the claim from a genuinely competent learner
  const why: Record<string, number> = {};
  for (const r of competentVisits.filter((r) => !pol(r, "gated"))) for (const k of r.proposed.gated.missing) { const s = r.sub[k]; const reason = s.status === "not-attempted" ? "never asked" : s.ind === 0 ? "asked, only assisted" : s.status === "recovery-required" ? "recovery required" : s.distinct < INDEPENDENT_MIN ? `fewer than ${INDEPENDENT_MIN} distinct right alone` : s.status; why[`${k}: ${reason}`] = (why[`${k}: ${reason}`] ?? 0) + 1; }
  // sub-skill coverage at the end of each journey
  const coverage = Object.fromEntries(COMP_KINDS.map((k) => [k, { askedAlone: R(finals.filter((r) => r.sub[k].ind > 0).length, finals.length), shown: R(finals.filter((r) => CLAIM(r.sub[k].status)).length, finals.length), everDelayedChecked: R(finals.filter((r) => r.sub[k].ret > 0).length, finals.length),
    shownButNeverDelayedChecked: R(finals.filter((r) => CLAIM(r.sub[k].status) && r.sub[k].ret === 0).length, finals.filter((r) => CLAIM(r.sub[k].status)).length) }]));
  // retention: what the proposed plan would ask when a sub-skill check is due
  const planRows = rows.flatMap((r) => r.plan);
  const retention = { planItemsBySubSkill: Object.fromEntries(COMP_KINDS.map((k) => [k, planRows.filter((x) => x.sub === k).length])), unchecked: R(planRows.filter((x) => x.unchecked).length, planRows.length) };
  // recovery targeting: visits where the existing policy requires (competency-wide) recovery
  const rec = rows.filter((r) => r.existing.recovery);
  const recovery = { existingRecoveryVisits: rec.length, gatedNamesASubSkill: R(rec.filter((r) => r.proposed.gated.recovery.length).length, rec.length),
    bySubSkill: Object.fromEntries(COMP_KINDS.map((k) => [k, rec.filter((r) => r.proposed.gated.recovery.includes(k)).length])),
    // UPPER BOUND: the existing policy cleared recovery while the proposed one still requires it on some sub-skill (not checked to be the same
    // failure: cleared by success elsewhere, or a different sub-skill's failure)
    clearedWhileSubSkillStillInRecoveryUpperBound: [...byJ.values()].reduce((n, vs) => n + vs.filter((r, i) => i > 0 && vs[i - 1].existing.recovery && !r.existing.recovery && r.proposed.gated.recovery.length).length, 0),
    gatedRecoveryWithoutExisting: rows.filter((r) => !r.existing.recovery && r.proposed.gated.recovery.length).length,
    // the proposed policy claims while the existing one requires recovery because a wrong delayed-check answer came before the sub-skill's own due date
    gatedClaimsDespiteEarlyWrongCheck: rows.filter((r) => r.existing.recovery && CLAIM(r.proposed.gated.status) && COMP_KINDS.some((k) => r.sub[k].earlyWrong)).length };
  // claims resting on a sub-skill whose delayed check is due and was never answered
  const restsOnUnchecked = Object.fromEntries(VARIANTS.map((v) => { const c = rows.filter((r) => CLAIM(r.proposed[v].status)); return [v, R(c.filter((r) => r.proposed[v].due.some((k) => r.sub[k].ret === 0)).length, c.length)]; }));
  const extra = Object.fromEntries(VARIANTS.map((v) => { const xs = rows.filter((r) => r.existing.claims && !CLAIM(r.proposed[v].status)).map((r) => r.proposed[v].extra).sort((a, b) => a - b);
    // per journey: at the FIRST visit where the existing policy claims and the proposed one does not, and at the final visit
    const first = [...byJ.values()].map((vs) => vs.find((r) => r.existing.claims && !CLAIM(r.proposed[v].status))).filter(Boolean).map((r) => r!.proposed[v].extra);
    const fin = [...byJ.values()].map((vs) => vs.at(-1)!).filter((r) => !CLAIM(r.proposed[v].status)).map((r) => r.proposed[v].extra);
    const st = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return { n: b.length, mean: b.length ? Math.round((b.reduce((x, y) => x + y, 0) / b.length) * 100) / 100 : null, median: b.length ? b[Math.floor(b.length / 2)] : null, max: b.at(-1) ?? null }; };
    return [v, { perVisitWhereExistingClaimsButProposedNot: st(xs), perJourneyAtFirstDisagreement: st(first), perJourneyAtFinalVisitNotClaimed: st(fin) }]; }));
  const agreement = Object.fromEntries(VARIANTS.map((v) => [v, { bothClaim: rows.filter((r) => r.existing.claims && CLAIM(r.proposed[v].status)).length, onlyExisting: rows.filter((r) => r.existing.claims && !CLAIM(r.proposed[v].status)).length, onlyProposed: rows.filter((r) => !r.existing.claims && CLAIM(r.proposed[v].status)).length, neither: rows.filter((r) => !r.existing.claims && !CLAIM(r.proposed[v].status)).length }]));
  return { visits: rows.length, falseMastery, missedCompetence: { competentVisits: competentVisits.length, competentJourneysS2: competentJourneys.length, competentJourneysAskedEachKind: askedEach.length, byPolicy: missed, competentKindPairs: pairs.length, missedKindPairsByVariant: missedPairs, gatedWithheldReasons: why }, coverage, retention: { ...retention, claimsRestingOnNeverCheckedDueSubSkill: restsOnUnchecked }, recovery, additionalQuestions: extra, agreement };
}
