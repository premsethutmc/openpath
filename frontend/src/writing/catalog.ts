/** Input-enabled practice attached to existing competencies. Not a replacement curriculum. */
export const writingLessons = [
  {
    competency: "MATH.number.long-division",
    topic: "division",
    name: "Long division · work and check",
    problemId: "division:379:3",
    parameters: { dividend: 379, divisor: 3 },
  },
  {
    competency: "MATH.number.equivalent-fractions",
    topic: "fraction",
    name: "Equivalent fractions · work and check",
    problemId: "fraction:1:2",
    parameters: {},
  },
  {
    competency: "MATH.number.multiplication-tables",
    topic: "multiplication",
    name: "Equal groups · work and check",
    problemId: "multiplication:4:6",
    parameters: { groups: 4, size: 6 },
  },
] as const;
export const writingLessonFor = (id: string) =>
  writingLessons.find((l) => l.competency === id);
