/** Renders the item-bank coverage report: one self-contained HTML page, no scripts. */
import { type Context, guessingFloor } from "../../../packages/english-core/src/index.ts";
import { type Coverage, type PassageStats, type Problem, RUNWAY, itemsFor } from "./checks.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtGuess = (c: number) => (c === 0 ? "0" : c >= 0.1 ? c.toFixed(2) : `1/${Math.round(1 / c)}`);

interface Data {
  framework: string;
  runtimeFramework: string;
  gates: Record<string, unknown>;
  problems: Problem[];
  warnings: Problem[];
  mismatches: string[];
  coverage: Coverage[];
  pending: { capability: string; name: string }[];
  recorded: Record<string, { gates: string[]; reason: string }>;
  passages: PassageStats[];
}

/** One strip of cells, one per level: how many unseen-item retention checks the bank can serve there. */
function runwayStrip(r: { level: number; checks: number }[]): string {
  return `<span class="strip" role="img" aria-label="${esc(r.map((x) => `band ${x.level}: ${x.checks}`).join(", "))}">${r
    .map((x) => `<span class="cell c${Math.min(4, x.checks)}" title="band ${x.level}: ${x.checks} of ${RUNWAY.checksWanted}">${x.checks}</span>`)
    .join("")}</span>`;
}

/** Item difficulties on the 1–8 scale, one tick per item, with the gate's end points marked. */
function spread(c: Coverage): string {
  const W = 240;
  const x = (b: number) => 6 + ((b - 1) / 7) * (W - 12);
  const ticks = c.difficulties.map((b) => `<line x1="${x(b)}" x2="${x(b)}" y1="4" y2="20" class="tick"/>`).join("");
  const scale = [1, 2, 3, 4, 5, 6, 7, 8].map((b) => `<line x1="${x(b)}" x2="${x(b)}" y1="22" y2="25" class="axis"/>`).join("");
  return `<svg class="spread" viewBox="0 0 ${W} 28" role="img" aria-label="difficulties ${c.difficulties.join(", ")}"><rect x="${x(2)}" y="2" width="${x(7.5) - x(2)}" height="20" class="band"/>${scale}${ticks}</svg>`;
}

