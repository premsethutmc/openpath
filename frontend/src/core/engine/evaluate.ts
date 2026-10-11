/**
 * On-device mirror of backend/assessment (evaluate.py + rules/produce_set.py).
 *
 * The Python engine is the reference. This copy exists so evidence can be
 * assessed on the family's own device, and it must give byte-identical results
 * for every case in shared/golden/cases.json (see engine.test.ts).
 */
import type { Evaluation, EvidenceEvent, Observation, Outcome, RoundSummary } from "../types";

const NUMERAL = "math.number.numeral_recognition";
const ONE_TO_ONE = "math.counting.one_to_one";
const CARDINALITY = "math.counting.cardinality";
const TRANSFER = "math.quantity.transfer";

interface RoundSpecData {
  task_type?: string;
  target: number;
  target_kind: string;
  representation?: "numeral" | "set";
  is_transfer?: boolean;
  available?: Record<string, number>;
}

function show(counts: Record<string, number>): string {
  const parts = Object.keys(counts)
    .sort()
    .map((kind) => `${counts[kind]} ${kind}`);
  return parts.join(", ") || "nothing";
}

function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

export function summarizeProduceSet(events: EvidenceEvent[]): RoundSummary {
  const start = events[0];
  const spec = start.data as unknown as RoundSpecData;
  const target = spec.target;
  const kind = spec.target_kind;
  const available = { ...(spec.available ?? {}) };
  const representation = spec.representation ?? "numeral";

  const problems: string[] = [];
  const basket = new Map<string, string>();
  const checks: { count: number; other: number; correct: boolean }[] = [];
  const hints: number[] = [];
  let removals = 0;
  let wrongKindAdds = 0;
  let maxInBasket = 0;
  let completed = false;
  let solved = false;

  const counts = (): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const itemKind of basket.values()) result[itemKind] = (result[itemKind] ?? 0) + 1;
    return result;
  };

  for (const event of events.slice(1)) {
    const data = event.data ?? {};
    if (event.type === "item_added") {
      const item = data.item as string;
      const itemKind = data.kind as string;
      if (basket.has(item)) {
        problems.push(`item ${item} added twice`);
        continue;
      }
      if (!(itemKind in available)) {
        problems.push(`item kind ${itemKind} was not on offer`);
        continue;
      }
      basket.set(item, itemKind);
      if (counts()[itemKind] > available[itemKind]) problems.push(`more ${itemKind} added than were on offer`);
      if (itemKind !== kind) wrongKindAdds += 1;
      maxInBasket = Math.max(maxInBasket, basket.size);
    } else if (event.type === "item_removed") {
      const item = data.item as string;
      if (!basket.has(item)) {
        problems.push(`item ${item} removed but was not in the basket`);
        continue;
      }
      basket.delete(item);
      removals += 1;
    } else if (event.type === "check_requested") {
      const replayed = counts();
      const claimed: Record<string, number> = {};
      for (const [k, v] of Object.entries((data.counts as Record<string, number>) ?? {})) if (v) claimed[k] = v;
      if (!sameCounts(claimed, replayed)) {
        problems.push(`check reported ${show(claimed)} but replay gives ${show(replayed)}`);
      }
      const nTarget = replayed[kind] ?? 0;
      let nOther = 0;
      for (const [k, v] of Object.entries(replayed)) if (k !== kind) nOther += v;
      const correct = nTarget === target && nOther === 0;
      checks.push({ count: nTarget, other: nOther, correct });
      if (correct) solved = true;
    } else if (event.type === "hint_shown") {
      hints.push(Number(data.level ?? 1));
    } else if (event.type === "round_completed") {
      completed = true;
    }
  }

  if (completed && !solved) problems.push("round marked complete without a correct check");

  let outcome: Outcome | null;
  if (checks.length === 0) outcome = null;
  else if (checks[0].correct) outcome = "independent";
  else if (solved) outcome = "supported";
  else outcome = "not_yet";

  const first = checks[0];
  let error: string | null = null;
  if (first && !first.correct) {
    if (first.count === 0 && first.other === 0) error = "empty";
    else if (first.other > 0 && first.count === target) error = "wrong_kind";
    else if (first.count >= (available[kind] ?? target) && first.count > target) error = "took_all";
    else if (first.count > target) error = "too_many";
    else if (first.count < target) error = "too_few";
    else error = "wrong_kind";
  }

  return {
    round: start.round as string,
    task_type: "produce_set",
    target,
    target_kind: kind,
    representation,
    is_transfer: Boolean(spec.is_transfer),
    context: `${representation}:${kind}:${target}`,
    outcome,
    first_check_count: first ? first.count : null,
    first_error: error,
    checks: checks.length,
    wrong_checks: checks.filter((c) => !c.correct).length,
    max_hint_level: hints.length ? Math.max(...hints) : 0,
    removals,
    wrong_kind_adds: wrongKindAdds,
    max_in_basket: maxInBasket,
    self_corrected: Boolean(first && first.correct && (removals > 0 || wrongKindAdds > 0)),
    completed,
    duration_ms: events[events.length - 1].t - start.t,
    problems,
  };
}

