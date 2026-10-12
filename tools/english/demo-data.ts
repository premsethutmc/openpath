/** The two demonstration learners and Asha's written answer. Names and texts are invented. */
import type { SimLearner } from "./sim/learners.ts";

export const ASHA: SimLearner = {
  id: "asha",
  name: "Asha",
  profile: "Reads well; writes in run-on sentences",
  truth: { infl: 5, gen: 6, suf: 5.5, ctx: 6, art: 5.5, asp: 5, sva: 5.5, com: 4, run: 3, sub: 4.5, loc: 6.5, mot: 6.5, main: 6, task: 5, para: 4.5, wgr: 5, wsp: 5.5 },
  misconceptions: ["comma_splice", "fused_sentence"],
};

export const BEN: SimLearner = {
  id: "ben",
  name: "Ben",
  profile: "Rich vocabulary; weak grammar accuracy",
  truth: { infl: 5, gen: 6.5, suf: 6, ctx: 6.5, art: 3.5, asp: 3.5, sva: 3, com: 4.5, run: 4.5, sub: 5, loc: 5.5, mot: 5.5, main: 5.5, task: 5, para: 5, wgr: 3.5, wsp: 5 },
  misconceptions: ["third_person_s", "article_omission", "perfect_with_finished_time"],
};

export const ASHA_EMAIL = `Dear Mrs. Rao,

I want to ask you to order a book for our library, it is called The Secret of the Stars. I read the first chapter at my cousin's house I could not stop reading. The story is about two children who build a telescope, they find something strange in the sky.

Many students in my class like science so I think they will borrow it. Thank you for your help.

Asha`;
