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

export const DOMAIN_FAMILIES: Def[] = [...CORE, ...B01, ...B02, ...B03, ...B04, ...B05, ...B06, ...B07, ...B08, ...B09, ...B10, ...B11, ...B12, ...B13, ...B14, ...B15, ...B16, ...B17, ...B18, ...B19, ...B20];
