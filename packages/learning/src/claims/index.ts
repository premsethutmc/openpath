import type { ClaimTable } from "../claim-kit";
import { CLAIMS as a } from "./a-units-time-money";
import { CLAIMS as b } from "./b-place-round-compare";
import { CLAIMS as c } from "./c-arithmetic-division";
import { CLAIMS as d } from "./d-compare-fractions-misc";

export const MODULE_CLAIMS: ClaimTable = { ...a, ...b, ...c, ...d };
