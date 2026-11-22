/**
 * screen-review@1: corrections to lesson screens found by reading every screen.
 *
 * How the screens are validated: every maths lesson screen is dumped as text (scripts/screen-review-dump.ts), read in
 * full by an AI reviewer acting as a strict teacher for that class (wrong maths, title/text mismatch, unclear, wrong
 * level), and each proposed fix is checked again by a second, independent AI reader that works the maths out itself.
 * Only fixes both agree on are kept here. A correction names the exact text it replaces and applies only while the
 * screen still says exactly that, so a regenerated screen is never silently overwritten: the test lists any stale
 * correction, and the screen is read again.
 */
import data from "../../../content/learning/screen-corrections.v1.json";

export interface ScreenCorrection {
  competency: string;
  /** "chapter" or the strategy id */
  section: string;
  index: number;
  /** the screen's text as it was read, paragraphs joined by " / " */
  original: string;
  text: string[];
  problem: string;
  severity: "high" | "medium" | "low";
}
export const screenCorrections = (data as { entries: ScreenCorrection[] }).entries;
const byKey = new Map(screenCorrections.map((c) => [`${c.competency}|${c.section}|${c.index}`, c]));
const joined = (t: readonly string[] | undefined) => (t ?? []).join(" / ");

type HasScreens = { competency: string; chapter: { text?: string[] }[]; strategies: { id: string; screens: { text?: string[] }[] }[] };
/** The module with every correction whose original text still matches applied. */
export function withCorrections<M extends HasScreens>(m: M): M {
  if (!screenCorrections.some((c) => c.competency === m.competency)) return m;
  const fix = <S extends { text?: string[] }>(section: string) => (x: S, i: number): S => {
    const c = byKey.get(`${m.competency}|${section}|${i}`);
    return c && joined(x.text) === c.original ? { ...x, text: c.text } : x;
  };
  return { ...m, chapter: m.chapter.map(fix("chapter")), strategies: m.strategies.map((s) => ({ ...s, screens: s.screens.map(fix(s.id)) })) };
}
/** Corrections that no longer match the screen they were written for (the screen changed: read it again). */
export function staleCorrections(raw: (c: ScreenCorrection) => readonly string[] | undefined | null): ScreenCorrection[] {
  return screenCorrections.filter((c) => joined(raw(c) ?? undefined) !== c.original);
}
