/**
 * lesson-checks@1: automatic checks for the kinds of defect the Grade 8 sample reviews found by reading
 * (docs/milestones/GRADE8_REVIEW_2.md). Each check looks at a lesson AS A LEARNER OF A GIVEN GRADE SEES IT (the lesson page:
 * teachingLesson with that grade, built from the page's own practice candidates). The counts are a ratchet
 * (content/learning/lesson-checks-baseline.v1.json): lesson-checks.test.ts fails when a count rises; a fix lowers it with
 * `bun packages/learning/scripts/lesson-checks.ts --write-baseline`. A finding is a pointer for a person, not a verdict:
 * these checks are heuristics on the text and can miss a defect or flag a sound section.
 *
 * Not checkable this way (left to review): whether a misconception's stated reason is true (M3), outcomes no family covers
 * (M7, M8, M11: the gap report lists unmapped outcomes only), unrealistic contexts, the engine repeating one explanation.
 */
import { needsMarking, question, type Module } from "./content";
import { FAMILIES, gradeOfQuestion, parseProblem, problemKeyOf, problemOf } from "./families";
import { modulePhasePool } from "./library";
import { lessonScreens, teachingLesson, type LessonBlock } from "./teaching-contract";
import { teachingScopeFor } from "./teaching-presentation";

export const CHECKS = {
  "mixed-example": "A section draws or names one question while its working, tip or picture was written for another (M1, M2, m3)",
  "exponent-as-factor": "A step explanation multiplies by an exponent: 0 × 4³ explained as 0 × 4 × 3 (M4)",
  "above-grade-section": "A learner's lesson shows a section from a later grade (must stay 0: grade-order@1)",
  "no-on-grade-section": "No section of the learner's lesson is on their grade though the module has questions on it, or every graded section is 3+ grades below (M5, M6)",
  "empty-step-reason": "A worked step that is a bare calculation with no explanation (m1; counted per step)",
  "misconception-no-reason": "A misconception section gives the wrong answer but no reason for it (m2)",
  "picture-missing": "The words refer to a picture the section does not draw (m5, m6)",
  "option-not-shown": "Working cites an option letter but the section lists no options (m10)",
  "factorial-early": "Factorial notation (n!) before Grade 11 (m9)",
  "singular-plural": "A count of 1 with a plural noun: \"there are 1\", \"1 parts\" (m14)",
  "single-type-practice": "Six or more of the first eight practice questions from one family when others are available (m12)",
} as const;
export type CheckId = keyof typeof CHECKS;
export interface Finding { check: CheckId; competency: string; section?: string; detail: string }

const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const strip = (id: string) => id.replace(/:(mc|w)$/, "");
const g = (id: string | null) => (id ? gradeOfQuestion(strip(id)) : null);

/** The lesson page's practice candidates (as frontend/src/curriculum/TeachingContent.tsx builds them). */
export function pageCandidates(m: Module): string[] {
  const scope = teachingScopeFor(m);
  return [...new Set([...modulePhasePool(m, "practice"), ...m.practice, ...m.transfer])].filter((id) => {
    if (needsMarking(question(id))) return false;
    const p = problemOf(id);
    return !!p && scope.accepts(p);
  });
}

/** Detectors on one section (exported for tests on hand-made sections). */
export const detect = {
  /** b^e (superscript or ^) in an expression whose explanation contains "b × e" as a product (b ≠ e). */
  exponentAsFactor(expression: string, explanation: string): boolean {
    const powers = [...expression.matchAll(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g)].map((m) => [m[1], [...m[2]].map((c) => SUP[c]).join("")] as const)
      .concat([...expression.matchAll(/(\d+)\^(\d+)/g)].map((m) => [m[1], m[2]] as const));
    return powers.some(([b, e]) => b !== e && new RegExp(`(^|[^\\d])${b} × ${e}(?![\\d⁰-⁹.])`).test(explanation));
  },
  misconceptionNoReason(b: Pick<LessonBlock, "role" | "text" | "tip">): boolean {
    return b.role === "misconception" && !b.tip && b.text.every((l) => /common wrong answer is/i.test(l) || !l.trim());
  },
  pictureMissing(b: LessonBlock, words: string[]): boolean {
    const drawn = !!(b.figure || b.representation || b.visual || b.widget);
    return !drawn && words.some((w) => /\b(as in the picture|in the picture|the picture shows|the diagram shows|in the diagram|the figure shows|shown in the figure)\b/i.test(w));
  },
  optionNotShown(b: LessonBlock, working: string[]): boolean {
    return !b.worked?.options?.length && working.some((w) => /\boption [A-F]\b/.test(w));
  },
  factorial(words: string[]): boolean {
    return words.some((w) => /(\b\d+|\bn|\))!(?!=)/.test(w));
  },
  singularPlural(words: string[]): boolean {
    // not inside a list or an expression ("1, 3, 3, 1 times", "3n + 1 sticks")
    return words.some((w) => /\bthere are 1\b|(?<![\d.,+−×÷=-]\s)(?<![\d.,])\b1 (parts|ways|pairs|times|days|people|children|coins|groups|items|sticks|values|numbers|squares|cubes|marks)\b/.test(w));
  },
};

