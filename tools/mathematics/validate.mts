import {
  validateGraph,
  coverage,
  competencies,
  examTracks,
} from "../../packages/mathematics/src/curriculum";
import { families } from "../../packages/mathematics/src/generator";
import { programs } from "../../packages/mathematics/src/program";
const errors = validateGraph();
for (const c of competencies) {
  if (
    c.lessonProgram !== `${c.id}@${c.version}` ||
    !programs.some((p) => p.id === c.id && p.version === c.version)
  )
    errors.push(`Program reference ${c.id}`);
  for (const f of c.questionFamilies)
    if (!Object.hasOwn(families, f)) errors.push(`Unknown family ${f}`);
  if (
    !c.curriculumMappings.every((m) => ["ncert-cbse", "tn"].includes(m.source))
  )
    errors.push(`Unknown source ${c.id}`);
}
for (const t of examTracks) {
  for (const m of t.syllabusMapping)
    if (!competencies.some((c) => c.id === m.competencyId))
      errors.push(`Exam competency ${m.competencyId}`);
}
console.log(
  JSON.stringify(
    {
      version: "1.0.0",
      ...coverage(),
      programs: programs.length,
      executablePrograms: programs.filter((p) => p.families.length).length,
      families: Object.keys(families).length,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
