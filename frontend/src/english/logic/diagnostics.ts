/**
 * The developer's diagnostic of one pupil: what the engine knows, why it decided what it did, and what looks wrong.
 *
 * Everything is computed by the existing engine from the pupil's own events, exactly as the app computes it:
 *   fold (Ledger.rebuild)  the Learner Vector, decisions and exposures
 *   learnerProfile         standings, evidence by kind, Today and the development plan
 *   Learner.start/current  the next question each activity would show, on an in-memory copy that is thrown away
 * Nothing here scores, estimates or plans anything itself, and nothing is written to the pupil's record.
 *
 * Decision traces are those recorded when the decision was made (`trace` events). Where a question or session
 * predates tracing, it is labelled "not recorded"; no explanation is reconstructed for it.
 */
import { itemVersion, leafView, scoreCode, type CodeItem, type Decision, type Item, type Response } from "../../../../packages/english-core/src/index.ts";
import type { AppContent } from "./content.ts";
import { type AppEvent, type AttemptEvent, type PlanTrace, type SelectionTrace, type TraceEvent, eventProblem } from "./events.ts";
import { Learner } from "./learner.ts";
import { learnerProfile } from "./profile.ts";
import { placementDone, fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";
import { APP_BUILD, muted } from "./telemetry.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const NOT_RECORDED = "decision details not recorded (this happened before decision tracing existed)";
const ASSESS = new Set(["placement", "check", "spelling_check", "spelling_transfer"]);
const r2 = (x: number) => Math.round(x * 100) / 100;
const short = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export interface DiagnosticInput {
  pupil: { id: string; name: string; own?: boolean };
  events: AppEvent[];
  now: string;
  /** The server's commit, when the record came from the API. */
  serverCommit?: string;
}

export interface Issue {
  severity: "high" | "medium" | "low" | "info";
  check: string;
  detail: string;
}

export interface TimelineQuestion {
  kind: "question";
  at: string;
  session: string;
  sessionType: string;
  item: string;
  capability: string | null;
  difficulty: number | null;
  purpose: string;
  /** What the engine knew and weighed when it chose this question, as recorded then; null when not recorded. */
  selection: SelectionTrace | null;
  selectionStatus: "recorded" | typeof NOT_RECORDED;
  answer: { correct: boolean; kind: string; text: string; misconceptions: string[]; tries: number } | null;
  /** How the first, unhelped answer moved the Learner Vector (the ledger's own decision). */
  effect: { capability: string | null; verdict: string; reasons: string[]; before: { mean: number; sd: number } | null; after: { mean: number; sd: number } | null; inferred: { capability: string; shift: number }[] } | null;
  /** Difficulty minus the estimate just before the answer (positive: harder than the learner's estimate). */
  difficultyVsEstimate: number | null;
  /** Compared with the previous question in the same session (facts only). */
  next: string | null;
}

export interface TimelineSession {
  kind: "session";
  at: string;
  session: string;
  type: string;
  capability: string | null;
  purpose: string | null;
  ended: string | null;
  /** What Today offered when this was started, as recorded then; null when not recorded. */
  plan: PlanTrace | null;
  planStatus: "recorded" | typeof NOT_RECORDED;
  /** Compared with the previous recorded plan (facts only). */
  planChange: string | null;
}

export type TimelineEntry = TimelineSession | TimelineQuestion;

export interface Diagnosis {
  generated_at: string;
  read_only: true;
  versions: { app_build: string; server_commit: string | null; framework: string; development_policy: string; content_status: string };
  pupil: { label: string; id: string; preferences: { band: string; goal: string } | null; consent_scope: string | null; flags: number };
  counts: Any;
  placement_done: boolean;
  learner_vector: Any[];
  evidence: { capability: string; name: string; answers: Any[] }[];
  misconceptions_and_gaps: Any[];
  independent_vs_assisted: Record<string, { n: number; right: number }>;
  retention: Any[];
  today: Any[];
  plan: { policy: string; all: Any[]; for_adults: Any[] };
  next_questions: Any[];
  unknown_and_shortages: Any;
  tracing: { questions: number; traced: number; sessions: number; plansTraced: number; firstTraceAt: string | null };
  timeline: TimelineEntry[];
  issues: Issue[];
}

function answerText(it: Any, resp: Any): string {
  if (!resp) return "";
  if (resp.kind === "typed") return String(resp.text ?? "");
  if (resp.kind === "choice") return it?.options?.[resp.choice] ?? String(resp.choice);
  if (resp.kind === "multi") return (resp.choices ?? []).map((k: number) => it?.options?.[k]).join(" + ");
  if (resp.kind === "order") return (resp.order ?? []).map((k: number) => it?.options?.[k]).join(" ");
  if (resp.kind === "match") return (resp.pairs ?? []).map((k: number, i: number) => `${it?.left?.[i]}→${it?.options?.[k]}`).join("; ");
  return JSON.stringify(resp);
}
const keyText = (it: Any): string => (it?.answers ? it.answers[0] : it?.options && it.answer !== undefined ? it.options[it.answer] : it?.answer_set ? it.answer_set.map((k: number) => it.options[k]).join(" + ") : "");
const tally = <T,>(xs: T[], key: (x: T) => string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const x of xs) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return out;
};
const AREA = (id: string) => (id.startsWith("EN.FND.SPL") ? "spelling" : id.startsWith("EN.GRM") || id.startsWith("EN.SEN") ? "grammar" : id.startsWith("EN.VOC") ? "vocabulary" : id.startsWith("EN.RDG") ? "reading" : "other");

