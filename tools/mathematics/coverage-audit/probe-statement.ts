// Gate 3/5 probe R1: can the EXISTING answer-first entry point reproduce the stored answer from a statement taken mechanically out of the generated prompt?
// No parsing is added: the statement is a substring of the prompt; the checker's own parser decides whether it can read it. Usage: bun probe-statement.ts inv-base.json out.json
import { readFileSync, writeFileSync } from "node:fs";
import { assessAnswerFirst } from "../../../packages/learning/src/answer-first.ts";
const inv = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[];
const MATH = /[0-9a-zA-Z+\-−–×÷*\/^()=<>≤≥≠.,²³⁴√π|\s]/;
function candidates(prompt: string): string[] {
  const c: string[] = [];
  const p = prompt.replace(/\s+/g, " ");
  let m = p.match(/^(?:Solve|Work out|Calculate|Evaluate|Simplify|Find the value of|Find|What is)\s*:?\s*(.+?)(?:\.\s|\?|\s+for\s|\s+\(|$)/i); if (m) c.push(m[1].replace(/\s*=\s*\?$/, ""));
  m = p.match(/^(.+?)\s*=\s*\?/); if (m) c.push(m[1]);
  // the first run of math-looking characters that holds a digit and an operator or equals sign
  const runs = p.match(/[0-9a-zA-Z(][0-9a-zA-Z+\-−–×÷*\/^()=<>≤≥≠.,²³⁴√π|\s]{2,}[0-9a-zA-Z)²³⁴]/g) ?? [];
  for (const r of runs) if (/\d/.test(r) && /[=+\-−×÷*\/^<>≤≥]/.test(r) && !/\b[A-Za-z]{4,}\b/.test(r)) c.push(r.trim());
  return [...new Set(c.map((s) => s.replace(/[.,;]\s*$/, "").trim()).filter((s) => s.length >= 3 && MATH.test(s)))].slice(0, 3);
}
function norm(type: string, answer: string, stmt: string): string[] {
  const a = answer.replace(/−/g, "-").trim();
  const v = /\b([a-z])\b/.exec(stmt.replace(/\b(sin|cos|tan|log|ln|sqrt)\b/g, ""))?.[1];
  const isEq = /=/.test(stmt) && v;
  if (type === "set" || type === "roots") { const vs = a.split(/\s*,\s*/); return [isEq ? vs.map((x) => `${v} = ${x}`).join(" or ") : a]; }
  return [isEq ? `${v} = ${a}` : a, a];
}
const out: any[] = [];
for (const f of inv) {
  const r = { family: f.family, probes: 0, extracted: 0, reproduces: 0, disagrees: 0, unsupported: 0, unresolved: 0, notes: [] as string[] };
  for (const s of f.samples) {
    r.probes++; const cs = candidates(s.prompt); if (!cs.length || s.options || s.type === "choice") continue;
    let got: string | null = null;
    for (const st of cs) { for (const ans of norm(s.type, String(s.answer), st)) {
      try { const x = assessAnswerFirst({ domain: "algebra", statement: st }, null, { finalAnswer: ans, diagnose: false }); const k = x.answer.status;
        if (k === "correct") { got = "reproduces"; break; } if (k === "incorrect" || k === "incomplete") { got ??= "disagrees"; if (r.notes.length < 2) r.notes.push(`${st} | ${ans} -> ${k}`); } else got ??= k === "unresolved" ? "unresolved" : "unsupported";
      } catch { got ??= "unsupported"; } } if (got === "reproduces") break; }
    r.extracted++; if (got) (r as any)[got]++;
  }
  out.push(r);
}
writeFileSync(process.argv[3], JSON.stringify(out));
const tot = (k: string) => out.reduce((a, r) => a + r[k], 0);
console.log(JSON.stringify({ families: out.length, famReproduces: out.filter((r) => r.reproduces > 0).length, famAll5: out.filter((r) => r.reproduces === r.probes).length, famDisagree: out.filter((r) => r.disagrees > 0 && r.reproduces === 0).length, probes: tot("probes"), extracted: tot("extracted"), reproduces: tot("reproduces"), disagrees: tot("disagrees"), unsupported: tot("unsupported"), unresolved: tot("unresolved") }));
