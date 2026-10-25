import { rat } from "../claim-kit";
import type { Check, Claim, ClaimTable, Problem } from "../claim-kit";

/** Phase 3 claims: k-charts-tables. Every value is recomputed from the figure data (bars, pictographs, tables, number
 *  lines) and the prompt, never from a family helper. Step inputs must agree with that data, else the claim is null. */

const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);
const sameList = (a: unknown, b: readonly unknown[]): boolean => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
/** inputsOk false -> the step cannot be read (null); otherwise whether the stated value is right. */
const verdict = (inputsOk: boolean, valueOk: boolean): boolean | null => (inputsOk ? valueOk : null);
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** The figure as a bar chart: labels and whole-number values. */
const barsFig = (p: Problem): { title: string; labels: string[]; values: number[]; scale: number } | null => {
  const f = p.figure as { type?: string; title?: unknown; labels?: unknown; values?: unknown; scale?: unknown } | undefined;
  if (!f || f.type !== "bars" || !Array.isArray(f.labels) || !Array.isArray(f.values) || f.labels.length !== f.values.length || f.labels.length < 2) return null;
  if (!f.labels.every((l) => typeof l === "string") || !f.values.every(isInt) || !isInt(f.scale) || typeof f.title !== "string") return null;
  return { title: f.title, labels: f.labels as string[], values: f.values as number[], scale: f.scale };
};
/** The figure as a pictograph: labels, counts (the real numbers, not pictures) and the key. */
const pictFig = (p: Problem): { labels: string[]; counts: number[]; key: number } | null => {
  const f = p.figure as { type?: string; labels?: unknown; counts?: unknown; key?: unknown } | undefined;
  if (!f || f.type !== "pictograph" || !Array.isArray(f.labels) || !Array.isArray(f.counts) || f.labels.length !== f.counts.length) return null;
  if (!f.labels.every((l) => typeof l === "string") || !f.counts.every(isInt) || !isInt(f.key) || f.key < 1) return null;
  return { labels: f.labels as string[], counts: f.counts as number[], key: f.key };
};
/** The figure as a table: head and rows. */
const tableFig = (p: Problem): { head: unknown[]; rows: unknown[][] } | null => {
  const f = p.figure as { type?: string; head?: unknown; rows?: unknown } | undefined;
  if (!f || f.type !== "table" || !Array.isArray(f.head) || !Array.isArray(f.rows) || !f.rows.every(Array.isArray)) return null;
  return { head: f.head, rows: f.rows as unknown[][] };
};
/** Indexes of the labels mentioned in a text (a label may be written lower case or as a plural), in order of appearance. */
const mentions = (text: string, labels: readonly string[]): number[] => {
  const hits: { i: number; at: number }[] = [];
  labels.forEach((l, i) => {
    const m = new RegExp(`(?<![A-Za-z0-9])${esc(l)}(?:es|s)?(?![A-Za-z0-9])`, "i").exec(text);
    if (m) hits.push({ i, at: m.index });
  });
  return hits.sort((a, b) => a.at - b.at).map((h) => h.i);
};

/* ------------------------------------------------------------------ afbar */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MONTHS = ["January", "February", "March", "April", "May"];
const CLASSES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
/** The chart's labels written in full (days, months, classes) as the prompt writes them, or null. */
const fullNames = (labels: string[]): string[] | null => {
  if (labels.every((l, i) => l === DAYS[i].slice(0, 3))) return DAYS;
  if (labels.every((l, i) => l === MONTHS[i].slice(0, 3))) return MONTHS;
  if (labels.every((l, i) => l === CLASSES[i])) return CLASSES;
  return null;
};
/** "Read the scale carefully" bar charts. read1 / read2 are the bars named first / second in the question; inputs
 *  [lines, scale] with lines × scale the bar's value (the chart's scale line by line); the stated value is that bar's value. */
