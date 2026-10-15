/**
 * The pilot summary: what a guardian can choose to share with the OpenPath team during a small trial.
 *
 * It is made on the device from the learner's own record and saved as a file; nothing is sent. It
 * leaves out the display name (the learner is a short code derived from the profile id), but it keeps
 * what is needed to see learning and usability: sessions and their timing, word, pattern and
 * capability progress, misspellings typed in spelling items, ratings, notes and reported questions.
 * Free-text notes are included as written, so the interface asks people not to put names in them.
 *
 * The three levels of spelling progress stay separate here, as everywhere (words.ts).
 */
import { fnv1a } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, GUIDED, GUIDED_ALL } from "./content.ts";
import { APP_VERSION, type NoteEvent, type Rating, type RatingEvent } from "./events.ts";
import { patternTitle } from "./plan.ts";
import { capabilityProgress } from "./progress.ts";
import { spellingPatterns } from "./select.ts";
import { type AppState, patternKey, patternStatus } from "./state.ts";
import { type WordStatus, statusCounts, wordMastery } from "./words.ts";

export const PILOT_FORMAT = "openpath-english-pilot-summary";
export const PILOT_VERSION = 1;
/** A gap between answers longer than this is a pause (the learner stepped away), not time on the question. */
export const PAUSE_SECONDS = 180;

export interface PilotSession {
  type: string;
  capability?: string;
  step?: string;
  started: string;
  ended: string | null;
  how: "finished" | "stopped" | "still open";
  minutes: number;
  questions: number;
  rightFirstTime: number;
  secondTries: number;
  pauses: number;
  rating: Rating | null;
}

