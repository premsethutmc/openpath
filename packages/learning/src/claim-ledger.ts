/**
 * E7 claim ledger.
 *
 * Invariant: every recognized mathematical claim in the submitted text, including claims embedded in sentences, receives a ledger
 * entry with source provenance (line, character span) BEFORE any route-specific parser runs. The extractor is deliberately independent
 * of every parser and kernel: it only tokenises the raw text, so a claim that a parser silently drops is still present here and can be
 * checked against the verdict (see `accountForLedger`). Classification as prose, parse success or numerical agreement are never evidence;
 * a claim is `proven` only when a record produced by a kernel covers its span with a verified-valid status.
 *
 * The extractor over-approximates on purpose (a spurious claim blocks acceptance, a missed one could not be checked), and it never
 * interprets mathematics: it only decides WHERE a claim is and what kind of statement it is.
 */
export const CLAIM_LEDGER_CONTRACT = "openpath-claim-ledger@1" as const;

export type ClaimKind = "relation" | "assertion" | "assumption";
export type ClaimOutcome = "proven" | "disproven" | "unresolved" | "unsupported";
export interface LedgerClaim {
  id: string; line: number; start: number; end: number; text: string; kind: ClaimKind;
  /** words that precede the mathematical run inside the same sentence ("the product of the roots is") */
  lead: string;
  /** the relation has no mathematical left-hand side, only words ("sum of roots = 5/2") */
  labelled: boolean;
  /** named modelling assumptions this sentence states (independent, equiprobable, real-coefficients ...), with `negated` when it denies them */
  names?: { name: string; negated: boolean }[];
  outcome: ClaimOutcome; reason: string;
}
export interface LedgerLine { line: number; start: number; end: number; text: string; claims: LedgerClaim[]; residue: { start: number; end: number; text: string }[]; statedAssumptions: string[] }
export interface ClaimLedger { contract: typeof CLAIM_LEDGER_CONTRACT; lines: LedgerLine[]; claims: LedgerClaim[] }

const REL = /(?:<=|>=|!=|==|[=≠<>≤≥≈≡])/;
const REL_G = /(?:<=|>=|!=|==|[=≠<>≤≥≈≡])/g;
/** words that belong to mathematical notation rather than to prose */
const MATH_WORDS = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "sinh", "cosh", "tanh", "ln", "log", "exp", "sqrt", "abs", "pi", "lim", "int", "dx", "dy", "du", "dv", "dt", "conj", "arctan", "arcsin", "arccos", "atan", "inf", "infty", "infinity", "mod", "arg", "det", "max", "min", "gcd", "lcm", "re", "im", "var", "cov", "sd", "mu", "sigma", "binom", "choose", "nCr", "nPr", "Var", "SD", "Pr", "Cov", "E", "Re", "Im", "Arg", "cis", "i", "e"]);
const COPULA = /^(?:is|are|equals?|equal|gives?|giving|becomes?|yields?|converges?|approaches|tends|diverges|was|were)$/i;
const QUALITATIVE = /\b(?:continuous|discontinuous|differentiable|converges?|diverges?|does\s+not\s+exist|dne)\b/i;
/** a copula or auxiliary followed (anywhere in the sentence) by a mathematical predicate: "the function is even", "the polynomial has no real roots", "x is positive" */
const PREDICATE = /\b(?:is|are|isn't|aren't|has|have|hasn't|does\s+not|do\s+not|doesn't)\b[^.;!?]*\b(?:even|odd|prime|composite|bounded|unbounded|monotonic|increasing|decreasing|positive|negative|nonzero|non-zero|zero|rational|irrational|real|complex|imaginary|integer|convergent|divergent|symmetric|periodic|injective|surjective|one-to-one|linear|quadratic|roots?|solutions?|zeros|maximum|minimum|extremum|asymptotes?)\b/i;
const ASSUME_LEAD = /^(?:assume|assuming|suppose|supposing|provided|given|where|when|for|if|restrict(?:ing)?|take)$/i;

