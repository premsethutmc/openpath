/**
 * Phone walkthrough d1-two-dice (walkthrough/integ-145249ad, app 145249ad): a Grade 8 learner answered two "total is exactly k" dice
 * questions wrong (4,5,0,2:w → 1/8 and 3,4,0,7 → 1/6, the totals taken as equally likely), was taught a counting-stages lesson
 * (tree), then answered four counting questions right; the skill read "Shown on your own".
 *
 * Trace (evidence.skillEvidence, status@2): two distinct right answers alone make the competency independent; after that only "two wrong
 * of the last three" undoes it. The counting answers after the lesson pushed the dice answers out of the last three, so status returned to
 * independent: answers on OTHER skills of the competency established it while the dice skill had no right answer at all.
 * Fix (skill-units@1): a skill the module teaches with a scoped explanation (two dice, total exactly k) holds the competency below
 * "independent" while its own answers alone show it is not yet there (status@2 applied to the skill itself).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { make } from "../../../packages/learning/src/session";
import { SliceSession } from "./session";

const C = "MATH.probability.sample-space";
/** the walkthrough's answers, in order (qid, response, activity); "tree" taught after the two dice answers */
const PHONE: [string, string, string][] = [
  ["gen:akss:0,4,4,5", "80", "diagnostic"], ["gen:akss:1,5,5,2", "50", "diagnostic"], ["gen:akss:1,4,3,2", "24", "practice"],
  ["gen:akss:1,5,4,4:mc", "D", "practice"], ["gen:akss:1,5,4,3", "60", "practice"], ["gen:akdice:3,4,2,0", "1/2", "practice"],
  ["gen:akssl:1,1,1", "C", "practice"], ["gen:aksarr:0,3,0", "2", "practice"], ["gen:akss:1,4,2,3:w", "24", "transfer"],
  ["gen:akdice:4,5,0,2:w", "1/8", "transfer"], ["gen:akdice:3,4,0,7", "1/6", "check"],
  ["TEACH", "tree", ""], ["gen:akss:1,4,3,3", "36", "guided"],
  ["gen:akss:2,3,2,3:mc", "B", "check"], ["gen:akdice:3,6,1,4:mc", "B", "practice"], ["gen:akss:2,3,2,2", "12", "practice"], ["gen:akss:1,4,3,5:mc", "B", "practice"],
];

test("phone d1-two-dice: counting answers on other skills do not establish the competency while both exact-total dice answers are wrong", () => {
  const s = new SliceSession("phone-d1-two-dice", C, Date.parse("2026-11-04T05:40:00Z"));
  for (const [q, r, act] of PHONE) {
    if (q === "TEACH") { s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date((s.now += 60_000)).toISOString() }, C, r, "conceptual")); continue; }
    const reply = s.submit(q, r, act as never);
    assert.equal(reply.credit, String(question(q).answer) === r, `${q}: the walkthrough's mark`);
  }
  const ev = s.state().evidence(C);
  assert.ok(!["independent", "transfer", "verified"].includes(ev.status), `status ${ev.status}: the dice skill has no right answer alone`);
  assert.equal(ev.status, "guided", "progress with help or on other skills, not shown on your own");
  const ms = s.state().module(C);
  assert.ok(!/^Shown on your own/.test(ms.reason), ms.reason);
  // the rest of the chapter stays open: the module asks a question (or teaches), it does not stop
  assert.ok(ms.question || ms.phase === "chapter", `${ms.phase}: ${ms.reason}`);
});
