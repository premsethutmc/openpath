import type { AssessmentEnvelope } from "./unified-math-engine";

export const D2_PROOF_STATE_VERSION = "openpath-cross-domain-proof-state@2" as const;
export const D2_MAX_STAGES = 30;

export interface D2EstablishedFact {
  stageId: string;
  mathematicalDomain: string;
  dependencyStageIds: string[];
  assessmentStepIndexes: number[];
  assumptionsAndRestrictions: string[];
  outstandingObligations: string[];
  skills: string[];
  mathematicalEvidence: unknown;
  reasonerVersions: string[];
  independentlyVerified: true;
}

export interface D2ProofStateSnapshot {
  version: typeof D2_PROOF_STATE_VERSION;
  establishedFacts: D2EstablishedFact[];
  currentGoal: string | null;
  completionEvidence: string[];
  dependencyEdges: { from: string; to: string }[];
}

/**
 * Independently checks the transfer boundary between already verified domain stages.
 * Mathematical claims remain owned by their domain reasoner and proof kernel; this
 * checker proves that a later stage depends only on established, non-circular facts.
 */
export class D2ProofState {
  readonly facts = new Map<string, D2EstablishedFact>();
  readonly edges: { from: string; to: string }[] = [];

  checkDependencies(stageId: string, dependencies: string[]): string[] {
    if (!stageId) return ["stage id is required"];
    if (this.facts.has(stageId)) return [`duplicate stage id ${stageId}`];
    if (new Set(dependencies).size !== dependencies.length) return ["duplicate proof dependency"];
    if (dependencies.includes(stageId)) return ["circular self-dependency"];
    const missing = dependencies.filter((dependency) => !this.facts.has(dependency));
    return missing.length ? missing.map((dependency) => `dependency ${dependency} is not established`) : [];
  }

  establish(stageId: string, dependencies: string[], assessment: AssessmentEnvelope, offset: number): string[] {
    const errors = this.checkDependencies(stageId, dependencies);
    if (errors.length) return errors;
    if (assessment.classification !== "verified" || !assessment.complete || assessment.correct !== true) {
      return [`stage ${stageId} is not a completed verified mathematical fact`];
    }
    if (!assessment.reasoners.length || assessment.steps.some((step) => step.classification !== "verified")) {
      return [`stage ${stageId} lacks independently checked step evidence`];
    }
    const reasonerVersions = assessment.reasoners.map((reasoner) => `${reasoner.id}@${reasoner.version}`);
    this.facts.set(stageId, {
      stageId,
      mathematicalDomain: assessment.domain,
      dependencyStageIds: [...dependencies],
      assessmentStepIndexes: assessment.steps.map((step) => offset + step.index),
      assumptionsAndRestrictions: [...new Set(assessment.domainRestrictions)],
      outstandingObligations: [...assessment.outstandingObligations],
      skills: [...assessment.skills],
      mathematicalEvidence: assessment.domainPayload,
      reasonerVersions,
      independentlyVerified: true,
    });
    for (const dependency of dependencies) this.edges.push({ from: dependency, to: stageId });
    return [];
  }

  snapshot(currentGoal: string | null): D2ProofStateSnapshot {
    return {
      version: D2_PROOF_STATE_VERSION,
      establishedFacts: [...this.facts.values()],
      currentGoal,
      completionEvidence: [...this.facts.keys()],
      dependencyEdges: [...this.edges],
    };
  }
}
