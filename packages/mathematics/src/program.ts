import { competencies, type Competency } from "./curriculum";
import { type Family, families } from "./generator";
export const stageIds = [
  "concept",
  "worked",
  "guided",
  "independent",
  "application",
  "transfer",
  "retention",
] as const;
export type StageId = (typeof stageIds)[number];
export interface ProgramDefinition {
  id: string;
  version: string;
  competencyId: string;
  stages: { id: StageId; title: string; instruction: string }[];
  families: Family[];
  contentStatus: "scaffold" | "provisional-practice";
}
export function programFor(c: Competency): ProgramDefinition {
  const fs = (c.questionFamilies as string[]).filter((x): x is Family =>
    Object.hasOwn(families, x),
  );
  const names = [
    "Concept introduction",
    "Worked examples",
    "Guided practice",
    "Independent practice",
    "Application",
    "Transfer practice (candidate)",
    "Delayed retention",
  ];
  return {
    id: c.id,
    version: c.version,
    competencyId: c.id,
    families: fs,
    contentStatus: fs.length ? "provisional-practice" : "scaffold",
    stages: stageIds.map((id, i) => ({
      id,
      title: names[i],
      instruction:
        i === 0
          ? c.description
          : i === 5
            ? "Try a new parameter variant. This is not validated unfamiliar transfer; an educator and the host must supply cross-context checks."
            : i === 6
              ? "Return on a later day. The host must schedule and evaluate delayed evidence."
              : `${c.objectives[0]}. ${i === 2 ? "Hints are allowed for practice." : "Use a new example; completion is not mastery."}`,
    })),
  };
}
export interface AttemptReceipt {
  id: string;
  itemId: string;
  familyId: Family;
  seed: number;
  stage: StageId;
  at: string;
  response: string;
  correct: boolean;
  hints: number;
  solutionSeen: boolean;
  elapsedMs: number;
}
/** Instructional state only. Host owns learner identity, ledger and competency estimates. */
export interface ProgramRecord {
  schemaVersion: 1;
  learnerId: string;
  journeyId: string;
  programId: string;
  programVersion: string;
  completed: StageId[];
  current: StageId;
  elapsedMs: number;
  attempts: AttemptReceipt[];
  timeReceipts: { id: string; stage: StageId; elapsedMs: number }[];
  independentEvidenceIds: string[];
  retention: "not-scheduled" | "host-pending";
  revision: number;
}
export function startProgram(
  learnerId: string,
  journeyId: string,
  definition: ProgramDefinition,
): ProgramRecord {
  return {
    schemaVersion: 1,
    learnerId,
    journeyId,
    programId: definition.id,
    programVersion: definition.version,
    completed: [],
    current: "concept",
    elapsedMs: 0,
    attempts: [],
    timeReceipts: [],
    independentEvidenceIds: [],
    retention: "not-scheduled",
    revision: 0,
  };
}
export function programKey(
  record: Pick<
    ProgramRecord,
    "learnerId" | "journeyId" | "programId" | "programVersion"
  >,
) {
  return JSON.stringify([
    record.learnerId,
    record.journeyId,
    record.programId,
    record.programVersion,
  ]);
}
export function updateProgram(
  def: ProgramDefinition,
  record: ProgramRecord,
  action:
    | { kind: "complete"; stage: StageId }
    | { kind: "attempt"; receipt: AttemptReceipt }
    | { kind: "open"; stage: StageId }
    | { kind: "time"; id: string; stage: StageId; elapsedMs: number },
): ProgramRecord {
  if (record.programId !== def.id || record.programVersion !== def.version)
    throw new Error("Program version mismatch: explicit migration required");
  const next = structuredClone(record);
  const ids = def.stages.map((s) => s.id);
  if (action.kind === "time") {
    if (
      !action.id ||
      !["concept", "worked"].includes(action.stage) ||
      action.stage !== next.current ||
      !Number.isFinite(action.elapsedMs) ||
      action.elapsedMs < 0 ||
      action.elapsedMs > 3600000
    )
      throw new Error("Invalid instructional duration");
    if (!next.timeReceipts.some((t) => t.id === action.id)) {
      next.timeReceipts.push({
        id: action.id,
        stage: action.stage,
        elapsedMs: action.elapsedMs,
      });
      next.elapsedMs += action.elapsedMs;
    }
  }
  if (action.kind === "open") {
    if (!ids.includes(action.stage)) throw new Error("Unknown stage");
    next.current = action.stage;
  }
  if (action.kind === "complete") {
    if (action.stage === "retention")
      throw new Error("Delayed retention must be scheduled by the host");
    if (next.current !== action.stage || !ids.includes(action.stage))
      throw new Error("Complete current stage only");
    if (!def.families.length)
      throw new Error("Scaffold has no executable activities");
    if (
      !["concept", "worked"].includes(action.stage) &&
      !next.attempts.some((a) => a.stage === action.stage)
    )
      throw new Error("Practice attempt required");
    if (!next.completed.includes(action.stage))
      next.completed.push(action.stage);
    next.current =
      ids.find((id) => !next.completed.includes(id)) ?? "retention";
    if (next.current === "retention") next.retention = "host-pending";
  }
  if (action.kind === "attempt") {
    const a = action.receipt;
    if (
      !Number.isFinite(a.elapsedMs) ||
      a.elapsedMs < 0 ||
      a.elapsedMs > 3600000 ||
      !Number.isInteger(a.hints) ||
      a.hints < 0 ||
      !ids.includes(a.stage) ||
      a.stage !== next.current ||
      !def.families.includes(a.familyId) ||
      !a.id ||
      !Number.isInteger(a.seed) ||
      !Number.isFinite(Date.parse(a.at))
    )
      throw new Error("Invalid receipt");
    if (!next.attempts.some((x) => x.id === a.id)) {
      next.attempts.push(a);
      next.elapsedMs += a.elapsedMs;
    }
  }
  next.revision++;
  return next;
}
export function completion(def: ProgramDefinition, record: ProgramRecord) {
  return Math.round(
    (record.completed.filter((id) => def.stages.some((s) => s.id === id))
      .length /
      def.stages.length) *
      100,
  );
}
export interface ProgramStoragePort {
  load(key: string): Promise<ProgramRecord | null>;
  save(
    key: string,
    record: ProgramRecord,
    expectedRevision: number,
  ): Promise<void>;
}
export const programs = competencies.map(programFor);
