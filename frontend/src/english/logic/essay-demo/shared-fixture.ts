/** Typed, synthetic examples of Claude's published contract. No live assessment or inference. */
import {
  ESSAY_CONTRACT,
  ESSAY_OBSERVE_PROTOCOL,
  ESSAY_REWRITE_PROTOCOL,
  type CompetencyStatus,
  type EssayAnalysis,
  type EssayLearnerProfile,
  type EssaySubmission,
  type LearningJourney,
  type RewriteEvaluation,
  type WritingArea,
  type RewriteDimension,
} from "../../../../../packages/english-core/src/essay/contract";
import {
  CAPABILITIES,
  SAMPLE_ESSAY,
  SAMPLE_REWRITE,
  REWRITE_FEEDBACK,
  type DemoCompetencyId,
  type DemoScene,
  type PresentationStatus,
} from "./fixtures";
export const CONTRACT_SOURCE = "447a56d71a00ac9965516f099d01253594e5e6ad";
const AT = "2026-10-18T00:00:00Z";
export const BINDINGS: Record<
  DemoCompetencyId,
  { capability: string; area: WritingArea }
> = {
  grammar: { capability: "EN.GRM.VERB.sva", area: "grammar" },
  prepositions: { capability: "EN.GRM.PREP.dependent", area: "prepositions" },
  "sentence-structure": {
    capability: "EN.SEN.CMB.coordination",
    area: "sentence_structure",
  },
  vocabulary: { capability: "EN.VOC.USE.word_choice", area: "vocabulary" },
  coherence: { capability: "EN.SEN.COH.connectives", area: "coherence" },
  "concise-writing": { capability: "EN.SEN.PRE.concision", area: "concision" },
};
export function presentationStatus(c: CompetencyStatus): PresentationStatus {
  // Display mapping only: states and hypotheses have already been supplied by the shared projection.
  if (c.state === "verified" && c.engine.verification === "verified")
    return "verified";
  if (c.state === "demonstrated") return "independently-demonstrated";
  if (c.gap?.status === "confirmed") return "learning";
  if (c.state === "unknown") return "not-started";
  return "needs-verification";
}
export function sharedFixture(
  scenes: Partial<Record<DemoCompetencyId, DemoScene>>,
  rewritten: boolean,
) {
  const evaluator = {
    id: "fixture:essay-ux",
    version: "1",
    protocol: ESSAY_OBSERVE_PROTOCOL,
  };
  const submission: EssaySubmission = {
    contract: ESSAY_CONTRACT,
    id: "fixture:school-garden",
    learner: "fixture:writer",
    session: "fixture:session",
    at: AT,
    text: SAMPLE_ESSAY,
    words: 114,
    fingerprint: "fixture:school-garden-v1",
    source: {
      kind: "synthetic",
      prompt: "Should schools create more green spaces?",
      genre: "persuasive",
      grade: 8,
      profile: "openpath.g8-writing@1",
      dataUse: "synthetic_test",
    },
  };
  const observations = CAPABILITIES.map((c, index) => {
    const quote =
      c.id === "coherence"
        ? "However, each class could look after a small area."
        : c.quote.slice(1, -1).replace(/…$/u, "");
    const start = SAMPLE_ESSAY.indexOf(quote);
    if (start < 0) throw Error("Invalid synthetic evidence span");
    return {
      id: `fixture:observation:${c.id}`,
      essay: submission.id,
      competency: BINDINGS[c.id].capability,
      area: BINDINGS[c.id].area,
      kind:
        index === 2 || index === 3 || index === 4
          ? ("strength" as const)
          : ("error" as const),
      span: {
        quote,
        start,
        end: start + quote.length,
        sentence: (SAMPLE_ESSAY.slice(0, start).match(/[.!?](?:\s|$)/g) ?? [])
          .length,
      },
      confidence: "low" as const,
      note: c.reason,
      evaluator,
    };
  });
  const analysis: EssayAnalysis = {
    contract: ESSAY_CONTRACT,
    id: "fixture:analysis",
    essay: submission.id,
    evaluator,
    status: "accepted",
    reasons: [
      "Synthetic storyboard; no submitted answer or edited draft was assessed.",
    ],
    observations,
    rejected: [],
    notObservable: [],
  };
  const competencies: CompetencyStatus[] = CAPABILITIES.map((c) => {
    const scene = scenes[c.id],
      demonstrated = scene === "independent";
    const observed = c.id === "coherence";
    const state = demonstrated
      ? "demonstrated"
      : scene ||
          c.id === "grammar" ||
          c.id === "prepositions" ||
          c.id === "concise-writing"
        ? "suspected"
        : observed
          ? "observed"
          : "unknown";
    return {
      competency: BINDINGS[c.id].capability,
      name: c.name,
      area: BINDINGS[c.id].area,
      state,
      gap:
        state === "suspected"
          ? {
              id: `fixture:gap:${c.id}`,
              competency: BINDINGS[c.id].capability,
              status:
                scene && scene !== "introduced" ? "confirmed" : "suspected",
              uncertainty: "high",
              essays: [submission.id],
              observations: [`fixture:observation:${c.id}`],
              misconceptions: [],
              basis: [
                "Fictional prewritten diagnostic state, not inferred from this response.",
              ],
              engine: "not_demonstrated",
              policy: "fixture:storyboard-only",
            }
          : null,
      engine: {
        stage: demonstrated ? "demonstrated" : "unassessed",
        verification: demonstrated ? "demonstrated" : "not_demonstrated",
        // essay-contract@1 as of e1c6405: the engine's supported level and the grade target (none in the fixture)
        currentLevel: null,
        target: null,
        demonstrated: null,
        mastered: null,
        directN: demonstrated ? 2 : 0,
      },
      essays: {
        errors: state === "suspected" ? 1 : 0,
        strengths: observed ? 1 : 0,
        essays: 1,
      },
      provenance: {
        tentative: [`fixture:observation:${c.id}`],
        independent: demonstrated
          ? [`fixture:historical:${c.id}:1`, `fixture:historical:${c.id}:2`]
          : [],
        assisted: scene === "guided" ? [`fixture:guided:${c.id}`] : [],
        held: [],
      },
      notes: [
        "Synthetic projection only. No real learner evidence was created.",
      ],
    };
  });
  const profile: EssayLearnerProfile = {
    contract: ESSAY_CONTRACT,
    learner: submission.learner,
    asOf: AT,
    profile: submission.source.profile,
    competencies,
    essays: [
      {
        id: submission.id,
        at: AT,
        words: submission.words,
        fingerprint: submission.fingerprint,
      },
    ],
    journeys: ["fixture:journey"],
    rewrites: rewritten
      ? [{ id: "fixture:rewrite", essay: submission.id, at: AT }]
      : [],
  };
  const journey: LearningJourney = {
    contract: ESSAY_CONTRACT,
    id: "fixture:journey",
    essay: submission.id,
    learner: submission.learner,
    at: AT,
    policy: "fixture:storyboard-only",
    trees: CAPABILITIES.map((c) => ({
      root: BINDINGS[c.id].capability,
      nodes: [
        {
          competency: BINDINGS[c.id].capability,
          role: "target",
          requires: [],
          reason: "Synthetic UX path; no engine selected these steps.",
          green: false,
          level: scenes[c.id] === "independent" ? "demonstrated" : "none",
          steps: (
            [
              "diagnose",
              "teach",
              "guided_practice",
              "independent_check",
            ] as const
          ).map((kind, order) => ({
            id: `fixture:step:${c.id}:${kind}`,
            competency: BINDINGS[c.id].capability,
            kind,
            order,
            content: {
              available: true,
              refs: [`fixture:content:${c.id}`],
              note: "Unreviewed synthetic demonstration only",
            },
            status:
              (scenes[c.id] && scenes[c.id] !== "introduced" && order === 0) ||
              scenes[c.id] === "independent"
                ? "done"
                : "pending",
            evidence: [],
            reason: "Storyboard completion never makes a step green.",
          })),
        },
      ],
    })),
    skipped: [],
    contentGaps: [],
    limits: { maxTrees: 6, maxStepsPerNode: 4, totalSteps: 24 },
    finalRewrite: {
      available: rewritten || Object.values(scenes).includes("independent"),
      reason: Object.values(scenes).includes("independent")
        ? "The fixture storyboard now permits the final challenge. This is not a live policy decision."
        : "First explore a competency and try its independent example. The shared policy will control this gate when connected.",
    },
    complete: false,
  };
  const dimensions: RewriteDimension[] = [
    "meaning_preservation",
    "clarity",
    "grammar",
    "concision",
  ];
  const rewrite: RewriteEvaluation | null = rewritten
    ? {
        contract: ESSAY_CONTRACT,
        rewrite: "fixture:rewrite",
        essay: submission.id,
        evaluator: { ...evaluator, protocol: ESSAY_REWRITE_PROTOCOL },
        words: { count: 50, limit: 50, min: 50, within: true },
        dimensions: dimensions.map((d, index) => ({
          dimension: d,
          rating: null,
          quotes: [],
          note: REWRITE_FEEDBACK[index].text,
          status: "not_assessed",
        })),
        keyIdeas: [],
        status: "evaluated",
        reasons: ["Prewritten UI fixture, not actual evaluation."],
        affectsEstimates: false,
        verifiesCompetencies: false,
        artifacts: { original: submission.id, revised: "fixture:rewrite" },
      }
    : null;
  return {
    contract: ESSAY_CONTRACT,
    submission,
    analysis,
    profile,
    journey,
    rewrite,
    sampleRewrite: SAMPLE_REWRITE,
  };
}
