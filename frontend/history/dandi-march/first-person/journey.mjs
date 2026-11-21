export const VILLAGE_STEP = 8;
export const LAST_STEP = 20;
export const routeNotes = Object.freeze([
  '12 March: Gandhi and 78 volunteers leave Sabarmati Ashram to challenge British control of salt.',
  '12 March: the marchers halt for the evening at Aslali. People come out to see the march.',
  '19–20 March: the marchers cross the Mahi River overnight and halt at Kareli.',
  '5 April: the marchers reach the coast at Dandi. Gandhi breaks the salt law the next morning.'
]);
export function stepForward(step, { walking, ahead, visible }) {
  return walking && ahead && visible ? Math.min(LAST_STEP, step + 1) : step;
}
