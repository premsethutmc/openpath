/** The six versioned synthetic learner profiles (profiles/*.json, schema synthetic-learner-profile@1). */
import { readFileSync } from "node:fs";
import { KINDS, MISCONCEPTIONS, type Profile } from "./model";
export const PROFILE_IDS = ["S001", "S002", "S003", "S004", "S005", "S006"] as const;
const dir = new URL("../profiles/", import.meta.url);
export function validateProfile(p: Profile): string[] {
  const e: string[] = [];
  if (p.schema !== "synthetic-learner-profile@1") e.push("schema");
  if (!/^\d+\.\d+\.\d+$/.test(p.version)) e.push("version");
  if (!Number.isInteger(p.seed)) e.push("seed");
  for (const k of KINDS) if (!(p.skills[k] >= 0 && p.skills[k] <= 1)) e.push(`skill ${k}`);
  for (const [m, v] of Object.entries(p.misconceptions)) if (!(MISCONCEPTIONS as readonly string[]).includes(m) || !(v >= 0 && v <= 1)) e.push(`misconception ${m}`);
  const w = p.working; if (Math.abs(w.full + w.partial + w.bare + w.none - 1) > 1e-9) e.push("working styles must sum to 1");
  if (p.instruction.full + p.instruction.partial > 1) e.push("instruction outcomes exceed 1");
  if (!(p.forgetting.halfLifeDays > 0 && p.forgetting.fragileHalfLifeDays > 0)) e.push("half-lives");
  return e;
}
export function loadProfile(id: string): Profile {
  const p = JSON.parse(readFileSync(new URL(`${id}.json`, dir), "utf8")) as Profile;
  const e = validateProfile(p); if (e.length) throw new Error(`profile ${id} invalid: ${e.join(", ")}`);
  return p;
}
export const loadProfiles = () => PROFILE_IDS.map(loadProfile);
