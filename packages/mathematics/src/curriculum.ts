import curriculum from "../../../content/mathematics/curriculum.v1.json";
import exams from "../../../content/mathematics/exam-tracks.v1.json";
export const curriculumVersion = curriculum.version;
export const competencies = curriculum.competencies;
export const examTracks = exams.tracks;
export type Competency = (typeof competencies)[number];
export function validateGraph(
  nodes: readonly Competency[] = competencies,
): string[] {
  const errors: string[] = [],
    map = new Map(nodes.map((c) => [c.id, c]));
  if (map.size !== nodes.length) errors.push("Duplicate competency ID");
  const active = new Set<string>(),
    done = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      errors.push(`Cycle: ${id}`);
      return;
    }
    if (done.has(id)) return;
    const c = map.get(id);
    if (!c) {
      errors.push(`Missing: ${id}`);
      return;
    }
    active.add(id);
    if (!c.prerequisites.length && !c.rootJustification)
      errors.push(`Unjustified root: ${id}`);
    if (
      c.gradeRange[0] < 1 ||
      c.gradeRange[1] > 12 ||
      c.gradeRange[0] > c.gradeRange[1]
    )
      errors.push(`Grade: ${id}`);
    for (const p of c.prerequisites) visit(p);
    if (
      !c.objectives.length ||
      !c.demonstrationCriteria.length ||
      !c.misconceptions.length
    )
      errors.push(`Incomplete: ${id}`);
    if (
      c.curriculumMappings.length !== 2 ||
      c.curriculumMappings[1].source !== "tn" ||
      c.curriculumMappings[1].proposedGrades.length
    )
      errors.push(`Board mapping: ${id}`);
    active.delete(id);
    done.add(id);
  };
  nodes.forEach((c) => visit(c.id));
  for (let grade = 1; grade <= 12; grade++)
    if (!nodes.some((c) => c.gradeRange[0] === grade))
      errors.push(`Missing grade ${grade}`);
  return [...new Set(errors)];
}
export function coverage() {
  const grade: Record<string, number> = {},
    strand: Record<string, number> = {};
  competencies.forEach((c) => {
    grade[c.gradeRange[0]] = (grade[c.gradeRange[0]] ?? 0) + 1;
    strand[c.strand] = (strand[c.strand] ?? 0) + 1;
  });
  return { total: competencies.length, grade, strand };
}
