/**
 * Read trial summaries (the files guardians save from Settings → "Save a trial summary") and print one
 * readable report: learning (words, patterns, spelling level) and usability (time, stops, ratings,
 * notes, reported questions). Runs on the product owner's computer; nothing is sent anywhere.
 *
 *   node tools/english/pilot/report.ts summary1.json summary2.json … [> report.md]
 *
 * With several summaries from the same learner (say, one a week), the latest is reported in full and
 * the word statuses are shown week by week, so change over time is visible.
 */
import { readFileSync } from "node:fs";

type Summary = {
  format: string;
  version: number;
  made_at: string;
  content: { mode: string };
  learner: { code: string; set_up_by: string; started: string | null };
  device: { speech: boolean; width?: number; standalone?: boolean };
  activity: { days_active: number; sessions: number; questions: number; minutes: number; median_seconds_per_question: number | null; sessions_stopped_early: number };
  sessions: { type: string; started: string; how: string; minutes: number; questions: number; rightFirstTime: number; secondTries: number; pauses: number; rating: string | null }[];
  spelling: {
    words: { counts: Record<string, number>; list: { word: string; status: string; retention_passed: number; retention_failed: number; misspellings: string[]; assisted: number }[] };
    patterns: { title: string; status: string; check: string | null; practice_recent: string | null; transfers: string[] }[];
    proficiency: { name: string; certainty: string; range: string | null }[];
  };
  grammar_and_vocabulary: { name: string; certainty: string; range: string | null }[];
  usability: { ratings: Record<string, number>; notes: { at: string; screen: string; text: string }[]; reported_questions: { at: string; item: string; note: string }[]; lessons_read: number; lesson_checks_right: number };
};

const STATUSES = ["mastered", "retained", "recalled", "learning", "met"];

export function report(summaries: Summary[]): string {
  for (const s of summaries) if (s.format !== "openpath-english-pilot-summary" || s.version !== 1) throw new Error("not an OpenPath trial summary (version 1)");
  const byLearner = new Map<string, Summary[]>();
  for (const s of summaries) byLearner.set(s.learner.code, [...(byLearner.get(s.learner.code) ?? []), s]);
  const out: string[] = [`# OpenPath English trial report`, ``, `${summaries.length} summar${summaries.length === 1 ? "y" : "ies"} from ${byLearner.size} learner${byLearner.size === 1 ? "" : "s"}. Small numbers: read these as observations about individuals, not as evidence that the method works.`, ``];
  for (const [code, list] of byLearner) {
    list.sort((a, b) => a.made_at.localeCompare(b.made_at));
    const s = list[list.length - 1];
    const a = s.activity;
    out.push(`## Learner ${code}`, ``);
    out.push(`Set up by ${s.learner.set_up_by}; started ${s.learner.started?.slice(0, 10) ?? "?"}; latest summary ${s.made_at.slice(0, 10)}. Content: ${s.content.mode}. Device: ${s.device.width ?? "?"} px wide, speech ${s.device.speech ? "on" : "off"}${s.device.standalone ? ", installed" : ""}.`, ``);
    out.push(`**Activity:** ${a.days_active} days, ${a.sessions} sessions, ${a.questions} questions, about ${a.minutes} minutes of answering; median ${a.median_seconds_per_question ?? "–"} s between answers; ${a.sessions_stopped_early} session(s) stopped early.`, ``);
    out.push(`### Learning`, ``, `**Words over time** (from each summary):`, ``, `| Summary | ${STATUSES.join(" | ")} |`, `|---|${STATUSES.map(() => "---").join("|")}|`);
    for (const x of list) out.push(`| ${x.made_at.slice(0, 10)} | ${STATUSES.map((st) => x.spelling.words.counts[st] ?? 0).join(" | ")} |`);
    const words = s.spelling.words.list;
    const passed = words.reduce((t, w) => t + w.retention_passed, 0);
    const failed = words.reduce((t, w) => t + w.retention_failed, 0);
    out.push(``, `Delayed recall (a day or more later): ${passed} right, ${failed} wrong${passed + failed ? ` (${Math.round((100 * passed) / (passed + failed))}% right)` : ""}.`);
    const miss = words.filter((w) => w.misspellings.length).slice(0, 15);
    if (miss.length) out.push(``, `Misspellings typed (first 15 words): ${miss.map((w) => `${w.word} (${w.misspellings.join(", ")})`).join("; ")}.`);
    out.push(``, `**Patterns:**`, ``, `| Pattern | Status | First check | Recent practice | Checks with new words |`, `|---|---|---|---|---|`);
    for (const p of s.spelling.patterns) out.push(`| ${p.title} | ${p.status.replace(/_/g, " ")} | ${p.check ?? "–"} | ${p.practice_recent ?? "–"} | ${p.transfers.join(", ") || "–"} |`);
    out.push(``, `**Spelling level (engine):** ${s.spelling.proficiency.map((p) => `${p.name}: ${p.certainty.replace("_", " ")}${p.range ? ` ${p.range}` : ""}`).join("; ")}.`);
    out.push(``, `**Grammar and vocabulary:** ${s.grammar_and_vocabulary.map((p) => `${p.name}: ${p.certainty.replace("_", " ")}${p.range ? ` ${p.range}` : ""}`).join("; ")}.`, ``);
    out.push(`### Usability`, ``);
    const r = s.usability.ratings;
    out.push(`Ratings: too easy ${r.too_easy ?? 0}, about right ${r.about_right ?? 0}, too hard ${r.too_hard ?? 0}, confusing ${r.confusing ?? 0}. Lessons read: ${s.usability.lessons_read} (quick check right ${s.usability.lesson_checks_right}).`, ``);
    out.push(`| Session | Started | Ended | Questions | Right first time | Second tries | Pauses | Minutes | Rating |`, `|---|---|---|---|---|---|---|---|---|`);
    for (const x of s.sessions) out.push(`| ${x.type} | ${x.started.slice(0, 16).replace("T", " ")} | ${x.how} | ${x.questions} | ${x.rightFirstTime} | ${x.secondTries} | ${x.pauses} | ${x.minutes} | ${x.rating ?? "–"} |`);
    if (s.usability.notes.length) out.push(``, `**Notes:**`, ``, ...s.usability.notes.map((n) => `- ${n.at.slice(0, 10)} (${n.screen}): ${n.text}`));
    if (s.usability.reported_questions.length) out.push(``, `**Questions reported as wrong:**`, ``, ...s.usability.reported_questions.map((q) => `- ${q.item}: ${q.note}`));
    out.push(``);
  }
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("usage: node tools/english/pilot/report.ts summary.json [more.json …]");
    process.exit(1);
  }
  console.log(report(files.map((f) => JSON.parse(readFileSync(f, "utf8")) as Summary)));
}
