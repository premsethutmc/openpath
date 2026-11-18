/**
 * What kind of spelling mistake was that? From the right spelling and what the learner typed, by fixed rules:
 * no model, the same answer every time. Each pattern carries the rule in a child's words and a few other words
 * that follow it, so a miss becomes a short lesson on the rule and not only on the one word.
 *
 * Only clear cases are named. Anything else returns null and the learner simply sees the letters to look at.
 * Candidate teaching text, written by OpenPath; not reviewed by an educator.
 */

export type PatternId = "double_missing" | "double_extra" | "ie_ei" | "silent_e_kept" | "y_to_i" | "full_suffix" | "silent_letter" | "shun_ending" | "able_ible" | "swapped";

export interface Pattern {
  id: PatternId;
  /** For the parent: "keeps missing …". */
  name: string;
  /** For the child, in two sentences at most. */
  rule: string;
  /** Shown with the rule. */
  examples: string[];
  /** Asked (spoken, then typed) as "two more like it"; never shown before they are answered. */
  drill: string[];
}

export const PATTERNS: Record<PatternId, Pattern> = {
  double_missing: { id: "double_missing", name: "double letters left single", rule: "This word needs a double letter. After a short vowel sound, the next letter is often doubled before an ending.", examples: ["hop → hopping", "big → bigger", "run → running"], drill: ["sitting", "dinner", "stopped", "rabbit"] },
  double_extra: { id: "double_extra", name: "doubling where it is not needed", rule: "No double letter here. After a long vowel sound, or two vowel letters together, the next letter stays single.", examples: ["hope → hoping", "read → reading", "late → later"], drill: ["writing", "cleaning", "waiting", "shining"] },
  ie_ei: { id: "ie_ei", name: "ie and ei", rule: "For the 'ee' sound: i before e, except straight after c.", examples: ["believe", "field", "receive"], drill: ["piece", "chief", "ceiling", "thief"] },
  silent_e_kept: { id: "silent_e_kept", name: "keeping the e before an ending", rule: "Drop the final e before an ending that starts with a vowel, such as -ing or -able.", examples: ["make → making", "hope → hoping", "use → usable"], drill: ["taking", "riding", "smiling", "dancing"] },
  y_to_i: { id: "y_to_i", name: "y that should change to i", rule: "When a word ends in a consonant and y, change the y to i before most endings.", examples: ["happy → happiness", "try → tried", "baby → babies"], drill: ["carried", "easier", "stories", "luckily"] },
  full_suffix: { id: "full_suffix", name: "-ful written with two l's", rule: "The ending -ful has only one l, although the word full has two.", examples: ["careful", "helpful", "beautiful"], drill: ["useful", "thankful", "hopeful", "playful"] },
  silent_letter: { id: "silent_letter", name: "silent letters", rule: "This word has a silent letter: you write it but you do not say it.", examples: ["knee", "write", "lamb"], drill: ["knife", "wrong", "thumb", "listen"] },
  shun_ending: { id: "shun_ending", name: "the 'shun' ending", rule: "The 'shun' sound at the end of a word is most often written -tion. After l, n, r or s it is often -sion.", examples: ["station", "action", "pension"], drill: ["nation", "question", "mention", "position"] },
  able_ible: { id: "able_ible", name: "-able and -ible", rule: "-able is the common one, and usually follows a whole word. -ible often follows a part that is not a word on its own.", examples: ["enjoy → enjoyable", "possible", "terrible"], drill: ["comfortable", "visible", "reasonable", "horrible"] },
  swapped: { id: "swapped", name: "two letters changed places", rule: "You have the right letters, but two of them have changed places. Say the word slowly and listen to the order.", examples: [], drill: [] },
};

