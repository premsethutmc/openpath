/**
 * Diagnostic evidence audit (Assessment Evidence v1): for every spelling inflection principle, what the content can
 * support, kept strictly apart from what has been shown to be RELIABLE.
 *
 *   node tools/english/evidence/audit.ts            print the report
 *   node tools/english/evidence/audit.ts --write    write docs/english/evidence/EVIDENCE_AUDIT.{md,json}
 *   node tools/english/evidence/audit.ts --check    fail if the committed report is out of date (CI)
 *
 * Deterministic: depends only on content files. A rule is never "ready" because it has many questions: a reliable
 * mastery claim needs (1) complete coverage on educator-VALIDATED items and (2) diagnostic reliability demonstrated
 * with real learners (a calibration study). Neither exists for any rule today.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { INFLECTION_RULES, evidenceEligibility, evidenceOf, type Item } from "../../../packages/english-core/src/index.ts";
import { REPO } from "../load.ts";
import { loadEvidenceContent } from "./load.ts";

export const AUDIT_VERSION = "spelling-evidence-audit@1";
/** Coverage thresholds (research policy, not empirically derived): counts of distinct LEMMAS, not of questions. */
export const COVERAGE_POLICY = {
  positiveLemmas: 6,
  contrastLemmas: 3,
  transferLemmas: 4,
  retentionLemmas: 3,
  recognitionItems: 2,
  productionLemmas: 6,
  misconceptionProbes: 3,
} as const;
/** Real-learner studies that have demonstrated diagnostic reliability, by rule (none yet). */
export const RELIABILITY_STUDIES: Record<string, string> = {};

type Tier = "validated" | "demonstration" | "practice";
interface Row {
  principle: string;
  name: string;
  items: number;
  offeredByApp: number;
  bankOnly: number;
  byTier: Record<Tier, number>;
  ownerApproved: number;
  wordFamilies: Record<Tier, number>;
  positives: { items: number; lemmas: number };
  contrasts: { items: number; lemmas: number };
  production: { items: number; lemmas: number };
  recognition: { items: number; lemmas: number };
  transfer: { lemmas: number; reserved: number };
  retention: { lemmas: number; reserved: number };
  misconceptionProbes: number;
  unmapped: number;
  coverageAllContent: string[];
  coverageValidatedOnly: string[];
  reliabilityDemonstrated: boolean;
  masteryClaimPossible: boolean;
  why: string[];
}

function ownerApprovals(): Set<string> {
  const reviews = JSON.parse(readFileSync(join(REPO, "content/english/pilot/reviews.json"), "utf8")) as { id: string; version: string | number; decision: string; authority?: string }[];
  return new Set(reviews.filter((r) => r.decision === "approve" && r.authority === "product-owner").map((r) => `${r.id}@${r.version}`));
}

function gaps(c: { positives: number; contrasts: number; transfer: number; retention: number; recognition: number; production: number; probes: number }): string[] {
  const p = COVERAGE_POLICY;
  const out: string[] = [];
  if (c.positives < p.positiveLemmas) out.push(`positive lemmas ${c.positives}/${p.positiveLemmas}`);
  if (c.contrasts < p.contrastLemmas) out.push(`contrast lemmas ${c.contrasts}/${p.contrastLemmas}`);
  if (c.transfer < p.transferLemmas) out.push(`unseen-transfer lemmas ${c.transfer}/${p.transferLemmas}`);
  if (c.retention < p.retentionLemmas) out.push(`delayed-retention lemmas ${c.retention}/${p.retentionLemmas}`);
  if (c.recognition < p.recognitionItems) out.push(`recognition items ${c.recognition}/${p.recognitionItems}`);
  if (c.production < p.productionLemmas) out.push(`production lemmas ${c.production}/${p.productionLemmas}`);
  if (c.probes < p.misconceptionProbes) out.push(`misconception probes ${c.probes}/${p.misconceptionProbes}`);
  return out;
}