const afbarRead: Claim = (s, p) => {
  const f = barsFig(p);
  if (!f || f.labels.length !== 5) return null;
  const m = p.prompt.match(/^The bar chart shows (.+)\. Read the scale carefully\. (How many .+\?)$/);
  const full = fullNames(f.labels);
  if (!m || !full || m[1].toLowerCase() !== f.title.toLowerCase()) return null;
  const named = full.map((n, i) => ({ i, at: m[2].indexOf(n) })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at).map((h) => h.i);
  const want = s.id === "read1" ? 0 : s.id === "read2" ? 1 : -1;
  if (want < 0 || named.length !== (/^How many (?!more)/.test(m[2]) && !/ and /.test(m[2]) ? 1 : 2) || want >= named.length) return null;
  const v = f.values[named[want]];
  if (s.inputs.length !== 2 || !isInt(s.inputs[0]) || s.inputs[1] !== f.scale || s.inputs[0] * f.scale !== v) return null;
  return rat(BigInt(v));
};

/* ------------------------------------------------------------------ adbar */
/** Splits "The bar chart shows <title>[ (each line on the scale is 5)]. <question>" and checks title and scale against the figure. */
const adbarAsk = (p: Problem): { f: NonNullable<ReturnType<typeof barsFig>>; ask: string } | null => {
  const f = barsFig(p);
  const m = p.prompt.match(/^The bar chart shows (.+?)(?: \(each line on the scale is (\d+)\))?\. ((?:How many|Is this).*)$/);
  if (!f || !m || f.labels.length !== 4 || m[1] !== f.title || f.scale !== (m[2] ? Number(m[2]) : 1)) return null;
  return { f, ask: m[3] };
};
/** read: one bar [index] -> that bar's number; "how many more A than B" [a, b] -> [bar a, bar b] (named in the question's
 *  order); "in all" and "tallest ... shortest" [0,1,2,3] -> all four bars. */
const adbarRead: Check = (s, p) => {
  const a = adbarAsk(p);
  if (!a) return null;
  const { f, ask } = a;
  const n = mentions(ask, f.labels);
  if (/^How many more .+ than /.test(ask) && !/tallest/.test(ask)) {
    if (n.length !== 2 || new Set(n).size !== 2) return null;
    return verdict(sameList(s.inputs, n), sameList(s.value, [f.values[n[0]], f.values[n[1]]]));
  }
  if (/tallest bar .* shortest bar\?$/.test(ask) || /in all\?$/.test(ask)) return verdict(sameList(s.inputs, [0, 1, 2, 3]), sameList(s.value, f.values));
  if (/^How many /.test(ask) && n.length === 1) return verdict(sameList(s.inputs, n), s.value === f.values[n[0]]);
  return null;
};

/* ------------------------------------------------------------------ adbartf */
/** Is a statement about the bars true? "More A than B." / "n more A than B" / "A read n books more than B" / "n ... in all". null = not understood. */
const statementTrue = (stmt: string, labels: string[], values: number[]): boolean | null => {
  const nums = stmt.match(/\d+/g) ?? [];
  const n = mentions(stmt, labels);
  if (/ in all\.$/.test(stmt)) return nums.length === 1 ? Number(nums[0]) === sum(values) : null;
  if (!/\bmore\b/i.test(stmt) || !/\bthan\b/.test(stmt) || n.length !== 2) return null;
  if (nums.length === 0) return values[n[0]] > values[n[1]];
  if (nums.length === 1) return values[n[0]] - values[n[1]] === Number(nums[0]);
  return null;
};
const adbartfParts = (p: Problem) => {
  const f = barsFig(p);
  const m = p.prompt.match(/^The bar chart shows (.+)\. Is this statement true or false\? "(.+)"$/);
  if (!f || !m || f.labels.length !== 4 || m[1] !== f.title) return null;
  return { f, stmt: m[2] };
};
/** read: the step reads off the four bars (inputs, in the figure's order) and states the quoted statement. */
const adbartfRead: Check = (s, p) => {
  const a = adbartfParts(p);
  if (!a) return null;
  return verdict(sameList(s.inputs, a.f.values), s.value === a.stmt);
};
/** judge (compare): the quoted statement is tested against the figure's bars; the value is "True" or "False" and the input is 0 for True, 1 for False. */
const adbartfCompare: Check = (s, p) => {
  const a = adbartfParts(p);
  if (!a) return null;
  const t = statementTrue(a.stmt, a.f.labels, a.f.values);
  if (t === null) return null;
  return verdict(sameList(s.inputs, [t ? 0 : 1]), s.value === (t ? "True" : "False"));
};

