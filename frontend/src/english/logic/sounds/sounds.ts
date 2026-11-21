/**
 * Sounds that are easy to mix up (content/english/sounds/pairs.json): English sounds Tamil speakers often swap (v/w,
 * f/p, z/j, s/sh, th/t, short i/long ee). The phone says one word of a pair; the child taps the one they heard, then
 * hears both and says them with a tip on how to make each sound. Hearing the difference comes before saying it.
 *
 * Why not score the child's own voice: the on-phone recogniser (Read aloud's Vosk model) told these pairs apart
 * only 42 times in 60 even on clean synthetic speech, and leant one way (vest heard as west, pill as fill, ship as
 * sheep), so it would tell children they said a word wrongly when they had not (tools/english/read-aloud, 21 Nov 2026).
 * Practice-only: nothing here is evidence for the engine.
 */
import pairsJson from "../../../../../content/english/sounds/pairs.json";

export interface SoundGroup {
  id: string;
  name: string;
  tip: string;
  pairs: [string, string][];
}
export const SOUNDS: { version: number; groups: SoundGroup[] } = pairsJson as unknown as { version: number; groups: SoundGroup[] };
export const ROUNDS = 8;

export function soundProblems(d = SOUNDS): string[] {
  const out: string[] = [];
  for (const g of d.groups) {
    if (!g.id || !g.name || !g.tip) out.push(`${g.id}: name and tip`);
    if (g.pairs.length < 5) out.push(`${g.id}: at least five pairs`);
    for (const p of g.pairs) if (p.length !== 2 || p[0].toLowerCase() === p[1].toLowerCase() || !p.every((w) => /^[A-Za-z]+$/.test(w))) out.push(`${g.id}: ${p.join("/")}`);
  }
  return out;
}
{
  const p = soundProblems();
  if (p.length) throw new Error(`sounds: ${p.join("; ")}`);
}

/** One round: the pair, the word said, and the two choices in a fixed order. */
export interface SoundRound {
  group: string;
  pair: [string, string];
  said: string;
}

function rng(seed: number) {
  let h = seed >>> 0 || 1;
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), ((h ^= h >>> 16) >>> 0) / 4294967296);
}

/** A sitting's rounds for one group: every pair at least once, each word of a pair as likely, no pair twice running. */
export function roundsFor(group: SoundGroup, seed: number, n = ROUNDS): SoundRound[] {
  const r = rng(seed);
  const out: SoundRound[] = [];
  let order: [string, string][] = [];
  while (out.length < n) {
    if (!order.length) order = [...group.pairs].sort(() => r() - 0.5);
    let pair = order.shift()!;
    if (out.length && out[out.length - 1].pair === pair && order.length) {
      order.push(pair);
      pair = order.shift()!;
    }
    out.push({ group: group.id, pair, said: pair[r() < 0.5 ? 0 : 1] });
  }
  return out;
}

export type SoundRecord = { type: "sitting"; group: string; right: number; asked: number };

/** Per group: sittings, and right of asked over the last two sittings (to suggest what to practise next). */
export function soundSummary(records: readonly SoundRecord[]) {
  const by = new Map<string, SoundRecord[]>();
  for (const r of records) by.set(r.group, [...(by.get(r.group) ?? []), r]);
  return SOUNDS.groups.map((g) => {
    const rs = by.get(g.id) ?? [];
    const last = rs.slice(-2);
    const right = last.reduce((a, r) => a + r.right, 0);
    const asked = last.reduce((a, r) => a + r.asked, 0);
    return { id: g.id, name: g.name, sittings: rs.length, right, asked, sure: asked >= 12 && right / asked >= 0.9 };
  });
}

/** The group to suggest: the first not yet tried, else the least sure. */
export function nextGroup(records: readonly SoundRecord[]): string {
  const s = soundSummary(records);
  const fresh = s.find((g) => !g.sittings);
  if (fresh) return fresh.id;
  return [...s].sort((a, b) => Number(a.sure) - Number(b.sure) || a.right / Math.max(1, a.asked) - b.right / Math.max(1, b.asked))[0].id;
}
