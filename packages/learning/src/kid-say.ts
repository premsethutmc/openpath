/**
 * kid-say@1: how a question reads to a child (Class 5 child build only). The maths, the answer and the marking never
 * change: this file only rewords what is shown and shapes the answer box, then turns what the child taps or types
 * back into the answer string the existing marking already accepts.
 *
 * The rules (written by OpenPath; see docs/product/FAMILY_PILOT.md, "Question wording"):
 *  1. One short ask. Anything after the question mark that tells the child how to type is dropped; the box says it.
 *  2. The answer takes the form the question suggests: ₹ before the box, a unit after it, two boxes for m and cm,
 *     numbers to tap into order, a letter to tap.
 *  3. A picture only where the maths is visual, and the sentence never does the picture's work.
 *  4. A calculation stays a calculation: no story is added.
 */
import type { Visual } from "./family-kit";

export type Ask =
  | { kind: "box"; before?: string; after?: string }
  | { kind: "fields"; labels: string[] }
  | { kind: "order"; items: string[]; first: string; prefix?: string }
  | { kind: "tap"; items: { label: string; value: string }[] };
export interface KidQ {
  say: string;
  ask: Ask;
  /** Multiple-choice options as the child sees them (the value is still the letter). */
  options?: string[];
  figure?: Visual;
  /** One short line under the picture (a key). */
  note?: string;
}
interface Q {
  id: string;
  prompt: string;
  type: string;
  answer?: string;
  options?: string[];
  figure?: { type: string; [k: string]: unknown };
}

const UNIT_LABEL: Record<string, string> = { hours: "h", minutes: "min", seconds: "s", m: "m", cm: "cm", mm: "mm", km: "km", kg: "kg", g: "g", L: "L", mL: "mL" };
const UNIT_AFTER: Record<string, string> = {
  cm: "cm", mm: "mm", m: "m", km: "km", mL: "mL", ml: "mL", L: "L", kg: "kg", g: "g", "cm³": "cm³", metres: "m", centimetres: "cm", millimetres: "mm",
  kilograms: "kg", kilometres: "km", grams: "g", litres: "L", millilitres: "mL", degrees: "°", "square units": "square units", "square centimetres": "cm²",
  "square metres": "m²", minutes: "min", hours: "h", seconds: "s", days: "days",
};
const UNIT_RE = Object.keys(UNIT_AFTER).sort((a, b) => b.length - a.length).map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