/** Every finding for one module's lesson as a learner in `grade` sees it. */
export function lessonChecks(m: Module, grade: number): Finding[] {
  const out: Finding[] = [];
  const add = (check: CheckId, section: string | undefined, detail: string) => out.push({ check, competency: m.competency, section, detail });
  const candidates = pageCandidates(m);
  const lesson = teachingLesson(m, candidates, grade);
  const screens = lessonScreens(m);
  for (const b of lesson.blocks) {
    const steps = b.worked?.steps ?? [];
    const words = [...b.text, ...(b.lines ?? []), b.tip ?? "", b.worked?.question ?? "", ...steps.flatMap((s) => [s.expression, s.explanation])];
    const working = [...(b.lines ?? []), ...steps.flatMap((s) => [s.expression, s.explanation])];
    // the screen this section was built from (same title): its own question, when it names one
    const screen = screens.find((x) => x.screen.title === b.title)?.screen;
    const own = screen?.instance ?? (screen?.math?.[0] ? (() => { const p = parseProblem(screen.math![0]); return p.supported ? p.problem.id : null; })() : null);
    // only when the working or tip quotes numbers of the other question that the question shown does not have (a generic tip
    // written once for the family is not a mismatch)
    if (own && b.instance && problemKeyOf(strip(own)) !== problemKeyOf(strip(b.instance))) {
      const nums = (t: string) => new Set(t.match(/\d+(?:\.\d+)?/g) ?? []);
      const shown = nums(`${question(strip(b.instance)).prompt} ${(question(strip(b.instance)).options ?? []).join(" ")} ${question(strip(b.instance)).answer}`);
      const theirs = nums(`${question(strip(own)).prompt} ${question(strip(own)).answer}`);
      const foreign = (t: string) => [...nums(t)].filter((n) => theirs.has(n) && !shown.has(n) && n.length + (n.includes(".") ? 0 : 1) > 1);
      const where = [(b.lines ?? []).some((l) => foreign(l).length) ? "working" : "", b.tip && foreign(b.tip).length ? "tip" : ""].filter(Boolean);
      if (where.length) add("mixed-example", b.title, `shows ${b.instance} but its ${where.join(" and ")} quote${where.length > 1 ? "" : "s"} ${own} (${[...new Set([...(b.lines ?? []), b.tip ?? ""].flatMap(foreign))].slice(0, 4).join(", ")})`);
    }
    for (const s of steps) if (detect.exponentAsFactor(s.expression, s.explanation)) add("exponent-as-factor", b.title, `${s.expression} — ${s.explanation}`);
    // a bare calculation with no explanation (a step whose expression already says why in words is not counted)
    for (const s of steps) if (!s.explanation.trim() && !/[A-Za-z]{3,}/.test(s.expression)) add("empty-step-reason", b.title, s.expression);
    const ig = g(b.instance);
    if (ig !== null && ig > grade) add("above-grade-section", b.title, `${b.instance} is Grade ${ig}`);
    if (detect.misconceptionNoReason(b)) add("misconception-no-reason", b.title, b.text[0]?.slice(0, 120) ?? "");
    if (detect.pictureMissing(b, [...b.text, ...(b.lines ?? [])])) add("picture-missing", b.title, "words refer to a picture; none is drawn");
    if (detect.optionNotShown(b, working)) add("option-not-shown", b.title, working.find((w) => /\boption [A-F]\b/.test(w)) ?? "");
    if (grade < 11 && detect.factorial(words)) add("factorial-early", b.title, words.find((w) => detect.factorial([w])) ?? "");
    if (detect.singularPlural(words)) add("singular-plural", b.title, words.find((w) => detect.singularPlural([w])) ?? "");
  }
  // level: the module has on-grade questions, yet no section of the lesson is on grade (or ungraded)
  const graded = lesson.blocks.map((b) => g(b.instance)).filter((x): x is number => x !== null);
  const sectionGrades = [...new Set(graded)].sort((a, b) => a - b).join("/");
  if (candidates.some((id) => g(id) === grade) && lesson.blocks.some((b) => b.instance) && !lesson.blocks.some((b) => b.instance && (g(b.instance) === null || g(b.instance)! >= grade)))
    add("no-on-grade-section", undefined, `sections are Grade ${sectionGrades}; the module has Grade ${grade} questions`);
  else if (graded.length && graded.every((x) => x <= grade - 3)) add("no-on-grade-section", undefined, `every graded section is Grade ${sectionGrades} for a Grade ${grade} learner`);
  // practice variety: the first eight, by family, when the candidates hold more than one family
  const fam = (id: string) => problemOf(strip(id))?.family ?? id;
  const first = lesson.practice.slice(0, 8), families = new Set(lesson.practice.map(fam));
  if (first.length >= 8 && families.size > 1) {
    const top = [...first.reduce((c, id) => c.set(fam(id), (c.get(fam(id)) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];
    if (top[1] >= 6) add("single-type-practice", undefined, `${top[1]} of the first 8 are ${top[0]} (${FAMILIES.get(top[0])?.title ?? ""}); ${families.size} families available`);
  }
  return out;
}

export const countByCheck = (fs: Finding[]) => Object.fromEntries((Object.keys(CHECKS) as CheckId[]).map((c) => [c, fs.filter((f) => f.check === c).length])) as Record<CheckId, number>;
