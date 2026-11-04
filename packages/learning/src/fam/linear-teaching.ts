/**
 * Workstream A3: the instance teaching (teaching-contract@1) of the linear-equations families — for one concrete equation, the
 * worked solution step by step (each step says why it keeps the equation true), the arithmetic claims a machine checks, and the
 * check by substitution into the ORIGINAL equation. Used by `lin` (ax + b = c), `lboth` (x on both sides) and `lbrk` (a bracket).
 */
import type { InstanceTeaching, TeachStep } from "../family-kit";

/** A signed number as written: −3. */
export const sn = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A number in an arithmetic claim (machine-read): negative ones in brackets. */
const cn = (v: number) => (v < 0 ? `(${v})` : String(v));
/** k·x + m as written: 3x − 6, x + 4, −2x. */
export function lin(k: number, m: number): string {
  let out = "";
  if (k !== 0) out = `${k === 1 ? "" : k === -1 ? "−" : sn(k)}x`;
  if (m !== 0) out += out ? ` ${m < 0 ? "−" : "+"} ${Math.abs(m)}` : sn(m);
  return out || "0";
}
/** a(x + s) as written: 3(x − 2). */
export const bracket = (a: number, s: number) => `${a}(x ${s < 0 ? "−" : "+"} ${Math.abs(s)})`;
/** "take 5 from both sides" / "add 6 to both sides", for removing the number m from one side. */
const removeNumber = (m: number) => (m > 0 ? `Take ${m} from both sides` : `Add ${-m} to both sides`);
const minusTerm = (m: number) => (m > 0 ? `− ${m}` : `+ ${-m}`);

/** ax + b = c, solution x. */
export function twoStepTeaching([a, b, x]: number[]): InstanceTeaching {
  const c = a * x + b, ax = a * x;
  const steps: TeachStep[] = [
    { expression: `${lin(a, b)} = ${c}`, explanation: `The two sides are equal: ${a} lots of x, plus ${b}, is the same amount as ${c}.` },
    { expression: `${lin(a, b)} − ${b} = ${c} − ${b}`, explanation: `Take ${b} from both sides. Doing the same to both sides keeps them equal.`, claims: [{ expr: `${c} - ${b}`, value: ax }] },
    { expression: `${lin(a, 0)} = ${ax}`, explanation: `${b} − ${b} = 0, so only ${a}x is left on the left.` },
    { expression: `${a}x ÷ ${a} = ${ax} ÷ ${a}`, explanation: `${a}x means ${a} × x. Divide the whole of each side by ${a}.`, claims: [{ expr: `${ax} ÷ ${a}`, value: x }] },
    { expression: `x = ${x}`, explanation: "x is on its own: this is the solution." },
    { expression: `Check: ${a} × ${x} + ${b} = ${c}`, explanation: `Put ${x} back into the original equation. Both sides are ${c}, so x = ${x} is right.`, claims: [{ expr: `${a} × ${x} + ${b}`, value: c }] },
  ];
  return { concept: { title: "Undo one step at a time", text: ["An equation is a balance: do the same to both sides and it stays true.", `To get x on its own in ${lin(a, b)} = ${c}, undo the + ${b} first, then the × ${a}.`] }, worked: { steps, result: x } };
}

