/** Renders simulation results as one self-contained HTML page (no scripts, no external files except fonts). */
import { type Context, type Recommendation, aggregate, leafView, recommend } from "../../../packages/english-core/src/index.ts";
import { CRITERIA, PROTOCOL } from "./criteria.ts";
import { CAP } from "./learners.ts";
import { type RunResult, at } from "./run.ts";
import { type BankLimits, type Measure, STRANDS, trueValue } from "./simulate.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const STRAND_NAMES: Record<string, string> = { "EN.FND": "Foundations", "EN.VOC": "Vocabulary", "EN.GRM": "Grammar", "EN.SEN": "Sentences", "EN.RDG": "Reading", "EN.WRT": "Writing" };
const Z80 = 1.2816;

interface Row {
  label: string;
  truth: number;
  mean: number;
  sd: number;
}

/** Dot plot on the 1–8 band scale: filled dot = estimate with its 80% range, ring = true level. */
function dotPlot(rows: Row[], caption: string): string {
  const W = 360;
  const left = 92;
  const right = 14;
  const rowH = 26;
  const top = 8;
  const H = top + rows.length * rowH + 24;
  const x = (v: number) => left + ((Math.min(8, Math.max(1, v)) - 1) / 7) * (W - left - right);
  const grid = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((b) => `<line x1="${x(b)}" x2="${x(b)}" y1="${top}" y2="${top + rows.length * rowH}" class="grid"/><text x="${x(b)}" y="${H - 6}" class="tick" text-anchor="middle">${b}</text>`)
    .join("");
  const marks = rows
    .map((r, i) => {
      const y = top + i * rowH + rowH / 2;
      const lo = x(r.mean - Z80 * r.sd);
      const hi = x(r.mean + Z80 * r.sd);
      const tip = `${r.label}: estimate ${r.mean.toFixed(2)} ± ${r.sd.toFixed(2)} (range ${(r.mean - Z80 * r.sd).toFixed(1)}–${(r.mean + Z80 * r.sd).toFixed(1)}), true ${r.truth.toFixed(1)}`;
      return `<g class="row"><title>${esc(tip)}</title><rect x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}" class="hit"/>
<text x="0" y="${y + 4}" class="lab">${esc(r.label)}</text>
<line x1="${lo}" x2="${hi}" y1="${y}" y2="${y}" class="range"/>
<circle cx="${x(r.mean)}" cy="${y}" r="5" class="est"/>
<circle cx="${x(r.truth)}" cy="${y}" r="6" class="truth"/></g>`;
    })
    .join("");
  return `<figure class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}">${grid}${marks}</svg></figure>`;
}

function strandRows(ctx: Context, r: RunResult, composite = r.ledger.composite, now = r.sessions.at(-1)!.now, day = r.sessions.at(-1)!.day): Row[] {
  const ag = aggregate(composite, ctx.index, now);
  return STRANDS.map((s) => ({ label: STRAND_NAMES[s], truth: trueValue(r.learner, s, day), mean: ag.get(s)!.mean, sd: ag.get(s)!.sd }));
}