/* ------------------------------------------------------------------ pictographs */
/** count: how many ● are in the row asked about: counts[row] ÷ key. */
const acpictCount: Claim = (s, p) => {
  const f = pictFig(p);
  const m = p.prompt.match(/^The pictograph shows (.+?)\. Each ● stands for (\d+) child(?:ren)?\. How many children chose (.+)\?$/);
  if (!f || !m || Number(m[2]) !== f.key) return null;
  const i = f.labels.indexOf(m[3]);
  if (i < 0 || f.counts[i] % f.key !== 0 || !sameList(s.inputs, [m[3]])) return null;
  return rat(BigInt(f.counts[i] / f.key));
};
/** read: "how many more children chose A than B": big reads A's row, small reads B's row; inputs [pictures, key], value = pictures × key = the row's count. */
const acpictmoreRead: Claim = (s, p) => {
  const f = pictFig(p);
  const m = p.prompt.match(/^The pictograph shows (.+?)\. Each ● stands for (\d+) child(?:ren)?\. How many more children chose (.+) than (.+)\?$/);
  if (!f || !m || Number(m[2]) !== f.key) return null;
  const label = s.id === "big" ? m[3] : s.id === "small" ? m[4] : null;
  const i = label === null ? -1 : f.labels.indexOf(label);
  if (i < 0 || f.counts[i] % f.key !== 0) return null;
  if (s.inputs.length !== 2 || s.inputs[1] !== f.key || s.inputs[0] !== f.counts[i] / f.key) return null;
  return rat(BigInt(f.counts[i]));
};
/** count: a half ● is worth half the key, so the row (or all rows) has counts ÷ (key / 2) half-pictures. */
const acpicthalfCount: Claim = (s, p) => {
  const f = pictFig(p);
  const m = p.prompt.match(/^The pictograph shows (.+?)\. Each ● stands for (\d+) children, and a half ● stands for (\d+)\. How many children (?:chose (.+)|are there in all)\?$/);
  if (!f || !m || Number(m[2]) !== f.key || Number(m[3]) * 2 !== f.key) return null;
  const half = Number(m[3]);
  const total = m[4] === undefined ? sum(f.counts) : f.counts[f.labels.indexOf(m[4])];
  if (total === undefined || total % half !== 0 || !sameList(s.inputs, [m[4] === undefined ? "all rows" : m[4]])) return null;
  return rat(BigInt(total / half));
};
/** compare (the largest group): inputs are the number of pictures in each row (counts ÷ key); the value is the largest. */
const acpicttabCompare: Claim = (s, p) => {
  const f = pictFig(p);
  const m = p.prompt.match(/^The pictograph shows (.+?)\. Each ● stands for (\d+) children\. How many children are in the largest group\?$/);
  if (!f || !m || Number(m[2]) !== f.key || f.counts.some((c) => c % f.key !== 0)) return null;
  const pics = f.counts.map((c) => c / f.key);
  if (!sameList(s.inputs, pics)) return null;
  return rat(BigInt(Math.max(...pics)));
};

