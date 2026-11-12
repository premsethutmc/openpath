/**
 * deep-recovery@0 switch (RESEARCH). Off unless BOTH hold:
 *   1. the bundle was built for research: `node scripts/build-year.mjs --test --deep-recovery` defines OPENPATH_DEEP_RECOVERY=true.
 *      A separate --deep-evaluation=integration-methods build enforces real review gates; ordinary builds define it false, so in a production bundle
 *      this module is constant `false` and no URL, role or saved preference can turn it on;
 *   2. the page was opened with ?deep=1 (remembered in this browser until ?deep=0).
 */
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
declare const OPENPATH_DEEP_RECOVERY: boolean;
export const DEEP_RECOVERY_BUILD: boolean = typeof OPENPATH_DEEP_RECOVERY !== "undefined" && OPENPATH_DEEP_RECOVERY === true;
const KEY = "openpath.deep-recovery@0";

export function deepRecoveryOn(build: boolean = DEEP_RECOVERY_BUILD, search: string = typeof location === "undefined" ? "" : location.search, storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof localStorage === "undefined" ? null : localStorage): boolean {
  if (!build) return false;
  const q = new URLSearchParams(search).get("deep");
  try {
    if (q === "1") storage?.setItem(KEY, "on");
    if (q === "0") storage?.removeItem(KEY);
    return q === "1" || (q !== "0" && storage?.getItem(KEY) === "on");
  } catch { return q === "1"; }
}

/** Build-time scope, independent of the educator-review test fixture. No URL can broaden it. */
declare const OPENPATH_DEEP_EVALUATION: string;
export const DEEP_EVALUATION = typeof OPENPATH_DEEP_EVALUATION !== "undefined" && OPENPATH_DEEP_EVALUATION === "integration-methods";
export function deepPathwayAllowed(records: { pathway?: { active: boolean; target: string } | null }, evaluation = DEEP_EVALUATION): boolean {
  return !evaluation || !!(records.pathway?.active && records.pathway.target === "MATH.calculus.integration-methods");
}

/**
 * The deep-recovery@0 research journeys were written against the shipped recovery before prereq-after-own@1 was on by default and
 * while the integers lesson was not teachable. With the research switch on (never in a shipped build) that baseline is kept, exactly
 * as the deep-recovery unit tests pin it. The evaluation build keeps the real gates.
 */
if (typeof OPENPATH_DEEP_RECOVERY !== "undefined" && OPENPATH_DEEP_RECOVERY === true && !(typeof OPENPATH_DEEP_EVALUATION !== "undefined" && OPENPATH_DEEP_EVALUATION === "integration-methods") && deepRecoveryOn()) { usePrerequisiteAfterOwn(false); useUnteachableFixture(["MATH.number.integers"]); }
