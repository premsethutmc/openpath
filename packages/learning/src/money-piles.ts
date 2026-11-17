/**
 * money-piles@1: an amount of rupees and paise as coins a child can count and pay with. The piles are built so that
 * the amount to pay can always be paid exactly with the coins shown (after one rupee is changed into paise, when the
 * paise are not enough): a child never needs change they do not have.
 */
export interface Coin { id: string; paise: number; pile: "rupees" | "paise"; group: "have" | "more"; paid: boolean }
export interface MoneyPicture { type: "money"; have: [number, number]; other: [number, number]; take: boolean; still?: boolean }

const split = (n: number, units: number[]): number[] => units.flatMap((u) => { const k = Math.floor(n / u); n -= k * u; return Array<number>(k).fill(u); });
const rupees = (n: number) => split(n, [10, 1]).map((r) => r * 100);
const paise = (n: number) => split(n, [10, 5]);
/** One rupee as paise coins: nine 10p and two 5p, so any paise amount up to 95 can then be paid. */
export const RUPEE_AS_PAISE = [...Array<number>(9).fill(10), 5, 5];

/** Whether the paise are too few to pay with (one rupee must be changed first). */
export const needsChange = (m: MoneyPicture) => m.take && m.have[1] < m.other[1];

/** The coins at the start. Taking away: one pile that holds the coins to pay. Adding: what you have, then what you get. */
export function coinsOf(m: MoneyPicture): Coin[] {
  const [a, pa] = m.have, [b, pb] = m.other;
  const mk = (vals: number[], pile: Coin["pile"], group: Coin["group"]) => vals.map((v) => ({ paise: v, pile, group, paid: false }));
  const desc = <T extends { paise: number }>(xs: T[]) => [...xs].sort((x, y) => y.paise - x.paise);
  const list = m.take
    ? needsChange(m)
      ? [...desc(mk([...rupees(b), 100, ...rupees(a - b - 1)], "rupees", "have")), ...mk(paise(pa), "paise", "have")]
      : [...desc(mk([...rupees(b), ...rupees(a - b)], "rupees", "have")), ...desc(mk([...paise(pb), ...paise(pa - pb)], "paise", "have"))]
    : [...mk(rupees(a), "rupees", "have"), ...mk(rupees(b), "rupees", "more"), ...mk(paise(pa), "paise", "have"), ...mk(paise(pb), "paise", "more")];
  return list.map((c, i) => ({ ...c, id: `c${i}` }));
}
const sum = (cs: Coin[], pile: Coin["pile"], paid: boolean) => cs.filter((c) => c.pile === pile && c.paid === paid).reduce((s, c) => s + c.paise, 0);
/** What has been paid and what is left, as [rupees, paise] (paise may pass 99 while adding, before they are changed). */
export function totals(cs: Coin[]): { paid: [number, number]; left: [number, number] } {
  return { paid: [sum(cs, "rupees", true) / 100, sum(cs, "paise", true)], left: [sum(cs, "rupees", false) / 100, sum(cs, "paise", false)] };
}
/** Change one unpaid ₹1 coin into 100 paise of coins; the same coins when there is none. */
export function changeRupee(cs: Coin[]): Coin[] {
  const i = cs.map((c) => c.pile === "rupees" && c.paise === 100 && !c.paid).lastIndexOf(true);
  if (i < 0) return cs;
  return [...cs.filter((_, k) => k !== i), ...RUPEE_AS_PAISE.map((v, k) => ({ id: `${cs[i].id}p${k}`, paise: v, pile: "paise" as const, group: cs[i].group, paid: false }))];
}
/** Change 100 paise of unpaid paise coins into one ₹1 coin; the same coins when they do not make 100. */
export function changePaise(cs: Coin[]): Coin[] {
  const ps = cs.filter((c) => c.pile === "paise" && !c.paid);
  const fives = ps.filter((c) => c.paise === 5), tens = ps.filter((c) => c.paise === 10);
  const useFives = fives.length >= 2 && tens.length < 10 ? fives.slice(0, 2) : [];
  const useTens = tens.slice(0, (100 - 5 * useFives.length) / 10);
  if (10 * useTens.length + 5 * useFives.length !== 100) return cs;
  const gone = new Set([...useTens, ...useFives].map((c) => c.id));
  return [...cs.filter((c) => !gone.has(c.id)), { id: `r${cs.length}${gone.size}`, paise: 100, pile: "rupees", group: "have", paid: false }];
}
export const coinLabel = (c: Coin) => (c.pile === "rupees" ? `₹${c.paise / 100}` : `${c.paise}p`);
