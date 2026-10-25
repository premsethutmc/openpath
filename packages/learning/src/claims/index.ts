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

export const MODULE_CLAIMS: ClaimTable = { ...a, ...b, ...c, ...d, ...e, ...f, ...g, ...h, ...i };
