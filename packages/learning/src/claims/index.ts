import type { ClaimTable } from "../claim-kit";
import { CLAIMS as a } from "./a-units-time-money";
import { CLAIMS as b } from "./b-place-round-compare";
import { CLAIMS as c } from "./c-arithmetic-division";
import { CLAIMS as d } from "./d-compare-fractions-misc";
import { CLAIMS as e } from "./e-units-conversion";
import { CLAIMS as f } from "./f-fractions";
import { CLAIMS as g } from "./g-sequences-patterns";
import { CLAIMS as h } from "./h-factors-number-properties";
import { CLAIMS as i } from "./i-arithmetic-leftovers";
import { CLAIMS as n } from "./n-other-grades";
import { CLAIMS as j, BASIS as bj } from "./j-clocks-time-volume";
import { CLAIMS as k, BASIS as bk } from "./k-charts-tables";
import { CLAIMS as l, BASIS as bl } from "./l-grids-symmetry";
import { CLAIMS as m, BASIS as bm } from "./m-solids-angles-lattice";

export const MODULE_CLAIMS: ClaimTable = { ...a, ...b, ...c, ...d, ...e, ...f, ...g, ...h, ...i, ...j, ...k, ...l, ...m, ...n };
/** What each Phase 3 claim relies on (keys not listed here are prompt-independent or kernel/convention claims). */
export const CLAIM_BASIS: Record<string, string> = { ...bj, ...bk, ...bl, ...bm };
