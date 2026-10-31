// E7 Phase 2: falsehood-injection battery. For every natural-input corpus case whose reference is `verified`, inject a mathematically FALSE statement
// (as a prose sentence, as a verbal assertion, between lines, and as a trailing line). No engine may verify any of them. A TRUE statement injected the same
// way measures how much valid work survives the claim accounting. Usage: ENGINE_ROOT=<worktree> bun injection-battery.ts > out.json
import { readFileSync } from "node:fs";
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const T = new URL("../../", import.meta.url).pathname;
const parts: [string, string][] = [["e2dev", "proof-integrity-e2/dev-cases.v1.json"], ["e2sealed", "proof-integrity-e2/sealed-cases.v1.json"], ["e3dev", "verification-closure-e3/dev-cases.v1.json"], ["e3sealed", "verification-closure-e3/sealed-cases.v1.json"], ["e4dev", "coverage-e4/dev-cases.v1.json"], ["e4sealed", "coverage-e4/sealed-cases.v1.json"], ["e5dev", "geocalc-e5/dev-cases.v1.json"], ["e5sealed", "geocalc-e5/sealed-cases.v1.json"], ["e6dev", "generalization-e6/dev-cases.v1.json"], ["e6val", "generalization-e6/validation-cases.v1.json"], ["e6sealed", "generalization-e6/sealed-cases.v1.json"], ["h1", "generalization-e6r/holdout1/holdout-cases.v1.json"], ["h2", "generalization-e6r/holdout2/holdout-cases.v1.json"]];
const FALSE = { prose: "Note that 2 + 2 = 5.", verbal: "Recall that the square of 3 is 10.", predicate: "It follows that 12 is a prime number.", predicate2: "Note that the polynomial has no real roots and the function is odd.", between: "Since 7 * 6 = 41 we continue.", trailing: "Hence 7 = 8." };
const TRUE = { prose: "Note that 2 + 2 = 4.", between: "Since 7 * 6 = 42 we continue.", trailing: "Hence 7 = 7." };
const variants = (text: string, S: Record<string, string>) => {
  const lines = text.split("\n"); const out: Record<string, string> = {};
  if (S.prose) out.prose = S.prose + "\n" + text;
  if (S.verbal) out.verbal = S.verbal + "\n" + text;
  if ((S as any).predicate) { out.predicate = (S as any).predicate + "\n" + text; out.predicate2 = (S as any).predicate2 + "\n" + text; }
  if (S.between && lines.length > 1) out.between = [lines[0], S.between, ...lines.slice(1)].join("\n");
  if (S.trailing) out.trailing = text + "\n" + S.trailing;
  return out;
};
const res = { engine: root, cases: 0, falseRuns: 0, falseVerified: [] as string[], trueRuns: 0, trueVerified: 0, trueInvalid: [] as string[] };
for (const [name, f] of parts) {
  let cs: any[]; try { cs = JSON.parse(readFileSync(T + f, "utf8")).cases; } catch { continue; }
  for (const c of cs) {
    const w = c.studentWorking; if (!w || Array.isArray(w) || w.format !== "natural" || !c.problem) continue;
    const ref = c.reference?.classification ?? c.expected?.classification; if (ref !== "verified") continue;
    const id = `${name}/${c.caseId ?? c.id}`; res.cases++;
    for (const [k, t] of Object.entries(variants(w.text, FALSE))) { res.falseRuns++; try { const r: any = await assessMathematicalWorking(c.problem, { format: "natural", text: t }); if (r.classification === "verified") res.falseVerified.push(`${id}:${k}`); } catch { /* an exception never verifies */ } }
    for (const [k, t] of Object.entries(variants(w.text, TRUE))) { res.trueRuns++; try { const r: any = await assessMathematicalWorking(c.problem, { format: "natural", text: t }); if (r.classification === "verified") res.trueVerified++; else if (r.classification === "invalid") res.trueInvalid.push(`${id}:${k}`); } catch { /* ignore */ } }
  }
}
console.log(JSON.stringify(res));