/* ------------------------------------------------------------------ adtally */
/** A tally string: "||||/" is a bundle of 5, a run of 1 to 4 "|" is that many singles. null if not a tally. */
const readTally = (t: unknown): number | null => {
  if (typeof t !== "string" || t === "") return null;
  let n = 0;
  for (const tok of t.split(" ")) {
    if (tok === "||||/") n += 5;
    else if (/^\|{1,4}$/.test(tok)) n += tok.length;
    else return null;
  }
  return n;
};
/** count: the marks drawn in the table's rows are counted (bundle 5, strokes 1): one row -> number; "altogether" -> the three rows; "how many more A than B" -> [A, B]. */
const adtallyCount: Check = (s, p) => {
  const t = tableFig(p);
  const m = p.prompt.match(/^Children in a class chose their favourite (.+?)\. The table shows their choices as tally marks \(\|\|\|\|\/ stands for 5 marks\)\. (How many .+\?)$/);
  if (!t || !m || t.rows.length !== 3 || t.head.length !== 2 || t.rows.some((r) => r.length !== 2 || typeof r[0] !== "string")) return null;
  const labels = t.rows.map((r) => r[0] as string);
  const tallies = t.rows.map((r) => r[1]);
  const counts = tallies.map(readTally);
  if (counts.some((c) => c === null)) return null;
  const row = (l: string) => labels.indexOf(l);
  let q: RegExpMatchArray | null;
  if ((q = m[2].match(/^How many more children chose (.+) than (.+)\?$/))) {
    const x = row(q[1]), y = row(q[2]);
    if (x < 0 || y < 0 || x === y) return null;
    return verdict(sameList(s.inputs, [tallies[x], tallies[y]]), sameList(s.value, [counts[x], counts[y]]));
  }
  if (m[2] === "How many children are counted in the table altogether?") return verdict(sameList(s.inputs, tallies), sameList(s.value, counts));
  if ((q = m[2].match(/^How many children chose (.+)\?$/))) {
    const x = row(q[1]);
    if (x < 0) return null;
    return verdict(sameList(s.inputs, [tallies[x]]), s.value === counts[x]);
  }
  return null;
};

/* ------------------------------------------------------------------ adrec */
const REC_ASKS = ["How many boys chose idli?", "How many boys chose dosa?", "How many girls chose idli?", "How many girls chose dosa?", "How many boys are there in all?", "How many children chose idli in all?"];
/** The listed children as [gender, breakfast] pairs, each Boy/Girl and Idli/Dosa, or null. */
const recRows = (p: Problem): [string, string][] | null => {
  const t = tableFig(p);
  if (!t || t.head.join("|") !== "Child|Boy or girl|Breakfast" || t.rows.length === 0) return null;
  const out: [string, string][] = [];
  for (const r of t.rows) {
    if (r.length !== 3 || (r[1] !== "Boy" && r[1] !== "Girl") || (r[2] !== "Idli" && r[2] !== "Dosa")) return null;
    out.push([r[1], r[2]]);
  }
  return out;
};
const REC_PROMPT = /^The list in the picture shows each child of a class and what they chose for breakfast\. Record it in a table with rows Boys and Girls and columns Idli and Dosa\. (How many .+\?)$/;
const recCounts = (rows: [string, string][]) => {
  const c = (g: string, b: string) => rows.filter((r) => r[0] === g && r[1] === b).length;
  return [c("Boy", "Idli"), c("Boy", "Dosa"), c("Girl", "Idli"), c("Girl", "Dosa")];
};
/** count (tally): going down the list, boys-idli, boys-dosa, girls-idli, girls-dosa are counted; inputs are the four counts, value the sentence naming them. */
const adrecCount: Check = (s, p) => {
  const rows = recRows(p);
  if (!rows || !REC_PROMPT.test(p.prompt)) return null;
  const c = recCounts(rows);
  return verdict(sameList(s.inputs, c), s.value === `Boys: ${c[0]} idli, ${c[1]} dosa; Girls: ${c[2]} idli, ${c[3]} dosa`);
};
/** read: the question is one of six (a cell, all boys, all who chose idli) with input its position in that list; the value counts the matching children in the list. */
const adrecRead: Claim = (s, p) => {
  const rows = recRows(p);
  const m = p.prompt.match(REC_PROMPT);
  if (!rows || !m) return null;
  const q = REC_ASKS.indexOf(m[1]);
  if (q < 0 || !sameList(s.inputs, [q])) return null;
  const fits = ([g, b]: [string, string]) =>
    [g === "Boy" && b === "Idli", g === "Boy" && b === "Dosa", g === "Girl" && b === "Idli", g === "Girl" && b === "Dosa", g === "Boy", b === "Idli"][q];
  return rat(BigInt(rows.filter(fits).length));
};