const NEG = /\b(?:not|isn't|aren't|never|no longer|cannot|can't|without|neither)\b|non-/i;
const ASSUMPTION_PATTERNS: [string, RegExp][] = [
  ["independent", /\bindependen(?:t|ce|tly)\b/i], ["mutually-exclusive", /\bmutually\s+exclusive\b|\bdisjoint\b/i],
  ["equiprobable", /\bequally\s+likely\b|\bequiprobable\b|\buniform(?:ly)?\b|\bfair\b/i], ["ordered", /\border\s+matters\b|\bordered\b/i], ["unordered", /\border\s+(?:does\s+not|doesn't|is\s+not|isn't)\s+matter\b|\bunordered\b/i],
  ["real-coefficients", /\b(?:real|rational|integer)\s+coefficients?\b|\bcoefficients?\s+(?:of\s+\w+\s+)?(?:are|is)\s+(?:all\s+)?real\b/i],
  ["with-replacement", /\bwith\s+replacement\b|\breplaced\b/i], ["without-replacement", /\bwithout\s+replacement\b|\bnot\s+replaced\b/i],
];
/** modelling assumptions a sentence states or denies (the same vocabulary the kernels read, found here without any parser) */
export function assumptionNames(sentence: string): { name: string; negated: boolean }[] {
  const out: { name: string; negated: boolean }[] = [];
  for (const [name, re] of ASSUMPTION_PATTERNS) { const m = re.exec(sentence); if (m) out.push({ name, negated: NEG.test(sentence.slice(Math.max(0, m.index - 24), m.index)) }); }
  return out;
}

interface Tok { text: string; start: number; end: number; brk: boolean; sent: boolean }

/** whitespace tokens at bracket depth zero; trailing sentence punctuation is split off into a break flag */
function tokenize(s: string, base: number): Tok[] {
  const out: Tok[] = []; let depth = 0, from = -1;
  const flush = (to: number) => {
    if (from < 0) return; let end = to, brk = false;
    // a trailing "!" ends a sentence only after a word ("done!"); after a digit or bracket it is a factorial ("7!", "(5 - 1)!")
    while (end > from && /[.,;:!?]/.test(s[end - 1]) && !(s[end - 1] === "." && /\d/.test(s[end - 2] ?? "") && /\d/.test(s[to] ?? "")) && !(s[end - 1] === "!" && !/[A-Za-z]{2}/.test(s.slice(end - 3, end - 1)))) { brk = true; end--; }
    const sent = /[.;!?]/.test(s.slice(end, to));
    if (end > from) out.push({ text: s.slice(from, end), start: base + from, end: base + end, brk, sent });
    else if (brk && out.length) { out[out.length - 1].brk = true; out[out.length - 1].sent = out[out.length - 1].sent || sent; }
    from = -1;
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[([{]/.test(ch)) depth++; else if (/[)\]}]/.test(ch)) depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) flush(i); else if (from < 0) from = i;
  }
  flush(s.length);
  return out;
}
const stripEvents = (s: string) => s.replace(/\b(?:P|Pr|n|E|Var|SD|sd|Cov)\s*[(\[][^)\]]*[)\]]/g, " 0 ");
/** a token that carries no sentence word: only symbols, numbers, single letters and recognised function names */
function mathy(t: string): boolean {
  // LaTeX control sequences (\\frac, \\cdot, \\left ...) are notation, not sentence words
  // E7 repair E: geometric object names after an angle/triangle sign (∠BOD, m∠ABC, △ABC) are notation, not sentence words
  const residue = (stripEvents(t.replace(/\\[A-Za-z]+/g, " ").replace(/m?[∠△▵⊿]\s*[A-Za-z]{1,4}/g, " ")).match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !MATH_WORDS.has(w) && !MATH_WORDS.has(w.toLowerCase()) && !/^d[a-zA-Z]$/.test(w));
  // single letters glued to digits/operators are fine; a run of letters such as "roots" is a word
  return residue.length === 0;
}
const ARROWS = /<=>|=>|->|-->|<-|→|⇒|⟹|⟶/g;
const hasRel = (t: string) => REL.test(t.replace(ARROWS, " "));
const carriesMath = (t: string) => /[0-9^+*/√∫∑π∞±·×÷|!]/.test(t) || /[A-Za-z]\(/.test(t) || (/-/.test(t) && /[0-9A-Za-z]/.test(t));

/** Extract every claim of one (already trimmed) line. `base` is the column of s[0] in the original line. */
export function extractLine(line: number, s0: string, base: number, original: string): LedgerLine {
  const s = s0.replace(/\\[,;:! ]/g, "  "); // LaTeX spacing commands are not punctuation (same length: offsets are preserved)
  // an explicit equivalence connective (⇔, <=>, ⟺, iff) separates two claims, as the natural-working parser splits them into two lines
  const toks = tokenize(s, base).flatMap((t, k, all) => { if (!/^(?:⇔|<=>|⟺|iff)$/.test(t.text)) return [t]; if (k > 0) all[k - 1].brk = true; return []; });
  const claims: LedgerClaim[] = [];
  const kinds = toks.map((t, i) => {
    const prevOp = i > 0 && hasRel(toks[i - 1].text), nextOp = i + 1 < toks.length && hasRel(toks[i + 1].text);
    // E7 repair E: a lone A/a/I beside any operator is a variable ("A + B + C = 180"), not an article/pronoun
    const opTok = (u?: Tok) => !!u && /^[+\-*/^×÷−·]+$/.test(u.text);
    if (/^[aAI]$/.test(t.text)) return /^(?:angle|angles|triangle|segment|arc|ray|side)$/i.test(toks[i - 1]?.text ?? "") || prevOp || nextOp || opTok(toks[i - 1]) || opTok(toks[i + 1]) ? "m" : "w";
    // E7 repair E: point/segment/angle names (AB, DBC) beside an operator, and a geometric noun directly before such a name ("angle DBC"), are notation
    if (/^[A-Z]{2,4}$/.test(t.text) && (/^(?:angle|angles|triangle|segment|arc|ray|side)$/i.test(toks[i - 1]?.text ?? "") || prevOp || nextOp || opTok(toks[i - 1]) || opTok(toks[i + 1]))) return "m";
    if (/^(?:angle|angles|triangle|segment|arc|ray|side)$/i.test(t.text) && /^(?:[A-Z]{1,4}|[a-z])$/.test(toks[i + 1]?.text ?? "") && (prevOp || opTok(toks[i - 1]) || hasRel(toks[i + 2]?.text ?? "") || opTok(toks[i + 2]) || (i === 0 || toks[i - 1].brk))) return "m";
    return mathy(t.text) ? "m" : "w";
  });
  const claimSpans: [number, number][] = []; // token index ranges
  // a sentence that states a qualitative conclusion ("f is continuous at x = 2") is ONE claim; the relation inside it is only a point specification
  {
    let st = 0;
    for (let k = 0; k < toks.length; k++) {
      if (toks[k].sent || k === toks.length - 1) {
        const f = toks[st], l = toks[k];
        const sentence = original.slice(f.start, l.end);
        const named = assumptionNames(sentence);
        if (named.length && !REL.test(sentence.replace(ARROWS, " "))) { // a sentence that states a modelling assumption is a premise, not a claim to prove
          for (let q = st; q <= k; q++) kinds[q] = "q";
          claims.push({ id: "", line, start: f.start, end: l.end, text: sentence, kind: "assumption", lead: "", labelled: false, names: named, outcome: "unresolved", reason: "not yet accounted" });
          claimSpans.push([st, k]);
        } else if ((QUALITATIVE.test(sentence) || PREDICATE.test(sentence)) && !/^(?:assume|suppose|assuming|let|if|take|choose)$/i.test(f.text)) {
          for (let q = st; q <= k; q++) kinds[q] = "q";
          claims.push({ id: "", line, start: f.start, end: l.end, text: original.slice(f.start, l.end), kind: "assertion", lead: "", labelled: false, outcome: "unresolved", reason: "not yet accounted" });
          claimSpans.push([st, k]);
        }
        st = k + 1;
      }
    }
  }
  let i = 0;
  while (i < toks.length) {
    if (kinds[i] !== "m") { i++; continue; }
    let j = i;
    while (j + 1 < toks.length && kinds[j + 1] === "m" && !toks[j].brk) j++;
    // the run [i..j]; a comma/semicolon inside a run splits it, so a break only ends the run (handled by !brk above)
    const run = toks.slice(i, j + 1);
    if (run.some((t) => hasRel(t.text))) {
      let a = i, b = j;
      const firstRel = run.findIndex((t) => hasRel(t.text)), lastRel = run.length - 1 - [...run].reverse().findIndex((t) => hasRel(t.text));
      const lhsEmpty = firstRel === 0 && /^(?:<=|>=|!=|==|[=≠<>≤≥≈≡])$/.test(run[0].text);
      const rhsEmpty = lastRel === run.length - 1 && /^(?:<=|>=|!=|==|[=≠<>≤≥≈≡])$/.test(run[run.length - 1].text);
      let labelled = false;
      if (lhsEmpty) { // extend leftwards across the words that name the quantity ("sum of roots =")
        let k = a - 1, n = 0; while (k >= 0 && kinds[k] === "w" && !toks[k].brk && n < 8 && !ASSUME_LEAD.test(toks[k].text) && !/^(?:so|hence|thus|therefore|then|since|because|now|and)$/i.test(toks[k].text)) { k--; n++; }
        if (n > 0) { a = k + 1; labelled = true; }
      }
      void rhsEmpty;
      claimSpans.push([a, b]);
      const first = toks[a], last = toks[b];
      const lead = toks.slice(Math.max(0, a - 6), a).filter((t) => kinds[toks.indexOf(t)] === "w").map((t) => t.text).join(" ");
      const leadAll = toks.slice(0, a).slice(-4).map((t) => t.text).join(" ");
      const kind: ClaimKind = ASSUME_LEAD.test(toks[a - 1]?.text ?? "") || /\b(?:assume|suppose|assuming|provided|restrict)/i.test(leadAll) ? "assumption" : "relation";
      claims.push({ id: `claim-${line}-${claims.length + 1}`, line, start: first.start, end: last.end, text: original.slice(first.start, last.end), kind, lead, labelled, outcome: "unresolved", reason: "not yet accounted" });
    }
    i = j + 1;
  }
  // verbal assertions: a sentence with a copula and mathematical content but no relation sign ("the derivative of x^2 is 3x")
  const covered = new Set<number>(); claimSpans.forEach(([a, b]) => { for (let k = a; k <= b; k++) covered.add(k); });
  let sStart = 0;
  for (let k = 0; k <= toks.length; k++) {
    if (k === toks.length || toks[k].brk) {
      const seg = toks.slice(sStart, k + 1 > toks.length ? toks.length : k + 1), idx = Array.from({ length: seg.length }, (_, q) => sStart + q);
      if (seg.length && !idx.some((q) => covered.has(q))) {
        const cop = seg.findIndex((t) => COPULA.test(t.text)) , mathTok = seg.filter((t, q) => kinds[idx[q]] === "m" && carriesMath(t.text));
        const qual = QUALITATIVE.test(original.slice(seg[0].start, seg[seg.length - 1].end));
        if ((cop >= 0 && mathTok.length) || (qual && mathTok.length)) {
          const f = seg[0], l = seg[seg.length - 1];
          claims.push({ id: `claim-${line}-${claims.length + 1}`, line, start: f.start, end: l.end, text: original.slice(f.start, l.end), kind: "assertion", lead: "", labelled: false, outcome: "unresolved", reason: "not yet accounted" });
        }
      }
      sStart = k + 1;
    }
  }
  claims.sort((x, y) => x.start - y.start);
  claims.forEach((c, n) => { c.id = `claim-${line}-${n + 1}`; });
  // residue: text outside every claim
  const residue: LedgerLine["residue"] = []; let pos = base;
  for (const c of claims) { if (c.start > pos) { const t = original.slice(pos, c.start).trim(); if (t) residue.push({ start: pos, end: c.start, text: t }); } pos = Math.max(pos, c.end); }
  if (pos < base + s.length) { const t = original.slice(pos, base + s.length).trim(); if (t) residue.push({ start: pos, end: base + s.length, text: t }); }
  // stated assumptions (independent, fair, ...) recorded as names; these carry no claim of their own
  const names: string[] = [];
  const add = (n: string, re: RegExp) => { if (re.test(s)) names.push(n); };
  add("independent", /\bindependen(?:t|ce|tly)\b/i); add("mutually-exclusive", /\bmutually\s+exclusive\b|\bdisjoint\b/i); add("equiprobable", /\bequally\s+likely\b|\bequiprobable\b|\buniform(?:ly)?\b|\bfair\b/i);
  return { line, start: base, end: base + s.length, text: original, claims, residue, statedAssumptions: names };
}

const FORMATTING = /^\s*(?:\$\$|\\\[|\\\]|\\begin\{[^}]*\}|\\end\{[^}]*\}|-{3,}|={3,})\s*$/;
/** Build the ledger from the raw submitted text; line numbers follow the submission (1-based), formatting-only lines carry no claims. */
export function extractLedger(text: unknown): ClaimLedger {
  const lines: LedgerLine[] = []; const claims: LedgerClaim[] = [];
  if (typeof text === "string") {
    text.replace(/\r\n?/g, "\n").split("\n").forEach((original, index) => {
      if (FORMATTING.test(original)) return;
      const trimmed = original.replace(/^\s*(?:\d+\)\s*|\d+\.(?:\s+|$))/, "").trim(); if (!trimmed) return;
      const base = original.indexOf(trimmed);
      const ll = extractLine(index + 1, trimmed, base, original); lines.push(ll); claims.push(...ll.claims);
    });
  }
  return { contract: CLAIM_LEDGER_CONTRACT, lines, claims };
}

