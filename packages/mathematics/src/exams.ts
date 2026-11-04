import { examTracks, competencies } from "./curriculum";
import { programFor, programKey, startProgram } from "./program";
/** Exam strategy/timing records are separate from conceptual evidence and school completion. */
export interface ExamAttempt {
  id: string;
  mode: "practice" | "timed";
  itemIds: string[];
  startedAt: string;
  elapsedMs: number;
  strategyNotes: string[];
  hostScore?: { value: number; maximum: number; policyVersion: string };
  conceptualCandidateIds: string[];
}
export interface ExamJourney {
  schemaVersion: 1;
  learnerId: string;
  trackId: string;
  trackVersion: string;
  journeyVersion: string;
  currentProgramKey: string | null;
  programKeys: string[];
  attempts: ExamAttempt[];
  readiness: "not-estimated";
  officialRulesVerified: false;
}
export function startExamJourney(
  learnerId: string,
  trackId: string,
): ExamJourney {
  const track = examTracks.find((t) => t.id === trackId);
  if (!track || !learnerId) throw new Error("Unknown track or learner");
  const programKeys = track.syllabusMapping.map((m) =>
    programKey(
      startProgram(
        learnerId,
        trackId,
        programFor(competencies.find((c) => c.id === m.competencyId)!),
      ),
    ),
  );
  return {
    schemaVersion: 1,
    learnerId,
    trackId,
    trackVersion: track.version,
    journeyVersion: track.journeyVersion,
    currentProgramKey: programKeys[0] ?? null,
    programKeys,
    attempts: [],
    readiness: "not-estimated",
    officialRulesVerified: false,
  };
}
export function recordExamAttempt(
  journey: ExamJourney,
  attempt: ExamAttempt,
): ExamJourney {
  const track = examTracks.find((t) => t.id === journey.trackId);
  if (!track || track.version !== journey.trackVersion)
    throw new Error("Track version migration required");
  if (attempt.mode === "timed" && !track.timedTestEnabled)
    throw new Error("Official rules unverified: timed test disabled");
  if (
    !attempt.id ||
    !Number.isFinite(attempt.elapsedMs) ||
    attempt.elapsedMs < 0 ||
    !Number.isFinite(Date.parse(attempt.startedAt))
  )
    throw new Error("Invalid exam attempt");
  if (attempt.hostScore)
    throw new Error("Scoring contract not verified; no score accepted");
  if (journey.attempts.some((a) => a.id === attempt.id))
    return structuredClone(journey);
  return {
    ...structuredClone(journey),
    attempts: [...journey.attempts, structuredClone(attempt)],
  };
}
/** Link only: the host decides whether a shared evidence concern warrants this program. */
export function schoolProgramLink(
  learnerId: string,
  competencyId: string,
): string {
  const c = competencies.find((c) => c.id === competencyId);
  if (!c) throw new Error("Unknown competency");
  return programKey(startProgram(learnerId, "school", programFor(c)));
}