/* ------------------------------------------------------------------ cups and jugs */
/** read: the chart's bars give the cups for the container(s) named in the question (the single "read" or the pair "read2"); the value is the bar (or the two bars, in the question's order). */
const abcupRead: Check = (s, p) => {
  const f = barsFig(p);
  const m = p.prompt.match(/^The chart shows how many cups of water fill each container, using the same small cup\. How many (more )?cups does the (\w+) hold(?: than the (\w+))?\?$/);
  if (!f || !m || f.scale !== 1 || f.labels.length !== 3 || !!m[1] !== (m[3] !== undefined)) return null;
  const at = (w: string) => f.labels.findIndex((l) => l.toLowerCase() === w);
  const a = at(m[2]);
  if (a < 0) return null;
  if (m[3] === undefined) return verdict(sameList(s.inputs, [f.labels[a]]), s.value === f.values[a]);
  const b = at(m[3]);
  if (b < 0 || a === b) return null;
  return verdict(sameList(s.inputs, [f.labels[a], f.labels[b]]), sameList(s.value, [f.values[a], f.values[b]]));
};
/** compare cups: the table's cups column (inputs, in row order) puts the containers in order, most or least first; the value lists their numbers with ", ". */
const abcupordCompare: Check = (s, p) => {
  const t = tableFig(p);
  const m = p.prompt.match(/^The table shows how many cups of water fill each container, and how tall each one is\. Put the containers in order from the one that holds the (most|least) to the one that holds the (most|least)\. Write their numbers with commas\.$/);
  if (!t || !m || m[1] === m[2] || t.head.join("|") !== "Number|Container|Height (cm)|Cups of water it holds" || t.rows.length < 3) return null;
  const cups: number[] = [];
  for (let i = 0; i < t.rows.length; i++) {
    const r = t.rows[i];
    if (r.length !== 4 || r[0] !== i + 1 || !isInt(r[3])) return null;
    cups.push(r[3]);
  }
  if (new Set(cups).size !== cups.length) return null;
  const order = cups.map((_, i) => i).sort((a, b) => (m[1] === "most" ? cups[b] - cups[a] : cups[a] - cups[b]));
  return verdict(sameList(s.inputs, cups), s.value === order.map((i) => i + 1).join(", "));
};
/** read: the dot on the jug's scale (figure marks) is the water level in mL; the input is the jug's size, which the prompt and the scale both state. */
const abjugRead: Claim = (s, p) => {
  const f = p.figure as { type?: string; from?: unknown; to?: unknown; marks?: unknown } | undefined;
  const m = p.prompt.match(/^The scale on a (\d+) mL measuring jug is shown as a line, and the dot shows the water level\. /);
  if (!f || f.type !== "numberline" || !m || f.from !== 0 || f.to !== Number(m[1]) || !Array.isArray(f.marks) || f.marks.length !== 1) return null;
  const level = f.marks[0];
  if (!isInt(level) || level <= 0 || level >= f.to || !sameList(s.inputs, [f.to])) return null;
  return rat(BigInt(level));
};

/* ------------------------------------------------------------------ venn table */
const VENN_ASKS = ["How many children play exactly one of the two games?", "How many children play cricket?", "How many children play at least one of the games?", "How many children are there in the class?"];
/** choose cells: the question picks the cells of the 2 × 2 table (both games, cricket only, kho-kho only, neither) it needs; input is the question's position in the list of four; the value lists those cells' counts in table order. */
const advennChoose: Check = (s, p) => {
  const t = tableFig(p);
  const m = p.prompt.match(/^The table shows which of two games, cricket and kho-kho, the children of a class play\. (How many .+\?)$/);
  if (!t || !m || t.head.join("|") !== "|Plays kho-kho|Does not play kho-kho" || t.rows.length !== 2) return null;
  const [r1, r2] = t.rows;
  if (r1[0] !== "Plays cricket" || r2[0] !== "Does not play cricket" || r1.length !== 3 || r2.length !== 3) return null;
  const q = VENN_ASKS.indexOf(m[1]);
  if (q < 0 || ![r1[1], r1[2], r2[1], r2[2]].every(isInt)) return null;
  // cells in reading order, each tagged (plays cricket, plays kho-kho)
  const cells: { c: boolean; k: boolean; n: number }[] = [
    { c: true, k: true, n: r1[1] as number }, { c: true, k: false, n: r1[2] as number },
    { c: false, k: true, n: r2[1] as number }, { c: false, k: false, n: r2[2] as number },
  ];
  const fit = cells.filter((x) => [x.c !== x.k, x.c, x.c || x.k, true][q]);
  return verdict(sameList(s.inputs, [q]), s.value === fit.map((x) => x.n).join(", "));
};

