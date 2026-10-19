import type { Learner } from "./learner.ts";
/** Projection of instructional receipts. Review scheduling stays in the existing spelling state fold. */
export function learningView(learner: Learner) {
  const cur = learner.spellingSession();
  if (!cur?.word) return null;
  const actions = learner.events.filter(
    (e) =>
      e.kind === "spell_learning" &&
      e.session === cur.session &&
      e.word === cur.word!.id,
  );
  const phase = actions
    .filter((e) => e.kind === "spell_learning" && e.action !== "draft")
    .at(-1);
  const draft = actions
    .filter((e) => e.kind === "spell_learning" && e.action === "draft")
    .at(-1);
  const seen = learner
    .spelling()
    .words.get(`${cur.source.type}:${cur.source.id}/${cur.word.id}`);
  return {
    cur,
    phase:
      phase?.kind === "spell_learning"
        ? phase.action === "study" || phase.action === "hint"
          ? "study"
          : "recall"
        : seen
          ? "recall"
          : "prepare",
    draft: draft?.kind === "spell_learning" ? (draft.response ?? "") : "",
    assisted: actions.some(
      (e) =>
        e.kind === "spell_learning" &&
        (e.action === "study" || e.action === "hint"),
    ),
  };
}