/** Run the whole diagnostic. Read-only: the input events are never changed and nothing is saved. */
/** A trace whose shape the dashboard can show (traces come from any app version, or from a shared family's record). */
function wellFormed(e: TraceEvent): boolean {
  const t = e.selection;
  if (t && (typeof t !== "object" || !["engine", "queue", "planner"].includes(t.selector) || (t.alternatives !== undefined && !Array.isArray(t.alternatives)) || (t.knew !== undefined && !Array.isArray(t.knew)) || (t.chosen !== undefined && !Array.isArray(t.chosen?.reasons)) || (t.bankGaps !== undefined && !Array.isArray(t.bankGaps)))) return false;
  const p = e.plan;
  if (p && (typeof p !== "object" || !Array.isArray(p.offered) || typeof p.standings !== "object" || p.standings === null)) return false;
  return true;
}

export async function diagnose(c: AppContent, input: DiagnosticInput): Promise<Diagnosis> {
  // events the app itself would refuse on import, and malformed traces, are left out and reported, never trusted
  const rejected = input.events.map((e) => [e, eventProblem(e) ?? (e.kind === "trace" && !wellFormed(e) ? `trace ${e.id} is malformed` : null)] as const).filter(([, p]) => p);
  const events = rejected.length ? input.events.filter((e) => !rejected.some(([r]) => r === e)) : input.events;
  const now = input.now;
  const s = fold(c, events);
  const profile = learnerProfile(s, c, now);
  const item = (id: string): Any => c.ctx.content.items.get(id);
  const pool = (id: string) => c.pilot.pools.get(id)?.pool ?? null;

  // ------------------------------------------------------------ counts and kinds of evidence
  const sessions = [...s.sessions.values()];
  const byType: Record<string, { sessions: number; finished: number }> = {};
  for (const x of sessions) {
    const t = x.event.type === "check" ? `check:${x.event.purpose ?? "assess"}` : x.event.type;
    byType[t] ??= { sessions: 0, finished: 0 };
    byType[t].sessions++;
    if (x.end) byType[t].finished++;
  }
  const attempts = events.filter((e): e is AttemptEvent => e.kind === "attempt");
  const first = attempts.filter((a) => !a.assisted);
  const decisionBy = new Map<string, Decision>(s.ledger.decisions.filter((d) => d.observation).map((d) => [d.source, d]));
  const classify = (a: AttemptEvent): string => {
    const d = a.evidence ? decisionBy.get(a.evidence) : undefined;
    if (!a.evidence || a.assisted) return "assisted";
    if (!d) return "no_decision";
    if (d.verdict === "held") return d.observation?.samePassage ? "held_same_passage" : d.reasons.some((r) => r.includes("generated item")) ? "held_practice_word" : d.reasons.some((r) => r.includes("provisional")) ? "held_provisional" : "held_assisted";
    if (d.verdict !== "accepted") return d.verdict;
    if (d.observation?.exposure === "repeat") return "repeat";
    if (d.observation?.setting === "after_teaching") return "after_teaching";
    return "independent";
  };
  const kinds: Record<string, { n: number; right: number }> = {};
  for (const a of attempts) {
    const k = classify(a);
    kinds[k] ??= { n: 0, right: 0 };
    kinds[k].n++;
    kinds[k].right += a.correct ? 1 : 0;
  }
  const counts = {
    events: events.length,
    events_by_kind: tally(events, (e) => e.kind),
    sessions: sessions.length,
    sessions_by_type: byType,
    assessments: sessions.filter((x) => ASSESS.has(x.event.type)).length,
    assessments_finished: sessions.filter((x) => ASSESS.has(x.event.type) && x.end).length,
    questions_answered: new Set(first.map((a) => `${a.session}|${a.item.id}`)).size,
    first_attempts: { total: first.length, correct: first.filter((a) => a.correct).length, incorrect: first.filter((a) => !a.correct).length },
    second_tries_or_help: attempts.filter((a) => a.assisted).length,
    lessons_completed: [...s.lessons.values()].map((l) => ({ lesson: l.lesson, at: l.at, quick_check_right: l.checkCorrect })),
    first_event_at: events[0]?.at ?? null,
    last_event_at: events.at(-1)?.at ?? null,
  };

  // ------------------------------------------------------------ evidence per answer
  const answersByCap = new Map<string, Any[]>();
  for (const a of attempts) {
    const it = item(a.item.id);
    if (!it || it.kind !== "code") continue;
    const d = a.evidence ? decisionBy.get(a.evidence) : undefined;
    const row = {
      at: a.at,
      session_type: s.sessions.get(a.session)?.event.type ?? null,
      item: a.item.id,
      version: a.item.version,
      pool: pool(a.item.id),
      difficulty: it.b,
      difficulty_vs_estimate_before: d?.before ? r2(it.b - d.before.mean) : null,
      format: it.format,
      prompt: short(it.prompt ?? ""),
      passage: it.passage ?? null,
      answer: answerText(it, a.response),
      key: keyText(it),
      correct: a.correct,
      misconceptions: a.misconceptions,
      evidence_kind: classify(a),
      estimate_change: d?.before && d?.after ? { from: r2(d.before.mean), to: r2(d.after.mean), sd_from: r2(d.before.sd), sd_to: r2(d.after.sd) } : null,
    };
    answersByCap.set(it.target, [...(answersByCap.get(it.target) ?? []), row]);
  }

  // ------------------------------------------------------------ the Learner Vector (leafView: the engine's own view)
  const caps = profile.capabilities.map((x) => {
    const v = leafView(s.ledger.composite, c.index, x.id, now);
    const node: Any = s.ledger.composite.nodes[x.id] ?? {};
    return {
      id: x.id,
      name: x.name,
      area: x.strand,
      standing: x.standing,
      certainty: x.estimate.certainty,
      estimate: { mean: r2(v.mean), sd: r2(v.sd), range_80: [r2(v.mean - 1.2816 * v.sd), r2(v.mean + 1.2816 * v.sd)] },
      direct: { mean: r2(v.direct.mean), sd: r2(v.direct.sd), n: v.direct.n },
      inferred_from_related_skills: v.inferred,
      engine_stage: v.stage,
      demonstrated_level: v.demonstrated,
      shown_level_reported: x.shownLevel,
      verification: v.verification,
      retention: { status: v.retention.status, due: v.retention.dueAt, checks: v.retention.checks.length },
      qualifying_answers: node.qualifyingN ?? node.directN ?? 0,
      contexts: (node.qualifyingContexts ?? node.contexts ?? []) as string[],
      misconceptions: v.misconceptions.map((m) => ({ id: m.id, strength: r2(m.strength) })),
      evidence: x.evidence,
      passages: x.passages,
      difficulties: x.difficulties,
      notes: x.notes,
      content_left: x.content,
      answers: answersByCap.get(x.id) ?? [],
    };
  });
  const withEvidence = caps.filter((x) => x.answers.length > 0);
  const touched = caps.filter((x) => x.answers.length === 0 && x.inferred_from_related_skills);

  // ------------------------------------------------------------ Today and the plan
  const today = profile.activities.map((a) => ({
    kind: a.kind,
    title: a.title,
    child_line: a.line,
    session: a.step,
    planner_action: a.recommendation?.action ?? null,
    capability: a.step.capability ?? null,
    priority: a.recommendation?.priority ?? null,
    why: a.recommendation?.why ?? a.step.reason,
    would_change_if: a.recommendation?.changeIf ?? null,
    evidence_ids: a.recommendation?.evidence.flatMap((e) => e.ids) ?? [],
    content: a.recommendation?.content ?? null,
  }));
  const plan = {
    policy: profile.plan.policy,
    all: profile.plan.all.map((r) => ({ action: r.action, capability: r.capability, priority: r.priority, what: r.what, available: r.content.available })),
    for_adults: profile.plan.forAdults.map((r) => ({ action: r.action, capability: r.capability, what: r.what, why: r.why })),
  };

  // ------------------------------------------------------------ the next question each activity would show (the app itself, on a throwaway copy)
  const nextQuestions: Any[] = [];
  for (const t of today) {
    const out: Any = { activity: t.title, session: t.session };
    try {
      await muted(async () => {
        const copy = new MemoryRepo();
        await copy.replaceAll(input.pupil.id, structuredClone(events));
        const l = await Learner.open(c, copy, input.pupil.id, () => now);
        const cur = await l.start(t.session);
        if (cur.lesson) out.first = { lesson: cur.lesson.id, note: "a lesson is shown first; the questions are chosen after it" };
        else if (cur.next) {
          const it = cur.next.item as Any;
          const cap = it.kind === "code" ? it.target : null;
          const est = cap ? caps.find((k) => k.id === cap)?.estimate.mean : undefined;
          out.first = { item: it.id, capability: cap, difficulty: it.b ?? null, pool: pool(it.id), prompt: short(it.prompt ?? ""), difficulty_vs_estimate: est !== undefined && it.b !== undefined ? r2(it.b - est) : null };
          out.selection = cur.next.trace ?? null;
        } else out.first = null;
      });
    } catch (e) {
      out.error = e instanceof Error ? e.message : String(e);
    }
    nextQuestions.push(out);
  }

  // ------------------------------------------------------------ what is unknown, and content shortages
  const gaps = new Map<string, Any>();
  for (const n of nextQuestions) for (const g of n.selection?.bankGaps ?? []) gaps.set(g.capability, g);
  const unknown = {
    never_checked: caps.filter((x) => x.standing === "not_checked").length,
    never_checked_by_area: tally(caps.filter((x) => x.standing === "not_checked"), (x) => AREA(x.id)),
    too_little_evidence: caps.filter((x) => x.standing === "uncertain" || x.standing === "developing").map((x) => `${x.name} (${x.evidence.independent} independent answers)`),
    no_retention_check_yet: caps.filter((x) => x.answers.length && x.retention.checks === 0).length,
    moved_only_by_related_skills: touched.map((x) => `${x.name}: ${x.estimate.mean} ± ${x.estimate.sd}`),
    no_unused_questions_left: caps.filter((x) => x.standing !== "not_checked" && x.content_left.assess === 0).map((x) => x.name),
    no_teaching_activity: caps.filter((x) => (x.standing === "found_hard" || x.standing === "not_kept") && !x.content_left.teach).map((x) => x.name),
    bank_gaps_reported_by_engine: [...gaps.values()],
  };

  // ------------------------------------------------------------ decision timeline (recorded traces only)
  const timeline: TimelineEntry[] = [];
  const traceFor = new Map<string, TraceEvent>();
  for (const e of events) if (e.kind === "trace" && e.presented) traceFor.set(e.presented, e);
  let pendingPlan: PlanTrace | null = null;
  let lastPlan: PlanTrace | null = null;
  const lastInSession = new Map<string, TimelineQuestion>();
  for (const e of events) {
    if (e.kind === "trace" && e.plan) pendingPlan = e.plan;
    else if (e.kind === "session") {
      const st = s.sessions.get(e.session);
      const planTrace = pendingPlan;
      pendingPlan = null;
      let change: string | null = null;
      if (planTrace && lastPlan) change = planChange(lastPlan, planTrace);
      if (planTrace) lastPlan = planTrace;
      timeline.push({ kind: "session", at: e.at, session: e.session, type: e.type, capability: e.capability ?? null, purpose: e.purpose ?? null, ended: st?.end?.reason ?? null, plan: planTrace, planStatus: planTrace ? "recorded" : NOT_RECORDED, planChange: change });
    } else if (e.kind === "presented") {
      const it = item(e.item.id);
      const tr = traceFor.get(e.id);
      const tries = attempts.filter((a) => a.session === e.session && a.item.id === e.item.id);
      const firstTry = tries[0];
      const d = firstTry?.evidence ? decisionBy.get(firstTry.evidence) : undefined;
      const cap = it && it.kind !== "writing" ? (it.target as string) : null;
      const q: TimelineQuestion = {
        kind: "question",
        at: e.at,
        session: e.session,
        sessionType: s.sessions.get(e.session)?.event.type ?? "unknown",
        item: e.item.id,
        capability: cap,
        difficulty: it?.kind === "code" ? it.b : null,
        purpose: e.purpose ?? "unknown",
        selection: tr?.selection ?? null,
        selectionStatus: tr?.selection ? "recorded" : NOT_RECORDED,
        answer: firstTry ? { correct: firstTry.correct, kind: classify(firstTry), text: short(answerText(it, firstTry.response), 60), misconceptions: firstTry.misconceptions, tries: tries.length } : null,
        effect: d ? { capability: d.capability, verdict: d.verdict, reasons: d.reasons, before: d.before ? { mean: r2(d.before.mean), sd: r2(d.before.sd) } : null, after: d.after ? { mean: r2(d.after.mean), sd: r2(d.after.sd) } : null, inferred: (d.inferred ?? []).slice(0, 5).map((x) => ({ capability: x.capability, shift: r2(x.shift) })) } : null,
        difficultyVsEstimate: d?.before && it?.kind === "code" ? r2(it.b - d.before.mean) : null,
        next: null,
      };
      const prev = lastInSession.get(e.session);
      if (prev) prev.next = prev.capability === q.capability ? `the next question stayed on ${q.capability}` : `the next question moved from ${prev.capability} to ${q.capability}${q.selection?.chosen ? ` (recorded reason: ${q.selection.chosen.reasons.slice(0, 2).join("; ") || "highest score"})` : ""}`;
      lastInSession.set(e.session, q);
      timeline.push(q);
    }
  }
  const qs = timeline.filter((x): x is TimelineQuestion => x.kind === "question");
  const ss = timeline.filter((x): x is TimelineSession => x.kind === "session");
  const tracing = { questions: qs.length, traced: qs.filter((x) => x.selection).length, sessions: ss.length, plansTraced: ss.filter((x) => x.plan).length, firstTraceAt: events.find((e) => e.kind === "trace")?.at ?? null };

  // ------------------------------------------------------------ consistency checks
  const issues: Issue[] = [];
  const flag = (severity: Issue["severity"], check: string, detail: string) => issues.push({ severity, check, detail });
  if (rejected.length) flag("high", "malformed events", `${rejected.length} event(s) left out of this diagnosis: ${rejected.slice(0, 3).map(([, p]) => p).join("; ")}`);
  for (const a of attempts) {
    const it = item(a.item.id);
    if (!it || it.kind !== "code") {
      flag("medium", "unknown item", `${a.item.id} is not in the current content`);
      continue;
    }
    if (it.version !== a.item.version) flag("low", "item version", `${a.item.id} answered at v${a.item.version}, now v${it.version}`);
    const asked = (itemVersion(c.ctx.content, a.item.id, a.item.version) ?? it) as Item;
    if (asked.kind === "code") {
      const ok = scoreCode(asked as CodeItem, a.response as Response).correct;
      if (ok !== a.correct) flag("high", "rescoring", `${a.item.id}: recorded ${a.correct ? "right" : "wrong"}, the scoring code says ${ok ? "right" : "wrong"} now`);
    }
  }
  for (const a of attempts) {
    const p = pool(a.item.id);
    if (!p) continue;
    const ev = s.sessions.get(a.session)?.event;
    const use = ev?.type === "check" ? (ev.purpose === "confirm" ? "confirmation" : ev.purpose === "retention" ? "retention" : "diagnosis") : ev?.type === "guided" || ev?.type === "explore" || ev?.type === "spelling_practice" ? "practice" : "diagnosis";
    if (p !== use) flag("medium", "pool use", `${a.item.id} (${p}) asked in a ${ev?.type}${ev?.purpose ? `:${ev.purpose}` : ""} session`);
  }
  const counted = new Map<string, number>();
  for (const d of s.ledger.decisions)
    if (d.verdict === "accepted" && d.observation && d.observation.exposure !== "repeat") {
      const it = item(d.observation.item);
      if (it?.passage) counted.set(`${it.passage}#${it.target}`, (counted.get(`${it.passage}#${it.target}`) ?? 0) + 1);
    }
  for (const [k, n] of counted) if (n > 1) flag("medium", "passage counted twice", `${k}: ${n} counted answers`);
  const minDirect = c.index.framework.policy.demonstrated_min_direct;
  for (const x of caps) {
    const shown = x.standing === "shown" || x.standing === "confirmed";
    if (shown && x.evidence.independent < minDirect) flag("high", "shown claim", `${x.name} is ${x.standing} with ${x.evidence.independent} independent answers`);
    if (shown && x.evidence.independentRight * 2 < x.evidence.independent) flag("medium", "shown claim", `${x.name} is ${x.standing} with only ${x.evidence.independentRight}/${x.evidence.independent} right independently (the engine weighs difficulty: check the items)`);
    if (x.standing === "improving" && x.evidence.independent >= 3 && x.evidence.independentRight * 2 < x.evidence.independent)
      flag("info", "standing label", `${x.name} reads "improving" (practice after a lesson ${x.evidence.afterTeachingRight}/${x.evidence.afterTeaching}) while independent answers were ${x.evidence.independentRight}/${x.evidence.independent}: correct under the draft policy, but a parent sees "improving", not "found hard"`);
  }
  const ev = events.filter((e) => e.kind === "evidence") as Any[];
  const noProv = ev.filter((e) => !e.provenance).length;
  const noPolicy = ev.filter((e) => e.provenance && !e.provenance.policies?.includes("passage@1")).length;
  if (noProv) flag("low", "provenance", `${noProv} evidence events without provenance (recorded by an older app?)`);
  if (noPolicy) flag("low", "passage policy", `${noPolicy} evidence events without passage@1 (recorded before it existed)`);
  for (let i = 1; i < events.length; i++) if (events[i].at < events[i - 1].at) flag("low", "event order", `event ${i} (${events[i].kind}) is dated earlier than the one before it`);
  const future = events.filter((e) => e.at > now).length;
  if (future) flag("medium", "clock", `${future} events are dated in the future (a test clock?)`);
  for (const t of today) if (t.content && !t.content.available) flag("medium", "plan", `${t.title} is offered but marked unavailable: ${t.content.note}`);
  for (const n of nextQuestions) {
    const f = n.first;
    if (f?.difficulty_vs_estimate != null && Math.abs(f.difficulty_vs_estimate) > 2.5)
      flag("medium", "targeting", `${n.activity}: the next question (${f.item}, difficulty ${f.difficulty}) is ${Math.abs(f.difficulty_vs_estimate)} levels ${f.difficulty_vs_estimate > 0 ? "above" : "below"} the estimate for ${f.capability}${n.selection?.selector === "queue" ? " (chosen by the fixed spelling list, not the engine's ranking)" : ""}${n.selection?.bankGaps?.length ? `; the engine reports a bank gap: ${n.selection.bankGaps[0].note}` : ""}`);
    if (n.error) flag("high", "next question", `${n.activity}: starting it on a copy failed: ${n.error}`);
  }
  for (const q of qs) if (q.difficultyVsEstimate != null && Math.abs(q.difficultyVsEstimate) > 3) flag("low", "targeting (past)", `${q.item} on ${q.capability} was ${q.difficultyVsEstimate > 0 ? "+" : ""}${q.difficultyVsEstimate} levels from the estimate when asked (${q.at.slice(0, 16)})`);
  const open = sessions.filter((x) => !x.end);
  if (open.length) flag("info", "open session", `${open.length} session(s) not finished: ${open.map((x) => x.event.type).join(", ")}`);
  const homeIndependent = profile.capabilities.reduce((t, x) => t + x.evidence.independent, 0);
  if (homeIndependent !== (kinds.independent?.n ?? 0)) flag("info", "independent count", `the profile counts ${homeIndependent} independent answers; first answers classed independent here: ${kinds.independent?.n ?? 0}`);
  if (tracing.questions > tracing.traced) flag("info", "tracing", `${tracing.questions - tracing.traced} of ${tracing.questions} questions have no recorded decision (asked before tracing existed, or in a session type that is not traced)`);

  return {
    generated_at: now,
    read_only: true,
    versions: { app_build: APP_BUILD, server_commit: input.serverCommit ?? null, framework: c.index.key, development_policy: profile.plan.policy, content_status: "all questions and lessons are draft content awaiting educator review (provisional)" },
    pupil: { label: input.pupil.name, id: input.pupil.id, preferences: s.preferences ? { band: s.preferences.band, goal: s.preferences.goal } : null, consent_scope: s.profile?.consent.scope ?? null, flags: s.flags.length },
    counts,
    placement_done: placementDone(s),
    learner_vector: caps.map(({ answers: _a, difficulties: _d, content_left, ...x }) => ({ ...x, content_left })),
    evidence: withEvidence.map((x) => ({ capability: x.id, name: x.name, answers: x.answers })),
    misconceptions_and_gaps: caps
      .filter((x) => x.misconceptions.length || x.difficulties.length || x.standing === "found_hard" || x.standing === "not_kept")
      .map((x) => ({ capability: x.id, name: x.name, standing: x.standing, misconceptions: x.misconceptions, difficulties: x.difficulties, notes: x.notes })),
    independent_vs_assisted: kinds,
    retention: caps.filter((x) => x.answers.length).map((x) => ({ capability: x.id, name: x.name, standing: x.standing, demonstrated_level: x.demonstrated_level, qualifying_answers: x.qualifying_answers, contexts: x.contexts.length, verification: x.verification.status, retention: x.retention })),
    today,
    plan,
    next_questions: nextQuestions,
    unknown_and_shortages: unknown,
    tracing,
    timeline,
    issues,
  };
}

