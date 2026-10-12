/**
 * Pass levels for the ten-learner simulation, FROZEN before the first full run
 * (see git history: this file is committed before any simulation results).
 *
 * They operationalise SELECTION_AND_SIMULATION.md §3.3. Where the plan's
 * wording could not be applied literally, the change and the reason are given
 * here, decided from the design and the item bank, not from results.
 *
 * What the simulation can and cannot show: the simulated learners answer
 * according to OpenPath's own response model. Passing shows the engine is
 * internally consistent and can tell profiles apart under its own assumptions.
 * It does not show that real learners behave this way, that item difficulties
 * are right, or that anyone's English improves (A-27).
 */

export const PROTOCOL = {
  /** Session days and items per session (6 × 20 = 120 items). */
  sessionDays: [0, 1, 8, 15, 16, 22],
  itemsPerSession: 20,
  /** "After about 40 items (two sessions)". */
  earlyCheckAfterSessions: 2,
  goal: "overall",
  evaluatorNoise: 0.7,
  seed: 20261012,
};

export const CRITERIA = {
  /**
   * M1 Profile recovery: mean Spearman rank correlation between true and
   * estimated strand values after 2 sessions (40 items).
   * Literal plan: "across L1–L8". Change: computed for learners whose true
   * strand profile is not flat (L2, L3, L4, L5, L6, L8). For flat profiles
   * (L1, L7) a rank correlation is undefined; they are covered by M3 and M6.
   */
  profileRecovery: { learners: ["L2", "L3", "L4", "L5", "L6", "L8"], minMeanSpearman: 0.8 },

  /**
   * M2 Weakest strand named correctly at the end.
   * Literal plan: "at least 8 of the 10". Change: only 7 learners have a
   * unique true weakest strand by design (L1, L7, L9 are flat); pass level
   * scaled to at least 6 of those 7 (the same tolerance of about one miss in eight).
   */
  weakestStrand: { learners: ["L2", "L3", "L4", "L5", "L6", "L8", "L10"], minCorrect: 6 },

  /** M3 Separation: each pair differs on its distinguishing node by more than the sum of both sds (end of run). */
  separation: [
    { a: "L3", b: "L4", node: "EN.GRM" },
    { a: "L4", b: "L5", node: "EN.VOC" },
    { a: "L4", b: "L5", node: "EN.GRM" },
    { a: "L6", b: "L1", node: "EN.RDG.INF.motives" },
    { a: "L2", b: "L1", node: "EN.FND" },
    { a: "L8", b: "L1", node: "EN.SEN.CMP.run_ons" },
    { a: "L7", b: "L1", node: "EN" },
    { a: "L3", b: "L1", node: "EN.WRT" },
  ],

  /** M4 Honest uncertainty: share of 80% intervals (directly observed capabilities, end of run) containing the true value. */
  coverage: { level: 0.8, min: 0.7, max: 0.9 },

  /**
   * M5 Efficiency: adaptive vs random order over the 32 grammar items (goal:
   * the four grammar capabilities), items needed until their mean sd ≤ the
   * threshold, averaged over the 10 learners (random: 5 seeds each).
   * Literal plan: sd ≤ 0.6. Change: 0.8, because with 8 items per grammar
   * capability in the E1 bank, sd 0.6 is not reachable in any order
   * (analytically, all 8 items give about 0.64). Pass ratio unchanged: 0.7.
   */
  efficiency: { sdThreshold: 0.8, maxRatio: 0.7, randomSeeds: 5 },

  /**
   * M6 Robustness.
   * Guesser (L9): no strand estimate more than 1.0 from the truth, and the
   * estimated strand range no wider than 1.2 (the true profile is flat).
   * Forgetter (L10): at the end, at least 2 of the 4 grammar capabilities are
   * in "needs review" or estimated at or below 4.3, and none is reported as
   * mastered above 4.0.
   */
  robustness: { guesserMaxError: 1.0, guesserMaxRange: 1.2, forgetterMinFlagged: 2, forgetterFlagAt: 4.3, forgetterMaxMastered: 4.0 },

  /** M7 Safety: faulty evaluator output applied, across all injected faults. */
  safety: { maxApplied: 0 },

  /** M8 Determinism: two runs with the same seed give byte-identical results. */
  determinism: true,
};
