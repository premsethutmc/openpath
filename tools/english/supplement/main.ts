/**
 * Proposed Grade 8 supplemental bank: quality checks and the educator-review package.
 *
 *   node tools/english/supplement/main.ts --check      run every check; exit 1 on a blocking problem
 *   node tools/english/supplement/main.ts --manifest   (re)write manifest.json (proposed pools), deterministic
 *   node tools/english/supplement/main.ts --package    write the educator-review package (Markdown + CSV + JSON)
 *
 * Checks (blocking unless marked "review"):
 *   schema        indexContent accepts every question (the engine's own validation)
 *   bank rules    the item-bank lint (tools/english/bank/checks.ts): candidate review mark, expert-estimate
 *                 difficulty, a ladder step within 0.75 band, a rationale, discrimination 0.5–2, no duplicate
 *   provisional   evidence_status "provisional" and review "draft-unreviewed" on every question; the allocation
 *                 offers it for practice only, and the ledger holds an answer to it (no estimate change)
 *   duplicates    no repeated option or accepted answer inside a question; no question that repeats an existing one
 *   near-dupes    word overlap (Jaccard on content words) with every existing question and with each other
 *   leakage       the answer appears in a lesson (allocation.ts teachingLeak), or the filled-in answer sentence shares
 *                 four words in a row with an existing question (which might be shown in teaching)
 *   ambiguity     "two"/"both" prompts have exactly two answers; one keyed option in choice questions; distractor
 *                 tags and addressed misconceptions exist in the framework; answer-position balance (review)
 *   language      the bank's age screen plus extra words for 10–15-year-olds (review)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CodeItem,
  indexContent,
  type Item,
  type ItemPool,
  itemEligibility,
  Ledger,
  misconceptionIds,
  normaliseAnswer,
  teachingLeak,
  type BankItem,
} from "../../../packages/english-core/src/index.ts";
import { ageScreen, lint, loadProgressions } from "../bank/checks.ts";
import { loadAppEssayContext } from "../essay-load.ts";
import { REPO, viewFor } from "../load.ts";
import { loadContextWithSupplement, loadSupplementItems, loadSupplementManifest, SUPPLEMENT_DIR, type SupplementManifest } from "./load.ts";

type Code = { kind: "code" } & CodeItem;
export interface Finding {
  item: string;
  check: string;
  severity: "blocking" | "review";
  message: string;
}

const STOP = new Set("a an the and or but of to in on at for is are was were be been it this that these those with as by from which who what choose sentence sentences correct write word words two both one best".split(" "));
const tokens = (s: string) => new Set(s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)));
const textOf = (i: Code) => [i.prompt, ...(i.options ?? []), ...(i.left ?? []), ...(i.answers ?? [])].join(" ");
const jaccard = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
};
export const NEAR_DUPLICATE = 0.6;
const EXTRA_SCREEN = /\b(smok\w*|dying|hate|stupid|idiot|ugly|fat|kill\w*|weapon|bomb|war|poison)\b/i;

function filledAnswer(i: Code): string {
  const kind = i.format.split(":")[0];
  const ans = kind === "choice" && i.options && i.answer !== undefined ? i.options[i.answer] : kind === "typed" ? (i.answers?.[0] ?? "") : "";
  return i.prompt.includes("___") ? i.prompt.replace(/_{3,}/, ans) : `${i.prompt} ${ans}`;
}
const grams = (s: string, n: number) => {
  const w = s.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let k = 0; k + n <= w.length; k++) out.add(w.slice(k, k + n).join(" "));
  return out;
};

export function checkSupplement(): { findings: Finding[]; items: Code[] } {
  const findings: Finding[] = [];
  const add = (item: string, check: string, severity: Finding["severity"], message: string) => findings.push({ item, check, severity, message });
  const items = loadSupplementItems().filter((i): i is Code => i.kind === "code");
  const app = loadAppEssayContext();
  const existing = [...app.ctx.content.items.values()].filter((i): i is Code => i.kind === "code");

  // schema: the engine's own content validation, on the app bank plus the proposal
  let sup;
  try {
    sup = loadContextWithSupplement();
  } catch (e) {
    add("(all)", "schema", "blocking", (e as Error).message);
    return { findings, items };
  }
  const ids = new Set(items.map((i) => i.id));
  for (const i of items) if (app.ctx.content.items.has(i.id)) add(i.id, "schema", "blocking", "id already used by an existing question");
  if (items.length !== 96) add("(all)", "schema", "blocking", `expected 96 questions, found ${items.length}`);

  // bank rules (only problems on proposed questions)
  for (const p of lint(sup.ctx, loadProgressions())) if (p.item && ids.has(p.item)) add(p.item, "bank rules", "blocking", p.message);

  // provisional and ineligible for verified mastery
  const ledger = new Ledger(sup.ctx, "supplement-check");
  for (const i of items) {
    if ((i as { evidence_status?: string }).evidence_status !== "provisional") add(i.id, "provisional", "blocking", "must be evidence_status provisional until educator review");
    if (i.review !== "draft-unreviewed") add(i.id, "provisional", "blocking", `review must be "draft-unreviewed" (is "${i.review}")`);
    const roles = itemEligibility(sup, i.target).find((e) => e.item === i.id)?.roles ?? [];
    if (roles.some((r) => r === "independent_verification" || r === "delayed_retention" || r === "diagnostic")) add(i.id, "provisional", "blocking", `the allocation would use it for ${roles.join(", ")}`);
  }
  // the ledger holds an answer to a provisional question
  const probe = items.find((i) => i.format.startsWith("choice"))!;
  const d = ledger.apply({ kind: "evidence", id: "probe", at: "2026-10-18T09:00:00.000Z", session: "probe", item: { id: probe.id, version: probe.version }, response: { kind: "choice", choice: 0 }, use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
  if (d[0]?.verdict !== "held") add(probe.id, "provisional", "blocking", `the ledger did not hold an answer to a provisional question (${d[0]?.verdict})`);

  // duplicates inside a question, and against the existing bank
  const key = (i: Code) => [i.target, normaliseAnswer(i.prompt), (i.options ?? []).map(normaliseAnswer).join("|")].join("§");
  const existingKeys = new Map(existing.map((e) => [key(e), e.id]));
  for (const i of items) {
    const opts = (i.options ?? []).map(normaliseAnswer);
    if (new Set(opts).size !== opts.length) add(i.id, "duplicates", "blocking", "two options are the same");
    const ans = (i.answers ?? []).map(normaliseAnswer);
    if (new Set(ans).size !== ans.length) add(i.id, "duplicates", "blocking", "an accepted answer is listed twice");
    if (existingKeys.has(key(i))) add(i.id, "duplicates", "blocking", `repeats ${existingKeys.get(key(i))}`);
    if (i.wrong) for (const w of Object.keys(i.wrong)) if (ans.includes(normaliseAnswer(w))) add(i.id, "ambiguity", "blocking", `"${w}" is both accepted and marked wrong`);
  }

  // near-duplicates: with every existing question and with each other
  const tok = new Map(items.map((i) => [i.id, tokens(textOf(i))]));
  for (const i of items) {
    for (const e of existing) {
      if (e.target !== i.target) continue;
      const j = jaccard(tok.get(i.id)!, tokens(textOf(e)));
      if (j >= NEAR_DUPLICATE) add(i.id, "near-dupes", "blocking", `${Math.round(j * 100)}% word overlap with existing ${e.id}`);
    }
    for (const o of items) {
      if (o.id <= i.id) continue;
      const j = jaccard(tok.get(i.id)!, tok.get(o.id)!);
      if (j >= NEAR_DUPLICATE) add(i.id, "near-dupes", "blocking", `${Math.round(j * 100)}% word overlap with proposed ${o.id}`);
    }
  }

  // leakage: the answer in a lesson, or the keyed answer's words (four in a row) in an existing question's text, which
  // the learner may have been shown while being taught or practising
  const keyedText = (i: Code): string => {
    const kind = i.format.split(":")[0];
    if (kind === "choice") return i.options![i.answer!];
    if (kind === "multi") return /^before sentence/.test(i.options![0]) ? "" : i.answer_set!.map((k) => i.options![k]).join(" | ");
    if (kind === "order") return i.answer_order!.map((k) => i.options![k]).join(" ");
    // typed: the sentence after the instruction (after the last colon), with the answer filled in
    return filledAnswer(i).split(":").slice(1).join(":") || filledAnswer(i);
  };
  for (const i of items) {
    const leak = teachingLeak(i as BankItem, app.teachingText?.get(i.target) ?? []);
    if (leak) add(i.id, "leakage", "blocking", `its answer appears in a lesson ("${leak}")`);
    const g = [...grams(keyedText(i), 4)].filter((x) => x.split(" ").filter((w) => !STOP.has(w)).length >= 2);
    for (const e of existing) {
      if (e.target !== i.target) continue;
      const eg = grams([e.prompt, ...(e.options ?? []), ...(e.answers ?? [])].join(" | "), 4);
      const shared = g.find((x) => eg.has(x));
      if (shared) {
        add(i.id, "leakage", "blocking", `its keyed answer shares "${shared}" with existing ${e.id}`);
        break;
      }
    }
  }

  // ambiguity
  const positions: Record<string, number[]> = {};
  for (const i of items) {
    const kind = i.format.split(":")[0];
    const allowed = misconceptionIds(sup.ctx.index, i.target);
    for (const t of Object.values(i.distractor_tags ?? {})) if (!allowed.has(t)) add(i.id, "ambiguity", "blocking", `distractor tag "${t}" is not a misconception of ${i.target}`);
    for (const t of i.addresses ?? []) if (!allowed.has(t)) add(i.id, "ambiguity", "blocking", `addresses "${t}", not a misconception of ${i.target}`);
    for (const t of Object.values(i.wrong ?? {})) if (!allowed.has(t)) add(i.id, "ambiguity", "blocking", `wrong-answer tag "${t}" is not a misconception of ${i.target}`);
    if (kind === "multi") {
      const n = /\b(two|both)\b/i.test(i.prompt) ? 2 : null;
      if (n !== null && i.answer_set?.length !== n) add(i.id, "ambiguity", "blocking", `the prompt asks for two, but ${i.answer_set?.length} are keyed`);
      if (n === null) add(i.id, "ambiguity", "review", "a multi-answer prompt should say how many to choose");
    }
    if (kind === "choice") {
      (positions[i.target] ??= []).push(i.answer!);
      if (i.distractor_tags && String(i.answer) in i.distractor_tags) add(i.id, "ambiguity", "blocking", "the keyed answer carries a distractor tag");
      if ((i.options?.length ?? 0) < 3) add(i.id, "ambiguity", "review", "fewer than three options");
    }
    if (kind === "typed" && (i.answers?.length ?? 0) > 3) add(i.id, "ambiguity", "review", `${i.answers!.length} accepted answers: check the wording allows exactly these`);
  }
  for (const [cap, ps] of Object.entries(positions)) {
    const counts = [0, 1, 2, 3].map((k) => ps.filter((p) => p === k).length);
    if (ps.length >= 4 && Math.max(...counts) / ps.length > 0.6) add(cap, "ambiguity", "review", `keyed answers sit mostly in one position (${counts.join("/")})`);
  }

  // language
  const screenCtx = { ...sup.ctx, content: { ...sup.ctx.content, items: new Map(items.map((i) => [i.id, i as Item])), passages: new Map() } };
  for (const p of ageScreen(screenCtx as never)) add(p.item ?? "?", "language", "review", p.message);
  for (const i of items) {
    const m = textOf(i).match(EXTRA_SCREEN);
    if (m) add(i.id, "language", "review", `contains "${m[0]}": check it is suitable for ages 10–15`);
  }
  return { findings, items };
}

/** Proposed pools: per competency, the two questions closest to the target for the delayed check, the rest for checks. */
export function proposedPools(items: Code[], target = 5): Record<string, ItemPool> {
  const out: Record<string, ItemPool> = {};
  const byCap = new Map<string, Code[]>();
  for (const i of items) byCap.set(i.target, [...(byCap.get(i.target) ?? []), i]);
  for (const list of byCap.values()) {
    const sorted = [...list].sort((a, b) => Math.abs(a.b - target) - Math.abs(b.b - target) || a.id.localeCompare(b.id));
    sorted.forEach((i, k) => (out[i.id] = k < 2 ? "retention" : "confirmation"));
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function writeManifest(items: Code[]) {
  const m: SupplementManifest = {
    version: "g8-supplement@1",
    status: "proposed: provisional, unreviewed. Not loaded by the app. No answer to these questions can change an estimate or verify mastery until an educator review changes their status.",
    provenance:
      "Drafted by the development team with AI assistance (Claude) on 18 October 2026, for educator review. Written to the existing competency ids, difficulty ladders (content/english/items/progressions.json), question schemas and the item-bank rules. Difficulties are expert estimates, not calibrated. Prioritised by the coverage gaps in docs/product/essay-learning/ASSESSMENT_RETENTION.md (the 'two later checks' column). No existing or pilot question is replaced or reassigned.",
    proposedPools: proposedPools(items),
  };
  writeFileSync(join(SUPPLEMENT_DIR, "manifest.json"), JSON.stringify(m, null, 1) + "\n");
}

function csvCell(s: unknown): string {
  const t = String(s ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function writePackage(items: Code[], findings: Finding[]) {
  const ectx = loadAppEssayContext();
  const prog = loadProgressions();
  const manifest = loadSupplementManifest();
  const dir = join(REPO, "docs", "product", "essay-learning", "g8-supplement-v1");
  const name = (cap: string) => ectx.profile.byCapability.get(cap)?.name ?? cap;
  const keyOf = (i: Code): string => {
    const kind = i.format.split(":")[0];
    if (kind === "choice") return `${String.fromCharCode(65 + i.answer!)}. ${i.options![i.answer!]}`;
    if (kind === "typed") return i.answers!.join(" / ");
    if (kind === "multi") return i.answer_set!.map((k) => `${String.fromCharCode(65 + k)}. ${i.options![k]}`).join("; ");
    if (kind === "order") return i.answer_order!.map((k) => i.options![k]).join(" → ");
    return JSON.stringify(i.answer_pairs);
  };
  const justification = (i: Code) => {
    const step = prog.capabilities[i.target]?.steps.find((s) => s.id === i.step);
    return step ? `Ladder step "${step.id}" (band ${step.band}): ${step.feature} Estimated b ${i.b} (${i.b >= step.band ? "+" : ""}${(i.b - step.band).toFixed(2)} from the step). ${i.rationale}` : i.rationale ?? "";
  };
  const curriculum = (cap: string) =>
    (ectx.profile.byCapability.get(cap)?.curriculum ?? [])
      .filter((c) => c.scheme !== "openpath")
      .map((c) => `${c.scheme}${c.code ? `: ${c.code}` : ""}`)
      .join("; ");
  const flagsFor = (id: string) => findings.filter((f) => f.item === id).map((f) => `${f.check}: ${f.message}`);

  // CSV review form, one row per question
  const header = ["id", "competency_id", "competency", "curriculum_reference (indicative, unvalidated)", "step", "estimated_b", "proposed_use", "format", "prompt", "options", "answer_key", "misconception_tags", "rationale", "difficulty_justification", "automated_flags", "reviewer_key_correct (y/n)", "reviewer_unambiguous (y/n)", "reviewer_age_appropriate (y/n)", "reviewer_band (your estimate)", "reviewer_decision (approve/revise/reject)", "reviewer_comment", "reviewer_id", "review_date"];
  const rows = items.map((i) => [
    i.id,
    i.target,
    name(i.target),
    curriculum(i.target),
    i.step,
    i.b,
    manifest.proposedPools[i.id] === "retention" ? "delayed retention check" : "independent check",
    i.format,
    i.prompt,
    (i.options ?? []).map((o, k) => `${String.fromCharCode(65 + k)}. ${o}`).join(" | ") || (i.left ? `match ${i.left.join(", ")}` : ""),
    keyOf(i),
    [...new Set([...Object.values(i.distractor_tags ?? {}), ...Object.values(i.wrong ?? {}), ...(i.addresses ?? [])])].join(", "),
    i.rationale,
    justification(i),
    flagsFor(i.id).join(" | "),
    "", "", "", "", "", "", "", "",
  ]);
  writeFileSync(join(dir, "review-form.csv"), [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");

  // empty review record, in the pilot's review-record shape, for decisions once made
  writeFileSync(
    join(dir, "reviews.json"),
    JSON.stringify({ schema: "supplement-review@1", content_version: manifest.version, note: "Educator decisions go here, one record per question: { id, version, decision: approve|revise|reject, issues[], comment, reviewer, authority: 'educator', date }. Owner approval is not educator review. An approved question still needs its status changed in a separate, reviewed change.", records: [] }, null, 1) + "\n",
  );

  // Markdown package
  const byCap = new Map<string, Code[]>();
  for (const i of items) byCap.set(i.target, [...(byCap.get(i.target) ?? []), i]);
  const lines: string[] = [
    "# Educator review package: proposed Grade 8 supplement v1",
    "",
    `**${items.length} proposed questions**, \`${manifest.version}\`. ${manifest.status}`,
    "",
    `Provenance: ${manifest.provenance}`,
    "",
    "## What we ask a reviewer to decide, per question",
    "",
    "1. **Key**: is the keyed answer correct, and is every other option wrong for a Grade 8 learner of standard written English (Indian and British usage accepted)?",
    "2. **Unambiguous**: could a competent writer defend another answer? If so, revise or reject.",
    "3. **Competency**: does it test the named competency (and not mainly vocabulary or reading)?",
    "4. **Difficulty**: does the estimated band (b) fit? Write your own estimate. Band 5 ≈ age-typical secondary text, mostly accurate (indicatively CEFR B1); these targets are provisional.",
    "5. **Suitable**: language and context appropriate for 12–14-year-olds in India.",
    "6. **Decision**: approve, revise (say how) or reject.",
    "",
    "Use `review-form.csv` (one row per question) or comment here. Decisions are recorded in `reviews.json`. Nothing changes in the app until a separate change, reviewed in turn, marks approved questions as reviewed.",
    "",
    "## Automated checks (run: `node tools/english/supplement/main.ts --check`)",
    "",
    `Blocking problems: **${findings.filter((f) => f.severity === "blocking").length}**. Points for review: **${findings.filter((f) => f.severity === "review").length}**.`,
    "",
    ...(findings.length ? ["| Question | Check | Severity | Note |", "|---|---|---|---|", ...findings.map((f) => `| ${f.item} | ${f.check} | ${f.severity} | ${f.message.replace(/\|/g, "/")} |`)] : ["None."]),
    "",
    "The checks are mechanical: schema, bank rules, provisional status, duplicates, word-overlap near-duplicates (≥ 60%), answer leakage from lessons and existing questions, keyed-answer and tag consistency, and an age screen. They do not judge correctness or difficulty; that is the review.",
    "",
    "## Coverage",
    "",
    "| Competency | Questions | b range | Steps | Proposed: independent check / delayed check |",
    "|---|---:|---|---|---|",
    ...[...byCap].map(([cap, list]) => `| ${name(cap)} | ${list.length} | ${Math.min(...list.map((i) => i.b))}–${Math.max(...list.map((i) => i.b))} | ${[...new Set(list.map((i) => i.step))].join(", ")} | ${list.filter((i) => manifest.proposedPools[i.id] === "confirmation").length} / ${list.filter((i) => manifest.proposedPools[i.id] === "retention").length} |`),
    "",
  ];
  for (const [cap, list] of byCap) {
    lines.push(`## ${name(cap)} (\`${cap}\`)`, "", `Curriculum references (indicative, unvalidated): ${curriculum(cap) || "none"}.`, "");
    for (const i of list) {
      lines.push(`### ${i.id} · b ${i.b} · ${i.step} · ${manifest.proposedPools[i.id] === "retention" ? "delayed retention check" : "independent check"}`, "");
      lines.push(`**${i.prompt}**`, "");
      if (i.left) lines.push(`Match: ${i.left.join(", ")}`, "");
      (i.options ?? []).forEach((o, k) => lines.push(`- ${String.fromCharCode(65 + k)}. ${o}`));
      if (i.options) lines.push("");
      lines.push(`- **Key:** ${keyOf(i)}`);
      if (i.distractor_tags || i.wrong) lines.push(`- **Wrong answers show:** ${Object.entries({ ...(i.distractor_tags ?? {}), ...(i.wrong ?? {}) }).map(([k, v]) => `${/^\d+$/.test(k) && i.options ? String.fromCharCode(65 + Number(k)) : `"${k}"`} → ${v}`).join("; ")}`);
      lines.push(`- **Rationale:** ${i.rationale}`, `- **Difficulty justification:** ${justification(i)}`);
      const fl = flagsFor(i.id);
      if (fl.length) lines.push(`- **Automated flags:** ${fl.join("; ")}`);
      lines.push(`- **Reviewer:** key ☐ unambiguous ☐ suitable ☐ band ___ decision ___`, "");
    }
  }
  writeFileSync(join(dir, "REVIEW_PACKAGE.md"), lines.join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const items = loadSupplementItems().filter((i): i is Code => i.kind === "code");
  if (argv.includes("--manifest")) writeManifest(items);
  const { findings } = checkSupplement();
  const blocking = findings.filter((f) => f.severity === "blocking");
  if (argv.includes("--package")) writePackage(items, findings);
  console.log(`${items.length} proposed questions; ${blocking.length} blocking problem(s), ${findings.length - blocking.length} point(s) for review`);
  for (const f of findings) console.log(`  [${f.severity}] ${f.item} ${f.check}: ${f.message}`);
  if (argv.includes("--check") && blocking.length) process.exit(1);
}

// re-exported for tests
export { viewFor, indexContent };
