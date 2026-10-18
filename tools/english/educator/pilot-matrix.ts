/**
 * Three-competency pilot coverage matrix (educator validation v1).
 *
 *   node tools/english/educator/pilot-matrix.ts          JSON
 *   node tools/english/educator/pilot-matrix.ts --md     the Markdown used in the docs
 *
 * For each pilot competency (the three Grade 8 competencies that have lessons in the app), the eight stages of one
 * complete learning sequence, with the content each needs, what the bank supplies now, and what it would supply if
 * an educator approved the proposed supplement. Questions are taken stage by stage for one learner through the
 * existing allocation (allocation.ts), so a question used in one stage is not counted again in another.
 *
 * A competency is pilot-ready only if every stage has enough eligible content AND that content has been reviewed by
 * an educator AND the essay evaluator that observes it has been validated. None of these holds today.
 */
import { allocateItems, type EssayContext, type ItemRole, patternEssayEvaluator } from "../../../packages/english-core/src/index.ts";
import { loadAppEssayContext } from "../essay-load.ts";
import { loadContextWithSupplement } from "../supplement/load.ts";
import { PILOT_COMPETENCIES } from "./review.ts";

export interface Stage {
  stage: string;
  needs: string;
  required: number;
  now: { count: number; items: string[] };
  ifSupplementApproved: { count: number; items: string[] };
  note: string;
}

/** Stage-by-stage questions for one learner, each stage excluding what the earlier stages took. */
function sequence(ectx: EssayContext, cap: string) {
  const p = ectx.policy;
  const used = new Set<string>();
  const take = (role: ItemRole, n: number) => {
    const ids = allocateItems(ectx, [], cap, { exclude: used }).available[role].slice(0, n);
    ids.forEach((i) => used.add(i));
    return ids;
  };
  const diagnostic = take("diagnostic", p.diagnosticItems);
  const practice = take("guided_practice", p.guidedItems);
  // the retention reserve is kept back first, so the checks below cannot take it
  const retention = allocateItems(ectx, [], cap, { exclude: used }).reserved.delayed_retention.slice(0, p.retentionItems);
  retention.forEach((i) => used.add(i));
  const check = take("independent_verification", p.checkItems);
  const later = take("independent_verification", p.checkItems * p.followUpChecks);
  return { diagnostic, practice, check, later, retention };
}