function leafTable(ctx: Context, r: RunResult): string {
  const now = r.sessions.at(-1)!.now;
  const day = r.sessions.at(-1)!.day;
  const rows = Object.values(CAP)
    .map((c) => {
      const v = leafView(r.ledger.composite, ctx.index, c, now);
      const t = trueValue(r.learner, c, day);
      const stage = v.stage.replace("_", " ") + (v.stage === "mastered" && v.mastered ? ` at ${v.mastered}` : v.stage === "demonstrated" && v.demonstrated ? ` at ${v.demonstrated}` : "");
      return `<tr><td>${esc(v.name)}</td><td class="num">${t.toFixed(1)}</td><td class="num">${v.mean.toFixed(2)}</td><td class="num">${v.sd.toFixed(2)}</td><td class="num">${v.direct.n}</td><td>${esc(stage)}</td><td>${esc(v.misconceptions.map((m) => m.id.replace(/_/g, " ")).join(", "))}</td></tr>`;
    })
    .join("");
  return `<div class="scroll"><table class="leaves"><thead><tr><th>Capability</th><th class="num">True</th><th class="num">Estimate</th><th class="num">± sd</th><th class="num">Direct</th><th>Stage</th><th>Active misconceptions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** What the engine would recommend at the start of the third session, after the first 40 items. */
export function nextAfterTwoSessions(ctx: Context, r: RunResult): Recommendation {
  const s = r.sessions[1];
  const used = r.recommendations.slice(0, s.items).map((x) => x.item);
  const recent = used
    .slice()
    .reverse()
    .map((id) => {
      const it = ctx.content.items.get(id)!;
      return { item: id, targets: it.kind === "code" ? [it.target] : it.targets, format: it.format };
    });
  return recommend({ index: ctx.index, content: ctx.content, composite: s.composite, goal: ctx.content.goals.get(PROTOCOL.goal)!, now: at(PROTOCOL.sessionDays[2]), seen: new Set(used), recent, writingThisSession: 0, writingAvailable: true }, 3);
}

function itemLabel(ctx: Context, id: string): string {
  const it = ctx.content.items.get(id)!;
  return it.kind === "writing" ? `Writing task: ${it.prompt.split("(")[0].trim()}` : it.prompt;
}

export function renderReport(ctx: Context, results: RunResult[], ms: Measure[], meta: { generatedAt: string; fingerprint: string }, limits?: BankLimits): string {
  const passed = ms.filter((m) => m.pass).length;
  const byId = new Map(results.map((r) => [r.learner.id, r]));
  const pair = ["L3", "L4"].map((id) => byId.get(id)!);
  const pairCards = pair
    .map((r) => {
      const s = r.sessions[1];
      const rec = nextAfterTwoSessions(ctx, r);
      const alts = [rec.choice!, ...rec.alternatives.slice(0, 2)];
      return `<article class="card"><h3>${esc(r.learner.id)} · ${esc(r.learner.name)}</h3><p class="muted">${esc(r.learner.profile)}</p>
${dotPlot(strandRows(ctx, r, s.composite, s.now, s.day), `${r.learner.name}: strand estimates after 40 items`)}
<h4>Next activity the engine chose</h4><p class="next">${esc(itemLabel(ctx, rec.choice!.item))}</p><p class="why">${esc(rec.explanation)}</p>
<details><summary>Runners-up</summary><ol>${alts.slice(1).map((a) => `<li>${esc(itemLabel(ctx, a.item))} <span class="muted">(score ${a.score.toFixed(2)})</span></li>`).join("")}</ol></details></article>`;
    })
    .join("");
  const learnerCards = results
    .map((r) => `<article class="card"><h3>${esc(r.learner.id)} · ${esc(r.learner.name)}</h3><p class="muted">${esc(r.learner.profile)}</p>${dotPlot(strandRows(ctx, r), `${r.learner.name}: strand estimates after 120 items`)}<details><summary>All 17 capabilities</summary>${leafTable(ctx, r)}</details></article>`)
    .join("");
  const rows = ms
    .map((m) => `<tr><td><span class="pill ${m.pass ? "ok" : "miss"}">${m.pass ? "Pass" : "Miss"}</span></td><td><strong>${esc(m.id)}</strong> ${esc(m.name)}${m.detail.length ? `<details><summary>Detail</summary><ul>${m.detail.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></details>` : ""}</td><td class="val">${esc(m.value)}</td><td class="val">${esc(m.passLevel)}</td></tr>`)
    .join("");

  return `<title>OpenPath E1 Simulation</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Source+Serif+4:opsz,wght@8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: one reading column for findings, then a two-up grid of learner cards; charts are dot plots on the 1–8 band scale. */
:root {
  --bg: #f7f8f9; --surface: #ffffff; --ink: #14181d; --ink-2: #4b5560; --line: #dfe3e8; --grid: #e9ecef;
  --est: #2a78d6; --range: #9cc0ec; --ok-bg: #e3f3e6; --ok: #1e6b2f; --miss-bg: #fdecd9; --miss: #8a4300; --note-bg: #eef3fa;
  --display: "Source Serif 4", Georgia, serif; --body: "Atkinson Hyperlegible", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #121417; --surface: #1a1d21; --ink: #eef0f2; --ink-2: #aab3bd; --line: #2c3238; --grid: #252a2f;
  --est: #3987e5; --range: #2f5683; --ok-bg: #173022; --ok: #8fd6a0; --miss-bg: #3a2614; --miss: #f2b77a; --note-bg: #1b2533; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #121417; --surface: #1a1d21; --ink: #eef0f2; --ink-2: #aab3bd; --line: #2c3238; --grid: #252a2f;
  --est: #3987e5; --range: #2f5683; --ok-bg: #173022; --ok: #8fd6a0; --miss-bg: #3a2614; --miss: #f2b77a; --note-bg: #1b2533; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font: 16px/1.55 var(--body); }
.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 20px; padding-block: 32px 64px; display: grid; gap: 40px; }
header { display: grid; gap: 6px; }
.eyebrow { font: 500 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }
h1, h2 { font-family: var(--display); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1.15; }
h2 { font-size: 24px; }
h3 { font-size: 17px; margin: 0; }
h4 { font-size: 13px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-2); }
p { margin: 0; max-width: 68ch; }
section { display: grid; gap: 14px; }
.muted { color: var(--ink-2); font-size: 14px; }
.meta { font: 13px/1.5 var(--mono); color: var(--ink-2); }
.note { background: var(--note-bg); border-radius: 8px; padding: 14px 16px; display: grid; gap: 6px; max-width: 80ch; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 700; color: var(--ink-2); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.val { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: 13px; min-width: 9ch; }
.pill { display: inline-block; font: 500 12px/1 var(--mono); padding: 5px 8px; border-radius: 999px; }
.pill.ok { background: var(--ok-bg); color: var(--ok); } .pill.miss { background: var(--miss-bg); color: var(--miss); }
details summary { cursor: pointer; color: var(--ink-2); font-size: 13px; margin-top: 6px; }
details ul, details ol { margin: 6px 0 0; padding-left: 18px; font-size: 13px; color: var(--ink-2); }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 16px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; display: grid; gap: 8px; min-width: 0; align-content: start; }
.next { font-weight: 700; }
.why { font-size: 14px; color: var(--ink-2); }
.legend { display: flex; flex-wrap: wrap; gap: 18px; font-size: 13px; color: var(--ink-2); align-items: center; }
.key { display: inline-flex; gap: 6px; align-items: center; }
.plot { margin: 0; } .plot svg { width: 100%; height: auto; display: block; }
.plot .grid { stroke: var(--grid); stroke-width: 1; }
.plot .tick { fill: var(--ink-2); font: 11px var(--mono); }
.plot .lab { fill: var(--ink); font: 12px var(--body); }
.plot .range { stroke: var(--range); stroke-width: 6; stroke-linecap: round; }
.plot .est { fill: var(--est); stroke: var(--surface); stroke-width: 2; }
.plot .truth { fill: none; stroke: var(--ink); stroke-width: 2; }
.plot .hit { fill: transparent; } .plot .row:hover .hit { fill: var(--grid); }
.leaves td:first-child { min-width: 180px; }
</style>
<div class="wrap">
<header>
  <span class="eyebrow">OpenPath English · Milestone E1</span>
  <h1>Ten-learner simulation</h1>
  <p class="meta">framework ${esc(ctx.index.key)} · ${PROTOCOL.sessionDays.length} sessions × ${PROTOCOL.itemsPerSession} items · stand-in evaluator noise ${PROTOCOL.evaluatorNoise} · seed ${PROTOCOL.seed} · ${esc(meta.generatedAt)} · results ${esc(meta.fingerprint.slice(0, 12))}</p>
