/**
 * Loaded only when a learner is chosen: the shared engine and the module library (the same code My Learning Year
 * runs), the server's review registry (only released content can count toward verified mastery), the learner's
 * stored records and their educator marks. Read only: nothing here writes a record.
 */
import type { Api } from "../english/logic/account";
import { questions } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { setActiveRegistry, type Registry } from "../../../packages/learning/src/review";
import { learnerView, type LearnerView } from "../../../packages/learning/src/dashboard-learner";
import type { WrittenMark } from "../../../packages/learning/src/written";

declare const OPENPATH_REVIEW_FIXTURE: boolean;
let prepared = false;
function prepare(registry: unknown) {
  if (prepared) return;
  prepared = true;
  // TEST BUILDS ONLY (a banner says so on every screen): every question treated as educator-reviewed
  if (typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE) useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  if (registry) setActiveRegistry(registry as Registry);
}

export async function loadLearner(api: Api, id: string, registry: unknown, now: number): Promise<LearnerView> {
  prepare(registry);
  const [ev, marks] = await Promise.all([
    api.request<{ events: { kind: string }[] }>("GET", `/pupils/${id}/events/?subject=mathematics`),
    api.request<{ marks: WrittenMark[] }>("GET", `/pupils/${id}/written-marks/`).catch(() => ({ marks: [] as WrittenMark[] })),
  ]);
  return learnerView(id, ev.events, marks.marks, now);
}
