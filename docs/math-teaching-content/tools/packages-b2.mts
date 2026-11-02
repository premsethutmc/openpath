/**
 * Batch 2: PATTERN packages. One instructional pattern (one shared teaching strategy) is reused across several generator families and
 * competencies; a package exists per family only for what is family-specific (its examples, oracle and the misconceptions not already
 * taught by an existing explanation). REVIEW CANDIDATES — not approved, not registered, not served. Same checks as batch 1 (build.mts).
 */
import type { Problem } from "../../../packages/learning/src/family-kit.ts";
import { q, qs, type Oracle, type Package } from "./packages.mts";

const N = Number;
const nums = (t: string) => [...t.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => m[0]);

export interface Pattern {
  id: string; title: string; strands: string[];
  /** the ONE shared teaching strategy: concept, picture idea, alternative explanation */
  concept: string[]; alternative: { title: string; text: string[] };
  /** existing explanations that already teach part of this pattern (reused, not rewritten) */
  reuses: { competency: string; strategy: string; covers: string }[];
  members: string[];
  /** cross-family contrast: one diagnostic item from each member (by member id and its case label) */
  crossDiagnostic: { pkg: string; case: string }[];
  responsePatterns: { answers: string[]; supports: string; uncertain: string; establishes: boolean }[];
  whyThisPattern: string;
}