export function audit() {
  const { items, evidence } = loadEvidenceContent();
  const owner = ownerApprovals();
  const rows: Row[] = [];
  const infl = items.filter((x) => x.item.kind === "code" && x.item.target === "EN.FND.SPL.inflections");
  for (const def of INFLECTION_RULES) {
    const mine = infl.filter((x) => x.item.kind === "code" && x.item.step === def.id);
    const tierOf = (i: Item): Tier => {
      const e = evidenceEligibility(i);
      return e.verifies ? "validated" : e.practiceOnly ? "practice" : "demonstration";
    };
    const sets = (pred: (i: Item) => boolean, which: "all" | "validated") => {
      const lemmas = new Set<string>();
      let n = 0;
      for (const { item } of mine) {
        const t = tierOf(item);
        if (t === "practice" || (which === "validated" && t !== "validated") || !pred(item)) continue;
        n++;
        const m = evidenceOf(item, evidence);
        if (m) lemmas.add(m.lemma);
      }
      return { items: n, lemmas: lemmas.size };
    };
    const meta = (i: Item) => evidenceOf(i, evidence);
    const isApply = (i: Item) => meta(i)?.polarity === "apply";
    const isContrast = (i: Item) => meta(i)?.polarity === "contrast";
    const prod = (i: Item) => meta(i)?.mode === "production";
    const rec = (i: Item) => meta(i)?.mode === "recognition";
    const uses = (u: string) => (i: Item) => !!meta(i)?.uses.includes(u as never);
    const reserved = (u: string) => (i: Item) => !!meta(i)?.reserved && uses(u)(i);
    const probe = (i: Item) => (meta(i)?.probes.length ?? 0) > 0;
    const coverage = (which: "all" | "validated") =>
      gaps({
        positives: sets((i) => isApply(i) && prod(i), which).lemmas,
        contrasts: sets(isContrast, which).lemmas,
        transfer: sets(uses("unseen_transfer"), which).lemmas,
        retention: sets(uses("delayed_retention"), which).lemmas,
        recognition: sets(rec, which).items,
        production: sets(prod, which).lemmas,
        probes: sets(probe, which).items,
      });
    const families: Record<Tier, Set<string>> = { validated: new Set(), demonstration: new Set(), practice: new Set() };
    const byTier: Record<Tier, number> = { validated: 0, demonstration: 0, practice: 0 };
    for (const { item } of mine) {
      const t = tierOf(item);
      byTier[t]++;
      const m = meta(item);
      if (m) families[t].add(m.lemma);
    }
    const reliable = !!RELIABILITY_STUDIES[def.id];
    const covValidated = coverage("validated");
    const why: string[] = [];
    if (covValidated.length) why.push(`no complete coverage on educator-validated items (${covValidated.join("; ")})`);
    if (!reliable) why.push("diagnostic reliability not demonstrated with real learners (no calibration study)");
    rows.push({
      principle: def.id,
      name: def.name,
      items: mine.length,
      offeredByApp: mine.filter((x) => x.origin !== "diagnostic_bank").length,
      bankOnly: mine.filter((x) => x.origin === "diagnostic_bank").length,
      byTier,
      ownerApproved: mine.filter((x) => owner.has(`${x.item.id}@${x.item.version}`)).length,
      wordFamilies: { validated: families.validated.size, demonstration: families.demonstration.size, practice: families.practice.size },
      positives: sets((i) => isApply(i), "all"),
      contrasts: sets(isContrast, "all"),
      production: sets(prod, "all"),
      recognition: sets(rec, "all"),
      transfer: { lemmas: sets(uses("unseen_transfer"), "all").lemmas, reserved: sets(reserved("unseen_transfer"), "all").lemmas },
      retention: { lemmas: sets(uses("delayed_retention"), "all").lemmas, reserved: sets(reserved("delayed_retention"), "all").lemmas },
      misconceptionProbes: sets(probe, "all").items,
      unmapped: mine.filter((x) => !meta(x.item)).length,
      coverageAllContent: coverage("all"),
      coverageValidatedOnly: covValidated,
      reliabilityDemonstrated: reliable,
      masteryClaimPossible: covValidated.length === 0 && reliable,
      why,
    });
  }
  return { version: AUDIT_VERSION, policy: COVERAGE_POLICY, rows };
}

