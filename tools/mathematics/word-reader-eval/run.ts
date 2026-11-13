/**
 * word-reader@1 trial: how often does the language reader turn one of OUR OWN worded problems into a calculation whose
 * answer (worked by OpenPath's solver) is the problem's known answer?
 *
 * The problems are the worded forms of OpenPath's problem kinds (written by us, answers known by construction): one per
 * kind, kinds that need a picture left out. Nothing from a learner and nothing from a textbook is sent.
 *
 *   OPENPATH_WORD_PROBLEM_API_KEY=… OPENPATH_WORD_PROBLEM_MODEL=… node --import tsx tools/mathematics/word-reader-eval/run.ts [--limit=300]
 *
 * Writes a summary to stdout (and $GITHUB_STEP_SUMMARY). The key is read from the environment and never printed.
 * This spends money (a few cents for 300 problems on a small model): it runs only when asked, never in ordinary CI.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { FAMILIES, problemOf } from "../../../packages/learning/src/families";
import { solve } from "../../../packages/learning/src/solve";

const key = process.env.OPENPATH_WORD_PROBLEM_API_KEY ?? "";
const model = process.env.OPENPATH_WORD_PROBLEM_MODEL ?? "";
const base = process.env.OPENPATH_WORD_PROBLEM_BASE_URL ?? "https://api.anthropic.com";
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 300);
if (!key || !model) { console.error("Set OPENPATH_WORD_PROBLEM_API_KEY and OPENPATH_WORD_PROBLEM_MODEL."); process.exit(2); }
const PROMPT = JSON.parse(readFileSync(new URL("../../../content/learning/word-problem-prompt.v1.json", import.meta.url), "utf8"));

// ---- our own worded problems with a single numeric answer and no picture
type Case = { id: string; prompt: string; answer: string };
const cases: Case[] = [];
for (const [id, def] of FAMILIES as Map<string, { word?: unknown; domain?: [number, number][]; reject: (p: number[]) => unknown }>) {
  if (!def.word || !def.domain) continue;
  // a point a third of the way into the kind's range, moved along until the kind accepts it
  for (let shift = 0; shift < 12; shift++) {
    const p = def.domain.map(([lo, hi], k) => Math.min(hi, lo + Math.floor((hi - lo) / 3) + ((shift * (k + 1)) % (hi - lo + 1))));
    if (def.reject(p)) continue;
    const pr = problemOf(`gen:${id}:${p.join(",")}:w`);
    if (!pr || pr.figure || !["integer", "decimal", "fraction", "number"].includes(String(pr.type)) || /picture|shown|figure|diagram|graph|chart|table|below|above/i.test(pr.prompt)) break;
    const known = solve(pr.answer);
    if (known.ok && known.value) cases.push({ id: pr.id, prompt: pr.prompt, answer: pr.answer });
    break;
  }
}
// spread across the kinds rather than the first few hundred
const step = Math.max(1, Math.floor(cases.length / limit));
const chosen = cases.filter((_, i) => i % step === 0).slice(0, limit);
if (process.argv.includes("--list")) { console.log(`${chosen.length} chosen of ${cases.length} eligible`); for (const c of chosen.slice(0, 6)) console.log(c.id, "|", c.prompt, "|", c.answer); process.exit(0); }

const CALC = /^[0-9x+\-*/().,%^= ]{1,160}$/;
async function read(text: string): Promise<{ calculation?: string; cannot?: string; tokens: [number, number] }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base}/v1/messages`, { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 300, system: PROMPT.system, messages: [{ role: "user", content: `${PROMPT.userPrefix}${text}${PROMPT.userSuffix}` }] }) });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`provider answered ${res.status}`);
    const body = (await res.json()) as { content: { type: string; text?: string }[]; usage: { input_tokens: number; output_tokens: number } };
    const out = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    const tokens: [number, number] = [body.usage.input_tokens, body.usage.output_tokens];
    try {
      const data = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
      if (typeof data.cannot === "string") return { cannot: data.cannot, tokens };
      if (typeof data.calculation === "string" && CALC.test(data.calculation.trim())) return { calculation: data.calculation.trim(), tokens };
    } catch { /* counted as unreadable below */ }
    return { cannot: "(reply not in the expected form)", tokens };
  }
}

async function main() {
const tally = { right: 0, wrong: 0, refused: 0, unsolvable: 0 };
const wrong: string[] = [], refused: string[] = [];
let tin = 0, tout = 0;
for (const c of chosen) {
  const r = await read(c.prompt);
  tin += r.tokens[0]; tout += r.tokens[1];
  if (!r.calculation) { tally.refused++; if (refused.length < 15) refused.push(`- \`${c.id}\` ${c.prompt} → _${r.cannot}_`); continue; }
  const s = solve(r.calculation), known = solve(c.answer);
  if (!s.ok || !s.value) { tally.unsolvable++; if (refused.length < 15) refused.push(`- \`${c.id}\` ${c.prompt} → \`${r.calculation}\` (the solver cannot work this)`); continue; }
  const same = known.ok && known.value && s.value.n === known.value.n && s.value.d === known.value.d;
  if (same) tally.right++;
  else { tally.wrong++; if (wrong.length < 25) wrong.push(`- \`${c.id}\` ${c.prompt} → \`${r.calculation}\` = ${s.answer}, expected ${c.answer}`); }
}
const n = chosen.length, pct = (v: number) => `${((100 * v) / Math.max(1, n)).toFixed(1)}%`;
const report = [`## word-reader@1 trial: ${model}`, "", `${n} of OpenPath's own worded problems (one per kind; ${cases.length} eligible).`, "", `| Outcome | Count | Share |`, `|---|---|---|`, `| Right answer | ${tally.right} | ${pct(tally.right)} |`, `| WRONG answer shown | ${tally.wrong} | ${pct(tally.wrong)} |`, `| Refused by the reader | ${tally.refused} | ${pct(tally.refused)} |`, `| Read, but not a calculation the solver works | ${tally.unsolvable} | ${pct(tally.unsolvable)} |`, "", `Tokens: ${tin} in, ${tout} out (${(tin / Math.max(1, n)).toFixed(0)} / ${(tout / Math.max(1, n)).toFixed(0)} per problem).`, "", "### Wrong (first 25)", ...(wrong.length ? wrong : ["none"]), "", "### Refused or unsolvable (first 15)", ...(refused.length ? refused : ["none"])].join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
}
main().catch((e) => { console.error(String((e as Error).message ?? e)); process.exit(1); });