// ------------------------------------------------------------------------------------------------ REGROUP: carry at the unit boundary
const REGROUP_CONCEPT_GENERAL = "A bigger unit is made of a fixed number of smaller units. When the small units reach that number, make one big unit from them and keep the rest as small units.";
const REGROUP_CONCEPT = [
  "A bigger unit is made of a fixed number of smaller units: 60 minutes make 1 hour, 100 paise make ₹1.",
  "When the small units add up to that number or more, make one big unit from them and keep the rest as small units. The number to regroup at depends on the unit: 60 for time, 100 for money (10 for ones and tens).",
];
const hm = (t: string) => { const m = t.match(/(\d+) h (\d+) min[^\d]+(\d+) h (\d+) min/)!; return [N(m[1]), N(m[2]), N(m[3]), N(m[4])]; };
const rupees = (t: string) => { const m = t.match(/₹(\d+)\.(\d\d) ([+−]) ₹(\d+)\.(\d\d)/)!; return { a: N(m[1]) * 100 + N(m[2]), b: N(m[4]) * 100 + N(m[5]), plus: m[3] === "+" }; };
const rs = (p: number) => `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;

// ------------------------------------------------------------------------------------------------ SCALE: one symbol / line stands for k
const SCALE_CONCEPT = [
  "In a pictograph or a scaled bar chart, one picture or one line does not always stand for 1. The key or the scale says how many it stands for.",
  "Read the key first. Then count pictures (or lines) and multiply by the key; to draw, share the number into groups of the key.",
];
const label = (t: string, labels: string[]) => { const day: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" }; return labels.map((l, i) => ({ i, at: Math.max(t.indexOf(` ${l}`), day[l] ? t.indexOf(day[l]) : -1) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at).map((x) => x.i); };

// ------------------------------------------------------------------------------------------------ EQUAL PARTS: the bottom number counts ALL equal parts
const PARTS_CONCEPT = [
  "A fraction names equal parts of ONE whole. The bottom number is how many equal parts the whole is cut into, all of them, shaded or not.",
  "The top number is how many of those parts we mean. So the fraction of a shape that is shaded is (shaded parts) over (all the equal parts).",
];

// ------------------------------------------------------------------------------------------------ PLACE VALUE: what a digit is worth
const PV_CONCEPT = [
  "A digit is worth different amounts in different places. In a two-digit number the first digit counts tens and the second counts ones.",
  "'The value of a digit' is how much it is worth (a tens digit is worth that many tens); 'how many tens' is just the count. The same digit answers the two questions differently.",
];

// ------------------------------------------------------------------------------------------------ CHANCE: favourable over ALL equally likely outcomes
const CHANCE_CONCEPT = [
  "Each marble (or ball) is equally likely to be picked, not each colour. So count marbles, not colours.",
  "Probability = (marbles that fit) ÷ (ALL the marbles). It is a number from 0 to 1, never more than 1.",
];
const bag = (t: string) => { const c: Record<string, number> = {}; for (const m of t.matchAll(/(\d+) (red|blue|green|yellow|white|black|pink|purple|orange)/g)) c[m[2]] = N(m[1]); return c; };
const chance = (t: string, noun = "marbles"): Oracle => {
  const c = bag(t), all = Object.values(c).reduce((a, b) => a + b, 0);
  const ev = t.match(/probability that it is ([^?]+)\?/)![1].trim();
  const neg = ev.startsWith("not ");
  const cols = ev.replace(/^not /, "").split(/, | or /).map((x) => x.trim());
  const fit = cols.reduce((a, k) => a + (c[k] ?? 0), 0);
  const fav = neg ? all - fit : fit;
  return { value: q(fav, all), lines: [`All the ${noun}: ${Object.entries(c).map(([k, v]) => `${v} ${k}`).join(" + ")} = ${all}, each equally likely`, `${noun[0].toUpperCase() + noun.slice(1)} that fit "${ev}": ${fav}`, `P = ${fav}/${all}${qs(q(fav, all)) === `${fav}/${all}` ? "" : ` = ${qs(q(fav, all))}`}`] };
};

const common = (x: Partial<Package>) => x as Package;

export const PACKAGES_B2: Package[] = [
  common({
    id: "TP2-REG-TIME", batch: "batch-2", pattern: "PAT-REGROUP", title: "Adding durations: 60 minutes make an hour", family: "addur", competency: "MATH.measurement.time-unit-conversion", strand: "measurement",
    reuses: [{ strategy: "spot_the_mistake", covers: "hour-as-100 (an hour taken as 100 minutes)" }, { strategy: "clock_round", covers: "the 60-minute hour (general)" }],
    skill: "Add two durations in hours and minutes, regrouping 60 minutes as 1 hour.",
    restriction: "addur with params[0] = 0 (adding two durations in h and min); diagnostics, rechecks and delayed checks need minutes that add to 60 or more (the no-carry error is possible).",
    applies: (p) => p.params[0] === 0,
    diagnosticCases: [{ label: "minutes add to 100 or more", pick: (p) => p.bugs.some((b) => b.id === "no-carry") && hm(p.prompt)[1] + hm(p.prompt)[3] >= 100, why: "no-carry keeps 100+ minutes; regrouping at 100 instead of 60 (hour-as-100, unmodelled here) would give (h + 1, minutes − 100), a different answer, so the two beliefs are separated" }],
    targets: [{ bug: "no-carry", status: "modelled", note: "the minutes are not regrouped into hours" }],
    prerequisites: { knowledge: ["1 hour = 60 minutes", "adding two-digit numbers"] },
    concept: [REGROUP_CONCEPT_GENERAL, "60 minutes make 1 hour, so when the minutes of a duration add up to 60 or more, 60 of them become 1 hour."],
    visual: (p) => { const [h1, m1, h2, m2] = hm(p.prompt); return { type: "numberline", from: 0, to: 120, marks: [m1, m1 + m2, 60], note: `${m1} + ${m2} minutes passes 60: one hour` }; },
    visualNote: "Reuses the numberline visual (0–120 minutes, a mark at 60). A clock-face 'past the hour' visual exists (clock) but shows times, not durations.",
    oracle: (t) => { const [h1, m1, h2, m2] = hm(t); const mins = m1 + m2, carry = Math.floor(mins / 60); return { value: `(${h1 + h2 + carry}, ${mins % 60})`, lines: [`Minutes: ${m1} + ${m2} = ${mins}${carry ? ` = 60 + ${mins - 60}: 60 minutes make 1 hour` : ""}`, `Hours: ${h1} + ${h2}${carry ? " + 1" : ""} = ${h1 + h2 + carry}`, `(${h1 + h2 + carry}, ${mins % 60})`] }; },
    alternatives: [{ name: "Change everything to minutes, then back", valid: true, run: (t) => { const [h1, m1, h2, m2] = hm(t); const tot = 60 * (h1 + h2) + m1 + m2; return { value: `(${Math.floor(tot / 60)}, ${tot % 60})`, lines: [`${h1} h ${m1} min = ${60 * h1 + m1} min; ${h2} h ${m2} min = ${60 * h2 + m2} min; together ${tot} min`, `${tot} = ${Math.floor(tot / 60)} × 60 + ${tot % 60}: (${Math.floor(tot / 60)}, ${tot % 60})`] }; } }],
    alternativeExplanation: { title: "Like carrying, but at an hour", text: ["It works like carrying in addition, but you carry when the minutes make a whole hour, not when they make ten."], math: "oracle" },
    hints: (t) => { const [, m1, , m2] = hm(t); return ["Add the minutes first.", `${m1} + ${m2} minutes: is that 60 or more?`, "Take 60 minutes out as 1 hour and add it to the hours."]; },
    fixes: { "no-carry": { title: "Carry 60 minutes as an hour", fix: "60 minutes always make 1 hour, so the minutes part of a duration stays below 60.", counter: (t) => { const [h1, m1, h2, m2] = hm(t); const tot = 60 * (h1 + h2) + m1 + m2; return `Check in minutes: ${60 * h1 + m1} + ${60 * h2 + m2} = ${tot} minutes = ${Math.floor(tot / 60)} × 60 + ${tot % 60}, so ${Math.floor(tot / 60)} h ${tot % 60} min. An answer with ${m1 + m2} minutes still holds a whole hour inside the minutes.`; } } },
    workingChecker: "none: no working contract (answer-level evidence only)",
    sources: ["packages/learning/src/fam/b04.ts:2140 addur: teach idea/method, alternative like_carrying; bugs no-carry, carry-kept, small-unit-left-out"],
    uncertainties: ["The existing spot_the_mistake of MATH.measurement.time-unit-conversion addresses hour-as-100 (seed adhmin); this package adds no-carry only."],
  }),
  common({
    id: "TP2-REG-MONEY", batch: "batch-2", pattern: "PAT-REGROUP", title: "Adding rupees and paise: 100 paise make ₹1", family: "acmoneyadd", competency: "MATH.measurement.money-decimals", strand: "measurement",
    reuses: [{ strategy: "drop_dot", covers: "money as paise (general)" }],
    skill: "Add two amounts in rupees and paise, regrouping 100 paise as ₹1.",
    restriction: "acmoneyadd with params[4] = 0 (addition); diagnostics, rechecks and delayed checks need paise that add to 100 or more.",
    applies: (p) => p.params[4] === 0,
    diagnosticCases: [{ label: "paise add to 100 or more", pick: (p) => p.bugs.some((b) => b.id === "no-carry"), why: "paise-over-100 writes three paise digits; no-carry drops the regrouped rupee" }],
    targets: [{ bug: "paise-over-100", status: "modelled", note: "115 paise written as .115" }, { bug: "no-carry", status: "modelled", note: "the rupee made from 100 paise not carried" }],
    prerequisites: { knowledge: ["₹1 = 100 paise", "₹4.50 means 4 rupees and 50 paise"] },
    concept: [REGROUP_CONCEPT_GENERAL, "100 paise make ₹1, so when the paise add up to 100 or more, 100 of them become ₹1."],
    visual: (p) => { const { a, b } = rupees(p.prompt); return { type: "table", head: ["", "₹", "paise"], rows: [["", Math.floor(a / 100), String(a % 100).padStart(2, "0")], ["+", Math.floor(b / 100), String(b % 100).padStart(2, "0")]] }; },
    visualNote: "Reuses the family's own ₹/paise table figure.",
    oracle: (t) => { const { a, b, plus } = rupees(t); const s = plus ? a + b : a - b; const pa = (a % 100) + (b % 100); return { value: rs(s), lines: [`Paise: ${a % 100} + ${b % 100} = ${pa}${pa >= 100 ? ` = 100 + ${pa - 100}: 100 paise make ₹1` : ""}`, `Rupees: ${Math.floor(a / 100)} + ${Math.floor(b / 100)}${pa >= 100 ? " + 1" : ""} = ${Math.floor(s / 100)}`, `₹${rs(s)}`] }; },
    alternatives: [{ name: "All in paise", valid: true, run: (t) => { const { a, b, plus } = rupees(t); const s = plus ? a + b : a - b; return { value: rs(s), lines: [`${a} paise + ${b} paise = ${s} paise`, `${s} paise = ₹${rs(s)} (the dot two places from the right)`] }; } }],
    alternativeExplanation: { title: "Notes and coins", text: ["Count the coins: when you have 100 paise in coins, swap them for a ₹1 coin.", "Then count the rupees."] },
    hints: (t) => { const { a, b } = rupees(t); return ["Add the paise first.", `${a % 100} + ${b % 100} paise: is that 100 or more?`, "Swap 100 paise for ₹1 and add it to the rupees."]; },
    fixes: {
      "paise-over-100": { title: "Paise stop at 99", fix: "Paise always have two places after the dot: 100 paise or more must become rupees.", counter: (t) => { const { a, b } = rupees(t); const pa = (a % 100) + (b % 100); return `Check: ${pa} paise = ₹1 and ${pa - 100} paise, not ${pa} after the dot.`; } },
      "no-carry": { title: "Carry 100 paise as ₹1", fix: "The ₹1 made from 100 paise must be added to the rupees.", counter: (t) => { const { a, b } = rupees(t); return `Check: all in paise, ${a} + ${b} = ${a + b} paise = ₹${rs(a + b)}.`; } },
    },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b03.ts:1451 acmoneyadd: teach idea/method, alternative all_paise, figure table; bugs paise-over-100, no-carry, smaller-from-larger, rupee-not-reduced"],
    uncertainties: ["Money-decimals' existing spot_the_mistake addresses 'wrote-together' (seed acpaise); nothing existing covers regrouping."],
  }),
  common({
    id: "TP2-SCL-PICT", batch: "batch-2", pattern: "PAT-SCALE", title: "Pictographs: each picture stands for the key", family: "acpicttab", competency: "MATH.statistics.pictographs", strand: "statistics",
    reuses: [{ strategy: "spot_the_mistake", covers: "no-key (reading a pictograph)" }, { strategy: "table", covers: "pictures × key (general, seed acpict)" }],
    signature: (p) => { const f = FAMILY_FIG(p); const counts = f.type === "table" ? f.rows.map((r: any[]) => N(r[1])) : f.counts; const key = N(p.prompt.match(/(?:standing for|stands for) (\d+)/)![1]); const asked = /should be drawn for ([^?]+)\?/.exec(p.prompt); const row = asked && f.type === "table" ? N(f.rows.find((r: any[]) => r[0] === asked[1].trim())?.[1]) : null; return [`tbl:${[...counts].sort((a: number, b: number) => a - b).join(",")}|${key}`, ...(row !== null ? [`calc:${row}/${key}`] : [])]; },
    skill: "Use a pictograph key (each symbol stands for k) to draw a row and to read totals.",
    restriction: "acpicttab, all three forms: params[3] = 0 draw a row (÷ key), 1 total (× key), 2 largest group; key > 1 in diagnostics.",
    applies: () => true,
    diagnosticCases: [
      { label: "draw a row", pick: (p) => p.params[3] === 0 && p.bugs.some((b) => b.id === "one-each"), why: "one-each draws one picture per child" },
      { label: "read a total", pick: (p) => p.params[3] === 1 && p.bugs.some((b) => b.id === "no-key"), contrast: true, why: "no-key counts pictures; drawing and reading separate 'ignores the key both ways' from a one-direction gap" },
    ],
    targets: [{ bug: "one-each", status: "modelled", note: "one picture per child when drawing" }],
    prerequisites: { knowledge: ["multiplying and sharing by 2, 5, 10", "reading a table"] },
    concept: ["In a pictograph one picture does not always stand for 1 thing: the key says how many it stands for.", "To read, count the pictures and multiply by the key; to draw, share the number into groups of the key."],
    visual: (p) => { const f = pictFig(p); return f; },
    visualNote: "Reuses the family's own table / pictograph figures.",
    oracle: (t, fig) => { const rows: [string, number][] = fig.type === "table" ? fig.rows.map((r: any[]) => [String(r[0]), N(r[1])]) : fig.labels.map((l: string, i: number) => [l, fig.counts[i]]); const key = N(t.match(/(?:standing for|stands for) (\d+)/)![1]); if (/should be drawn for ([^?]+)\?/.test(t)) { const name = t.match(/should be drawn for ([^?]+)\?/)![1].trim(); const c = rows.find((r) => r[0] === name)![1]; return { value: q(c / key), lines: [`${name}: ${c} children, each ● for ${key}`, `${c} ÷ ${key} = ${c / key} pictures`] }; } const pics = rows.map(([l, c]) => [l, c / key] as const); if (/in all/.test(t)) { const s = pics.reduce((a, [, v]) => a + v, 0); return { value: q(s * key), lines: [`Pictures: ${pics.map(([, v]) => v).join(" + ")} = ${s}`, `${s} × ${key} = ${s * key} children`] }; } const mx = Math.max(...pics.map(([, v]) => v)); return { value: q(mx * key), lines: [`The longest row has ${mx} pictures`, `${mx} × ${key} = ${mx * key} children`] }; },
    alternatives: [{ name: "Make a table", valid: true, run: (t, fig) => { const o = PACKAGES_B2[2].oracle(t, fig); return { value: o.value, lines: ["pictures × key = children, or children ÷ key = pictures, row by row", o.lines.at(-1)!] }; } }],
    alternativeExplanation: { title: "Bundles", text: ["Think of each picture as a bundle of children tied together.", "Count bundles, then children in the bundles."] },
    hints: (t) => ["What does one picture stand for?", /drawn/.test(t) ? "Share the number into groups of the key." : "Count the pictures.", /drawn/.test(t) ? "One picture for each group." : "Multiply by the key."],
    fixes: { "one-each": { title: "One picture for each group", fix: "Each picture stands for the key's number of children, so draw one picture for each GROUP, not each child.", counter: (t, ) => { const key = N(t.match(/(?:standing for|stands for) (\d+)/)![1]); return `Check: ${key} children make one picture.`; } } },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b03.ts:1958 acpicttab: teach idea/method, alternative table, figures table/pictograph; bugs one-each, no-key, missed-row, smallest"],
    triggerCondition: { "one-each": "a competing explanation ('copied the table value', or 'answered children instead of pictures') gives the SAME number on every draw item, so answers alone cannot establish one-each: establish it only from a drawn pictograph (the learner draws one symbol per child) or after asking the learner what one symbol stands for" },
    uncertainties: ["no-key (reading) is already taught by the pictographs module's spot_the_mistake (seed acpict); this package adds one-each (drawing) and the shared concept for the family.", "one-each always predicts the number printed in the table, so it competes with copying: see the trigger condition."],
  }),
  common({
    id: "TP2-SCL-BAR", batch: "batch-2", pattern: "PAT-SCALE", title: "Scaled bar charts: read the scale, do not count lines", family: "afbar", competency: "MATH.statistics.scaled-bars", strand: "statistics",
    answerDistinct: true,
    signature: (p) => [`chart:${p.params[0]},${p.params[2]}`],
    exampleOk: (p) => { const f = FAMILY_FIG(p); return !f || p.params[1] !== 0 || Number(p.answer) / f.scale >= 3; },
    reuses: [{ strategy: "worked_steps", covers: "reading a scaled bar (general)" }, { strategy: "skip_count", covers: "counting up the scale" }, { strategy: "spot_the_mistake", covers: "count-lines" }],
    skill: "Read values from a bar chart whose scale steps by more than 1, then compare or add them.",
    restriction: "afbar, all forms (params[1] = 0 read, 1 how many more, 2 together); scale > 1.",
    applies: () => true,
    diagnosticCases: [{ label: "read one bar", pick: (p) => p.params[1] === 0 && p.bugs.some((b) => b.id === "assume-tens"), why: "count-lines gives the number of lines, assume-tens 10 per line" }, { label: "how many more", pick: (p) => p.params[1] === 1 && p.bugs.some((b) => b.id === "assume-tens"), why: "adds an operation error (add-for-more) that is separate from scale reading" }],
    targets: [{ bug: "assume-tens", status: "modelled", note: "each line assumed to be 10 (procedural)" }],
    prerequisites: { knowledge: ["skip counting in 2s, 5s, 10s", "difference and total"] },
    concept: ["On a scaled bar chart one line on the side does not always stand for 1: the numbers on the scale say how much each line stands for.", "Read the top of each bar against the scale, then add or subtract as the question asks."],
    visual: (p) => (FAMILY_FIG(p)),
    visualNote: "Reuses the family's own bars figure (with scale).",
    oracle: (t, fig) => { const ix = label(t, fig.labels); const v = (i: number) => fig.values[i]; if (/How many more/.test(t)) { const [a, b] = ix; return { value: q(v(a) - v(b)), lines: [`${fig.labels[a]}: ${v(a)}; ${fig.labels[b]}: ${v(b)} (scale ${fig.scale} per line)`, `${v(a)} − ${v(b)} = ${v(a) - v(b)}`] }; } if (/together/.test(t)) { const [a, b] = ix; return { value: q(v(a) + v(b)), lines: [`${fig.labels[a]}: ${v(a)}; ${fig.labels[b]}: ${v(b)} (scale ${fig.scale} per line)`, `${v(a)} + ${v(b)} = ${v(a) + v(b)}`] }; } return { value: q(v(ix[0])), lines: [`${fig.labels[ix[0]]}: ${v(ix[0]) / fig.scale} lines × ${fig.scale} = ${v(ix[0])}`] }; },
    alternatives: [{ name: "Skip count up the bar", valid: true, run: (t, fig) => { const o = PACKAGES_B2[3].oracle(t, fig); return { value: o.value, lines: [`count up in ${fig.scale}s to the top of each bar`, o.lines.at(-1)!] }; } }],
    alternativeExplanation: { title: "Read the numbers on the side", text: ["Look at two numbers next to each other on the scale: their difference is what one line stands for."] },
    hints: () => ["Look at the numbers on the side of the chart.", "How much does one line stand for?", "Read the top of the bar against the scale."],
    fixes: { "assume-tens": { title: "Read the scale; do not assume 10", fix: "Do not assume 10: read the numbers on the scale to see what one line stands for.", counter: (t) => "Check: two numbers next to each other on the scale differ by the size of one line." } },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b06.ts:824 afbar (seed of MATH.statistics.scaled-bars): bugs count-lines, assume-tens, add-for-more, difference-for-total"],
    uncertainties: ["afbar is the module's seed: its general teaching (worked_steps, skip_count) and spot_the_mistake (count-lines) already exist and are REUSED; only assume-tens gets a new explanation."],
  }),
  common({
    id: "TP2-PRT-NAME", batch: "batch-2", pattern: "PAT-PARTS", title: "Naming a shaded fraction: out of ALL the equal parts", family: "adfname", competency: "MATH.number.fraction-models", strand: "number",
    reuses: [{ strategy: "equal_parts", covers: "equal parts (authored, general)" }],
    signature: (p) => [`grid:${p.params[0]}x${p.params[1]}`],
    skill: "Name the shaded fraction of a shape cut into equal parts.",
    restriction: "adfname, all items (grids of equal squares); diagnostics need shaded ≠ unshaded so the two errors differ.",
    applies: () => true,
    diagnosticCases: [{ label: "shaded fraction", pick: (p) => p.bugs.some((b) => b.id === "shaded-to-unshaded") && p.bugs.some((b) => b.id === "count-only"), why: "shaded-to-unshaded gives shaded/unshaded; count-only gives the shaded count" }],
    targets: [{ bug: "shaded-to-unshaded", status: "modelled", note: "part-to-part instead of part-to-whole" }, { bug: "count-only", status: "modelled", note: "a count, not a fraction" }],
    prerequisites: { knowledge: ["equal parts", "counting squares"] },
    concept: PARTS_CONCEPT,
    visual: (p) => FAMILY_FIG(p),
    visualNote: "Reuses the family's own grid figure.",
    oracle: (_t, fig) => { const all = fig.rows * fig.cols, s = fig.shaded; return { value: q(s, all), lines: [`All the equal squares: ${fig.rows} × ${fig.cols} = ${all}`, `Shaded: ${s}`, `${s}/${all}${qs(q(s, all)) === `${s}/${all}` ? "" : ` = ${qs(q(s, all))}`}`] }; },
    alternatives: [{ name: "Unshaded first", valid: true, run: (_t, fig) => { const all = fig.rows * fig.cols; return { value: q(all - (all - fig.shaded), all), lines: [`unshaded ${all - fig.shaded}, so shaded = ${all} − ${all - fig.shaded} = ${fig.shaded} of ${all}`] }; } }],
    alternativeExplanation: { title: "Same fraction on a cake", text: ["Cut a round cake into the same number of equal pieces and colour the same number. The fraction is the same."] },
    hints: () => ["How many equal parts make the whole shape?", "How many of them are shaded?", "Write shaded over ALL the parts."],
    fixes: {
      "shaded-to-unshaded": { title: "Shaded out of ALL the parts", fix: "The bottom number counts ALL the equal parts of the whole, the shaded ones too.", counter: (_t, fig) => { const all = fig.rows * fig.cols; return `Check: the whole shape is cut into ${all} equal squares, so each square is 1/${all} of it, and ${fig.shaded} shaded ${fig.shaded === 1 ? "square is" : "squares are"} ${fig.shaded}/${all}.`; } },
      "count-only": { title: "A fraction is parts out of the whole", fix: "A fraction says how many parts out of how many: write the shaded parts over all the parts.", counter: (_t, fig) => `Check: ${fig.shaded} shaded ${fig.shaded === 1 ? "square" : "squares"} out of ${fig.rows * fig.cols} is a part of the shape; the number ${fig.shaded} alone does not say out of how many.` },
    },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b04.ts:567 adfname: teach idea/method, alternative pie, figure grid; bugs shaded-to-unshaded, unshaded, count-only"],
    uncertainties: ["MATH.number.fraction-models is an authored module (one strategy equal_parts); no misconception-specific explanation exists."],
  }),
  common({
    id: "TP2-PRT-SHADE", batch: "batch-2", pattern: "PAT-PARTS", title: "Shading a fraction of a grid: parts of the whole, not the top number", family: "adshade", competency: "MATH.number.fraction-models", strand: "number",
    reuses: [{ strategy: "equal_parts", covers: "equal parts (authored, general)" }],
    signature: (p) => [`grid:${p.params[0]}x${p.params[1]}`],
    skill: "Shade a/b of a grid of n equal squares: n ÷ b squares per part, a parts.",
    restriction: "adshade, all items; diagnostics need n > b so 'top-number' differs from the answer.",
    applies: () => true,
    diagnosticCases: [{ label: "grid larger than the bottom number", pick: (p) => p.bugs.some((b) => b.id === "top-number"), why: "top-number shades a squares instead of a × (n ÷ b)" }],
    targets: [{ bug: "top-number", status: "modelled", note: "the top number read as a count of squares" }],
    bugExampleOk: { "top-number": (p) => p.params[2] >= 2 },
    prerequisites: { knowledge: ["sharing into equal groups", "what a/b means"] },
    concept: PARTS_CONCEPT,
    visual: (p) => FAMILY_FIG(p),
    visualNote: "Reuses the family's own empty grid figure.",
    oracle: (t) => { const n = N(t.match(/has (\d+) equal squares/)![1]); const [a, b] = t.match(/show (\d+)\/(\d+)/)!.slice(1).map(N); return { value: q((n / b) * a), lines: [`Share ${n} squares into ${b} equal parts: ${n} ÷ ${b} = ${n / b} squares in each part`, `${a} part${a === 1 ? "" : "s"}: ${a} × ${n / b} = ${(n / b) * a} squares`] }; },
    alternatives: [{ name: "Multiply first", valid: true, run: (t) => { const n = N(t.match(/has (\d+) equal squares/)![1]); const [a, b] = t.match(/show (\d+)\/(\d+)/)!.slice(1).map(N); return { value: q((a * n) / b), lines: [`${a} × ${n} = ${a * n}; ÷ ${b} = ${(a * n) / b}`] }; } }],
    alternativeExplanation: { title: "Two wholes", text: ["Half of a small grid and half of a big grid are different numbers of squares, but each is half of its own grid."] },
    hints: (t) => { const [a, b] = t.match(/show (\d+)\/(\d+)/)!.slice(1).map(N); return [`Into how many equal parts must the grid be shared for /${b}?`, "How many squares are in each part?", `Shade ${a} of those parts.`]; },
    fixes: { "top-number": { title: "The top number counts parts, not squares", fix: "The top number counts PARTS of the whole, and each part may be several squares.", counter: (t) => { const n = N(t.match(/has (\d+) equal squares/)![1]); const [a, b] = t.match(/show (\d+)\/(\d+)/)!.slice(1).map(N); return `Check: ${a} square${a === 1 ? "" : "s"} out of ${n} is ${qs(q(a, n))}, not ${a}/${b}.`; } } },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b04.ts:1945 adshade: teach idea/method, alternative two_wholes, figure grid; bugs top-number, one-part, unshaded"],
    uncertainties: [],
  }),
  common({
    id: "TP2-PV-DIGIT", batch: "batch-2", pattern: "PAT-PLACE", title: "The value of a digit, and how many tens", family: "aadigit", competency: "MATH.number.place-value-tens", strand: "number",
    reuses: [{ strategy: "bundles", covers: "tens as bundles (general)" }, { strategy: "spot_the_mistake", covers: "count-blocks" }],
    signature: (p) => [`n:${p.params[0]}`, `q:${p.params[1]}:${p.params[1] === 1 ? Math.floor(p.params[0] / 10) : p.params[0]}`],
    skill: "Give the value of a digit in a two-digit number, and the number of tens.",
    restriction: "aadigit, all three forms (params[1] = 0 value of the tens digit, 1 how many tens, 2 value of the ones digit); numbers with two equal digits excluded (the question would be ambiguous).",
    applies: (p) => Math.floor(p.params[0] / 10) !== p.params[0] % 10,
    diagnosticCases: [
      { label: "value of the tens digit", pick: (p) => p.params[1] === 0, why: "face-value gives the digit" },
      { label: "how many tens", pick: (p) => p.params[1] === 1, why: "value-not-count gives the value; a learner who always answers 'the digit' is right here and wrong above" },
      { label: "value of the ones digit", pick: (p) => p.params[1] === 2, contrast: true, why: "times-ten over-applies the tens rule" },
      { label: "value of the tens digit, another number", pick: (p) => p.params[1] === 0, contrast: true, why: "a second value item, so face-value rests on two answers" },
    ],
    responsePatterns: [
      { answers: ["bug:face-value", "correct", "correct", "bug:face-value"], supports: "face-value on both value items while 'how many tens' and the ones digit are right", uncertain: "the word 'value' may be what is unknown rather than place value; fix_face_value teaches both (the chart and the word), so either cause is served", establishes: true },
      { answers: ["bug:face-value", "correct", "correct", "correct"], supports: "one face-value answer: suspected only", uncertain: "a slip, the word 'value', or place value", establishes: false },
      { answers: ["correct", "bug:value-not-count", "correct", "correct"], supports: "value-not-count once", uncertain: "a question-reading difference; suspected only", establishes: false },
      { answers: ["bug:face-value", "bug:value-not-count", "correct", "bug:face-value"], supports: "the two questions are answered the other way round", uncertain: "the place idea may be fine (both numbers are known): a vocabulary swap; teach the two questions side by side, do NOT establish face-value", establishes: false },
      { answers: ["correct", "correct", "bug:times-ten", "correct"], supports: "times-ten: the tens rule applied to the ones digit, once", uncertain: "suspected only", establishes: false },
    ],
    inherentInPrompt: ["face-value"],
    targets: [{ bug: "face-value", status: "modelled", note: "the digit given instead of its value" }, { bug: "value-not-count", status: "modelled", note: "the value given when the count of tens is asked" }],
    prerequisites: { knowledge: ["counting in tens", "a two-digit number is tens and ones"] },
    concept: PV_CONCEPT,
    visual: (p) => FAMILY_FIG(p),
    visualNote: "Reuses the family's own base-ten blocks figure.",
    oracle: (t) => { const n = N(t.match(/(?:In|in) (\d+)/)![1]); const T = Math.floor(n / 10), O = n % 10; if (/How many tens/.test(t)) return { value: q(T), lines: [`${n} = ${T} ${T === 1 ? "ten" : "tens"} and ${O} ${O === 1 ? "one" : "ones"}`, `${T} ${T === 1 ? "ten" : "tens"}`] }; const d = N(t.match(/the digit (\d)/)![1]); if (d === T && d !== O) return { value: q(10 * T), lines: [`${n} = ${T} ${T === 1 ? "ten" : "tens"} and ${O} ${O === 1 ? "one" : "ones"}`, `the ${d} is in the tens place: ${T} ${T === 1 ? "ten" : "tens"} = ${10 * T}`] }; if (d === O && d !== T) return { value: q(O), lines: [`${n} = ${T} ${T === 1 ? "ten" : "tens"} and ${O} ${O === 1 ? "one" : "ones"}`, `the ${d} is in the ones place: ${O}`] }; throw new Error("ambiguous digit"); },
    alternatives: [{ name: "Expanded form", valid: true, run: (t) => { const n = N(t.match(/(?:In|in) (\d+)/)![1]); const T = Math.floor(n / 10), O = n % 10; const v = /How many tens/.test(t) ? T : N(t.match(/the digit (\d)/)![1]) === T ? 10 * T : O; return { value: q(v), lines: [`${n} = ${10 * T} + ${O}`, `${v}`] }; } }],
    alternativeExplanation: { title: "Bundles of ten sticks", text: ["Bundle sticks in tens. The first digit tells how many bundles; each bundle is worth 10."] },
    hints: (t) => (/How many tens/.test(t) ? ["Write the number in a Tens | Ones chart.", "The first digit is how many tens.", "The question asks for the COUNT of tens, not their value."] : ["Which place is the digit in?", "Tens place: it counts tens; ones place: it counts ones.", "Its value is how much it is worth: tens digit × 10, ones digit as it is."]),
    fixes: {
      "face-value": { title: "A tens digit is worth tens", fix: "A digit in the tens place is worth that many TENS, not ones.", counter: (t) => { const n = N(t.match(/(?:In|in) (\d+)/)![1]); return `Check: ${n} is ${Math.floor(n / 10)} tens and ${n % 10} ones = ${10 * Math.floor(n / 10)} + ${n % 10}.`; } },
      "value-not-count": { title: "How many tens is a count", fix: "'How many tens' asks for a count of bundles, not their value.", counter: (t) => { const n = N(t.match(/in (\d+)/)![1]); return `Check: ${n} has ${Math.floor(n / 10)} bundles of ten; together they are worth ${10 * Math.floor(n / 10)}.`; } },
    },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b01.ts:1691 aadigit: teach idea/method, alternative chart, figure blocks; bugs face-value, value-not-count, times-ten, wrong-digit"],
    uncertainties: ["place-value-tens' existing spot_the_mistake addresses count-blocks (seed aatens); nothing covers face-value."],
  }),
  common({
    id: "TP2-CH-BAG", batch: "batch-2", pattern: "PAT-CHANCE", title: "Count marbles, not colours", family: "akchance", competency: "MATH.probability.chance-language", strand: "probability",
    answerDistinct: true,
    reuses: [{ strategy: "worked_steps", covers: "favourable over all (general)" }, { strategy: "scale_words", covers: "the 0–1 scale" }, { strategy: "spot_the_mistake", covers: "odds" }],
    signature: (p) => [`bag:${[...p.params.slice(0, 3)].sort((a, b) => a - b).join(",")}`],
    skill: "Probability of picking a colour (or not a colour) from a bag of marbles of different counts.",
    restriction: "akchance with params[3] ∈ {0, 1} (is X / is not X); diagnostics need unequal colour counts (colours-equal differs from the answer).",
    applies: (p) => p.params[3] <= 1,
    diagnosticCases: [
      { label: "unequal colours", pick: (p) => p.params[3] === 0 && p.bugs.some((b) => b.id === "colours-equal"), why: "colours-equal gives 1/(colours); odds gives red : others" },
      
    ],
    targets: [{ bug: "colours-equal", status: "modelled", note: "colours taken as equally likely" }],
    prerequisites: { knowledge: ["fractions as part of a whole", "counting"] },
    concept: CHANCE_CONCEPT,
    visual: (p) => FAMILY_FIG(p),
    visualNote: "Reuses the family's own colour table figure.",
    oracle: (t) => chance(t),
    alternatives: [{ name: "Number every marble", valid: true, run: (t) => { const o = chance(t); return { value: o.value, lines: ["number the marbles 1, 2, 3, …; each number is equally likely", o.lines[2]] }; } }],
    alternativeExplanation: { title: "Scale from 0 to 1", text: ["No matching marbles: 0. All of them: 1. Some: in between; more matching marbles means nearer 1."] },
    hints: () => ["Count ALL the marbles.", "Count the ones that fit.", "Fit ÷ all."],
    fixes: { "colours-equal": { title: "Count marbles, not colours", fix: "Colours with more marbles are more likely: count marbles, not colours.", counter: (t) => { const c = bag(t); const ks = Object.keys(c).sort((a, b) => c[b] - c[a]); const hi = ks[0], lo = ks[ks.length - 1]; return `Check: there are ${c[hi]} ${hi} but only ${c[lo]} ${lo}, so ${lo} is LESS likely than ${hi}. So the colours do not all have the same chance.`; } } },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b11.ts:634 akchance (seed of MATH.probability.chance-language): bugs odds, colours-equal, count-only; figure table"],
    uncertainties: ["akchance is the seed: worked_steps, scale_words and spot_the_mistake (odds) exist and are REUSED; this package adds colours-equal only.", "CONTRAST GAP: an equal-count bag (where 1/(number of colours) is RIGHT, so a correct answer there cannot be read as understanding) exists in the generator (gen:akchance:6,6,0,0, gen:akchance:8,8,0,0) but in NO served partition (diagnostic/practice/check/retention), and gen:akchance:1,1,0,0 (check) is ambiguous (odds and count-only both give 1). Generator partition change for Codex.", "Family prompt grammar: '1 red and 1 blue marbles' (plural with 1); wording only, recorded in 05."],
  }),
  common({
    id: "TP2-CH-BALL", batch: "batch-2", pattern: "PAT-CHANCE", title: "Balls of different counts: each ball is equally likely", family: "anbag", competency: "MATH.probability.classical", strand: "probability",
    answerDistinct: true,
    reuses: [{ strategy: "worked_steps", covers: "favourable over all (general)" }, { strategy: "out-of", covers: "numbering the balls" }, { strategy: "spot_the_mistake", covers: "odds" }],
    signature: (p) => [`bag:${[...p.params.slice(0, 3)].sort((a, b) => a - b).join(",")}`],
    skill: "Classical probability of a colour from a bag with unequal colour counts.",
    restriction: "anbag, all three asked colours; diagnostics need unequal counts.",
    applies: () => true,
    diagnosticCases: [{ label: "unequal colours", pick: (p) => p.bugs.some((b) => b.id === "colours-equally-likely"), why: "colours-equally-likely gives 1/(colours)" }],
    targets: [{ bug: "colours-equally-likely", status: "modelled", note: "colours taken as equally likely" }],
    prerequisites: { knowledge: ["probability = favourable ÷ total for equally likely outcomes"] },
    concept: CHANCE_CONCEPT,
    visual: (p) => { const c = bag(p.prompt); return { type: "table", head: ["Colour", "Balls"], rows: Object.entries(c) }; },
    visualNote: "anbag has no figure; a colour table (existing table visual) is proposed.",
    oracle: (t) => chance(t, "balls"),
    alternatives: [{ name: "Number every ball", valid: true, run: (t) => { const o = chance(t, "balls"); return { value: o.value, lines: ["number the balls; each number is equally likely", o.lines[2]] }; } }],
    alternativeExplanation: { title: "Out of", text: ["The probability is how many balls belong to the colour, out of how many balls there are."] },
    hints: () => ["Count all the balls.", "Count the balls of the colour asked.", "Write the second over the first."],
    fixes: { "colours-equally-likely": { title: "Count balls, not colours", fix: "It is the balls that are equally likely, not the colours.", counter: (t) => { const c = bag(t); const ks = Object.keys(c).sort((a, b) => c[b] - c[a]); const hi = ks[0], lo = ks[ks.length - 1]; return `Check: ${c[hi]} ${hi} balls and only ${c[lo]} ${lo} ball${c[lo] === 1 ? "" : "s"}: a ${lo} ball is less likely to come out than a ${hi} one, so the colours cannot all have the same chance.`; } } },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b14.ts:649 anbag (seed of MATH.probability.classical): bugs odds, colours-equally-likely, count-not-probability"],
    uncertainties: ["anbag is the seed: its spot_the_mistake (odds) is REUSED; this package adds colours-equally-likely only."],
  }),
];

export const PATTERNS: Pattern[] = [
  { id: "PAT-REGROUP", title: "Regroup at the unit boundary (60 minutes, 100 paise)", strands: ["measurement"], concept: REGROUP_CONCEPT, alternative: { title: "Like carrying, but at 60 or 100", text: ["Carrying in ones and tens happens at 10. Time carries at 60, money at 100."] },
    reuses: [{ competency: "MATH.measurement.time-unit-conversion", strategy: "spot_the_mistake", covers: "hour-as-100 (an hour taken as 100 minutes)" }, { competency: "MATH.measurement.time-unit-conversion", strategy: "clock_round", covers: "the 60-minute hour (general)" }, { competency: "MATH.measurement.money-decimals", strategy: "drop_dot", covers: "money as paise (general)" }],
    members: ["TP2-REG-TIME", "TP2-REG-MONEY"], crossDiagnostic: [{ pkg: "TP2-REG-TIME", case: "minutes add to 100 or more" }, { pkg: "TP2-REG-MONEY", case: "paise add to 100 or more" }],
    responsePatterns: [
      { answers: ["bug:no-carry", "correct"], supports: "minutes kept at 100 or more while money is regrouped: the 60-minute boundary is the gap", uncertain: "on a 100+ minute item regrouping at 100 would give (h + 1, minutes − 100), which is different, so hour-as-100 does not explain this answer", establishes: false },
      { answers: ["bug:no-carry", "bug:paise-over-100"], supports: "small units kept past the boundary in both units (100 or more minutes kept as minutes; 100 or more paise written after the dot)", uncertain: "the money answer also fits a notation habit (paise written in full after the dot); two different families: guide the shared concept, do not establish either misconception from this pair", establishes: false },
      { answers: ["correct", "bug:no-carry"], supports: "regroups time but loses the regrouped rupee in money", uncertain: "money-specific; the money no-carry answer also fits adding the rupees only", establishes: false },
      { answers: ["correct", "correct"], supports: "regroups at both boundaries", uncertain: "answer evidence only", establishes: false },
    ], whyThisPattern: "19 families across 10 competencies model a 60/100/24 boundary error (hour-as-100, minute-as-100, paise-over-100, no-carry, past-24); one strategy serves them all." },
  { id: "PAT-SCALE", title: "One picture or line stands for the key", strands: ["statistics"], concept: SCALE_CONCEPT, alternative: { title: "Read the key first", text: ["Before counting anything on a chart, find what one picture or one line stands for."] },
    reuses: [{ competency: "MATH.statistics.pictographs", strategy: "spot_the_mistake", covers: "no-key (reading)" }, { competency: "MATH.statistics.scaled-bars", strategy: "spot_the_mistake", covers: "count-lines" }, { competency: "MATH.statistics.scaled-bars", strategy: "skip_count", covers: "reading a scale (general)" }],
    members: ["TP2-SCL-PICT", "TP2-SCL-BAR"], crossDiagnostic: [{ pkg: "TP2-SCL-PICT", case: "read a total" }, { pkg: "TP2-SCL-BAR", case: "read one bar" }],
    responsePatterns: [
      { answers: ["bug:no-key", "bug:count-lines"], supports: "every symbol and line read as 1 on both displays: the key/scale idea is missing", uncertain: "none competing; teach the shared concept", establishes: true },
      { answers: ["correct", "bug:assume-tens"], supports: "uses keys but assumes scales go in 10s", uncertain: "a habit from charts seen before; fix_assume_tens", establishes: false },
      { answers: ["bug:no-key", "correct"], supports: "pictograph key ignored, bar scale read", uncertain: "a pictograph-specific reading slip; existing spot_the_mistake", establishes: false },
    ], whyThisPattern: "6 families in 5 competencies (pictographs, tallies, bar charts, scaled bars) model reading a key or scale as 1 or 10." },
  { id: "PAT-PARTS", title: "The bottom number counts all the equal parts", strands: ["number"], concept: PARTS_CONCEPT, alternative: { title: "Whole first", text: ["Before naming a fraction, say what the whole is and how many equal parts it has."] },
    reuses: [{ competency: "MATH.number.fraction-models", strategy: "equal_parts", covers: "equal parts (general, authored)" }],
    members: ["TP2-PRT-NAME", "TP2-PRT-SHADE"], crossDiagnostic: [{ pkg: "TP2-PRT-NAME", case: "shaded fraction" }, { pkg: "TP2-PRT-SHADE", case: "grid larger than the bottom number" }],
    responsePatterns: [
      { answers: ["bug:shaded-to-unshaded", "correct"], supports: "names the fraction part-to-part (shaded over unshaded) while shading a given fraction is right", uncertain: "a conceptual part-to-part reading of naming, or a habit only in naming tasks; one answer: suspected only", establishes: false },
      { answers: ["correct", "bug:top-number"], supports: "names fractions but reads the top number as squares when shading", uncertain: "the size of a part in a bigger whole; fix_top_number", establishes: false },
      { answers: ["bug:count-only", "bug:top-number"], supports: "fractions treated as plain counts in both directions", uncertain: "the two answers are different errors, and typing only the top number also explains the first; teach the shared concept as general teaching, but do NOT establish either misconception from this pair", establishes: false },
    ], whyThisPattern: "9 families in 5 competencies model a part–whole error in naming or making fractions (count-only, shaded-to-unshaded, top-number, add-bottoms)." },
  { id: "PAT-PLACE", title: "What a digit is worth depends on its place", strands: ["number"], concept: PV_CONCEPT, alternative: { title: "Chart", text: ["Write the number in a Tens | Ones chart before answering."] },
    reuses: [{ competency: "MATH.number.place-value-tens", strategy: "bundles", covers: "tens as bundles (general)" }, { competency: "MATH.number.place-value-tens", strategy: "spot_the_mistake", covers: "count-blocks" }],
    members: ["TP2-PV-DIGIT"], crossDiagnostic: [], responsePatterns: [], whyThisPattern: "10 families in 6 competencies (two-digit, four-digit, decimal place value) model a digit-versus-value error; batch 2 covers the two-digit entry point." },
  { id: "PAT-CHANCE", title: "Count equally likely outcomes, not categories", strands: ["probability"], concept: CHANCE_CONCEPT, alternative: { title: "Number the objects", text: ["Give every marble a number: each number is equally likely, so count numbers that fit."] },
    reuses: [{ competency: "MATH.probability.chance-language", strategy: "spot_the_mistake", covers: "odds" }, { competency: "MATH.probability.classical", strategy: "spot_the_mistake", covers: "odds" }, { competency: "MATH.probability.chance-language", strategy: "scale_words", covers: "0–1 scale (general)" }, { competency: "MATH.probability.sample-space", strategy: "(batch 1) TP-PRO-01", covers: "two-stage sample spaces" }],
    members: ["TP2-CH-BAG", "TP2-CH-BALL"], crossDiagnostic: [{ pkg: "TP2-CH-BAG", case: "unequal colours" }, { pkg: "TP2-CH-BALL", case: "unequal colours" }],
    responsePatterns: [
      { answers: ["bug:colours-equal", "bug:colours-equally-likely"], supports: "colours treated as equally likely in two different contexts (marbles, balls)", uncertain: "on unequal bags this answer differs from odds and from a count, so no competing explanation gives both; the equal-count contrast that would show it is not chance is unavailable (gap)", establishes: true },
      { answers: ["bug:odds", "bug:odds"], supports: "compares with the others, not with all: odds", uncertain: "existing spot_the_mistake (odds) applies in both modules", establishes: true },
      { answers: ["bug:colours-equal", "correct"], supports: "one matching answer: suspected only", uncertain: "a slip or the belief", establishes: false },
      { answers: ["bug:colours-equal", "bug:odds"], supports: "two different errors", uncertain: "no single belief explains both; general teaching, re-probe", establishes: false },
    ], whyThisPattern: "12 families in 8 competencies (chance, classical, sample spaces, distributions) model treating categories or totals as equally likely; TP-PRO-01 (batch 1) is the two-stage case of the same pattern." },
];

function pictFig(p: Problem) { return FAMILY_FIG(p); }
let FIG: (p: Problem) => any = () => null;
export const setFigure = (f: (p: Problem) => any) => { FIG = f; };
function FAMILY_FIG(p: Problem) { return FIG(p); }
