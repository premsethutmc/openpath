/**
 * The spelling list behind the writing check: about 90,000 words from SCOWL (content/english/spelling/speller-words.txt,
 * built by tools/english/spelling/build_speller.py). Any word not on it is shown as "check the spelling", with a
 * likely correction where one letter added, dropped, changed or two letters swapped makes a listed word.
 *
 * It is only ever a tip, never a fix: a word missing from the list may be right (a rare word, a word from another
 * language), so it never holds back AI feedback. A word with a capital letter in the middle of a sentence is taken as
 * a name and not checked; a capital at the start of a sentence is checked in lower case, and left alone if unknown.
 *
 * The list (about 880 kB, 260 kB compressed) is fetched once, when a learner first checks a piece. If it cannot be had,
 * the rest of the check still runs.
 */

export interface Dictionary {
  has(word: string): boolean;
  /** The likeliest listed word one edit away, preferring commoner words; null if none. */
  suggest(word: string): string | null;
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function parseDictionary(text: string): Dictionary {
  const rank = new Map<string, number>();
  const quiet = new Set<string>();
  let band = 0;
  let suggestable = true;
  for (const line of text.split("\n")) {
    if (!line) continue;
    if (line.startsWith("#")) {
      suggestable = line !== "#no-suggest";
      if (suggestable) band = Number(line.slice(1)) || band;
      continue;
    }
    if (suggestable) rank.set(line, band);
    else quiet.add(line);
  }
  const has = (w: string) => rank.has(w);
  return {
    has,
    suggest(word) {
      const w = word.toLowerCase();
      let best: string | null = null;
      let bestScore = Infinity;
      // commoner words first; within a band, the edits learners make most: a letter left out, two letters swapped,
      // a wrong letter, an extra letter
      const consider = (c: string, kind: number) => {
        const r = rank.get(c);
        if (r === undefined || quiet.has(c) || c === w) return;
        const score = r * 10 + kind;
        if (score < bestScore || (score === bestScore && best !== null && c < best)) (best = c), (bestScore = score);
      };
      for (let i = 0; i <= w.length; i++) {
        const a = w.slice(0, i);
        const b = w.slice(i);
        if (b) consider(a + b.slice(1), 3);
        if (b.length > 1) consider(a + b[1] + b[0] + b.slice(2), 1);
        for (const ch of LETTERS) {
          if (b) consider(a + ch + b.slice(1), 2);
          consider(a + ch + b, 0);
        }
      }
      return best;
    },
  };
}

/** Lower-case words of a piece that are not on the list, in the order met, each once. */
export function unknownWords(text: string, dict: Dictionary, skip: ReadonlySet<string> = new Set()): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const startsSentence = (i: number) => /(^|[.?!]["”’']?\s+|\n\s*)["“‘']?$/.test(text.slice(Math.max(0, i - 6), i)) || i === 0;
  // web addresses and e-mail addresses are not words
  text = text.replace(/\b(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/g, (u) => " ".repeat(u.length));
  for (const m of text.matchAll(/[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*/g)) {
    const raw = m[0];
    const capital = /^[A-Z]/.test(raw);
    if (capital && (!startsSentence(m.index!) || raw.length > 1 && /[A-Z]/.test(raw.slice(1)))) continue;
    for (let part of raw.toLowerCase().replace(/’/g, "'").split("-")) {
      part = part.replace(/'s$|s'$|'$/, (s) => (s === "s'" ? "s" : ""));
      if (!part || part.length < 3 || seen.has(part) || skip.has(part) || dict.has(part)) continue;
      // an unknown capitalised word at the start of a sentence may be a name: leave it
      if (capital) continue;
      seen.add(part);
      out.push(part);
    }
  }
  return out;
}

let loading: Promise<Dictionary | null> | null = null;
/** The list, fetched once; null if it cannot be had (the rest of the check still runs). */
export function loadDictionary(url = "assets/speller-words.txt"): Promise<Dictionary | null> {
  loading ??= fetch(url)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then(parseDictionary)
    .catch(() => ((loading = null), null));
  return loading;
}
