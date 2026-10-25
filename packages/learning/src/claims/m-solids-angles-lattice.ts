import type { ClaimTable } from "../claim-kit";

/** Phase 3 claims: m-solids-angles-lattice. */
export const CLAIMS: ClaimTable = {};
/** For each key: "prompt-independent" (facts come from the prompt text or params) or "figure-consistent" (the only source is the data of the picture the family emitted). */
export const BASIS: Record<string, "prompt-independent" | "figure-consistent"> = {};