const VOWEL = /[aeiou]/;
const without = (s: string, i: number) => s.slice(0, i) + s.slice(i + 1);
/** Every string made by deleting one letter of `s`, with the index deleted. */
const deletions = (s: string) => [...s].map((_, i) => [without(s, i), i] as const);
const SILENT: [RegExp, number][] = [
  [/^kn/, 0], [/^wr/, 0], [/^gn/, 0], [/mb$/, -1], [/bt$/, -2], [/stle$/, -3], [/sten$/, -3], [/^wh/, 1], [/gh/, -99], [/^rh/, 1], [/^ps/, 0], [/alk$/, -2], [/ould$/, -2], [/mn$/, -1],
];

/** The pattern of the mistake, or null when it is not one of the clear cases. Case and outer spaces are ignored. */
export function diagnose(correct: string, typedRaw: string): PatternId | null {
  const c = correct.toLowerCase();
  const t = typedRaw.trim().toLowerCase();
  if (!t || t === c) return null;
  // ie / ei
  for (let i = 0; i + 1 < c.length; i++) {
    const pair = c.slice(i, i + 2);
    if ((pair === "ie" || pair === "ei") && t === c.slice(0, i) + pair[1] + pair[0] + c.slice(i + 2)) return "ie_ei";
  }
  // one letter missing from the right spelling
  if (t.length === c.length - 1) {
    for (const [d, i] of deletions(c)) {
      if (d !== t) continue;
      const ch = c[i];
      if (!VOWEL.test(ch) && (c[i - 1] === ch || c[i + 1] === ch)) return "double_missing";
      for (const [re, at] of SILENT) {
        const m = re.exec(c);
        if (!m) continue;
        if (at === -99 ? ch === "h" && c[i - 1] === "g" : i === (at >= 0 ? m.index + at : c.length + at)) return "silent_letter";
      }
    }
  }
  // one letter too many
  if (t.length === c.length + 1) {
    for (const [d, i] of deletions(t)) {
      if (d !== c) continue;
      const ch = t[i];
      if (ch === "l" && t.includes("full") && c.includes("ful") && !c.includes("full")) return "full_suffix";
      if (!VOWEL.test(ch) && (t[i - 1] === ch || t[i + 1] === ch)) return "double_extra";
      if (ch === "e" && /^(ing|able|ed|ous|est|er|y)/.test(t.slice(i + 1)) && !VOWEL.test(t[i - 1] ?? "a")) return "silent_e_kept";
    }
  }
  // y kept where i is needed: happyness, tryed, babys, carryed
  if (c.includes("i")) {
    for (let i = 1; i < c.length; i++) {
      if (c[i] !== "i") continue;
      const head = c.slice(0, i);
      const tail = c.slice(i + 1);
      if (t === `${head}y${tail}` || (tail.startsWith("e") && t === `${head}y${tail.slice(1)}`)) return "y_to_i";
    }
  }
  // endings that sound alike
  const ending = (xs: string[]) => {
    const a = xs.find((x) => c.endsWith(x));
    const b = xs.find((x) => t.endsWith(x));
    return !!a && !!b && a !== b && c.slice(0, -a.length) === t.slice(0, -b.length);
  };
  if (ending(["tion", "sion", "shun", "cian", "shion"]) || (/(tion|sion)$/.test(c) && /(shun|shon|shen)$/.test(t))) return "shun_ending";
  if (ending(["able", "ible"])) return "able_ible";
  // two neighbouring letters changed places
  if (t.length === c.length) {
    for (let i = 0; i + 1 < c.length; i++) if (c[i] !== c[i + 1] && t === c.slice(0, i) + c[i + 1] + c[i] + c.slice(i + 2)) return "swapped";
  }
  return null;
}

/** Two words to try for a pattern, never the word just missed. */
export function drillWords(id: PatternId, missed: string, n = 2): string[] {
  return PATTERNS[id].drill.filter((w) => w !== missed.toLowerCase()).slice(0, n);
}

/** For the parent: the patterns a child has missed, most often first. */
export function patternCounts(patterns: readonly (string | undefined)[]): { id: PatternId; name: string; times: number }[] {
  const n = new Map<PatternId, number>();
  for (const p of patterns) if (p && p in PATTERNS) n.set(p as PatternId, (n.get(p as PatternId) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id, times]) => ({ id, name: PATTERNS[id].name, times }));
}
