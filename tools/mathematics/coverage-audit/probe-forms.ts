// Gate 5 probe R4: the ACTIVE answer path (session.decide) on the answer forms, for several unrelated families per form: stored answer, equivalent alternative forms, incorrect answers,
// boundary variants that must be wrong, and unreadable input. Records WHERE a failure sits (comparator normalisation, contract, unreadable-as-wrong). Usage: bun probe-forms.ts inv-base.json out.json
import { readFileSync, writeFileSync } from "node:fs";
import { decide } from "../../../packages/learning/src/session.ts";
const inv = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[];
const mn = (s: string) => s.replace(/−/g, "-");
const num = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim());
type T = { cat: "stored" | "alt" | "wrong" | "boundary-wrong" | "unreadable"; r: string; note: string };
function cases(type: string, a: string): T[] {
  const t: T[] = [{ cat: "stored", r: a, note: "stored answer" }];
  const bump = (s: string) => s.replace(/-?\d+/, (m) => String(Number(mn(m)) + 1));
  const sw = (s: string) => s.replace(/−/g, "-");
  if (type === "integer") { t.push({ cat: "alt", r: ` ${a} `, note: "spaces" }, { cat: "alt", r: `${mn(a)}.0`, note: "trailing .0" }, { cat: "wrong", r: bump(a), note: "off by one" }, { cat: "boundary-wrong", r: a.startsWith("-") ? a.slice(1) : "-" + a, note: "sign flip" }); }
  if (type === "fraction") { t.push({ cat: "alt", r: ` ${a} `, note: "spaces" }, { cat: "wrong", r: bump(a), note: "numerator +1" }, { cat: "boundary-wrong", r: a.startsWith("-") ? a.slice(1) : "-" + a, note: "sign flip" }); const m = mn(a).match(/^(-?)(\d+)\/(\d+)$/); if (m) { const v = Number(m[2]) / Number(m[3]); if (Number.isFinite(v) && String(v).length < 9) t.push({ cat: "alt", r: `${m[1]}${v}`, note: "decimal form" }); t.push({ cat: "alt", r: `${m[1]}${Number(m[2]) * 2}/${Number(m[3]) * 2}`, note: "unreduced fraction (policy may reject)" }); } else if (num(a)) { const v = Number(a); if (Number.isInteger(v * 2)) t.push({ cat: "alt", r: String(v), note: "same decimal" }); } }
  if (type === "mixed") t.push({ cat: "wrong", r: bump(a), note: "off by one" });
  if (type === "ratio") t.push({ cat: "alt", r: a.replace(":", " : "), note: "spaced colon" }, { cat: "alt", r: a.replace(":", "/"), note: "slash ratio (policy)" }, { cat: "boundary-wrong", r: a.split(":").reverse().join(":"), note: "reversed ratio" });
  if (type === "exact") { t.push({ cat: "alt", r: a.replace(/√(\d+)/g, "sqrt($1)").replace(/π/g, "pi"), note: "sqrt()/pi spelling" }, { cat: "alt", r: a.replace(/(\d)(√)/g, "$1*$2").replace(/√(\d+)/g, "sqrt($1)"), note: "explicit *" }, { cat: "wrong", r: bump(a), note: "first number +1" }, { cat: "boundary-wrong", r: a.startsWith("-") || a.startsWith("−") ? a.replace(/^[-−]/, "") : "-" + a, note: "sign flip" }); }
  if (type === "tuple") { const els = mn(a).replace(/[()]/g, "").split(",").map((x) => x.trim()); t.push({ cat: "alt", r: els.join(","), note: "no brackets, no spaces" }, { cat: "alt", r: `( ${els.join(" , ")} )`, note: "spaced brackets" }, { cat: "wrong", r: `(${[bump(els[0]), ...els.slice(1)].join(", ")})`, note: "first +1" }); if (els.length > 1 && new Set(els).size > 1) t.push({ cat: "boundary-wrong", r: `(${[...els].reverse().join(", ")})`, note: "reversed order" }); }
  if (type === "set" || type === "roots") { const els = mn(a).split(",").map((x) => x.trim()); if (els.length > 1) t.push({ cat: "alt", r: [...els].reverse().join(", "), note: "reordered" }, { cat: "boundary-wrong", r: els.slice(1).join(", "), note: "one element missing" }, { cat: "boundary-wrong", r: els.concat(["97"]).join(", "), note: "extra element" }); t.push({ cat: "alt", r: `{${els.join(", ")}}`, note: "braces" }, { cat: "wrong", r: [bump(els[0]), ...els.slice(1)].join(", "), note: "first +1" }); }
  if (type === "interval") { t.push({ cat: "alt", r: ` ${a} `, note: "spaces" }, { cat: "boundary-wrong", r: a.includes("[") ? a.replace("[", "(") : a.includes("(") ? a.replace("(", "[") : a.includes("≤") ? a.replace("≤", "<") : a.replace("<", "≤").replace(">", "≥"), note: "closure flipped" }, { cat: "wrong", r: bump(a), note: "bound +1" }); const m = mn(a).match(/^x ([<>]) (-?\d+)$/); if (m) t.push({ cat: "alt", r: m[1] === ">" ? `(${m[2]}, ∞)` : `(-∞, ${m[2]})`, note: "interval notation for inequality" }); }
  if (type === "matrix") { const compact = mn(a).replace(/\s+/g, ""); t.push({ cat: "alt", r: compact, note: "no spaces" }, { cat: "wrong", r: bump(a), note: "one entry +1" }); }
  if (type === "expression") { t.push({ cat: "alt", r: a.replace(/ /g, ""), note: "no spaces" }, { cat: "alt", r: a.replace(/(\d)(x|sin|cos|e)/g, "$1*$2").replace(/\^/g, "^"), note: "explicit *" }, { cat: "wrong", r: a + " + 1", note: "+1 added" }); }
  if (type === "antiderivative") { t.push({ cat: "alt", r: a.replace(/\s*\+\s*C$/, ""), note: "without + C" }, { cat: "alt", r: a.replace(/\s*\+\s*C$/, "") + " + 7", note: "other constant" }, { cat: "wrong", r: a.replace(/\s*\+\s*C$/, "") + " + x", note: "extra term" }); }
  if (type === "choice") { const wrong = ["A", "B", "C", "D"].find((x) => x !== a)!; t.push({ cat: "wrong", r: wrong, note: "other option" }); }
  if (type !== "choice") t.push({ cat: "unreadable", r: "I don't know", note: "words" }, { cat: "unreadable", r: "", note: "empty" });
  return t;
}
const TYPES = ["integer", "fraction", "mixed", "ratio", "exact", "tuple", "set", "roots", "interval", "matrix", "expression", "antiderivative", "choice"];
let seed = 3; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const out: any = {}; const byFam: any[] = [];
for (const ty of TYPES) {
  const fs = inv.filter((f) => f.answerType === ty); const seenComp = new Set<string>(); const pick: any[] = [];
  for (const f of [...fs].sort(() => rnd(3) - 1)) { if (!seenComp.has(f.competency)) { seenComp.add(f.competency); pick.push(f); } if (pick.length >= 8) break; }
  const tally: any = {};
  for (const f of pick) for (const s of f.samples) {
    for (const c of cases(ty, String(s.answer))) {
      const a = decide(s.id, c.r, []); const k = `${c.cat}${c.cat === "alt" || c.cat === "boundary-wrong" ? ":" + c.note : ""}`;
      const x = (tally[k] ??= { n: 0, credited: 0, rejected: 0, undecided: 0, examples: [] as string[] }); x.n++;
      if (a.credit === true) x.credited++; else if (a.credit === false) x.rejected++; else x.undecided++;
      const bad = (c.cat === "stored" && a.credit !== true) || ((c.cat === "wrong" || c.cat === "boundary-wrong") && a.credit === true) || (c.cat === "alt" && a.credit !== true);
      if (bad && x.examples.length < 2) x.examples.push(`${f.family}: ${s.prompt.slice(0, 60)} | ${JSON.stringify(c.r)} stored ${JSON.stringify(s.answer)} -> ${a.credit}`);
    }
  }
  out[ty] = { families: pick.map((f) => f.family), tally };
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const [ty, v] of Object.entries<any>(out)) { console.log(`== ${ty} (${v.families.length} families: ${v.families.join(",")})`); for (const [k, x] of Object.entries<any>(v.tally)) console.log(`  ${k.padEnd(46)} n=${String(x.n).padEnd(3)} credit ${String(x.credited).padEnd(3)} wrong ${String(x.rejected).padEnd(3)} undecided ${x.undecided}`); }