</header>

<div class="note">
  <strong>What this shows, and what it cannot.</strong>
  <p>The simulated learners answer according to OpenPath's own response model, and the engine never sees their true levels. Passing shows the engine is internally consistent and can tell English profiles apart under its own assumptions. It does not show that real learners behave this way, that item difficulties are right, or that anyone's English improves. That needs real learners.</p>
</div>

<section>
  <h2>Results against the frozen pass levels</h2>
  <p class="muted">${passed} of ${ms.length} measures pass. The pass levels were committed before the first run (tools/english/sim/criteria.ts) and have not been changed since.</p>
  <div class="scroll"><table><thead><tr><th>Result</th><th>Measure</th><th class="num">Value</th><th class="num">Pass level</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>

<section>
  <h2>Two learners, two profiles, two next steps</h2>
  <p class="muted">After the same 40 items' worth of evidence, the engine holds different composites for a strong reader who writes weakly (L3) and a learner with rich vocabulary but weak grammar (L4), and recommends different next activities.</p>
  <div class="legend"><span class="key"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="var(--est)"/></svg>Estimate</span><span class="key"><svg width="30" height="16" aria-hidden="true"><line x1="3" x2="27" y1="8" y2="8" stroke="var(--range)" stroke-width="6" stroke-linecap="round"/></svg>Summary range (conservative, not calibrated)</span><span class="key"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>True level (hidden from the engine)</span><span>Scale: bands 1–8</span></div>
  <div class="grid2">${pairCards}</div>
</section>

<section>
  <h2>All ten learners after 120 items</h2>
  <p class="muted">Strand values are summaries of the 17 capabilities assessed in this version. Their ranges are conservative bounds, not calibrated measurements; only capability-level estimates are measurements. Each card's table lists every capability with its stage and the misconceptions the engine currently holds. Hover a row for exact values.</p>
  <div class="grid2">${learnerCards}</div>
