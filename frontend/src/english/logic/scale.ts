/**
 * Level scales. Listen and write, Listen and answer and Grammar in use had three levels until November 2026 and
 * have six now. A stored record written on the six-level scale carries `scale: SCALE`; one without it was written
 * on the old scale and is read through the activity's own map, so nobody's place is lost.
 */
export const SCALE = 2;
export interface Levelled {
  level: number;
  scale?: number;
}
/** A recorded level on today's scale. */
export const rescale = (r: Levelled, old: Readonly<Record<number, number>>): number => (r.scale === SCALE ? r.level : old[r.level] ?? r.level);
/** Where a starting level sits for an age band: the first level for the youngest, the middle for the rest. */
export const startFor = (age: "early" | "school" | "older" | null | undefined): number => (age === "early" ? 1 : age === "older" ? 4 : 3);
