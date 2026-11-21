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
type Band = "early" | "school" | "older";
/**
 * Where a starting level sits before any answers: from a school child's class (Classes 1–2 at level 1, then one level
 * every two classes), otherwise from the age band (the first level for the youngest, the middle for the rest). Each
 * activity clamps it to its own ladder, and the answers move it from there. An adult (no class) starts in the
 * middle, like a school learner of unknown class: the warm-up or the first sittings place them.
 */
export const startFor = (who: Band | { band: Band; school?: { class: number } | null } | null | undefined): number => {
  if (who && typeof who === "object" && who.school) return Math.min(6, Math.max(1, Math.ceil(who.school.class / 2)));
  if (who && typeof who === "object") return who.band === "early" ? 1 : 3;
  return who === "early" ? 1 : who === "older" ? 4 : 3;
};
