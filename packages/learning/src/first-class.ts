/** first-class@1: the first class (grade) in which any board's latest book teaches a skill — the class a skill "starts"
 * in. Worked out once from the reviewed curriculum releases (the same books the child app lists skills from). */
import { latestReleases } from "./curricula";
import { assigned } from "./curriculum";

let FIRST: Map<string, number> | null = null;
export function firstClassOf(competency: string): number | null {
  if (!FIRST) {
    FIRST = new Map();
    for (const r of latestReleases) for (const a of assigned(r)) if ((FIRST.get(a.competency) ?? 99) > r.grade) FIRST.set(a.competency, r.grade);
  }
  return FIRST.get(competency) ?? null;
}