// ------------------------------------------------------------------------------------------------ accounting against a verdict
export interface CoverageRecord { line: number; start: number; end: number; verified: boolean; credited: boolean; reason: string }
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);

/**
 * Decide each claim's outcome from the records a route produced. A claim is `proven` only when a credited, verified-valid record
 * covers the whole claim and covers no other claim of the same line (a record that swallows several claims cannot be shown to have
 * checked each of them). A claim with no covering record was silently lost: it is `unsupported`, never `proven`.
 */
export function accountForLedger(ledger: ClaimLedger, records: CoverageRecord[]): { outcomes: Map<string, { outcome: ClaimOutcome; reason: string }>; blocking: LedgerClaim[] } {
  const outcomes = new Map<string, { outcome: ClaimOutcome; reason: string }>(); const blocking: LedgerClaim[] = [];
  for (const ln of ledger.lines) {
    const here = records.filter((r) => r.line === ln.line);
    for (const c of ln.claims) {
      const cover = here.filter((r) => overlap(r.start, r.end, c.start, c.end) > 0);
      let res: { outcome: ClaimOutcome; reason: string };
      if (c.kind === "assumption") res = { outcome: "unresolved", reason: "student-stated assumption: compatibility with the task is decided by the context check" };
      else if (!cover.length) res = { outcome: "unsupported", reason: `no verifier accounts for the claim "${c.text}" (it was dropped between parsing and verification)` };
      else {
        const full = cover.filter((r) => r.start <= c.start + 0 && r.end >= c.end);
        // a record that spans the WHOLE line, where nothing but connectives is left over besides the claims, was given the complete line text and accepted
        // it as one statement ("x = 3 or x = -3", "x = 1, y = 2"); it then covers every claim of the line. Otherwise a record that swallows several claims cannot be shown to have checked each.
        const connectiveOnly = ln.residue.every((x) => /^(?:[\s,;.:]|and|or|so|then|since|thus|hence|therefore|because|now|next|step\s*\d*|⇔|<=>|⟺|iff)+$/i.test(x.text));
        // an explicit equivalence connective (⇔, <=>, ⟺, iff) divides the line into statements of their own (the parser reads each part as a
        // statement on the same source line, with its own span): a record that spans one whole part, with only connectives left over, covers that part's claims
        const parts: [number, number][] = []; { const re = /⇔|<=>|⟺|\biff\b/g; let from = 0, m: RegExpExecArray | null; while ((m = re.exec(ln.text))) { parts.push([from, m.index]); from = m.index + m[0].length; } parts.push([from, ln.text.length]); }
        const spans = parts.map(([a, b]) => { const t = ln.text.slice(a, b), lead = t.length - t.trimStart().length, trail = t.length - t.trimEnd().length; return [ln.start + a + lead, ln.start + b - trail] as const; }).filter(([a, b]) => b > a);
        const wholeLine = (r: CoverageRecord) => connectiveOnly && spans.some(([a, b]) => r.start <= a && r.end >= b - 1 && overlap(a, b, c.start, c.end) > 0);
        const shared = (r: CoverageRecord) => !wholeLine(r) && ln.claims.filter((o) => o !== c && o.kind !== "assumption" && overlap(r.start, r.end, o.start, o.end) > 0).length > 0;
        const good = full.find((r) => r.verified && r.credited && !shared(r));
        if (c.kind === "assertion") res = full.some((r) => r.verified && r.credited && !shared(r)) && !cover.some((r) => !r.credited) ? { outcome: "proven", reason: "checked by a verifier that covers the statement" } : { outcome: "unsupported", reason: `the statement "${c.text}" is a recognizable mathematical claim that could not be interpreted into a checkable form` };
        else if (good) res = { outcome: "proven", reason: good.reason };
        else if (cover.some((r) => !r.verified && r.credited)) res = { outcome: "disproven", reason: cover.find((r) => !r.verified && r.credited)!.reason };
        else if (full.some((r) => r.verified && r.credited && shared(r))) res = { outcome: "unresolved", reason: `the record covering "${c.text}" also covers other claims of the line, so it cannot be shown to have checked each` };
        else res = { outcome: "unsupported", reason: `the claim "${c.text}" is not covered by a verified record` };
      }
      c.outcome = res.outcome; c.reason = res.reason; outcomes.set(c.id, res);
      if (res.outcome !== "proven" && !(c.kind === "assumption")) blocking.push(c);
    }
  }
  return { outcomes, blocking };
}
