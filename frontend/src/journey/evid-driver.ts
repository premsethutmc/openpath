/** Consolidation #112 (evidence worker): a learner driven through the real session. The engine (moduleState) chooses every question and
 *  lesson; the only scripted input is whether the learner answers right. Shared by the evid-*.test.ts files. */
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { creditOf } from "../../../packages/learning/src/grade";
import { unitOfQuestion } from "../../../packages/learning/src/skill-units";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { SliceSession } from "./session";

export const SHOWN = ["independent", "transfer", "verified"];
export const unitKey = (c: string, q: string) => unitOfQuestion(moduleFor(c)!, q)?.key ?? null;
export function wrongAnswer(q: string): string {
  const x = question(q);
  for (const r of [x.answer === "A" ? "B" : "A", "987654", "1/99", "-37", "0", "1", "2"]) if (creditOf(q, r) === false) return r;
  throw new Error(`no wrong answer for ${q}`);
}
export interface Step { phase: string; q?: string; unit?: string | null; right?: boolean; status: string; strategy?: string; reason?: string; retention?: string }
export interface Learner { right: (q: string, s: { taught: Set<string>; i: number; phase: string }) => boolean }

export function start(id: string, c: string, at = Date.parse("2026-01-01T00:00:00Z"), pathway = true) {
  const s = new SliceSession(id, c, at);
  if (pathway) s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, c));
  return s;
}
/** run until the engine offers a delayed check (returned, not answered), stops offering a question, or `max` steps */
export function drive(s: SliceSession, c: string, learner: Learner, trail: Step[] = [], max = 60, o: { answerRetention?: boolean; onStep?: (t: Step) => void } = {}) {
  const taught = new Set<string>();
  for (let i = 0; i < max; i++) {
    const n = s.next(c);
    const ev = () => s.state().evidence(c);
    if (n.phase === "chapter") { s.taught(n); taught.add(n.strategy!.id); trail.push({ phase: "chapter", strategy: n.strategy!.id, status: ev().status }); continue; }
    if (!n.question) { trail.push({ phase: n.phase, status: ev().status, reason: n.reason, retention: ev().retention }); return { trail, stop: n }; }
    if (n.phase === "retention" && !o.answerRetention) { trail.push({ phase: "retention", q: n.question, unit: unitKey(c, n.question), status: ev().status, retention: ev().retention }); return { trail, stop: n }; }
    const q = n.question, m = moduleFor(c)!;
    const activity = n.phase === "explore" ? "diagnostic" : ["guided", "check", "transfer", "retention"].includes(n.phase) ? n.phase : m.transfer.includes(q) ? "transfer" : "practice";
    const ok = learner.right(q, { taught, i, phase: n.phase });
    s.submit(q, ok ? question(q).answer : wrongAnswer(q), activity as never, n.context ? { context: n.context } : {});
    trail.push({ phase: activity, q, unit: unitKey(c, q), right: ok, status: ev().status, retention: ev().retention, ...(n.strategy ? { strategy: n.strategy.id } : {}) });
    o.onStep?.(trail.at(-1)!);
  }
  return { trail, stop: null };
}
/** reload from saved JSON (the stored events with the server's decisions) agrees on status, retention and the next step */
export function reloads(s: SliceSession, c: string) {
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  const re = learnerState(s.learnerId, saved, s.now, { currentSession: s.session });
  const live = s.state();
  assert.equal(re.evidence(c).status, live.evidence(c).status, "reload: same status");
  assert.deepEqual(re.evidence(c).retentionHistory, live.evidence(c).retentionHistory, "reload: same retention history");
  assert.deepEqual(re.module(c), live.module(c), "reload: same next step");
  return re;
}
export const brief = (t: Step[]) => t.map((x) => `${x.phase}${x.q ? ` ${x.q}` : ""}${x.unit ? `[${x.unit}]` : ""}${x.right === undefined ? "" : x.right ? " ok" : " X"}${x.strategy ? ` <${x.strategy}>` : ""} -> ${x.status}${x.reason ? ` (${x.reason})` : ""}`).join("\n");