export function markdown(a: ReturnType<typeof audit>): string {
  const L = [
    "# Spelling diagnostic evidence audit",
    "",
    `Generated by \`node tools/english/evidence/audit.ts --write\` (${a.version}). Deterministic: content files only. Counts exclude practice-only (unchecked generated) items unless stated.`,
    "",
    "**Content coverage is not diagnostic reliability.** A rule could have complete coverage and still not support a reliable claim: that needs educator-validated items AND a real-learner study showing the evidence predicts unseen-word spelling later. No rule has either today.",
    "",
    "| Principle | Eligible items (validated / demonstration) | Practice-only | Independent word families (validated / demonstration) | Positive lemmas | Contrast lemmas | Production lemmas | Recognition items | Transfer lemmas (reserved) | Retention lemmas (reserved) | Misconception probes | Owner-approved | Bank-only |",
    "|---|---|---:|---|---:|---:|---:|---:|---|---|---:|---:|---:|",
  ];
  for (const r of a.rows)
    L.push(`| ${r.principle} | ${r.byTier.validated} / ${r.byTier.demonstration} | ${r.byTier.practice} | ${r.wordFamilies.validated} / ${r.wordFamilies.demonstration} | ${r.positives.lemmas} | ${r.contrasts.lemmas} | ${r.production.lemmas} | ${r.recognition.items} | ${r.transfer.lemmas} (${r.transfer.reserved}) | ${r.retention.lemmas} (${r.retention.reserved}) | ${r.misconceptionProbes} | ${r.ownerApproved} | ${r.bankOnly} |`);
  L.push("", "## Readiness", "", "| Principle | Coverage, all eligible content | Coverage, educator-validated only | Reliability demonstrated | Reliable mastery claim possible |", "|---|---|---|---|---|");
  for (const r of a.rows)
    L.push(`| ${r.principle} | ${r.coverageAllContent.length ? "gaps: " + r.coverageAllContent.join("; ") : "complete"} | ${r.coverageValidatedOnly.length ? "gaps" : "complete"} | ${r.reliabilityDemonstrated ? "yes" : "no"} | **${r.masteryClaimPossible ? "yes" : "no"}** |`);
  L.push("", "Coverage thresholds (distinct lemmas unless stated; research policy, not validated requirements): " +
    Object.entries(a.policy).map(([k, v]) => `${k} ${v}`).join(", ") + ".", "",
    "Owner approval (product permission) is reported separately and never counts as educator validation. Bank-only items are in `content/english/spelling/evidence/diagnostic-bank.json`: provisional, not offered by the app, awaiting educator review.");
  return L.join("\n") + "\n";
}

const OUT = join(REPO, "docs", "english", "evidence");
if (import.meta.url === `file://${process.argv[1]}`) {
  const a = audit();
  const md = markdown(a);
  const js = JSON.stringify(a, null, 1) + "\n";
  if (process.argv.includes("--write")) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, "EVIDENCE_AUDIT.md"), md);
    writeFileSync(join(OUT, "evidence-audit.json"), js);
  } else if (process.argv.includes("--check")) {
    const ok = readFileSync(join(OUT, "EVIDENCE_AUDIT.md"), "utf8") === md && readFileSync(join(OUT, "evidence-audit.json"), "utf8") === js;
    if (!ok) {
      console.error("docs/english/evidence/EVIDENCE_AUDIT.md is out of date: run node tools/english/evidence/audit.ts --write");
      process.exit(1);
    }
    console.log(md);
  } else console.log(md);
}
