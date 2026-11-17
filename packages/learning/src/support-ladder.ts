/**
 * support-ladder@1: how much help a question is asked with, from what the child has done on that kind of question.
 * A question may carry aids, most help first (for a sum of money: the coins, then the amounts set in columns); after
 * the last aid comes the bare question. A child starts with the most help. Two right answers in a row without help
 * move one step up; two wrong in a row move one step down; anything else stays. The step below can always be asked
 * for, and an answer given with it counts as helped (so it is never evidence of doing it alone). In a test the
 * question is always bare. The rule knows nothing about money: any question that names its aids fades the same way.
 */
export interface Tried { right: boolean; helped: boolean }
export const UP_AFTER = 2, DOWN_AFTER = 2;

/** The step to ask the next question at: 0 = the first aid … `aids` = bare. `tried` is oldest first, practice only. */
export function supportStep(tried: readonly Tried[], aids: number): number {
  let step = 0, right = 0, wrong = 0;
  for (const t of tried) {
    if (t.right && !t.helped) { right++; wrong = 0; if (right >= UP_AFTER) { step = Math.min(aids, step + 1); right = 0; } }
    else if (!t.right) { wrong++; right = 0; if (wrong >= DOWN_AFTER) { step = Math.max(0, step - 1); wrong = 0; } }
    else { right = 0; wrong = 0; } // right with help: neither a step up nor a slip
  }
  return step;
}