export function pilotMatrix() {
  const now = loadAppEssayContext();
  const approved = loadContextWithSupplement({ asIfReviewed: true });
  const p = now.policy;
  const patterns = patternEssayEvaluator();
  return PILOT_COMPETENCIES.map((cap) => {
    const a = sequence(now, cap);
    const b = sequence(approved, cap);
    const lessons = now.lessons.get(cap) ?? [];
    const name = now.profile.byCapability.get(cap)?.name ?? cap;
    const patternCovers = cap !== "EN.GRM.VERB.present_past_simple"; // the pattern stand-in has rules for agreement and a/an only
    const q = (x: string[]) => ({ count: x.length, items: x });
    const stages: Stage[] = [
      { stage: "1. Essay-derived observation", needs: "an essay evaluator validated for this competency", required: 1, now: { count: 0, items: [] }, ifSupplementApproved: { count: 0, items: [] }, note: `The LLM evaluator has not been run or measured. ${patternCovers ? `The pattern stand-in (${patterns.id}) has a few fixed rules for it (recall 0.11 overall on the synthetic benchmark): a demonstration tool, not an assessment.` : "The pattern stand-in has no rule for it."} Validation material: the essay benchmark (essay-validation-v1).` },
      { stage: "2. Diagnostic verification", needs: `${p.diagnosticItems} unseen questions near the target (at least ${p.diagnosticMinIndependent} answered without help)`, required: p.diagnosticItems, now: q(a.diagnostic), ifSupplementApproved: q(b.diagnostic), note: "Diagnosis-pool questions; at least one right answer near the target is needed to rule a gap out." },
      { stage: "3. Targeted instruction", needs: "at least one lesson", required: 1, now: { count: lessons.length, items: lessons }, ifSupplementApproved: { count: lessons.length, items: lessons }, note: "Candidate lessons (content/english/web/lessons.json), not yet educator-reviewed." },
      { stage: "4. Guided practice", needs: `${p.guidedItems} practice questions (below the target, or practice-pool)`, required: p.guidedItems, now: q(a.practice), ifSupplementApproved: q(b.practice), note: "Answers with help are held: practice is never evidence." },
      { stage: "5. Independent assessment", needs: `${p.checkItems} unseen questions between band 5 and 6.5, in a new sitting`, required: p.checkItems, now: q(a.check), ifSupplementApproved: q(b.check), note: "The journey's check." },
      { stage: "6. Subsequent verification", needs: `up to ${p.followUpChecks} later checks of ${p.checkItems} (${p.checkItems * p.followUpChecks} questions), spaced ${p.followUpSpacingDays.join(", ")} days`, required: p.checkItems * p.followUpChecks, now: q(a.later), ifSupplementApproved: q(b.later), note: "Needed only while the target is not shown; the full allowance is counted." },
      { stage: "7. Delayed retention", needs: `${p.retentionItems} questions kept back, asked at least ${p.retentionDelayDays} days after the target is first shown`, required: p.retentionItems, now: q(a.retention), ifSupplementApproved: q(b.retention), note: "Judged by the engine's own retention rule." },
      { stage: "8. Transfer into a later writing task", needs: "a later essay (and the 50-word rewrite) observed by a validated evaluator", required: 1, now: { count: 0, items: [] }, ifSupplementApproved: { count: 0, items: [] }, note: "The second essay's observations are tentative and the rewrite is transfer evidence only; both depend on the unvalidated evaluator. The rewrite judge (LLM) is unmeasured." },
    ];
    const contentStages = stages.slice(1, 7);
    const sufficientNow = contentStages.every((s) => s.now.count >= s.required);
    const sufficientIfApproved = contentStages.every((s) => s.ifSupplementApproved.count >= s.required);
    // a narrower pilot option: one later check (checkItems questions) instead of the full allowance
    const oneLater = (pick: (s: Stage) => number) => contentStages.every((s) => pick(s) >= (s.stage.startsWith("6.") ? p.checkItems : s.required));
    const sufficientWithOneLaterCheck = { now: oneLater((s) => s.now.count), ifSupplementApproved: oneLater((s) => s.ifSupplementApproved.count) };
    const approvalItems = [...new Set(contentStages.flatMap((s) => s.ifSupplementApproved.items).filter((i) => !lessons.includes(i)))];
    return {
      competency: cap,
      name,
      target: now.profile.byCapability.get(cap)?.expectedBand ?? null,
      stages,
      contentSufficientNow: sufficientNow,
      contentSufficientIfSupplementApproved: sufficientIfApproved,
      sufficientWithOneLaterCheck,
      pilotReady: false,
      notReadyBecause: [
        ...(sufficientNow ? [] : [`not enough eligible questions now (${contentStages.filter((s) => s.now.count < s.required).map((s) => s.stage.replace(/^\d\. /, "")).join(", ")})`]),
        ...(sufficientIfApproved ? [] : ["still short even with the supplement approved"]),
        "no question or lesson has been reviewed by an educator",
        "the essay evaluator (observation and transfer stages) has not been validated",
      ],
      requiresEducatorApproval: { questions: approvalItems, supplementQuestions: approvalItems.filter((i) => i.startsWith("sup.")), lessons },
    };
  });
}

function markdown(rows: ReturnType<typeof pilotMatrix>): string {
  const out: string[] = [];
  const cell = (s: { count: number }, req: number) => `${s.count}/${req}${s.count >= req ? "" : " ✗"}`;
  out.push("| Competency | Stage | Needs | Now | If the supplement is approved |", "|---|---|---|---:|---:|");
  for (const r of rows) for (const s of r.stages) out.push(`| ${r.name} | ${s.stage} | ${s.needs} | ${cell(s.now, s.required)} | ${cell(s.ifSupplementApproved, s.required)} |`);
  out.push("");
  for (const r of rows) {
    out.push(
      `**${r.name}** (\`${r.competency}\`): pilot-ready: **no**. ${r.notReadyBecause.join("; ")}.`,
      "",
      `Content sufficient for the full sequence (three later checks allowed) now: ${r.contentSufficientNow ? "yes" : "no"}; if the supplement is approved: ${r.contentSufficientIfSupplementApproved ? "yes" : "no"}. With the pilot limited to one later check: now ${r.sufficientWithOneLaterCheck.now ? "yes" : "no"}; if the supplement is approved: ${r.sufficientWithOneLaterCheck.ifSupplementApproved ? "yes" : "no"}.`,
      "",
      `Requires educator approval for one complete sequence: ${r.requiresEducatorApproval.questions.length} questions (${r.requiresEducatorApproval.supplementQuestions.length} from the supplement): ${r.requiresEducatorApproval.questions.join(", ")}; and ${r.requiresEducatorApproval.lessons.length} lessons: ${r.requiresEducatorApproval.lessons.join(", ")}.`,
      "",
    );
  }
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = pilotMatrix();
  console.log(process.argv.includes("--md") ? markdown(rows) : JSON.stringify(rows, null, 1));
}
