// AUDIT ONLY. Counterfactual: can a fixed straight-line priority policy over the SAME registered rules (no search, no backtracking) reproduce the engine's results?
// If yes, the BFS adds little beyond rule ordering. Reads frozen sets; changes nothing in production.
import { readFileSync, writeFileSync } from "node:fs";
import { Rational, type MathExpr } from "/home/claude/k052/packages/learning/src/math-kernel.ts";
import { initialState, excludedOf, linearFactorExpr, denominatorsOf } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-state.ts";
import { createDomainRegistry, applyDomainRule } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-rules.ts";
import { Poly } from "/home/claude/k052/packages/learning/src/reasoner/domain/poly.ts";
import { printExpr } from "/home/claude/k052/packages/learning/src/reasoner/expr-text.ts";
import { gate } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-engine.ts";
import { plan } from "/home/claude/k052/packages/learning/src/reasoner/planner.ts";
import { movesFrom } from "/home/claude/k052/packages/learning/src/reasoner/planner.ts";
const STUCK: string[] = []; const MODE = process.argv[2] ?? "greedy"; const reg = createDomainRegistry(); const root = "/home/claude/k052/tools/mathematics/domain-reasoner/frozen/";
const cst = (e: MathExpr): Rational | null => (e.kind === "num" ? e.value : e.kind === "neg" ? cst(e.operand)?.neg() ?? null : null);
function greedy(text: string) {
  if (gate(text).reasons.length) return { cls: "refused", sol: null as string[] | null, steps: 0 };
  let s = applyDomainRule(reg, initialState(text), "domain.restrict-denominators", {}); let steps = 1;
  for (let it = 0; it < 30; it++) {
    const { left, right } = s.math.statements[0]; const cl = cst(left), cr = cst(right);
    const fin = (c: Rational) => { try { applyDomainRule(reg, s, "domain.accept-candidate", { value: c.toString() }); return { cls: "unique", sol: [c.toString()], steps: steps + 1 }; } catch { return { cls: "none", sol: null, steps }; } };
    if (left.kind === "var" && cr) return fin(cr); if (cl && right.kind === "var") return fin(cl);
    if (cl && cr) return { cls: cl.eq(cr) ? "identity-on-domain" : "none", sol: null, steps };
    const rational = denominatorsOf(left).length + denominatorsOf(right).length > 0; const ex = excludedOf(s.math);
    const tries: [string, any][] = [];
    if (rational) { for (let i = 0; i < 4; i++) tries.push(["domain.cancel-common-factor", { index: i }]); tries.push(["domain.clear-denominators", {}]); }
    else {
      tries.push(["domain.simplify-polynomial", {}]);
      const L = Poly.fromExpr(left), R = Poly.fromExpr(right);
      const high = !!L && !!R && (L.degree > 1 || R.degree > 1);
      if (high) { if (!(cr && cr.isZero())) tries.push(["domain.move-to-left", {}]); if (cr && cr.isZero() && L) for (const a of ex) if (L.eval(a).isZero()) tries.push(["domain.divide-both-sides", { factor: printExpr(linearFactorExpr(a)) }]); }
      else {
        // fixed macro pipeline reached a degree<=1 equation: hand it to the K05.1 search (plan) and map its outcome
        if (MODE === "macro+k051") { try { s = applyDomainRule(reg, s, "domain.simplify-polynomial", {}); steps++; continue; } catch { /* already simplified */ } const r = plan(printExpr(left) + "=" + printExpr(right)); if (r.outcome === "identity") return { cls: "identity-on-domain", sol: null, steps }; if (r.outcome === "no-solution") return { cls: "none", sol: null, steps };
          if (r.outcome === "solved") { const v = r.answer!.replace(/^x\s*=\s*/, ""); try { applyDomainRule(reg, s, "domain.accept-candidate", { value: v }); return { cls: "unique", sol: [v], steps: steps + r.steps.length + 1 }; } catch { return { cls: "none", sol: null, steps }; } } STUCK.push(text + " PLAN-> " + r.outcome + " : " + printExpr(left) + " = " + printExpr(right)); return { cls: "stuck", sol: null, steps }; }
        for (let i = 0; i < movesFrom({ left, right }).length; i++) tries.push(["domain.linear-step", { index: i }]);
      }
      if (!high && cr && !cr.isZero() && false) tries.push(["domain.move-to-left", {}]);
    }
    let moved = false;
    for (const [r, p] of tries) { try { s = applyDomainRule(reg, s, r, p); moved = true; steps++; break; } catch { /* next */ } }
    if (!moved) { STUCK.push(text + "  ->  " + printExpr(left) + " = " + printExpr(right)); return { cls: "stuck", sol: null, steps }; }
  }
  STUCK.push(text + "  LOOP-> " + printExpr(s.math.statements[0].left) + " = " + printExpr(s.math.statements[0].right)); return { cls: "stuck", sol: null, steps };
}
const out: any = {};
for (const name of ["dev", "eval", "holdout"]) {
  const cases = JSON.parse(readFileSync(root + name + ".json", "utf8")); let ok = 0; const bad: string[] = []; const cats: Record<string, number> = {};
  for (const c of cases) { const g = greedy(c.text); const same = g.cls === c.class && (c.class !== "unique" || JSON.stringify(g.sol) === JSON.stringify(c.solution)); if (same) ok++; else { bad.push(c.id); cats[g.cls] = (cats[g.cls] ?? 0) + 1; } }
  out[name] = { cases: cases.length, greedyCorrect: ok, rate: +(ok / cases.length).toFixed(4), failedIds: bad.slice(0, 15), failedByGot: cats };
}
console.log(STUCK.slice(0,8).join("\n")); writeFileSync("/home/claude/k052/tools/mathematics/audit/ablation-"+MODE+".json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
