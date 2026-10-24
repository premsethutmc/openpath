/**
 * Question decomposition (decomposition@1): an advanced problem is stored with the competencies it needs and with
 * independently assessable fragments. A learner sees only fragments allowed for their grade AND whose readiness rule
 * their own evidence meets; the full problem appears only when its grade and readiness rules are met. A fragment never
 * contains the original problem's text, and every fragment keeps the problem id and competency links (traceability).
 */
import { problems, type Fragment, type Problem } from "./content";
import type { SkillEvidence } from "./evidence";

const shown = (e: SkillEvidence) => e.status === "independent" || e.status === "transfer" || e.status === "verified";

export interface Offer {
  problem: Problem;
  full: Fragment | null;
  fragments: Fragment[];
  hidden: { id: string; why: string }[];
}

export function offersFor(grade: number, ev: (id: string) => SkillEvidence): Offer[] {
  return problems.map((p) => {
    const hidden: Offer["hidden"] = [];
    const ok = (f: Fragment) => {
      if (grade < f.minGrade) return hidden.push({ id: f.id, why: `for Grade ${f.minGrade} and above` }), false;
      if (f.maxGrade !== undefined && grade > f.maxGrade) return hidden.push({ id: f.id, why: `for Grades ${f.minGrade}–${f.maxGrade}` }), false;
      const missing = f.readiness.filter((r) => !shown(ev(r)));
      if (missing.length) return hidden.push({ id: f.id, why: `after showing ${missing.join(", ")}` }), false;
      return true;
    };
    const full = ok(p.full) ? p.full : null;
    const fragments = full ? [] : p.fragments.filter(ok);
    return { problem: p, full, fragments, hidden };
  });
}

/** Where a fragment came from (for traceability in the UI and in reports). */
export function trace(fragmentId: string) {
  for (const p of problems) {
    const f = [p.full, ...p.fragments].find((x) => x.id === fragmentId);
    if (f) return { problem: p.id, title: p.title, fragment: f.id, isFull: f === p.full, competencies: f.competencies, problemCompetencies: p.competencies, source: p.source, licence: p.licence, validation: p.validation };
  }
  return null;
}