/* ------------------------------------------------------------------ speed */
/** read (total): the distance stated in the prompt, with its units (km in hours, metres in minutes) and the time; inputs [distance, time, unit, time unit]. */
const agspdRead: Claim = (s, p) => {
  const m = p.prompt.match(/^A van travels (\d+) km in (\d+) hours, going the same distance every hour\. How many km does it travel in 1 hour\?$/)
    ?? p.prompt.match(/^A girl walks (\d+) metres in (\d+) minutes, walking the same distance every minute\. How many metres does she walk in 1 minute\?$/);
  if (!m) return null;
  const van = p.prompt.startsWith("A van");
  if (!sameList(s.inputs, [Number(m[1]), Number(m[2]), van ? "km" : "metres", van ? "hours" : "minutes"])) return null;
  return rat(BigInt(m[1]));
};
/** compare: each child's speed is distance ÷ time from the table (inputs [speed1, speed2], whole numbers); the faster speed is the value. */
const agspdcCompare: Claim = (s, p) => {
  const t = tableFig(p);
  const m = p.prompt.match(/^The table shows how far (\w+) and (\w+) cycled and how long each took, each at a steady speed\. How many metres in 1 minute does the faster child cycle\?$/);
  if (!t || !m || t.head.join("|") !== "Child|Distance (metres)|Time (minutes)" || t.rows.length !== 2) return null;
  const speeds: number[] = [];
  for (const [i, r] of t.rows.entries()) {
    if (r.length !== 3 || r[0] !== m[i + 1] || typeof r[1] !== "string" || typeof r[2] !== "string" || !/^\d+$/.test(r[1]) || !/^\d+$/.test(r[2])) return null;
    const d = Number(r[1]), tm = Number(r[2]);
    if (tm === 0 || d % tm !== 0) return null;
    speeds.push(d / tm);
  }
  if (!sameList(s.inputs, speeds)) return null;
  return rat(BigInt(Math.max(...speeds)));
};

export const CLAIMS: ClaimTable = {
  "afbar/read": afbarRead,
  "adbar/read": { check: adbarRead },
  "adbartf/compare": { check: adbartfCompare },
  "adbartf/read": { check: adbartfRead },
  "acpictmore/read": acpictmoreRead,
  "acpict/count": acpictCount,
  "acpicthalf/count": acpicthalfCount,
  "acpicttab/compare": acpicttabCompare,
  "adtally/count": { check: adtallyCount },
  "adrec/count": { check: adrecCount },
  "adrec/read": adrecRead,
  "abcup/read": { check: abcupRead },
  "abcupord/compare cups": { check: abcupordCompare },
  "advenn/choose cells": { check: advennChoose },
  "agspd/read": agspdRead,
  "agspdc/compare": agspdcCompare,
  "abjug/read": abjugRead,
};
/** For each key: "prompt-independent" (facts come from the prompt text or params) or "figure-consistent" (the only source is the data of the picture the family emitted). */
export const BASIS: Record<string, "prompt-independent" | "figure-consistent"> = {
  "afbar/read": "figure-consistent",
  "adbar/read": "figure-consistent",
  "adbartf/compare": "figure-consistent",
  "adbartf/read": "figure-consistent",
  "acpictmore/read": "figure-consistent",
  "acpict/count": "figure-consistent",
  "acpicthalf/count": "figure-consistent",
  "acpicttab/compare": "figure-consistent",
  "adtally/count": "figure-consistent",
  "adrec/count": "figure-consistent",
  "adrec/read": "figure-consistent",
  "abcup/read": "figure-consistent",
  "abcupord/compare cups": "figure-consistent",
  "advenn/choose cells": "figure-consistent",
  "agspd/read": "prompt-independent",
  "agspdc/compare": "figure-consistent",
  "abjug/read": "figure-consistent",
};
