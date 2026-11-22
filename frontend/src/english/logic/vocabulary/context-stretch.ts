/** A short, provisional check of meaning in context. Never used for placement or mastery. */
export interface ContextItem {
  word: string;
  sentence: string;
  choices: readonly [string, string, string];
  answer: number;
  why: readonly [string, string, string];
  clue: string;
}

const opening: ContextItem = {
  word: "equivocal",
  sentence: "Asked whether she backed the proposal, the chair gave an equivocal reply: ‘I can see reasons to support it, and reasons not to.’ Nobody could tell which way she would vote.",
  choices: ["Openly hostile to the proposal", "Ambiguous about where she stood", "Reluctant but clearly in favour"],
  answer: 1,
  why: ["She gave reasons on both sides; there is no open opposition.", "Nothing in the reply settles whether she supports it.", "Reluctant support would still tell us which side she was on."],
  clue: "‘Nobody could tell’ is the clue. Look for what the reply leaves unclear.",
};
const upper: readonly ContextItem[] = [
  {
    word: "attenuate",
    sentence: "The second layer of felt attenuated the noise. The hum was still audible in the passage, but it no longer drowned out conversation.",
    choices: ["Made the noise weaker", "Blocked the noise completely", "Changed the pitch of the noise"],
    answer: 0,
    why: ["The hum remained but had less effect.", "The hum was still audible.", "The sentence tells us about loudness, not whether the sound became higher or lower."],
    clue: "‘Still audible, but’ separates reducing a sound from removing it.",
  },
  {
    word: "preclude",
    sentence: "Under the rules, missing the filing deadline precluded an appeal. The panel was not allowed to consider it, however strong the case.",
    choices: ["Made the appeal harder to win", "Delayed the appeal until a later hearing", "Ruled out the appeal entirely"],
    answer: 2,
    why: ["The panel was barred from hearing it, not merely harder to persuade.", "There is no later hearing under the rule.", "‘Not allowed to consider it’ means the option was closed."],
    clue: "Look for the difference between making something harder and making it impossible.",
  },
];
const bridge: readonly ContextItem[] = [
  {
    word: "reluctant",
    sentence: "Meena was reluctant to present. She could do it and knew the project well, but said yes only after her team promised to stand beside her.",
    choices: ["Unable to give the presentation", "Unwilling at first, but eventually agreed", "Eager to present and waiting for permission"],
    answer: 1,
    why: ["She could present and knew the project.", "She could do it but did not want to at first.", "She needed reassurance; there is no sign she was eager."],
    clue: "‘Could present’ tells you about ability; ‘only after’ tells you about willingness.",
  },
  {
    word: "tentative",
    sentence: "They chose Friday for the rehearsal but described the date as tentative. They would confirm it once the hall booking came through.",
    choices: ["Chosen for now but not final", "Officially confirmed but not announced", "Cancelled unless someone files a new request"],
    answer: 0,
    why: ["Friday is the plan for now, but the booking can change it.", "They still need to confirm it.", "They have not cancelled the plan."],
    clue: "If they still need to confirm it, it is not settled yet.",
  },
];

export const firstContextItem = opening;
export const nextContextItems = (firstChoice: number | null): readonly ContextItem[] =>
  firstChoice === opening.answer ? upper : bridge;

export const observedContextCount = (items: readonly ContextItem[], choices: readonly (number | null)[]): number =>
  items.filter((item, i) => item.answer === choices[i]).length;