function observation(s: RoundSummary, skill: string, outcome: Outcome, rule: string): Observation {
  return {
    skill,
    outcome,
    round: s.round,
    context: s.context,
    is_transfer: s.is_transfer,
    rule,
    detail: {
      target: s.target,
      first_check_count: s.first_check_count,
      first_error: s.first_error,
      checks: s.checks,
      max_hint_level: s.max_hint_level,
      self_corrected: s.self_corrected,
    },
  };
}

export function observeProduceSet(summaries: RoundSummary[]): Observation[] {
  const observations: Observation[] = [];
  const builtASetUnaided = summaries.some((s) => s.representation === "set" && s.outcome === "independent");

  for (const s of summaries) {
    const outcome = s.outcome;
    if (outcome === null) continue;
    const numeralRound = s.representation === "numeral";

    if (numeralRound) {
      observations.push(observation(s, CARDINALITY, outcome, "produce_set.cardinality"));
      if (outcome === "independent") {
        observations.push(observation(s, NUMERAL, "independent", "produce_set.numeral"));
      } else if (builtASetUnaided) {
        observations.push(observation(s, NUMERAL, "not_yet", "produce_set.numeral_differential"));
      }
    }

    if (outcome === "independent" || outcome === "supported") {
      observations.push(observation(s, ONE_TO_ONE, outcome, "produce_set.one_to_one"));
    } else if (!numeralRound) {
      observations.push(observation(s, ONE_TO_ONE, "not_yet", "produce_set.one_to_one"));
    }

    if (s.is_transfer) observations.push(observation(s, TRANSFER, outcome, "produce_set.transfer"));
  }
  return observations;
}

const RULES: Record<
  string,
  { summarize: (e: EvidenceEvent[]) => RoundSummary; observe: (s: RoundSummary[]) => Observation[] }
> = {
  produce_set: { summarize: summarizeProduceSet, observe: observeProduceSet },
};

export function evaluateSession(events: EvidenceEvent[]): Evaluation {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  const rounds = new Map<string, EvidenceEvent[]>();
  for (const event of ordered) {
    if (event.round === null || event.round === undefined) continue;
    if (!rounds.has(event.round)) rounds.set(event.round, []);
    rounds.get(event.round)!.push(event);
  }

  const summaries: RoundSummary[] = [];
  const problems: string[] = [];
  for (const roundEvents of rounds.values()) {
    const start = roundEvents[0];
    if (start.type !== "round_started") {
      problems.push(`round ${start.round}: first event is not round_started`);
      continue;
    }
    const taskType = String(start.data.task_type);
    const rule = RULES[taskType];
    if (!rule) {
      problems.push(`round ${start.round}: unknown task type ${taskType}`);
      continue;
    }
    const summary = rule.summarize(roundEvents);
    for (const p of summary.problems) problems.push(`round ${summary.round}: ${p}`);
    summaries.push(summary);
  }

  if (problems.length) return { integrity: "inconsistent", problems, rounds: summaries, observations: [] };

  const observations: Observation[] = [];
  const byTask = new Map<string, RoundSummary[]>();
  for (const s of summaries) {
    if (!byTask.has(s.task_type)) byTask.set(s.task_type, []);
    byTask.get(s.task_type)!.push(s);
  }
  for (const [taskType, taskSummaries] of byTask) observations.push(...RULES[taskType].observe(taskSummaries));

  const order = new Map(summaries.map((s, i) => [s.round, i]));
  observations.sort(
    (a, b) => order.get(a.round)! - order.get(b.round)! || (a.skill < b.skill ? -1 : a.skill > b.skill ? 1 : 0),
  );
  return { integrity: "ok", problems: [], rounds: summaries, observations };
}
