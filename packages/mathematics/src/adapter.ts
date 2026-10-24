import { examTracks, curriculumVersion } from "./curriculum";
import { competencyGraph, activeGraphVersion } from "./prerequisites";
import { programs } from "./program";
import { type GeneratedItem } from "./generator";
/** Provisional replaceable module boundary: deliberately NOT a LedgerEvent or estimator. */
export interface SharedCompetencyView {
  competencyId: string;
  status:
    | "unavailable"
    | "suspected"
    | "learning"
    | "demonstrated"
    | "verified";
  evidenceIds: string[];
  source: "shared-engine";
  retention: string;
}
export interface CandidateResponse {
  contract: "math-candidate@1";
  learnerId: string;
  journeyId: string;
  at: string;
  item: GeneratedItem;
  response: string;
  correct: boolean;
  elapsedMs: number;
  hintCount: number;
  solutionSeen: boolean;
  exposure: "fresh" | "variant" | "repeat";
  priorItemExposures: number;
  priorFamilyExposures: number;
  evidenceRole: "practice";
  admissible: false;
  misconceptions: { tag: string; status: "hypothesis"; rule: string }[];
}
export function candidateResponse(
  input: Omit<
    CandidateResponse,
    "contract" | "evidenceRole" | "admissible" | "misconceptions"
  >,
): CandidateResponse {
  if (
    !input.learnerId ||
    !input.journeyId ||
    !Number.isFinite(Date.parse(input.at)) ||
    !Number.isFinite(input.elapsedMs) ||
    input.elapsedMs < 0 ||
    input.hintCount < 0
  )
    throw new Error("Invalid response metadata");
  return {
    ...input,
    contract: "math-candidate@1",
    evidenceRole: "practice",
    admissible: false,
    misconceptions: [],
  };
}
export const mathematicsModule = {
  id: "mathematics",
  version: activeGraphVersion,
  curriculumVersion,
  prerequisiteGraphVersion: activeGraphVersion,
  competencies: competencyGraph(),
  programs,
  examTracks,
  evidenceContract: "math-candidate@1",
  status: "provisional",
};