/** Facts about how Today changed between two recorded plans: first suggestion and standings. Never a guessed reason. */
export function planChange(before: PlanTrace, after: PlanTrace): string {
  const parts: string[] = [];
  const a = before.offered[0];
  const b = after.offered[0];
  if (a && b) parts.push(a.title === b.title && a.capability === b.capability ? `Today's first suggestion stayed "${b.title}"` : `Today's first suggestion changed from "${a.title}" to "${b.title}"${b.why ? ` (planner: ${short(b.why, 140)})` : ""}`);
  const moved = Object.keys({ ...before.standings, ...after.standings })
    .filter((k) => before.standings[k] !== after.standings[k])
    .map((k) => `${k} ${before.standings[k] ?? "not_checked"} → ${after.standings[k] ?? "not_checked"}`);
  parts.push(moved.length ? `standings changed: ${moved.join(", ")}` : "no standing changed");
  return parts.join("; ");
}

// ------------------------------------------------------------------ reports

export interface ReportOptions {
  /** Default true: the pupil's name and record id are replaced, so the report can be pasted into another tool. */
  redact: boolean;
}

export interface Report {
  text: string;
  json: Diagnosis & { redacted: boolean };
}

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace the pupil's name and record id everywhere (answers included), and any email-like text. */
export function redactText(text: string, pupil: { id: string; name: string }): string {
  let out = pupil.id ? text.split(pupil.id).join("pupil-A") : text;
  const name = pupil.name.trim();
  // whole words in any alphabet (Zoë, José, Ananyā); one-letter names would erase ordinary words, and the name
  // field itself is replaced directly
  if (name.length >= 2) out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])${escape(name)}(?![\\p{L}\\p{N}\\p{M}])`, "giu"), "Pupil A");
  return out.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}/gu, "[email]");
}

/** Redact every string value (never keys or numbers), so no name can break the JSON. */
function redactValue<T>(v: T, who: { id: string; name: string }): T {
  if (typeof v === "string") return redactText(v, who) as T;
  if (Array.isArray(v)) return v.map((x) => redactValue(x, who)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redactValue(x, who)])) as T;
  return v;
}

export function buildReport(d: Diagnosis, opts: ReportOptions = { redact: true }): Report {
  const json = { ...structuredClone(d), redacted: opts.redact };
  if (!opts.redact) return { text: reportText(json), json };
  const who = { id: d.pupil.id, name: d.pupil.label };
  const out = redactValue(json, who);
  out.pupil = { ...out.pupil, label: "Pupil A", id: "pupil-A" };
  return { text: reportText(out), json: out };
}

function fmtSel(t: SelectionTrace | null): string[] {
  if (!t) return [`        why chosen: ${NOT_RECORDED}`];
  if (t.selector === "queue") return [`        why chosen: position ${t.queue?.position} of ${t.queue?.length} in ${t.queue?.reason}`];
  if (t.selector === "planner") return [`        why chosen: the rule planner chose "${t.planner?.action}"${t.planner?.itemRole ? ` (${t.planner.itemRole} item)` : ""}; diagnosis ${t.planner?.diagnosis}: ${short(t.planner?.reason ?? "", 160)}`];
  const L: string[] = [];
  L.push(`        knew: ${(t.knew ?? []).map((k) => `${k.capability} ${k.mean}±${k.sd} (${k.n} answers, ${k.stage})`).join("; ") || "–"}`);
  if (t.candidates) L.push(`        candidates on the goal: ${t.candidates.eligible} eligible of ${t.candidates.unseen} unseen (kept out: ${t.candidates.excludedReserved} reserved for another use, ${t.candidates.excludedPassage} passage rule, ${t.candidates.excludedSeenWord} word already seen); ${t.candidates.seen} already seen`);
  L.push(`        engine: mode ${t.mode}, path ${t.path}, schedule ${t.schedule}; target band ${t.target?.band} (${t.target?.source})`);
  if (t.chosen) L.push(`        chosen: score ${t.chosen.score}, p(right) ${t.chosen.p}; ${t.chosen.reasons.join("; ") || "no reasons given"}`);
  for (const a of (t.alternatives ?? []).slice(0, 3)) L.push(`        not chosen: ${a.item} (${a.capability}, b ${a.difficulty}) ${a.whyNot}`);
  if (t.bankGaps?.length) L.push(`        bank gap: ${t.bankGaps.map((g) => `${g.capability}: ${g.note}`).join("; ")}`);
  return L;
}

export function reportText(d: Diagnosis): string {
  const L: string[] = [];
  const P = (s = "") => L.push(s);
  const c = d.counts;
  P(`OPENPATH LEARNER DIAGNOSTIC — ${d.pupil.label}   ${d.generated_at.slice(0, 16)} UTC   read-only`);
  P(`app build ${d.versions.app_build}; server ${d.versions.server_commit ?? "–"}; framework ${d.versions.framework}; ${d.versions.development_policy}`);
  P(`Content: ${d.versions.content_status}. Levels are on OpenPath's 1–8 scale; ± is one standard deviation.`);
  P(`Every number below comes from the OpenPath engine replaying this pupil's events; nothing was re-scored or estimated separately.`);
  P();
  P(`1. ACTIVITY`);
  P(`   ${c.events} events, ${c.first_event_at?.slice(0, 16)} to ${c.last_event_at?.slice(0, 16)}; ${c.sessions} sessions: ${Object.entries(c.sessions_by_type as Record<string, { sessions: number }>).map(([k, v]) => `${k} ${v.sessions}`).join(", ")}`);
  P(`   Assessments: ${c.assessments} (${c.assessments_finished} finished). Placement done: ${d.placement_done ? "yes" : "no"}.`);
  P(`   Questions answered: ${c.questions_answered}; first tries ${c.first_attempts.correct} right, ${c.first_attempts.incorrect} wrong; ${c.second_tries_or_help} later tries or with help.`);
  P(`   Evidence by kind: ${Object.entries(d.independent_vs_assisted).map(([k, v]) => `${k} ${v.right}/${v.n}`).join(", ") || "none"}`);
  P(`   Lessons: ${c.lessons_completed.length}. Flagged questions: ${d.pupil.flags} (notes not included).`);
  P(`   Decision tracing: ${d.tracing.traced}/${d.tracing.questions} questions and ${d.tracing.plansTraced}/${d.tracing.sessions} sessions have recorded decisions${d.tracing.firstTraceAt ? ` (since ${d.tracing.firstTraceAt.slice(0, 16)})` : " (none yet)"}.`);
  P();
  P(`2. LEARNER VECTOR (skills with answers of their own)`);
  const own = d.learner_vector.filter((x) => d.evidence.some((e) => e.capability === x.id));
  if (!own.length) P(`   No answers yet.`);
  for (const x of own.sort((a, b) => a.area.localeCompare(b.area) || b.estimate.mean - a.estimate.mean))
    P(`   ${x.name.padEnd(44).slice(0, 44)} ${String(x.estimate.mean).padStart(5)} ± ${String(x.estimate.sd).padEnd(4)} ${String(x.certainty).padEnd(11)} ${String(x.standing).padEnd(11)} ${x.evidence.independentRight}/${x.evidence.independent} indep${x.evidence.afterTeaching ? `, ${x.evidence.afterTeachingRight}/${x.evidence.afterTeaching} after lesson` : ""}${x.evidence.assisted ? `, ${x.evidence.assistedRight}/${x.evidence.assisted} helped` : ""}`);
  const moved = d.unknown_and_shortages.moved_only_by_related_skills as string[];
  if (moved.length) P(`   Moved only through related skills: ${moved.slice(0, 8).join("; ")}${moved.length > 8 ? ` (+${moved.length - 8})` : ""}`);
  P();
  P(`3. ANSWERS (✓/✗, item, difficulty, difficulty minus estimate before, kind of evidence, answer, key)`);
  for (const x of d.evidence) {
    P(`   ${x.name}:`);
    for (const r of x.answers)
      P(`     ${r.correct ? "✓" : "✗"} ${r.item} (b ${r.difficulty}${r.difficulty_vs_estimate_before != null ? `, ${r.difficulty_vs_estimate_before >= 0 ? "+" : ""}${r.difficulty_vs_estimate_before}` : ""}, ${r.evidence_kind}${r.pool ? `, ${r.pool}` : ""}) "${short(r.answer, 40)}"${r.correct ? "" : ` key "${short(r.key, 40)}"`}${r.misconceptions.length ? ` [${r.misconceptions.join(", ")}]` : ""}${r.estimate_change ? ` → ${r.estimate_change.from}→${r.estimate_change.to}` : ""}`);
  }
  P();
  P(`4. MISCONCEPTIONS AND SKILL GAPS`);
  if (!d.misconceptions_and_gaps.length) P(`   None found yet.`);
  for (const g of d.misconceptions_and_gaps) P(`   ${g.name} (${g.standing}): ${[...g.misconceptions.map((m: Any) => `pattern ${m.id} (strength ${m.strength})`), ...g.difficulties, ...g.notes].join("; ") || "–"}`);
  P();
  P(`5. DEMONSTRATION AND RETENTION`);
  const dem = d.retention.filter((x) => x.demonstrated_level !== null || x.verification !== "not_demonstrated");
  if (!dem.length) P(`   No skill has enough independent evidence to be demonstrated yet.`);
  for (const x of dem) P(`   ${x.name}: demonstrated at level ${x.demonstrated_level ?? "–"} on ${x.qualifying_answers} qualifying answers in ${x.contexts} formats; ${x.verification}; later check ${x.retention.status === "none" ? "not scheduled" : `due ${String(x.retention.due).slice(0, 10)} (${x.retention.status})`}, ${x.retention.checks} done`);
  P();
  P(`6. TODAY (${d.plan.policy})`);
  for (const t of d.today) P(`   • ${t.title} [${t.kind}; action ${t.planner_action}, priority ${t.priority}]\n     why: ${t.why}\n     would change if: ${t.would_change_if ?? "–"}`);
  if (d.plan.for_adults.length) P(`   For an adult: ${d.plan.for_adults.map((r) => `${r.action} ${r.capability ?? ""}: ${short(r.why, 120)}`).join(" | ")}`);
  P();
  P(`7. NEXT QUESTION FOR EACH ACTIVITY (the app's own selection on a copy; nothing recorded)`);
  for (const n of d.next_questions) {
    const f = n.first;
    P(`   ${n.activity}: ${n.error ? `failed: ${n.error}` : !f ? "nothing to ask" : f.lesson ? `lesson ${f.lesson} first` : `${f.item} (${f.capability}, b ${f.difficulty}${f.difficulty_vs_estimate != null ? `, ${f.difficulty_vs_estimate >= 0 ? "+" : ""}${f.difficulty_vs_estimate} vs estimate` : ""}${f.pool ? `, ${f.pool}` : ""})`}`);
    if (n.selection) for (const line of fmtSel(n.selection)) P(line);
  }
  P();
  P(`8. UNKNOWN AND CONTENT SHORTAGES`);
  const u = d.unknown_and_shortages;
  P(`   ${u.never_checked} skills never checked (${Object.entries(u.never_checked_by_area).map(([k, v]) => `${k} ${v}`).join(", ") || "–"}).`);
  P(`   Too little evidence: ${u.too_little_evidence.join("; ") || "none"}.`);
  P(`   Skills with answers but no later (retention) check yet: ${u.no_retention_check_yet}.`);
  if (u.no_unused_questions_left.length) P(`   No unused questions left: ${u.no_unused_questions_left.join(", ")}.`);
  if (u.no_teaching_activity.length) P(`   Found hard with no teaching activity: ${u.no_teaching_activity.join(", ")}.`);
  for (const g of u.bank_gaps_reported_by_engine) P(`   Bank gap (engine): ${g.capability}: ${g.note}`);
  P();
  P(`9. CONSISTENCY CHECKS`);
  if (!d.issues.length) P(`   No problems found.`);
  for (const i of d.issues) P(`   [${i.severity}] ${i.check}: ${i.detail}`);
  P();
  P(`10. DECISION TRACE (oldest first)`);
  for (const e of d.timeline) {
    if (e.kind === "session") {
      P(`   ── ${e.at.slice(0, 16)} session ${e.type}${e.capability ? ` ${e.capability}` : ""}${e.purpose ? ` (${e.purpose})` : ""}${e.ended ? `, ${e.ended}` : ", not finished"}`);
      if (!e.plan) P(`      Today when started: ${NOT_RECORDED}`);
      else {
        P(`      Today offered: ${e.plan.offered.map((o, i) => `${i + 1}. ${o.title}${o.action ? ` [${o.action}]` : ""}`).join("  ") || "nothing"}; started ${e.plan.startedRank === null ? "from outside Today" : `#${e.plan.startedRank + 1}`}`);
        if (e.planChange) P(`      since the last recorded plan: ${e.planChange}`);
      }
    } else {
      P(`     ${e.answer ? (e.answer.correct ? "✓" : "✗") : "·"} ${e.item} (${e.capability ?? "–"}, b ${e.difficulty ?? "–"}, ${e.purpose})${e.answer ? ` ${e.answer.kind}${e.answer.tries > 1 ? `, ${e.answer.tries} tries` : ""}` : " not answered"}`);
      for (const line of fmtSel(e.selection)) P(line);
      if (e.effect) P(`        effect: ${e.effect.verdict}${e.effect.before && e.effect.after ? ` ${e.effect.capability} ${e.effect.before.mean}±${e.effect.before.sd} → ${e.effect.after.mean}±${e.effect.after.sd}` : ""}${e.effect.inferred.length ? `; related: ${e.effect.inferred.map((x) => `${x.capability} ${x.shift >= 0 ? "+" : ""}${x.shift}`).join(", ")}` : ""}${e.effect.verdict !== "accepted" ? ` (${e.effect.reasons.slice(0, 2).join("; ")})` : ""}`);
      else if (e.answer) P(`        effect: none on the estimate (${e.answer.kind})`);
      if (e.next) P(`        then: ${e.next}`);
    }
  }
  P();
  P(`The JSON version of this report has every field above in full.`);
  return L.join("\n");
}

