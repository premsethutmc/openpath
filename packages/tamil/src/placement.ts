/**
 * tamil-placement@1: "where should I start?" Four questions from different topics of each class, Class 1 upward.
 * Three right of four passes a class; the first class not passed is where to start (all passed → Class 10).
 * At most 40 questions; usually far fewer. Listening and passage questions are left out (they need a voice or reading time).
 */
import { type Board, type CourseQuestion, CLASSES, topicsFor } from "./icse";

export const PER_CLASS = 4;
/** sim-tamil@1: 2 of 3 let lucky taps through (placed 1.6 classes too high); 3 of 4 keeps it within about a class. */
export const PASS = 3;

/** The questions asked for one class: the first usable question of each of three spread-out topics. */
export function placementQuestions(cls: number, board: Board, round = 0): CourseQuestion[] {
  const topics = topicsFor(cls, board).filter((t) => !t.listen && !t.passage);
  if (!topics.length) return [];
  const step = Math.max(1, Math.floor(topics.length / PER_CLASS));
  const out: CourseQuestion[] = [];
  for (let i = 0; i < topics.length && out.length < PER_CLASS; i += step) {
    const qs = topics[(i + round) % topics.length].questions;
    out.push(qs[(round * 3 + i) % qs.length]);
  }
  return out;
}

export type PlacementState = { cls: number; asked: number; right: number; done: boolean; start: number | null; dir: 0 | 1 | -1; lowestPassed: number };
/**
 * Starts at the child's school class (sim-tamil@1: starting at Class 1 took a strong Class 8 child 38 questions).
 * Passed → go up until a class is not passed (start there). Not passed → go down until one is passed (start just above it).
 */
export const startPlacement = (from = CLASSES[0]): PlacementState => ({ cls: Math.min(Math.max(from, CLASSES[0]), CLASSES[CLASSES.length - 1]), asked: 0, right: 0, done: false, start: null, dir: 0, lowestPassed: 0 });

/** Record one answer; moves class once a class's questions are answered, or stops. */
export function answerPlacement(s: PlacementState, right: boolean): PlacementState {
  const n = { ...s, asked: s.asked + 1, right: s.right + (right ? 1 : 0) };
  if (n.asked % PER_CLASS !== 0) return n;
  // coming down, a class must be passed outright (4 of 4): a lucky tap would otherwise stop the search too high
  const passed = n.right >= (n.dir === -1 ? PER_CLASS : PASS);
  const first = CLASSES[0], last = CLASSES[CLASSES.length - 1];
  const next = (cls: number, dir: 0 | 1 | -1, more: Partial<PlacementState> = {}) => ({ ...n, cls, dir, right: 0, ...more });
  if (passed) {
    if (n.dir === -1) return { ...n, done: true, start: Math.min(n.cls + 1, last) };
    if (n.cls === last) return { ...n, done: true, start: last };
    return next(n.cls + 1, 1);
  }
  if (n.dir === 1 || n.cls === first) return { ...n, done: true, start: n.cls };
  return next(n.cls - 1, -1);
}

/** The question to show now. */
export const currentQuestion = (s: PlacementState, board: Board) => placementQuestions(s.cls, board)[s.asked % PER_CLASS];