export interface PilotSummary {
  format: typeof PILOT_FORMAT;
  version: typeof PILOT_VERSION;
  app: string;
  content: { mode: string; framework: string };
  made_at: string;
  learner: { code: string; set_up_by: string; started: string | null };
  device: { speech: boolean; standalone?: boolean; width?: number };
  note: string;
  activity: { days_active: number; sessions: number; questions: number; minutes: number; median_seconds_per_question: number | null; sessions_stopped_early: number };
  sessions: PilotSession[];
  spelling: {
    words: { counts: Record<WordStatus, number>; list: { word: string; status: WordStatus; recall_right: number; recall_wrong: number; recognition_right: number; recognition_wrong: number; assisted: number; retention_passed: number; retention_failed: number; misspellings: string[]; patterns: string[] }[] };
    patterns: { pattern: string; title: string; status: string; check: string | null; practice_recent: string | null; transfers: string[] }[];
    proficiency: { capability: string; name: string; certainty: string; range: string | null; evidence: Record<string, number> }[];
  };
  grammar_and_vocabulary: { capability: string; name: string; certainty: string; range: string | null; evidence: Record<string, number> }[];
  usability: { ratings: Record<Rating, number>; notes: { at: string; screen: string; text: string }[]; reported_questions: { at: string; item: string; note: string }[]; lessons_read: number; lesson_checks_right: number };
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

export function pilotSummary(s: AppState, c: AppContent, now: string, device: PilotSummary["device"]): PilotSummary {
  const ratings = new Map<string, Rating>();
  for (const e of s.events) if (e.kind === "rating") ratings.set((e as RatingEvent).session, (e as RatingEvent).rating);
  const gaps: number[] = [];
  const sessions: PilotSession[] = [...s.sessions.values()].map((st) => {
    let prev = Date.parse(st.event.at);
    let pauses = 0;
    let active = 0;
    for (const a of st.attempts) {
      const g = (Date.parse(a.at) - prev) / 1000;
      prev = Date.parse(a.at);
      if (g > PAUSE_SECONDS) pauses++;
      else {
        active += g;
        if (!a.assisted) gaps.push(g);
      }
    }
    return {
      type: st.event.type,
      ...(st.event.capability ? { capability: st.event.capability } : {}),
      ...(st.event.step ? { step: st.event.step } : {}),
      started: st.event.at,
      ended: st.end?.at ?? null,
      how: st.end ? st.end.reason : "still open",
      minutes: Math.round(active / 6) / 10,
      questions: st.answered.length,
      rightFirstTime: st.answered.filter((a) => a.correct).length,
      secondTries: st.attempts.filter((a) => a.assisted).length,
      pauses,
      rating: ratings.get(st.event.session) ?? null,
    };
  });
  const days = new Set(s.events.filter((e) => e.kind === "attempt").map((e) => e.at.slice(0, 10)));
  const words = wordMastery(s, c);
  const progress = capabilityProgress(s, c, now);
  const capRow = (id: string) => {
    const p = progress.find((x) => x.id === id)!;
    return { capability: id, name: p.name, certainty: p.certainty, range: p.range, evidence: { ...p.evidence } };
  };
  const ratingCounts: Record<Rating, number> = { too_easy: 0, about_right: 0, too_hard: 0, confusing: 0 };
  for (const r of ratings.values()) ratingCounts[r]++;
  return {
    format: PILOT_FORMAT,
    version: PILOT_VERSION,
    app: APP_VERSION,
    content: { mode: c.contentMode, framework: c.index.key },
    made_at: now,
    learner: { code: s.profile ? fnv1a(`pilot:${s.profile.id}`).slice(0, 8) : "unknown", set_up_by: s.profile?.consent.by ?? "unknown", started: s.profile?.at ?? null },
    device,
    note: "Made on the device for the OpenPath pilot. It has no name, but it does contain answers and any notes as written. Share it only if you choose to.",
    activity: {
      days_active: days.size,
      sessions: sessions.length,
      questions: sessions.reduce((t, x) => t + x.questions, 0),
      minutes: Math.round(sessions.reduce((t, x) => t + x.minutes, 0) * 10) / 10,
      median_seconds_per_question: median(gaps),
      sessions_stopped_early: sessions.filter((x) => x.how === "stopped").length,
    },
    sessions,
    spelling: {
      words: {
        counts: statusCounts(words),
        list: [...words.values()]
          .sort((a, b) => a.firstMet.localeCompare(b.firstMet) || a.word.localeCompare(b.word))
          .map((w) => ({
            word: w.word,
            status: w.status,
            recall_right: w.independent.recall.right,
            recall_wrong: w.independent.recall.wrong,
            recognition_right: w.independent.recognition.right,
            recognition_wrong: w.independent.recognition.wrong,
            assisted: w.assisted,
            retention_passed: w.retention.passed,
            retention_failed: w.retention.failed,
            misspellings: [...new Set(w.attempts.filter((a) => !a.correct && a.recall && a.response).map((a) => a.response!))],
            patterns: w.patterns,
          })),
      },
      patterns: spellingPatterns(c)
        .map((p) => {
          const rec = s.patterns.get(patternKey(p.cap, p.step));
          const recent = rec?.practice.slice(-8) ?? [];
          return {
            pattern: patternKey(p.cap, p.step),
            title: patternTitle(c, p.cap, p.step),
            status: patternStatus(rec),
            check: rec?.check.total ? `${rec.check.right}/${rec.check.total}` : null,
            practice_recent: recent.length ? `${recent.filter((x) => x.correct).length}/${recent.length}` : null,
            transfers: (rec?.transfers ?? []).map((t) => `${t.right}/${t.total}`),
          };
        })
        .filter((p) => p.status !== "not_started" || p.check),
      proficiency: GUIDED.spelling.map(capRow),
    },
    grammar_and_vocabulary: GUIDED_ALL.filter((x) => !GUIDED.spelling.includes(x as never)).map(capRow),
    usability: {
      ratings: ratingCounts,
      notes: s.events.filter((e): e is NoteEvent => e.kind === "note").map((n) => ({ at: n.at, screen: n.screen, text: n.text })),
      reported_questions: s.flags.map((f) => ({ at: f.at, item: f.item.id, note: f.note })),
      lessons_read: s.lessons.size,
      lesson_checks_right: [...s.lessons.values()].filter((l) => l.checkCorrect).length,
    },
  };
}
