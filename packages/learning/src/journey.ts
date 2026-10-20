/** Operational sessions, not a learner estimator. All learning decisions stay in plan/intervention/evidence. */
import { assigned, type CurriculumRelease } from "./curriculum";
import { moduleFor } from "./content";
import { graph, walkSupports } from "./graph";
import { nextActivity } from "./plan";
import type { LearnerRecords } from "./records";
import type { SkillEvidence } from "./evidence";
import tracks from "../../../content/mathematics/exam-tracks.v1.json";
export const JOURNEY_VERSION = "math-session@1";
export type Scope = "school" | "gre-quant" | "jee-main" | "jee-advanced";
export interface Draft {
  value: string;
  working: string;
  hint: boolean;
}
export interface Usage {
  activeMs: number;
  idleMs: number;
  solvingMs: number;
  helpCount: number;
}
export interface SessionPlan {
  id: string;
  scope: Scope;
  curriculum: { id: string; version: string; hash: string };
  budgetMinutes: number;
  modules: {
    competency: string;
    estimatedMs: number;
    source: "default" | "history";
  }[];
}
export interface JourneyRecord {
  kind: "math_session";
  version: typeof JOURNEY_VERSION;
  id: string;
  at: string;
  learnerId: string;
  sessionId: string;
  planId: string;
  action: "plan" | "checkpoint" | "time" | "finish";
  plan?: SessionPlan;
  competency?: string;
  usage?: Usage;
  drafts?: Record<string, Draft>;
}
export function journeyRecords(
  events: readonly { kind: string }[],
): JourneyRecord[] {
  return events.filter(
    (e) =>
      e.kind === "math_session" &&
      (e as JourneyRecord).version === JOURNEY_VERSION,
  ) as JourneyRecord[];
}
export function duration(competency: string, records: JourneyRecord[]) {
  const completed = records.filter(
    (r) => r.action === "finish" && r.competency === competency,
  );
  const samples = completed
    .map((f) =>
      records
        .filter(
          (r) =>
            r.planId === f.planId && r.competency === competency && r.usage,
        )
        .reduce((s, r) => s + (r.usage?.activeMs ?? 0), 0),
    )
    .filter((x) => x >= 60000 && x <= 7200000)
    .slice(-9)
    .sort((a, b) => a - b);
  const baseline = 12 * 60000;
  const median = samples.length
    ? samples[Math.floor(samples.length / 2)]
    : baseline;
  return {
    estimatedMs: Math.round(
      Math.max(
        4 * 60000,
        Math.min(
          40 * 60000,
          (baseline * 3 + median * samples.length) / (3 + samples.length),
        ),
      ),
    ),
    source: samples.length ? ("history" as const) : ("default" as const),
  };
}
export function buildSession(
  release: CurriculumRelease,
  ev: (id: string) => SkillEvidence,
  records: LearnerRecords,
  history: JourneyRecord[],
  budgetMinutes: number,
  scope: Scope = "school",
  preferred?: string,
): SessionPlan {
  const assignedIds = [...new Set(assigned(release).map((r) => r.competency))];
  const mapping =
    tracks.tracks
      .find((t) => t.id === scope)
      ?.syllabusMapping.map((m) => m.competencyId) ?? [];
  const candidates = (scope === "school" ? assignedIds : mapping).filter((c) =>
    moduleFor(c),
  );
  const suggested =
    scope === "school"
      ? nextActivity(release, ev, records).competency
      : candidates.find((c) => ev(c).status !== "verified");
  const first =
    preferred && candidates.includes(preferred) ? preferred : suggested;
  // Evidence-led prerequisites are support recommendations, never access gates. Only already observed gaps come first.
  const supports = first
    ? walkSupports(first, 2)
        .map((s) => s.id)
        .filter((c) => candidates.includes(c) && ev(c).status === "review")
    : [];
  const ordered = [
    ...new Set([
      ...supports,
      ...(first && candidates.includes(first) ? [first] : []),
      ...candidates,
    ]),
  ].filter(
    (c) =>
      c === preferred ||
      !["verified", "independent", "transfer"].includes(ev(c).status) ||
      ev(c).retention === "due",
  );
  const modules: SessionPlan["modules"] = [];
  let used = 0;
  for (const competency of ordered) {
    const d = duration(competency, history);
    if (used + d.estimatedMs > budgetMinutes * 60000) continue;
    modules.push({ competency, ...d });
    used += d.estimatedMs;
  }
  return {
    id: crypto.randomUUID(),
    scope,
    curriculum: {
      id: release.id,
      version: release.version,
      hash: release.hash,
    },
    budgetMinutes,
    modules,
  };
}
/** Monotonic intervals: visible recent interaction is active; hidden or >=60s inactivity is idle. */
export function timeSlice(
  from: number,
  to: number,
  lastInteraction: number,
  visible: boolean,
  solving: boolean,
): Usage {
  const elapsed = Math.max(0, to - from);
  const activeMs = visible
    ? Math.max(0, Math.min(to, lastInteraction + 60000) - from)
    : 0;
  return {
    activeMs,
    idleMs: elapsed - activeMs,
    solvingMs: solving ? activeMs : 0,
    helpCount: 0,
  };
}
export const EXAM_GOALS = [
  {
    id: "iit-jee",
    name: "IIT-JEE",
    tracks: ["jee-main", "jee-advanced"],
    missing:
      "Only sampled quadratic, coordinate and calculus skill overlaps. Full syllabus, approved exam bank and official scoring unverified.",
  },
  {
    id: "gre-quant",
    name: "GRE",
    tracks: ["gre-quant"],
    missing:
      "Percentage and fraction foundations only. Full Quant syllabus, approved exam bank, timing and scoring unverified.",
  },
  {
    id: "tnpsc",
    name: "TNPSC",
    tracks: [],
    missing:
      "No verified syllabus mapping or exam bank. Other subjects are not supported.",
  },
  {
    id: "upsc",
    name: "UPSC / IAS",
    tracks: [],
    missing:
      "No verified CSAT syllabus mapping or exam bank. General Studies and other subjects are not supported.",
  },
];
export function examScope(id: string) {
  const t = tracks.tracks.find((t) => t.id === id);
  return t
    ? {
        ...t,
        competencies: t.syllabusMapping
          .filter((m) => moduleFor(m.competencyId))
          .map((m) => ({
            id: m.competencyId,
            name: graph.get(m.competencyId).name,
          })),
      }
    : null;
}
