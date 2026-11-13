/**
 * parent-view@1: what a parent is shown about one learner's Maths. Counts of what happened, nothing estimated:
 * questions answered, how many were right at the first try without help, which days, which skills, and where help was
 * needed. It says what the learner DID; it never says a skill is learned (that is the engine's "verified", shown apart).
 */
export interface ReportAttempt { at: string; competency: string; hints: number; solution: boolean; n: number; activity: string }
export interface SkillLine { competency: string; name: string; answered: number; rightFirstTry: number; helped: number; last: string; verdict: "going_well" | "needs_help" | "in_progress" }
export interface ParentReport {
  lastActive: string | null;
  today: { answered: number; rightFirstTry: number };
  week: { answered: number; rightFirstTry: number; activeDays: number; lessons: number };
  /** the last seven days, oldest first; `day` is the local date (YYYY-MM-DD) */
  days: { day: string; label: string; answered: number }[];
  /** skills worked on in the last 14 days, most recent first */
  skills: SkillLine[];
  /** today-plan@1: days in a row with at least one question answered, counted back from today (or from yesterday when
   *  nothing has been answered yet today: the run is still alive until the day ends) */
  streak: number;
}

const DAY = 86_400_000;
const localDay = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * `right(a)`: the engine's own decision that the answer was right. `name(c)`: the skill's name.
 * A skill "needs help" when, of at least three questions, fewer than half were right at the first try without help, or the
 * full solution was opened twice or more; it is "going well" when, of at least three, four in five or more were.
 */
export function parentReport<A extends ReportAttempt>(input: { attempts: readonly A[]; teaching: readonly { at: string; competency: string }[] }, right: (a: A) => boolean, name: (competency: string) => string, now: number): ParentReport {
  const first = (a: A) => a.n === 1 && a.hints === 0 && !a.solution && a.activity !== "guided" && right(a);
  const when = (a: { at: string }) => Date.parse(a.at);
  const all = input.attempts.filter((a) => Number.isFinite(when(a)) && when(a) <= now);
  const today = localDay(now);
  // the seven local days ending today (noon is used so a daylight-saving change cannot skip or repeat a day)
  const noon = new Date(now); noon.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => { const t = noon.getTime() - (6 - i) * DAY; return { day: localDay(t), label: i === 6 ? "Today" : WEEKDAY[new Date(t).getDay()], answered: 0 }; });
  const inWeek = new Set(days.map((d) => d.day));
  const week = { answered: 0, rightFirstTry: 0, activeDays: 0, lessons: 0 };
  const todayCount = { answered: 0, rightFirstTry: 0 };
  for (const a of all) {
    const d = localDay(when(a));
    if (!inWeek.has(d)) continue;
    week.answered++;
    days.find((x) => x.day === d)!.answered++;
    if (first(a)) week.rightFirstTry++;
    if (d === today) { todayCount.answered++; if (first(a)) todayCount.rightFirstTry++; }
  }
  week.activeDays = days.filter((d) => d.answered > 0).length;
  week.lessons = input.teaching.filter((t) => inWeek.has(localDay(when(t)))).length;
  const recent = all.filter((a) => now - when(a) <= 14 * DAY);
  const by = new Map<string, A[]>();
  for (const a of recent) by.set(a.competency, [...(by.get(a.competency) ?? []), a]);
  const skills: SkillLine[] = [...by].map(([competency, list]) => {
    const answered = list.length, rightFirstTry = list.filter(first).length;
    const helped = list.filter((a) => a.hints > 0 || a.solution || a.activity === "guided").length;
    const solutions = list.filter((a) => a.solution).length;
    const verdict: SkillLine["verdict"] = answered >= 3 && (rightFirstTry * 2 < answered || solutions >= 2) ? "needs_help" : answered >= 3 && rightFirstTry * 5 >= answered * 4 ? "going_well" : "in_progress";
    return { competency, name: name(competency), answered, rightFirstTry, helped, last: list.reduce((m, a) => (a.at > m ? a.at : m), ""), verdict };
  }).sort((a, b) => (a.last < b.last ? 1 : -1));
  const lastActive = all.reduce<string | null>((m, a) => (!m || a.at > m ? a.at : m), null);
  const active = new Set(all.map((a) => localDay(when(a))));
  let streak = 0;
  for (let i = active.has(today) ? 0 : 1; active.has(localDay(noon.getTime() - i * DAY)); i++) streak++;
  return { lastActive, today: todayCount, week, days, skills, streak };
}
