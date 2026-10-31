import { solve } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-engine.ts";
import { checkStepText, checkClaim } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-checker.ts";
const t = (f: () => unknown) => { try { return JSON.stringify(f()); } catch (e) { return "THROWS " + String(e).slice(0, 80); } };
console.log("1 neg-exp solve:", t(() => { const r = solve("1/(x-1)-1/(x-1)=x^-1*x-1"); return [r.class, r.restrictions]; }));
console.log("1 neg-exp step :", t(() => checkStepText({ eq: "x^-1*x=1", excluded: [] }, { eq: "1=1", excluded: [] }, "equivalence")));
console.log("2 from-state   :", t(() => checkStepText({ eq: "(x^2-1)/(x-1)=2", excluded: [] }, { eq: "x+1=2", excluded: [] }, "equivalence")));
console.log("3 complex roots:", t(() => checkStepText({ eq: "x^2+1=0", excluded: [] }, { eq: "x^2+4=0", excluded: [] }, "equivalence")));
console.log("gate throws    :", t(() => solve("(x^2-1e26)/x=1")));
