/**
 * Families by mathematical domain (families@2). Each file exports an array of family definitions written against the
 * contract in family-kit.ts (see GUIDE.md); families.ts adds them to the one registry (ids must be unique).
 */
import type { Def } from "../family-kit";
import { CORE } from "./core";
import { B01 } from "./b01";
import { B02 } from "./b02";
import { B03 } from "./b03";
import { B04 } from "./b04";
import { B05 } from "./b05";
import { B06 } from "./b06";
import { B07 } from "./b07";
import { B08 } from "./b08";
import { B09 } from "./b09";
import { B10 } from "./b10";
import { B11 } from "./b11";
import { B12 } from "./b12";
import { B13 } from "./b13";
import { B14 } from "./b14";
import { B15 } from "./b15";
import { B16 } from "./b16";
import { B17 } from "./b17";
import { B18 } from "./b18";
import { B19 } from "./b19";
import { B20 } from "./b20";
import { B22 } from "./b22";

export const DOMAIN_FAMILIES: Def[] = [...CORE, ...B01, ...B02, ...B03, ...B04, ...B05, ...B06, ...B07, ...B08, ...B09, ...B10, ...B11, ...B12, ...B13, ...B14, ...B15, ...B16, ...B17, ...B18, ...B19, ...B20, ...B22];

/** range@1: these families answer a probability, so an option above 1 or below 0 is never offered (a learner could rule
 * it out without the mathematics); the explanation behind such a prediction still diagnoses a typed answer. The
 * specification check refuses a probability family that does not declare its range. */
const PROBABILITY_ANSWERS = ["akchance", "akexp", "akdice", "anbag", "ancardn", "andice", "antree", "ancomp", "anunion", "asaddp", "asbayes", "astotp", "asbinom", "atpdfp", "atindu", "attotal"];
for (const d of DOMAIN_FAMILIES) if (PROBABILITY_ANSWERS.includes(d.id)) d.range ??= [0, 1];
/** A cosine or sine lies in [−1, 1] (an option outside it is ruled out without the mathematics); a length, distance
 * or area is never negative. atdbl answers sin 2A, cos 2A or tan 2A (its last parameter): only the first two are bounded. */
const RANGES: Record<string, Def["range"]> = {
  atang: [-1, 1], atcosr: [-1, 1], asangl: [-1, 1], atdbl: (p) => (p[3] === 2 ? null : [-1, 1]),
  asperpd: [0, Infinity], asskew: [0, Infinity], asplaned: [0, Infinity], atarea: [0, Infinity], arconicarea: [0, Infinity], altria: [0, Infinity],
};
for (const d of DOMAIN_FAMILIES) if (RANGES[d.id]) d.range ??= RANGES[d.id];
