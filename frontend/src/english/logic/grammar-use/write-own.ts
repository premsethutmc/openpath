/**
 * Write your own (content/english/grammar/write-own.json): after a Grammar sitting, the learner writes one sentence
 * of their own that uses a rule just practised ("Write a sentence about a friend with has."). It is checked by rule,
 * with no AI: it must show the rule (the prompt's patterns), look like a sentence (a capital letter, an end mark, at
 * least four words), and pass the writing check with no slip to fix. A second try follows; then an example. What the
 * learner writes is never stored: only the topic, whether it was right and on which try.
 */
import ownJson from "../../../../../content/english/grammar/write-own.json";
import { checkWriting } from "../writing/check.ts";
import type { Dictionary } from "../writing/dictionary.ts";
import { GRAMMAR } from "./grammar-use.ts";

export interface OwnPrompt {
  topic: string;
  prompt: string;
  example: string;
  need: string[];
  hint: string;
}
export const OWN: OwnPrompt[] = (ownJson as { prompts: OwnPrompt[] }).prompts;

export interface OwnMark {
  ok: boolean;
  /** The sentence does not show the rule yet. */
  rule: boolean;
  /** Starts with a capital letter, ends with . ? or !, and has at least four words. */
  form: { capital: boolean; end: boolean; long: boolean };
  /** Slips the writing check found (spelling, grammar, marks). */
  slips: string[];
}

/** With the word list (when it has loaded), a word not in it counts as a slip too: one sentence leaves no room for names. */
export function markOwn(p: OwnPrompt, text: string, dict?: Dictionary | null): OwnMark {
  const t = text.trim();
  const rule = p.need.every((r) => new RegExp(r, "i").test(t));
  const form = { capital: /^["“]?[A-Z]/.test(t), end: /[.?!]["”]?$/.test(t), long: (t.match(/[A-Za-z']+/g) ?? []).length >= 4 };
  const slips = t ? checkWriting(t, { min: 1, max: 200 }, dict).notes.filter((n) => (n.level === "fix" || n.id === "unknown") && !["length", "short", "long", "paragraphs", "sentences"].some((k) => n.id.startsWith(k))).map((n) => n.text) : [];
  return { ok: rule && form.capital && form.end && form.long && !slips.length, rule: !rule, form, slips };
}

/** The topic to write about after a sitting: the first practised topic that has a prompt (missed topics first). */
export const ownFor = (topics: readonly string[]): OwnPrompt | null => topics.map((t) => OWN.find((p) => p.topic === t)).find((p) => !!p) ?? null;

export function ownProblems(): string[] {
  const out: string[] = [];
  for (const p of OWN) {
    if (!GRAMMAR.topics.some((t) => t.id === p.topic)) out.push(`${p.topic}: no such topic`);
    if (OWN.filter((x) => x.topic === p.topic).length > 1) out.push(`${p.topic}: two prompts`);
    const m = markOwn(p, p.example);
    if (!m.ok) out.push(`${p.topic}: its own example is not accepted (${JSON.stringify(m)})`);
    if (markOwn(p, "I like my school very much.").ok && !p.need.every((r) => new RegExp(r, "i").test("I like my school very much."))) out.push(`${p.topic}: a sentence without the rule is accepted`);
  }
  return out;
}
{
  const p = ownProblems();
  if (p.length) throw new Error(`write your own: ${p.slice(0, 5).join("; ")}`);
}
