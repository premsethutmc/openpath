/** Writes docs/integration/04-TRACES.md's stage table from a REAL run (real clock) + the persistence round-trip report. */
import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
const rep = JSON.parse(readFileSync(`${dir}/stored.report.json`, "utf8"));
const tr = JSON.parse(readFileSync(`${dir}/events.trace.json`, "utf8"));
const T = tr.trace as any[], ev = JSON.parse(readFileSync(`${dir}/events.json`, "utf8")) as any[];
const f = { frames: tr.frames as any[] };
const atts = ev.filter((e) => e.record === "attempt") as any[];
const id = (i: number) => atts[i]?.id;
const checkAtt = atts.find((a) => a.activity === "check");
const first = (c: string, d?: string) => T.find((t) => t.component === c && (!d || t.decides === d))!;
const j = (x: unknown, n = 150) => "`" + JSON.stringify(x).replace(/\|/g, "/").slice(0, n) + "`";
const q = "gen:lin:2,17,11";
const g1 = first("server-grader.gradeRequest"), inv = first("hypotheses.investigationTrigger"), mod = first("intervention.moduleState", "teaching-selection"), el = first("teaching-contract.teachingEligibility");
const teachFrames = f.frames.filter((x) => x.stage === "teaching");
const check = T.filter((t) => t.component === "intervention.moduleState").find((t) => (t.output as any).phase === "check")!;
const checkGrade = T[T.indexOf(check) + 1];
const rows = [
  ["1 open question", "renderer", "`renderer-adapter.questionSpec` + `LearningScreen`", `{qid:"${q}"}`, "RenderSpec: prompt, numeric input, feedback level none", "none (view only)", "none: interaction events are not stored"],
  ["2 incorrect answer submitted", "renderer (event only)", "`LearningScreen` -> `RendererEvent answer_submitted` -> `SliceFlow.on`", `{value:"22"}`, "forwarded to the grader; renderer decides nothing", "none", "none"],
  ["3 authorized grader evaluates", "mathematical grader", "`server-grader.gradeRequest` (Django: `kernel_grader.grader_decision` via `checked_learning`)", j(g1.input), j(g1.output), `attempt ${id(0)}; decision \`grading-decision@1\` (slice: \`dec:${id(0)}\`; Django: server decisionId, decidedBy server)`, "attempt body (with decision) in `PupilEvent`; decision log (`family/decisions.py`)"],
  ["4 evidence engine records", "evidence engine", "`session.make.attempt` + `session.learnerState` / `evidence.evidenceFor`", `{attempt ${id(0)}}`, j(T[T.indexOf(g1) + 1].output), `attempt ${id(0)}`, "attempt event in `PupilEvent` (rebuilt identically in a new process: see 3 below); evidence itself is derived, not stored"],
  ["5 investigation justified?", "adaptive engine (reads evidence engine's trigger)", "`hypotheses.investigationTrigger` then `intervention.moduleState` (phase explore)", `{attempt ${id(0)}}`, j(inv.output) + " then " + j((T[T.indexOf(inv) + 1].output as any).phase), "derived from attempt " + id(0), "none (a pure function of the stored records)"],
  ["6 eligible explanation selected", "adaptive engine", "`intervention.moduleState` (chapter) + `teaching-contract.teachingEligibility`", `{competency}`, j(mod.output, 130) + " eligibility " + j(el.output), "strategy `" + (mod.output as any).strategy + "`", "derived; the delivery is stored as the `teach` record (stage 7)"],
  ["7 renderer shows it progressively", "renderer (display only)", "`renderer-adapter.teachingSpec`, `WorkingPanel`/`AlgebraWorkspace`", `{strategy, revealed 1..${teachFrames.length}}`, `${teachFrames.length} frames, revealedCount ${teachFrames.map((x) => x.revealed).join(",")}; steps verified=false, badge "explanation"`, "teach record after the last step", "`teach` record in `PupilEvent` (sameTeaches: " + rep.sameTeaches + ")"],
  ["8 independent recheck", "mathematical grader decides; adaptive engine asks", "`moduleState` (check) then `gradeRequest`", j(check.output, 120), j(checkGrade.output), "attempt " + checkAtt?.id + " (activity check)", "attempt events as in 4; counted independent by the evidence engine only for an unaided first attempt"],
  ["9 history preserved", "evidence engine", "`learnerState` rebuilt from events read back by a fresh login", `{${rep.attemptsStored} stored attempts}`, `sameAttempts ${rep.sameAttempts}, sameTeaches ${rep.sameTeaches}, serverVerdictsMatchSlice ${rep.serverVerdictsMatchSlice}, allDecidedByServer ${rep.allDecidedByServer}`, "ids " + rep.ids.slice(0, 3).join(", ") + " ...", "Django `PupilEvent` + decisions log (verified across two requests/clients/processes)"],
  ["10 retention scheduled", "evidence engine under the adaptive policy (retention@2)", "`evidence.evidenceFor` -> `retention`, `retentionDueAt`, `retentionHistory`", "independent attempts", `retention ${rep.fromStore.retention}; independentAt ${rep.fromStore.independentAt}; due ${rep.fromStore.due}; due - independentAt = ${rep.dueMinusIndependentDays} days; due - now = ${rep.daysFromNowToDue} days (clock ${rep.clockNow})`, "no scheduling event is stored", "derived at read time from the stored independent attempts (+7 days, `RETENTION_DAYS`); history `pending`"],
];
const md = ["| stage | authority | component invoked | input | output | event / evidence id | persistence |", "|---|---|---|---|---|---|---|", ...rows.map((r) => "| " + r.join(" | ") + " |")].join("\n");
writeFileSync(process.argv[3], md + "\n");
console.log("rows", rows.length);