export function renderBankReport(ctx: Context, d: Data, generatedAt: string): string {
  const items = d.coverage.reduce((s, c) => s + c.items, 0);
  const passing = d.coverage.filter((c) => c.gates.every((g) => g.pass)).length;
  const gateIds = d.coverage[0]?.gates.map((g) => g.id) ?? [];
  const gateLabels = d.coverage[0]?.gates.map((g) => `<li><b>${g.id}</b> ${esc(g.label)}</li>`).join("") ?? "";
  const rows = d.coverage
    .map(
      (c) => `<tr>
<td><a href="#${esc(c.capability)}">${esc(c.name)}</a>${c.writingPrimary ? ' <span class="tag">writing-first</span>' : ""}</td>
<td class="num">${c.items}</td><td class="num">${c.families}</td>
<td>${spread(c)}</td>
${c.gates.map((g) => `<td class="g ${g.pass ? "ok" : "miss"}" title="${esc(`${g.label}: ${g.value}`)}">${g.pass ? "✓" : "✗"}</td>`).join("")}
<td>${runwayStrip(c.runway)}</td>
</tr>`,
    )
    .join("");
  const details = d.coverage
    .map((c) => {
      const its = itemsFor(ctx, c.capability).filter((i) => i.target === c.capability);
      const rec = d.recorded[c.capability];
      const cap = ctx.index.leaves.get(c.capability)!;
      const desc = Object.entries(cap.bands ?? {})
        .map(([b, t]) => `<li><b>Band ${b}</b> ${esc(t)}<ul>${c.steps.filter((st) => st.descriptor === b).map((st) => `<li>${st.band.toFixed(2)} · ${esc(st.feature)} <span class="muted">(${st.items} item${st.items === 1 ? "" : "s"})</span></li>`).join("")}</ul></li>`)
        .join("");
      const trs = its
        .map(
          (i) => `<tr><td class="num">${i.b.toFixed(1)}</td><td class="mono">${esc(i.step ?? "—")}</td><td class="mono">${esc(i.format)}</td><td class="num">${fmtGuess(guessingFloor(i))}</td><td class="mono">${esc(i.family ?? "—")}</td><td>${esc(i.prompt)}${i.passage ? ` <span class="muted">[${esc(i.passage)}]</span>` : ""}</td><td class="muted">${esc(i.rationale ?? "")}</td></tr>`,
        )
        .join("");
      return `<section class="cap" id="${esc(c.capability)}">
<h3>${esc(c.name)} <span class="meta">${esc(c.capability)}</span></h3>
<p class="muted">${c.items} items, ${c.families} families (${c.familiesWithVariants} with variants), formats: ${esc(c.formats.join(", "))}; ${c.lowGuessing} low-guessing items.</p>
${rec ? `<div class="note"><b>Recorded gaps: ${esc(rec.gates.join(", "))}</b><span>${esc(rec.reason)}</span></div>` : ""}
<details><summary>Band descriptors and difficulty ladder</summary><ul>${desc}</ul></details>
<details><summary>Retention runway by level (engine as it is, and if variants were reserved)</summary>
<p class="muted">As built ${runwayStrip(c.runway)} · variants reserved ${runwayStrip(c.runwayIfVariantsReserved)}</p></details>
<details open><summary>Difficulty progression (${its.length} items, easiest first)</summary><div class="scroll"><table class="prog"><thead><tr><th class="num">b</th><th>Step</th><th>Format</th><th class="num">Guess</th><th>Family</th><th>Prompt</th><th>Why this difficulty</th></tr></thead><tbody>${trs}</tbody></table></div></details>
</section>`;
    })
    .join("");
  const passages = d.passages
    .map((p) => `<tr><td>${esc(p.title)} <span class="meta">${esc(p.id)}</span></td><td class="num">${p.band}</td><td class="num">${p.words}</td><td class="num">${p.wordsPerSentence.toFixed(1)}</td><td class="num">${Math.round(p.longWordShare * 100)}%</td></tr>`)
    .join("");
  const warn = d.warnings.length ? `<ul>${d.warnings.map((w) => `<li><span class="mono">${esc(w.item ?? "")}</span> ${esc(w.message)}</li>`).join("")}</ul>` : "<p>None.</p>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Item bank coverage</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,600&display=swap" rel="stylesheet">
<style>
:root { --bg:#f7f8f9; --surface:#fff; --ink:#14181d; --ink-2:#4b5560; --line:#dfe3e8; --ok-bg:#e3f3e6; --ok:#1e6b2f; --miss-bg:#fdecd9; --miss:#8a4300; --note-bg:#eef3fa; --tick:#2a78d6; --band:#e9eef5;
  --c0:#fdecd9; --c1:#f6dfc0; --c2:#e7e9d2; --c3:#d4ead8; --c4:#bfe3c8;
  --display:"Source Serif 4",Georgia,serif; --body:"Atkinson Hyperlegible",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#121417; --surface:#1a1d21; --ink:#eef0f2; --ink-2:#aab3bd; --line:#2c3238; --ok-bg:#173022; --ok:#8fd6a0; --miss-bg:#3a2614; --miss:#f2b77a; --note-bg:#1b2533; --tick:#5aa0ef; --band:#222a33;
  --c0:#3a2614; --c1:#3a3018; --c2:#2c3320; --c3:#1f3527; --c4:#1b3d27; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#121417; --surface:#1a1d21; --ink:#eef0f2; --ink-2:#aab3bd; --line:#2c3238; --ok-bg:#173022; --ok:#8fd6a0; --miss-bg:#3a2614; --miss:#f2b77a; --note-bg:#1b2533; --tick:#5aa0ef; --band:#222a33;
  --c0:#3a2614; --c1:#3a3018; --c2:#2c3320; --c3:#1f3527; --c4:#1b3d27; color-scheme:dark }
body { background:var(--bg); color:var(--ink); font:16px/1.55 var(--body); margin:0; }
.wrap { max-width:1180px; margin:0 auto; padding:32px 16px 64px; display:grid; gap:32px; }
header { display:grid; gap:6px; } .eyebrow { font:500 12px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--ink-2); }
h1,h2,h3 { font-family:var(--display); font-weight:600; margin:0; text-wrap:balance; } h1 { font-size:clamp(28px,4vw,40px); line-height:1.15; } h2 { font-size:24px; } h3 { font-size:19px; }
p { margin:0; max-width:72ch; } section { display:grid; gap:12px; } .muted { color:var(--ink-2); font-size:14px; } .meta,.mono { font:13px/1.5 var(--mono); color:var(--ink-2); }
.note { background:var(--note-bg); border-radius:8px; padding:12px 14px; display:grid; gap:4px; max-width:90ch; font-size:14px; }
.scroll { overflow-x:auto; } table { border-collapse:collapse; width:100%; font-size:14px; }
th,td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; } th { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-2); }
.num { font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; }
td.g { text-align:center; font-weight:700; } td.g.ok { color:var(--ok); } td.g.miss { color:var(--miss); background:var(--miss-bg); }
.tag { font:500 11px/1 var(--mono); padding:3px 6px; border-radius:999px; background:var(--note-bg); color:var(--ink-2); white-space:nowrap; }
.strip { display:inline-flex; gap:2px; } .cell { width:16px; height:18px; display:inline-grid; place-items:center; font:11px var(--mono); border-radius:3px; }
.c0 { background:var(--c0); } .c1 { background:var(--c1); } .c2 { background:var(--c2); } .c3 { background:var(--c3); } .c4 { background:var(--c4); }
.spread { width:240px; height:28px; display:block; } .spread .tick { stroke:var(--tick); stroke-width:2; } .spread .band { fill:var(--band); } .spread .axis { stroke:var(--ink-2); }
.cap { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px; }
details summary { cursor:pointer; color:var(--ink-2); font-size:14px; } details ul { margin:6px 0 0; padding-left:18px; font-size:14px; }
.prog td:nth-child(6) { min-width:260px; } .prog td:nth-child(7) { min-width:220px; }
</style></head><body><div class="wrap">
<header><span class="eyebrow">OpenPath English · Milestone E2a</span><h1>Item bank coverage</h1>
<p class="meta">content checked against ${esc(d.framework)} and the runtime ${esc(d.runtimeFramework)} · ${esc(generatedAt)}</p></header>
<div class="note"><b>Every item, difficulty label and rationale here is candidate content, unvalidated.</b>
<span>Difficulties are expert estimates. The checks below test that they are internally consistent (each item on its step of an explicit difficulty ladder, ladders ordered and tied to the band descriptors, variants alike, the range covered without large gaps). They do not show the difficulties are right; that needs real learners' responses.</span></div>
<section><h2>Summary</h2>
<p>${items} code-scored items on ${d.coverage.length} capabilities. ${passing} of ${d.coverage.length} pass every gate; every miss is recorded below with its reason. ${d.pending.length} further specified capabilities get their items in E2b.</p>
<details><summary>What the gates mean</summary><ul>${gateLabels}</ul>
<p class="muted">Retention runway: for a learner at each level from band ${RUNWAY.levels[0]} to ${RUNWAY.levels.at(-1)}, after ${RUNWAY.typicalUse} items of typical assessment and learning, how many retention checks (of ${RUNWAY.checksWanted} wanted) the bank can serve with unseen items whose predicted success at that level is ${RUNWAY.checkWindow[0]}–${RUNWAY.checkWindow[1]}. After that, the engine uses a flagged repeat, at least 14 days after the item was last seen.</p></details>
<div class="scroll"><table><thead><tr><th>Capability</th><th class="num">Items</th><th class="num">Fam.</th><th>Difficulties (1–8; shaded 2–7.5)</th>${gateIds.map((g) => `<th>${g}</th>`).join("")}<th>Runway, band 2 → 7.5</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>
<section><h2>Reading passages</h2><div class="scroll"><table><thead><tr><th>Passage</th><th class="num">Band</th><th class="num">Words</th><th class="num">Words per sentence</th><th class="num">Long words</th></tr></thead><tbody>${passages}</tbody></table></div>
<p class="muted">Long words have 7 or more letters. These are rough readability signals for a reviewer, not a difficulty measure.</p></section>
<section><h2>For a reviewer to check</h2>${warn}</section>
<section><h2>Capabilities</h2>${details}</section>
${d.pending.length ? `<section><h2>Specified in 0.2.0, items in E2b</h2><p class="muted">${d.pending.map((p) => esc(p.name)).join(" · ")}</p></section>` : ""}
</div></body></html>`;
}
