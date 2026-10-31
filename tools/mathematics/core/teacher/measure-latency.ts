// Per-response wall-clock latency and CPU time of routine verification (single process, no I/O). Usage: measure-latency.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { assessWorking, verifyWorkingStep } from "../../../../packages/learning/src/core/working-assessment.ts";
const here = (p: string) => new URL(p, import.meta.url);
const T = JSON.parse(readFileSync(here("./examples.json"), "utf8")).examples as any[];
const A3 = JSON.parse(readFileSync(here("../adversarial3/adversarial3.json"), "utf8")).tasks as any[];
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stat = (xs: number[]) => ({ n: xs.length, p50: +pct(xs, 0.5).toFixed(2), p95: +pct(xs, 0.95).toFixed(2), max: +Math.max(...xs).toFixed(2), mean: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) });
function time(f: () => void): { wall: number; cpu: number } { const c0 = process.cpuUsage(); const t0 = performance.now(); f(); const t1 = performance.now(); const c1 = process.cpuUsage(c0); return { wall: t1 - t0, cpu: (c1.user + c1.system) / 1000 }; }
function run(name: string, jobs: (() => void)[]) { const w: number[] = [], c: number[] = []; for (const j of jobs) { const t = time(j); w.push(t.wall); c.push(t.cpu); } return { name, wall_ms: stat(w), cpu_ms: stat(c) }; }
const cold = time(() => assessWorking(T[0].problem, T[0].lines));          // first call includes module warm-up
for (const ex of T) assessWorking(ex.problem, ex.lines);                    // warm-up pass
const teacher = T.map((ex) => () => assessWorking(ex.problem, ex.lines));
const steps: (() => void)[] = []; for (const ex of T) { let prev = ex.problem; for (const l of ex.lines) { if (!/^case /i.test(l)) { const a = prev, b = l; steps.push(() => verifyWorkingStep(ex.problem, a, b)); prev = l; } } }
const sample = A3.filter((_, i) => i % 2 === 0).map((t) => () => assessWorking(t.problem, t.lines));
const res = { node: process.version, cold_first_call_ms: { wall: +cold.wall.toFixed(1), cpu: +cold.cpu.toFixed(1) },
  results: [run("assessWorking, 17 teacher examples", teacher), run("verifyWorkingStep, every step of the teacher examples", steps), run("assessWorking, 228 adversarial3 working sequences (every 2nd task)", sample)] };
writeFileSync(process.argv[2], JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
