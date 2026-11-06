/**
 * deep-recovery@0 switch (RESEARCH). Off unless BOTH hold:
 *   1. the bundle was built for research: `node scripts/build-year.mjs --test --deep-recovery` defines OPENPATH_DEEP_RECOVERY=true.
 *      build-year.mjs refuses --deep-recovery without --test, and every other build defines it false, so in a production bundle
 *      this module is constant `false` and no URL, role or saved preference can turn it on;
 *   2. the page was opened with ?deep=1 (remembered in this browser until ?deep=0).
 */
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
