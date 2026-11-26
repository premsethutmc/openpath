/**
 * explore@1: "what if the numbers change?" for a worked example, from the question family's own definition.
 *
 * A family is a recipe: given numbers it writes the question, draws the picture and works the answer. So the engine can let
 * a learner change one of the example's numbers and see the question, the picture and the working change with it, with
 * nothing written for any lesson. One rule for every family with a picture.
 *
 * What may be changed: one number at a time, the others staying as in the example, and only to values for which the family
 * still gives a valid question with a picture. Evidence is kept clean: a changed question is never one of the released
 * questions (those are the ones a learner is later tested on), nor the same question under other numbers; if too few such
 * values exist for a number, that number is not offered. Nothing here is recorded or counted.
 */
import { exposureKey, explainStep, inPool, pool, problemOf } from "./families";
import type { Problem } from "./family-kit";

export interface Dial {
  /** Which of the family's numbers this changes. */
  index: number;
  /** The values it may take, in order; the example's own value is among them. */
  values: number[];
  /** What the learner is told it changes: the number as written in the example's question, when exactly one number of the
   *  question moves with it; otherwise null (the question's wording changes, and is shown). */
  shown: string | null;
}
export interface Explorer { base: string; family: string; params: number[]; dials: Dial[]; /** own-numbers@1: also offered where the family draws no picture */ pictureless?: boolean }
export interface Explored { prompt: string; figure: NonNullable<Problem["figure"]> | null; steps: string[]; answer: string; changed: boolean }

const GEN = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/;
const REACH = 12, MOST = 9, FEWEST = 3;
const numbers = (t: string) => t.match(/\d+(?:[.,]\d+)*/g) ?? [];
const idOf = (family: string, params: number[]) => `gen:${family}:${params.join(",")}`;

/** A changed question, or null: not valid, no picture, or one a learner may be tested on. */
function variant(family: string, params: number[], released: Set<string>, picture = true): Problem | null {
  const id = idOf(family, params);
  let p: Problem | null = null;
  try { p = problemOf(id); } catch { return null; }
  if (!p || (picture && !p.figure) || !p.steps.length || p.type === "choice") return null;
  if (inPool(id) || released.has(exposureKey(id))) return null;
  return p;
}

const cache = new Map<string, Explorer | null>();
/** The numbers of a worked example that can be changed, or null when none can (or it is not a generated question). */
/** `picture: false` (own-numbers@1, the child's lesson): a family without a picture can be changed too; its question and
 *  working still change. */
export function explorerFor(qid: string, opts: { picture?: boolean } = {}): Explorer | null {
  const picture = opts.picture ?? true;
  const m = GEN.exec(qid);
  if (!m) return null;
  const family = m[1], params = m[2].split(",").map(Number), base = idOf(family, params);
  const key = picture ? base : `${base}|any`;
  if (cache.has(key)) return cache.get(key)!;
  let found: Explorer | null = null;
  try {
    const b = problemOf(base);
    if (b && (b.figure || !picture) && b.type !== "choice") {
      const released = new Set(pool(family).items.map((q) => exposureKey(q.id)));
      const dials: Dial[] = [];
      params.forEach((own, index) => {
        const values: number[] = [];
        for (let d = -REACH; d <= REACH; d++) {
          if (d === 0) { values.push(own); continue; }
          const t = [...params]; t[index] = own + d;
          if (variant(family, t, released, picture)) values.push(own + d);
        }
        if (values.length < FEWEST + 1) return;
        // the nearest values on each side of the example's own, so the dial is short and the example sits inside it
        const at = values.indexOf(own), from = Math.max(0, Math.min(at - Math.floor(MOST / 2), values.length - MOST));
        const kept = values.slice(from, from + MOST);
        // what the learner sees move: one number of the question, if for every value exactly one number differs, in one place
        const mine = numbers(b.prompt);
        let place: number | null | undefined;
        for (const v of kept) {
          if (v === own) continue;
          const t = [...params]; t[index] = v;
          const theirs = numbers(problemOf(idOf(family, t))!.prompt);
          const moved = theirs.length === mine.length ? mine.map((x, i) => (x === theirs[i] ? -1 : i)).filter((i) => i >= 0) : [];
          place = moved.length === 1 && (place === undefined || place === moved[0]) ? moved[0] : null;
          if (place === null) break;
        }
        dials.push({ index, values: kept, shown: typeof place === "number" ? mine[place] : null });
      });
      // at most two dials: those whose change is a number of the question first, then those with the most values
      dials.sort((x, y) => Number(y.shown !== null) - Number(x.shown !== null) || y.values.length - x.values.length || x.index - y.index);
      if (dials.length) found = { base, family, params, dials: dials.slice(0, 2).sort((x, y) => x.index - y.index), ...(picture ? {} : { pictureless: true }) };
    }
  } catch { found = null; }
  cache.set(key, found);
  return found;
}

/** The example with one dial moved (the other numbers as in the example): its question, picture, working and answer.
 *  `value` equal to the example's own gives the example itself. Null if the value is not one the dial offers. */
export function explored(e: Explorer, dial: number, value: number): Explored | null {
  const d = e.dials[dial];
  if (!d || !d.values.includes(value)) return null;
  const params = [...e.params]; params[d.index] = value;
  const p = problemOf(idOf(e.family, params));
  if (!p || (!p.figure && !e.pictureless)) return null;
  return { prompt: p.prompt, figure: p.figure ?? null, steps: p.steps.map((s) => explainStep(p, s)), answer: p.answer, changed: value !== e.params[d.index] };
}