</section>

${limits ? bankSection(limits) : ""}
<section>
  <h2>Notes</h2>
  <div class="note">
    <p><strong>Where the measures differ from the plan's wording.</strong> M1, M2 and M5 apply the plan's proposed pass levels with changes recorded in criteria.ts before the run. Rank correlation is undefined for flat profiles. Only 7 learners have a unique weakest strand. A mean sd of 0.6 is not reachable with 8 items per capability, so the threshold is ${CRITERIA.efficiency.sdThreshold}.</p>
    <p><strong>Third review: hybrid scheduling and retention.</strong> The automatic procedure is now the hybrid scheduler. In order, it gives: overdue retention checks; probes after contradictory evidence; measurement while uncertainty is high; an assessment probe every third activity; otherwise learning. Retention checks fall due by date, with intervals doubling after a pass and halving after a failure. Each check is judged on that session's fresh evidence. Mastery that is overdue for a check is shown as not currently verified.</p>
    <p><strong>Selection changed after the second review.</strong> Selection now has separate assessment and learning modes, a target-relative need term, relative information gain and a prerequisite-aware easier step. Under the same frozen procedure (automatic mode), measures that depend on broad re-measurement fell, because learning mode concentrates on needs. Forgetting is not yet re-checked by due date. See docs/english/E1_REPORT.md.</p>
    <p><strong>Strand ranges changed after review.</strong> Strand uncertainty was first combined as if each capability's error were independent, and its 80% ranges held the true value only 57–67% of the time. It is now a conservative bound (errors assumed to point the same way), which held it 77–90% of the time, and it is labelled as a summary, not a calibrated measurement. Pass levels are unchanged; with the wider ranges, M3 separates 4 of 8 pairs instead of 7.</p>
    <p><strong>One engine change during E1.</strong> Evaluator qualification now treats a lean smaller than its own sampling error (2 standard errors) as no evidence of bias. Without this, an unbiased stand-in evaluator failed qualification by chance with only 12 anchors per capability. The 0.3 limit itself is unchanged.</p>
  </div>
</section>
</div>`;
}

function bankSection(l: BankLimits): string {
  const rows = l.perCapability
    .map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${c.items}</td><td>${esc(c.formats.join(", "))}</td><td>${c.guessable ? "yes" : "no"}</td><td class="num">${c.maxDifficulty}</td></tr>`)
    .join("");
  const exhausted = l.exhaustedAtEnd.reduce((s, x) => s + x.capabilities, 0) / l.exhaustedAtEnd.length;
  const gaps = Object.entries(l.learningGapsByCapability)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => esc(k))
    .join(", ");
  return `<section>
  <h2>What the current item bank prevents us from measuring reliably</h2>
  <p class="muted">These limits come from the size and design of the E1 draft bank, not from the engine. Expanding and calibrating the bank is E2.</p>
  <div class="note">
    <p><strong>Exhaustion.</strong> ${l.bankSize} items in all, and each learner uses about ${l.itemsUsedPerLearner} in the 120-item protocol. By the end, on average ${exhausted.toFixed(1)} of the 17 capabilities have no unused item left. Later sessions can no longer choose freely.</p>
    <p><strong>Retention.</strong> ${l.retentionChecksBlocked} due retention checks could not run because no unused item was left for the capability. At the end, ${l.overdueUnverifiableAtEnd.length} learner-capability pairs are overdue with nothing left to check them with.</p>
    <p><strong>Learning.</strong> In ${l.learningRecsWithGap} of ${l.learningRecs} learning choices (${Math.round((100 * l.learningRecsWithGap) / Math.max(1, l.learningRecs))}%), at least one needed capability had no unused item at a suitable difficulty. Most often: ${gaps || "none"}.</p>
    <p><strong>Ceiling.</strong> The hardest items sit around band 7 to 7.5, so a learner whose true level is 7.5 everywhere (L7) is estimated at ${l.ceilingLearner.meanEstimate.toFixed(1)} on average.</p>
    <p><strong>Guessing.</strong> Reading, vocabulary breadth, context, commas, sentence and writing proofreading capabilities have only four-option items. A guess succeeds 25% of the time, so each answer carries little information. That limits how far profile recovery (M1), weakest strand (M2) and pair separation (M3) can go in any mode.</p>
  </div>
  <div class="scroll"><table><thead><tr><th>Capability</th><th class="num">Items</th><th>Formats</th><th>Choice only</th><th class="num">Hardest</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}