/** Sentences, keeping decimals (4.50), times (p.m.) and abbreviations together. */
const sentences = (t: string) => t.split(/(?<=[.?!])(?<!e\.g\.)(?<!i\.e\.)\s+(?=[A-Z(₹"0-9−])/).filter((s) => s.trim());
const fam = (id: string) => id.split(":")[1] ?? "";
const form = (id: string) => (id.endsWith(":mc") ? "mc" : id.endsWith(":w") ? "w" : "typed");
const grab = (re: RegExp, t: string) => {
  const m = t.match(re);
  if (!m) throw NOT_THIS;
  return m;
};
/** A family's own rewrite covers one way the family words its questions; for any other, the general rules apply. */
const NOT_THIS = new Error("kid-say@1: not this wording");
const lead = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ------------------------------------------------------------------ one family at a time (the wordiest ones)

type Own = (q: Q) => Partial<KidQ> & { say: string };
const OWN: Record<string, Own> = {
  avfold: (q) => {
    const m = grab(/so (\d+\/\d+) of the sheet is coloured\. .*every strip is cut into (\d+) equal parts/, q.prompt);
    return { say: `${m[1]} is coloured. Each strip is now cut into ${m[2]}. What fraction is coloured now?` };
  },
  aedec: (q) => ({ say: "What number do the blocks show?", note: "big square = 1 · rod = 0.1 · small cube = 0.01" }),
  aecmp: (q) => {
    const m = grab(/order \(smallest first\): ([\d,; ]+)\./, q.prompt);
    return { say: "Put them in order, smallest first.", ask: { kind: "order", items: m[1].split(/;\s*/), first: "smallest" } };
  },
  aedord: (q) => {
    const m = grab(/order \(smallest first\): ([\d.; ]+)\./, q.prompt);
    return { say: "Put them in order, smallest first.", ask: { kind: "order", items: m[1].split(/;\s*/), first: "smallest" } };
  },
  aaordx: (q) => {
    const c = q.prompt.match(/cards in the picture show numbers\. Put the numbers in (ascending|descending) order/);
    if (c) {
      const first = c[1] === "ascending" ? "smallest" : "biggest";
      const items = (q.answer ?? "").replace(/^\(|\)$/g, "").split(/,\s*/).sort();
      return { say: `Tap the cards in order, ${first} number first.`, ask: { kind: "order", items, first, prefix: "Card" } };
    }
    const m = grab(/in (ascending|descending) order \(from the \w+ to the \w+\): ([\d, ]+)\./, q.prompt);
    const first = m[1] === "ascending" ? "smallest" : "biggest";
    return { say: `Put them in order, ${first} first.`, ask: { kind: "order", items: m[2].split(/,\s*/), first } };
  },
  aaordn: (q) => {
    const m = grab(/from the smallest to the biggest: ([\d, ]+)\./, q.prompt);
    return { say: "Put them in order, smallest first.", ask: { kind: "order", items: m[1].split(/,\s*/), first: "smallest" } };
  },
  adford: (q) => order(q, /from the smallest to the largest: ([\d/, ]+)\./),
  adfordu: (q) => order(q, /from the smallest to the largest: ([\d/, ]+)\./),
  ajord: (q) => {
    const m = grab(/\(smallest first\): ([−\d, ]+)\./, q.prompt);
    return { say: "Put them in order, smallest first.", ask: { kind: "order", items: m[1].split(/,\s*/), first: "smallest" } };
  },
  ajmill: (q) => {
    const m = grab(/is (\d+ crore(?: \d+ lakh)?)\. How many millions is it\?/, q.prompt);
    return { say: `${m[1]} is how many millions?`, note: "1 crore = 10 million" };
  },
  ajmilr: (q) => {
    const m = grab(/^(\d+) million is [\d,]+ in the international system\. How many lakh is it\?/, q.prompt);
    return { say: `${m[1]} million is how many lakh?`, note: "1 million = 10 lakh" };
  },
  aematch: (q) => {
    const m = grab(/^(.+?) each (.+?): (.+?)\. Clues: (.+?) (Who [^?]+\?)$/, q.prompt);
    return { say: m[5], note: `${m[1]} each ${m[2]}: ${m[3]}. ${m[4]}` };
  },
  aedigsym: (q) => {
    const m = grab(/with straight bars: ([\d, ]+)\. How many of them have a (horizontal|vertical) line of symmetry/, q.prompt);
    return { say: m[2] === "horizontal" ? `How many of these fold onto themselves top to bottom? ${m[1]}` : `How many of these fold onto themselves left to right? ${m[1]}`, note: "Written like a digital clock, with straight bars." };
  },
  aearms: (q) => {
    const m = grab(/^∠X is the turn made by the minute hand of a clock moving from 12 to (\d+)\. ∠Y is drawn with arms twice as long, and is the turn of the hand moving from 12 to (\d+)\./, q.prompt);
    return { say: `∠X: a clock hand turns from 12 to ${m[1]}. ∠Y: from 12 to ${m[2]}, drawn with longer arms. Which is true?` };
  },
  adestcost: (q) => {
    const m = grab(/: (a .+?)\. Round each price to the nearest ten rupees/, q.prompt);
    return { say: `Round each price to the nearest ₹10 and add. About how much is it all? ${lead(m[1])}.`, ask: { kind: "box", before: "₹" } };
  },
  adbartf: (q) => {
    const m = grab(/Is this statement true or false\? (".+")$/, q.prompt);
    return { say: `True or false? ${m[1]}` };
  },
  aertang: () => ({ say: "Is the shaded angle smaller than a right angle, a right angle, or bigger?" }),
  agptest: (q) => {
    const m = grab(/whether (\d+) is prime/, q.prompt);
    return { say: `To check if ${m[1]} is prime, you divide by 2, 3, 5, 7, … What is the last prime you need to try?` };
  },
  aimulti: (q) => {
    const t = q.prompt.match(/temperature in (\w+) was (−?\d+) °C\. By noon it had (risen|fallen) by (\d+) °C\. By night it (fell|rose) by (\d+) °C, and by the next morning it had (risen|fallen) again by (\d+) °C\./);
    if (t) {
      const v = (w: string) => (/^(risen|rose)$/.test(w) ? "up" : "down");
      return { say: `${t[1]} was ${t[2]} °C at 6 a.m. Then it went ${v(t[3])} ${t[4]}, ${v(t[5])} ${t[6]}, and ${v(t[7])} ${t[8]}. What is it next morning?`, ask: { kind: "box", after: "°C" } };
    }
    const m = grab(/starts at floor (−?\d+) .*?\. It goes (.+?)\. At which floor does it stop\?/, q.prompt);
    return { say: `A lift starts at floor ${m[1]}. It goes ${m[2]}. Which floor does it stop at?`, note: "0 is the ground floor; −1, −2, −3 are basements." };
  },
  aehund: (q) => {
    const m = grab(/Start at (\d+)\. (Move .+?)\. Which number do you land on\?/, q.prompt);
    return { say: `On a 1–100 grid, start at ${m[1]}. ${m[2]}. Where do you land?` };
  },
  acsticks: (q) => {
    const m = grab(/One (\w+) is made with (\d+) matchsticks.*row of (\d+) \w+\?/, q.prompt);
    return { say: `Joined ${m[1]}s share a side. How many matchsticks make a row of ${m[3]}?` };
  },
  abdisp: (q) => {
    const b = q.prompt.match(/up to the (\d+) ml mark\. A metal block of volume (\d+) cm³ is dropped in/);
    if (b) return { say: `Water is at the ${b[1]} ml mark. A ${b[2]} cm³ block sinks in it. Which mark does the water rise to?`, ask: { kind: "box", after: "ml" }, note: "1 ml = 1 cm³" };
    const m = grab(/up to the (\d+) ml mark\. .*rises to the (\d+) ml mark/, q.prompt);
    return { say: `A stone goes into the jar. The water rises from ${m[1]} ml to ${m[2]} ml. What is the stone's volume?`, ask: { kind: "box", after: "cm³" }, note: "1 ml = 1 cm³" };
  },
  agnl: (q) => {
    const m = grab(/makes (\d+) equal jumps of (\d+\/\d+)/, q.prompt);
    return { say: `${m[1]} jumps of ${m[2]} from 0. Where do you land?` };
  },
  aemirror: () => ({ say: "Which word looks the same in a mirror held beside it?" }),
  avvcmp: (q) => {
    const m = grab(/Box A .*?: (\d+) long, (\d+) wide and (\d+) high\. Box B .*?: (\d+) long, (\d+) wide and (\d+) high/, q.prompt);
    return { say: `Box A is ${m[1]} × ${m[2]} × ${m[3]} cubes. Box B is ${m[4]} × ${m[5]} × ${m[6]} cubes. Which is true?` };
  },
  aaweave: (q) => {
    const m = grab(/goes over (\d+) and under (\d+), again and again: [^…]*… (.+\?)/, q.prompt);
    const ask = m[3].replace(/^In the first (\d+) crossings, how many times does the strip go over\?$/, 'In $1 crossings, how many are "over"?').replace(" (counting from the first)", "").replace("does the strip go", "does it go");
    return { say: `Over ${m[1]}, under ${m[2]}, again and again. ${ask}` };
  },
  adrec: (q) => {
    const m = grab(/columns (\w+) and (\w+)\. (How many [^?]+\?)/, q.prompt);
    return { say: m[3], note: `Sort the list into Boys and Girls, ${m[1]} and ${m[2]}.` };
  },
  adtally: (q) => {
    const m = grab(/\(\|\|\|\|\/ stands for 5 marks\)\. (How many [^?]+\?)/, q.prompt);
    return { say: m[1], note: "||||/ stands for 5." };
  },
  aesym: (q) => {
    const m = grab(/letters: ([A-Z ]+?)\. How many/, q.prompt);
    return { say: `How many of these letters have a line of symmetry going up and down? ${m[1].split(/\s+/).join("  ")}` };
  },
  aedsym: () => ({ say: "How many lines of symmetry does the design have?", note: "Count fold lines: up and down, across, and the two diagonals." }),
  afpaint: (q) => {
    const m = grab(/A (\d+) × \d+ × \d+ block/, q.prompt);
    return { say: `A ${m[1]} × ${m[1]} × ${m[1]} block is painted all over the outside. How many small cubes have no paint?` };
  },
  accal: () => ({ say: "What is the sum of all nine dates?", note: "Look for the pattern instead of adding one by one." }),
  aeirr: () => ({ say: "How many more squares does the bigger shape cover?" }),
  avpp: (q) => {
    const m = q.prompt.match(/In (\d+) × (\d+), \d+ is split into (\d+) \+ (\d+)\. What is the partial product (\d+ × \d+)\?/);
    if (m) return { say: `${m[1]} × ${m[2]}: split ${m[2]} into ${m[3]} + ${m[4]}. What is ${m[5]}?` };
    const n = grab(/Multiply (\d+ × \d+) with partial products: split (\d+) into (\d+ \+ \d+)/, q.prompt);
    return { say: `Split ${n[2]} into ${n[3]}. What is ${n[1]}?` };
  },
  avrem: (q) => {
    const m = grab(/leaves remainder (\d+) when divided by (\d+), and another number leaves remainder (\d+)/, q.prompt);
    return { say: `Two numbers leave remainders ${m[1]} and ${m[3]} when divided by ${m[2]}. What remainder does their sum leave?` };
  },
  aepat: (q) => {
    const m = grab(/begins ([\d, ]+), … What is the (\w+) number/, q.prompt);
    return { say: `${m[1]}, … What is the ${m[2]} number?` };
  },
  aeturn: (q) => {
    const m = grab(/points at (\d+)\. It turns (clockwise|anticlockwise) until it points at (\d+)\./, q.prompt);
    return { say: `A clock hand turns ${m[2]} from ${m[1]} to ${m[3]}. How many degrees is that?`, ask: { kind: "box", after: "°" }, note: "A full turn is 360°." };
  },
  adfnl: (q) => {
    const m = grab(/Which fraction is at the dot (.+?)\?/, q.prompt);
    return { say: `Which dot is ${m[1]}?` };
  },
  actrain: () => ({ say: "How long does the journey take?" }),
  aearea: () => ({ say: "Each small square is 1 square unit. What is the area?", ask: { kind: "box", after: "square units" } }),
  adperim: () => ({ say: "What is the perimeter of the triangle?", ask: { kind: "box", after: "cm" }, note: "Not drawn to scale." }),
  adwtcap: (q) => {
    const m = grab(/about (\d+) kg\. On the weighing scale it showed (\d+) kg/, q.prompt);
    return { say: `The guess was ${m[1]} kg. The scale shows ${m[2]} kg. How far off was the guess?`, ask: { kind: "box", after: "kg" } };
  },
  avstrat: (q) => {
    const m = grab(/Work out (\d+ × \d+) using the nearest multiple of ten: (.+?)\. What is/, q.prompt);
    return { say: `${m[2]}. So what is ${m[1]}?` };
  },
  acnlcmp: (q) => {
    const m = grab(/Which number will be farthest to the (left|right)\?/, q.prompt);
    return { say: `Which of these is farthest to the ${m[1]} on a number line?` };
  },
  agjump: (q) => {
    const m = grab(/jumps (\d+) at a time\. A rabbit starts at 0 and jumps (\d+) at a time\. The picture shows their jumps up to (\d+)\./, q.prompt);
    return { say: `From 0, a frog jumps ${m[1]} at a time and a rabbit ${m[2]} at a time. Up to ${m[3]}, where do both land?`, note: "Type every number, with commas between." };
  },
  abcupord: (q) => {
    const m = grab(/from the one that holds the (most|least) to/, q.prompt);
    const items = (q.answer ?? "").replace(/^\(|\)$/g, "").split(/,\s*/).sort();
    return { say: `Put the containers in order: the one that holds the ${m[1]} first.`, ask: { kind: "order", items, first: m[1], prefix: "Container" } };
  },
  agpfrac: (q) => {
    const m = grab(/Write (\d+)% as a fraction/, q.prompt);
    return { say: `Write ${m[1]}% as a fraction, as simple as it goes.` };
  },
  avpest: (q) => {
    const m = grab(/Estimate ([\d,]+ × [\d,]+) by rounding each number to its greatest place/, q.prompt);
    return { say: `Round each number to its biggest place, then multiply. About how much is ${m[1]}?`, note: "e.g. 4,870 → 5,000 and 36 → 40" };
  },
  avlat: (q) => {
    const m = grab(/lattice for (\d+ × \d+):/, q.prompt);
    const ask = q.prompt.replace(/\s*Choose one\.$/, "").trim().split(/(?<=[.)])\s+(?=[A-Z])/).pop()!;
    return { say: /^What is \d+ × \d+\?$/.test(ask) ? `Use the lattice to work out ${m[1]}.` : `Lattice for ${m[1]}. ${ask}`, note: "Each box holds two digits multiplied, tens over ones. Add along the diagonals from the bottom right." };
  },
  avarea: (q) => {
    const m = grab(/shows (\d+\/\d+ × \d+\/\d+)\. (.+\?)/, q.prompt);
    return { say: `The part shaded in both colours shows ${m[1]}. ${m[2].replace("shaded in both colours", "shaded twice")}` };
  },
  afview: () => ({ say: "Looking down from straight above, how many squares do you see?", note: "Each number is how many cubes stand on that square." }),
  ajintl: (q) => {
    const m = q.prompt.match(/write ("[^"]+") as an integer/i) ?? grab(/Write the opposite of ("[^"]+") as an integer/, q.prompt);
    return { say: q.prompt.includes("opposite of") ? `What is the opposite of ${m[1]}, as a number?` : `Write ${m[1]} as a number.`, note: "Up, gain or deposit: +   Down, loss or withdrawal: −" };
  },
  aedecc: (q) => pickOne(q, /Which number is greater: ([\d.]+) or ([\d.]+)\?/, "bigger"),
  adfcmp: (q) => pickOne(q, /Which fraction is smaller: (\d+\/\d+)(?: \([^)]*\))? or (\d+\/\d+)\?/, "smaller"),
  adfcmpu: (q) => pickOne(q, /Which fraction is smaller: (\d+\/\d+) or (\d+\/\d+)\?/, "smaller"),
  aeind: (q) => {
    const m = grab(/Write in figures: (.+?)\./, q.prompt);
    return { say: `Write in figures: ${m[1]}.` };
  },
  aadigmax: (q) => {
    const m = grab(/digits ([\d, ]+) exactly once to make the (greatest|smallest) (\d)-digit number/, q.prompt);
    return { say: `Use ${m[1]}, each once. Make the ${m[2] === "greatest" ? "biggest" : "smallest"} number.` };
  },
  aghlw: (q) => {
    const m = q.prompt.match(/has (\d+) (\w+) and (\d+) (\w+) for a party\..*greatest number of plates/);
    if (m) return { say: `${m[1]} ${m[2]} and ${m[3]} ${m[4]} are shared onto plates, all plates the same, nothing left over. What is the most plates?` };
    const n = grab(/are (\d+) cm and (\d+) cm long\./, q.prompt);
    return { say: `Cut ${n[1]} cm and ${n[2]} cm of cloth into equal pieces, as long as possible, nothing left over. How long is each piece?`, ask: { kind: "box", after: "cm" } };
  },
};
function order(q: Q, re: RegExp): Partial<KidQ> & { say: string } {
  const m = grab(re, q.prompt);
  return { say: "Put them in order, smallest first.", ask: { kind: "order", items: m[1].split(/,\s*/), first: "smallest" } };
}
function pickOne(q: Q, re: RegExp, word: string): Partial<KidQ> & { say: string } {
  const m = grab(re, q.prompt);
  return { say: `Which is ${word}?`, ask: { kind: "tap", items: [m[1], m[2]].map((x) => ({ label: x, value: x })) } };
}

// ------------------------------------------------------------------ rules for every question

/** Turn the existing prompt into one short ask plus an answer shape. */
function general(q: Q): KidQ {
  let t = q.prompt.replace(/\s*Choose one\.$/, "");
  const all = t;
  // 1. keep up to the last question mark; what follows only says how to type
  const ss = sentences(t);
  const last = ss.map((s) => /\?\)?$/.test(s.trim())).lastIndexOf(true);
  const typing = /^\(?(Write|Give|Type|Enter|List the primes|Use the letter|Answer as|Choose|Look at the picture|If they have the same)\b/;
  // with buttons to tap, a list after the question only repeats the buttons
  const drop = (s: string) => typing.test(s) || (!!q.options && !/^"/.test(s.trim()));
  let dropped = "";
  if (last >= 0 && last < ss.length - 1) {
    dropped = ss.slice(last + 1).filter(drop).join(" ");
    t = ss.filter((s, i) => i <= last || !drop(s)).join(" ");
  }
  // typing notes inside the question itself
  t = t
    .replace(/\s*\((?:A fraction is fine|A fraction or mixed number is fine|Write the answer as [^)]*|Write the number without commas[^)]*|Give the number of per cent[^)]*|If it is more than 1[^)]*|Do not count [^)]*)\.?\)/g, "")
    .replace(/\s*\((?:for example|e\.g\.)[^)]*\)/g, "")
    .replace(/,? for example,? [^.?]*(?=[.?])/g, "")
    .replace(/\s+Write it without commas\./, "")
    .replace(/\s+Write the greater number\.|\s+Write that fraction\./, "");
  t = t.replace(/\s*Write the (?:answer|time) as \([^)]*\)[^.]*\.(?:\s*\(\d+, \d+\)[^.]*\.)?/, "").replace(/\s*Write (?:them|their numbers) with commas\.|\s*Type the digits without commas\.|\s*Write them in that order, with commas between them\.|\s*Write them separated by commas\.|\s*Write them in brackets, separated by commas\.?/g, "");
  let ask: Ask = { kind: "box" };
  // 2. two boxes: (m, cm), (hours, minutes) …
  const pair = all.match(/\((hours|minutes|m|cm|kg|L)\s*,\s*(minutes|seconds|cm|mm|g|mL)\)/);
  if (pair && q.type === "tuple") {
    ask = { kind: "fields", labels: [UNIT_LABEL[pair[1]], UNIT_LABEL[pair[2]]] };
    t = t.replace(/\s*Write the (?:answer|time) as \([^)]*\)[^.]*\.?/, "").replace(/\s*Write the answer as \(.*$/, "");
  }
  // 3. money: ₹ before the box
  const money = /\bin rupees\b|like 4\.50|\(for example, write 12\.50/.test(all);
  if (money && ask.kind === "box") {
    ask = { kind: "box", before: "₹" };
    t = t.replace(/, in rupees,/, "").replace(/,? in rupees(?=\?)/, "").replace(/\s+Write (?:it|the answer in rupees),? like 4\.50\./, "").replace(/\s+Give the answer in rupees[^.]*\./, "");
  }
  // 4. a unit after the box: "…, in cm?" / "… in degrees?"
  if (ask.kind === "box" && !ask.before) {
    const u = all.match(new RegExp(`,? in (${UNIT_RE})(?=[?.,)\\s])(?![^?]*\\bin (?:${UNIT_RE})\\b)`));
    const tail = all.match(new RegExp(`Give the answer in (${UNIT_RE})\\.`));
    const unit = tail?.[1] ?? (u && /\?/.test(all.slice(all.indexOf(u[0]), all.indexOf(u[0]) + u[0].length + 2)) ? u[1] : null);
    if (unit && (q.type === "integer" || q.type === "fraction")) {
      ask = { kind: "box", after: UNIT_AFTER[unit] };
      t = t.replace(new RegExp(`,? in ${unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\?)`), "").replace(/\s+Give the answer in [^.]*\./, "");
    }
  }
  // 5. words a ten-year-old trips on
  t = t.replace(/ascending order \(smallest first\)/g, "order, smallest first").replace(/\bascending order\b/g, "order, smallest first").replace(/\bdescending order\b/g, "order, biggest first");
  // the marking wants the simplest form: say so once, under the question
  const note = q.type === "mixed" && /simplest|lowest/.test(dropped + all) && !/simplest|lowest/.test(t) ? "Simplest form; a mixed number if it is more than 1." : undefined;
  t = t.replace(/\b1 floors\b/g, "1 floor");
  return { say: t.replace(/\s{2,}/g, " ").trim(), ask, ...(note ? { note } : {}) };
}