// ------------------------------------------------------------------ question-bank coverage (content only; no pupil data)

export interface CoverageRow {
  capability: string;
  name: string;
  /** Hand-written questions the engine may choose, by difficulty band 1–8 (floor of b). */
  bands: number[];
  handWritten: number;
  generated: number;
  pools: Record<string, number>;
  validated: number;
  lesson: boolean;
}

export function bankCoverage(c: AppContent): CoverageRow[] {
  const rows = new Map<string, CoverageRow>();
  for (const id of c.index.leafIds) rows.set(id, { capability: id, name: c.index.names.get(id) ?? id, bands: [0, 0, 0, 0, 0, 0, 0, 0], handWritten: 0, generated: 0, pools: {}, validated: 0, lesson: [...c.lessons.keys()].some((k) => k.startsWith(`${id}#`)) });
  for (const it of c.ctx.content.items.values()) {
    if (it.kind !== "code") continue;
    const row = rows.get(it.target);
    if (!row) continue;
    if (c.handWritten.has(it.id)) {
      row.handWritten++;
      row.bands[Math.min(7, Math.max(0, Math.floor(it.b) - 1))]++;
      const p = c.pilot.pools.get(it.id)?.pool;
      if (p) row.pools[p] = (row.pools[p] ?? 0) + 1;
      if (it.evidence_status === "validated") row.validated++;
    } else if (it.generated) row.generated++;
  }
  return [...rows.values()];
}
