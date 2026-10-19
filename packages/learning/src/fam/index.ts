/**
 * Families by mathematical domain (families@2). Each file exports an array of family definitions written against the
 * contract in family-kit.ts (see GUIDE.md); families.ts adds them to the one registry (ids must be unique).
 */
import type { Def } from "../family-kit";
import { CORE } from "./core";

export const DOMAIN_FAMILIES: Def[] = [...CORE];