/** ax + b = cx + d (0 < c < a), solution x. */
export function bothSidesTeaching([a, b, c, x]: number[]): InstanceTeaching {
  const d = (a - c) * x + b, k = a - c, r = d - b;
  const steps: TeachStep[] = [
    { expression: `${lin(a, b)} = ${lin(c, d)}`, explanation: "There are x's on both sides. Collect them on the side with more x's." },
    { expression: `${lin(a, b)} − ${lin(c, 0)} = ${lin(c, d)} − ${lin(c, 0)}`, explanation: `Take ${lin(c, 0)} from both sides. It is the same amount on each side, so they stay equal.` },
    { expression: `${lin(k, b)} = ${d}`, explanation: `${a}x − ${lin(c, 0)} = ${lin(k, 0)}, and the x's on the right are gone.`, claims: [{ expr: `${a} - ${c}`, value: k }] },
    { expression: `${lin(k, b)} ${minusTerm(b)} = ${d} ${minusTerm(b)}`, explanation: `${removeNumber(b)}, so the x term is on its own.`, claims: [{ expr: `${d} - ${cn(b)}`, value: r }] },
    { expression: `${lin(k, 0)} = ${r}`, explanation: k === 1 ? "x is on its own." : `${k}x means ${k} × x.` },
    ...(k === 1 ? [] : [{ expression: `x = ${r} ÷ ${k} = ${x}`, explanation: `Divide both sides by ${k}.`, claims: [{ expr: `${r} ÷ ${k}`, value: x }] }]),
    { expression: `Check: ${a} × ${x} + ${b} = ${a * x + b} and ${c === 1 ? x : `${c} × ${x}`} + ${d} = ${c * x + d}`, explanation: `Put ${x} into both sides of the original equation: both are ${a * x + b}.`, claims: [{ expr: `${a} × ${x} + ${b}`, value: a * x + b }, { expr: `${c} × ${x} + ${d}`, value: c * x + d }] },
  ];
  return { concept: { title: "x on both sides", text: ["Taking the same number of x's from both sides keeps the balance, just as taking the same number does.", "Every step changes both sides in the same way, so every line has the same solution as the first."] }, worked: { steps, result: x } };
}

/** a(x + s) = cx + d (0 < c < a), solution x. */
export function bracketTeaching([a, s, c, x]: number[]): InstanceTeaching {
  const d = a * (x + s) - c * x, as = a * s, k = a - c, r = d - as;
  const steps: TeachStep[] = [
    { expression: `${bracket(a, s)} = ${lin(c, d)}`, explanation: `${bracket(a, s)} means ${a} lots of (x ${s < 0 ? "−" : "+"} ${Math.abs(s)}).` },
    { expression: `${lin(a, as)} = ${lin(c, d)}`, explanation: `Multiply out the bracket first: ${a} × x = ${a}x and ${a} × ${sn(s)} = ${sn(as)}. Both terms inside are multiplied.`, claims: [{ expr: `${a} × ${cn(s)}`, value: as }] },
    { expression: `${lin(a, as)} − ${lin(c, 0)} = ${lin(c, d)} − ${lin(c, 0)}`, explanation: `Take ${lin(c, 0)} from both sides, so the x's are on one side.` },
    { expression: `${lin(k, as)} = ${d === 0 ? "0" : sn(d)}`, explanation: `${a}x − ${lin(c, 0)} = ${lin(k, 0)}.`, claims: [{ expr: `${a} - ${c}`, value: k }] },
    { expression: `${lin(k, as)} ${minusTerm(as)} = ${sn(d)} ${minusTerm(as)}`, explanation: `${removeNumber(as)}, so the x term is on its own.`, claims: [{ expr: `${d} - ${cn(as)}`, value: r }] },
    { expression: `${lin(k, 0)} = ${sn(r)}`, explanation: k === 1 ? "x is on its own." : `${k}x means ${k} × x.` },
    ...(k === 1 ? [] : [{ expression: `x = ${sn(r)} ÷ ${k} = ${x}`, explanation: `Divide both sides by ${k}.`, claims: [{ expr: `${r} ÷ ${k}`, value: x }] }]),
    { expression: `Check: ${a} × (${x} ${s < 0 ? "−" : "+"} ${Math.abs(s)}) = ${a * (x + s)} and ${c === 1 ? x : `${c} × ${x}`} ${d < 0 ? "−" : "+"} ${Math.abs(d)} = ${c * x + d}`, explanation: `Put ${x} into both sides of the original equation: both are ${a * (x + s)}.`, claims: [{ expr: `${a} × (${x} + ${cn(s)})`, value: a * (x + s) }, { expr: `${c} × ${x} + ${cn(d)}`, value: c * x + d }] },
  ];
  return { concept: { title: "Equations with a bracket", text: ["Multiply out the bracket first: the number outside multiplies every term inside.", "Then collect the x's on one side and the numbers on the other, doing the same to both sides each time."] }, worked: { steps, result: x } };
}