/** How the options read to a child: (8, 30) as 8 h 30 min when the question names the units; brackets dropped. */
function kidOptions(q: Q, ask: Ask): string[] | undefined {
  if (!q.options) return undefined;
  const pair = q.prompt.match(/\((hours|minutes|m|cm|kg|L)\s*,\s*(minutes|seconds|cm|mm|g|mL)\)/);
  return q.options.map((o) => {
    const t = o.match(/^\((−?[\d.]+), (−?[\d.]+)\)$/);
    if (t && pair) return `${t[1]} ${UNIT_LABEL[pair[1]]} ${t[2]} ${UNIT_LABEL[pair[2]]}`;
    if (/^\(.*\)$/.test(o) && !/[a-z]/i.test(o)) return o.slice(1, -1);
    void ask;
    return o;
  });
}

export function kidQuestion(q: Q): KidQ {
  if (form(q.id) === "w") return { say: q.prompt, ask: { kind: "box" }, options: q.options };
  const base = general(q);
  const own = OWN[fam(q.id)];
  let o: ReturnType<Own> | null = null;
  try { o = own ? own(q) : null; } catch (e) { if (e !== NOT_THIS) throw e; }
  let ask = o?.ask ?? base.ask;
  // multiple choice keeps its buttons; a tap or order ask is for the typed form only
  if (form(q.id) === "mc" || q.type === "choice") ask = { kind: "box" };
  return { say: o?.say ?? base.say, ask, options: kidOptions(q, ask), ...(o?.figure ? { figure: o.figure } : q.figure ? { figure: q.figure as Visual } : {}), ...(o?.note ?? base.note ? { note: o?.note ?? base.note } : {}) };
}

/** What the child tapped or typed, as the answer string the marking already reads. */
export function compose(ask: Ask, parts: string[], answer?: string, type?: string): string {
  // a whole number may be typed with commas, as a child writes it (5,07,699)
  if (ask.kind === "box") { const v = (parts[0] ?? "").replace(/^\s*₹\s*/, "").trim(); return type === "integer" ? v.replace(/(\d),(?=\d)/g, "$1") : v; }
  if (ask.kind === "tap") return parts[0] ?? "";
  const xs = (ask.kind === "order" ? parts.map((p) => p.replace(/,(?=\d{2,3}\b)/g, "")) : parts.map((p) => p.trim()));
  const list = xs.join(", ");
  return answer && !answer.trim().startsWith("(") ? list : `(${list})`;
}
