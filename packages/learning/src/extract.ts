/**
 * Document extraction (extract@1): a textbook or specification document → chapters, pages and outcome lines with
 * their locations. Extraction says WHAT the document contains; interpretation (meaning.ts) says what it MEANS, and
 * review (curriculum.ts) decides what becomes authoritative. Each result records how it was extracted.
 *
 *   structured-text  the OpenPath textbook format (front matter, "# Chapter n: …", "## Learning outcomes", "- …"),
 *                    optionally grouped into units ("# Unit n: …") and divided into sections of any depth
 *                    ("## Section 7.2: …", "### Section 7.2.1: …")
 *   plain-text       a textbook's contents as ordinary text: chapter headings ("Chapter Three — Parts of a Whole
 *                    (pages 37 to 58)", "Unit 2: …"), outcome lists after "learners can", "students will be able
 *                    to", "learning outcomes", "you will learn", page references "(page 38)", "(p. 38)", "Page 12";
 *                    units above chapters ("Part 2: …", "Unit 3: …" when the book also has chapters) and numbered
 *                    sections ("7.2 Methods of integration", "Section 7.2: …")
 *   pdf              the PDF's own text layer (uncompressed or Flate streams; literal and hex strings), page by page,
 *                    then the plain-text reader. A PDF with no text layer (a scan) is DECLINED: it needs OCR, which is
 *                    not available here (an external dependency), and nothing is guessed from it.
 *   ai-assisted      not implemented and never called: it would need explicit approval, a budget and provenance
 *                    (EXTRACTION_POLICY); this module refuses it.
 */
export interface ExtractedOutcome {
  text: string;
  pages?: string;
  location: { page?: number; line: number };
}
export interface ExtractedSection {
  /** As printed: "7.2", "7.2.1". */
  number: string;
  title: string;
  pages?: string;
  outcomes: ExtractedOutcome[];
  examples: { title: string; pages?: string }[];
  exercises: { ref: string; pages?: string }[];
  /** Sections inside this one (any depth). */
  sections: ExtractedSection[];
}
export interface ExtractedChapter {
  number: number;
  title: string;
  pages?: string;
  /** The unit (part, strand, theme) the chapter belongs to, when the book groups chapters. */
  unit?: { number: number; title: string };
  /** Outcomes stated for the chapter as a whole. */
  outcomes: ExtractedOutcome[];
  examples: { title: string; pages?: string }[];
  exercises: { ref: string; pages?: string }[];
  /** Sections, when the book has them (any depth); their outcomes are theirs, not the chapter's. */
  sections?: ExtractedSection[];
}
export interface ExtractedDocument {
  meta: Record<string, string>;
  chapters: ExtractedChapter[];
  provenance: { extractor: "structured-text@1" | "plain-text@1" | "pdf-text-layer@1"; cost: 0; warnings: string[]; pages?: number };
}
export class ExtractionError extends Error {
  readonly reason: "no-chapters" | "no-grade" | "scanned" | "unreadable" | "not-approved";
  constructor(message: string, reason: ExtractionError["reason"]) {
    super(message);
    this.reason = reason;
  }
}
export const EXTRACTION_POLICY = {
  aiAssisted: "disabled: needs owner approval, a cost limit and human review of every extracted line",
} as const;

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15 };
const numberOf = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()] ?? NaN);
const range = (a: string, b?: string) => (b ? `${a}–${b}` : a);
/** "(pp. 33–52)", "(pages 37 to 58)", "(page 38)", "(p. 9)", "pp 3-4" → "33–52" etc. */
export function pagesIn(s: string): string | undefined {
  const m = s.match(/\(?\b(?:pp?\.?|pages?)\s*(\d+)(?:\s*(?:[–-]|to)\s*(\d+))?\)?\s*$/i);
  return m ? range(m[1], m[2]) : undefined;
}
const withoutPages = (s: string) => s.replace(/\s*\(?\b(?:pp?\.?|pages?)\s*\d+(?:\s*(?:[–-]|to)\s*\d+)?\)?\s*$/i, "").trim();

/** The OpenPath structured format. */
export function extractStructured(text: string): ExtractedDocument {
  const lines = text.replace(/\r/g, "").split("\n");
  const meta: Record<string, string> = {};
  let i = 0;
  if (lines[0]?.trim() === "---") {
    for (i = 1; i < lines.length && lines[i].trim() !== "---"; i++) {
      const m = lines[i].match(/^([a-zA-Z]+):\s*(.+)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
    }
    i++;
  }
  const chapters: ExtractedChapter[] = [];
  let section: "outcomes" | "examples" | "exercises" | null = null;
  let unit: ExtractedChapter["unit"];
  // the open sections, outermost first; outcomes go to the innermost
  let stack: ExtractedSection[] = [];
  const here = () => stack.at(-1) ?? chapters.at(-1)!;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const u = line.match(UNIT_HEADING);
    if (u && Number.isFinite(numberOf(u[1]))) {
      unit = { number: numberOf(u[1]), title: withoutPages(u[2]) };
      section = null;
      continue;
    }
    const ch = line.match(/^#\s+Chapter\s+(\d+)\s*[:.]\s*(.+)$/i);
    if (ch) {
      chapters.push({ number: Number(ch[1]), title: withoutPages(ch[2]), pages: pagesIn(ch[2]), ...(unit ? { unit } : {}), outcomes: [], examples: [], exercises: [] });
      section = null;
      stack = [];
      continue;
    }
    const sh = line.match(/^(#{2,6})\s+(?:section|topic|subsection|lesson)\s+(\d+(?:\.\d+)*)\s*[:.—–-]\s*(.+)$/i);
    if (sh && chapters.length) {
      const depth = sh[1].length - 1; // "##" is a section of the chapter, "###" a section inside it …
      stack = stack.slice(0, depth - 1);
      const s: ExtractedSection = { number: sh[2], title: withoutPages(sh[3]), pages: pagesIn(sh[3]), outcomes: [], examples: [], exercises: [], sections: [] };
      const parent = stack.at(-1);
      if (parent) parent.sections.push(s);
      else (chapters.at(-1)!.sections ??= []).push(s);
      stack.push(s);
      section = null;
      continue;
    }
    const sec = line.match(/^#{2,6}\s+(.+)$/);
    if (sec) {
      const t = sec[1].toLowerCase();
      section = t.includes("outcome") ? "outcomes" : t.includes("example") ? "examples" : t.includes("exercise") ? "exercises" : null;
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item && chapters.length && section) {
      const c = here();
      const body = withoutPages(item[1]);
      const pages = pagesIn(item[1]);
      if (section === "outcomes") c.outcomes.push({ text: body, pages, location: { line: i + 1, ...(pages ? { page: Number(pages.split("–")[0]) } : {}) } });
      else if (section === "examples") c.examples.push({ title: body, pages });
      else c.exercises.push({ ref: body, pages });
    }
  }
  return finish({ meta, chapters, provenance: { extractor: "structured-text@1", cost: 0, warnings: [] } });
}

const CHAPTER = /^(?:chapter|unit|lesson)\s+([0-9]+|[a-z]+)\s*(?:[:.—–-]+)\s*(.+)$/i;
const ONLY_CHAPTER = /^chapter\s+([0-9]+|[a-z]+)\s*(?:[:.—–-]+)\s*(.+)$/i;
/** A grouping above chapters: "# Unit 3: Calculus" (structured) or "Part Two — Calculus" (plain). */
const UNIT_HEADING = /^#\s+(?:unit|part|strand|theme|domain)\s+([0-9]+|[a-z]+)\s*[:.—–-]+\s*(.+)$/i;
const UNIT_PLAIN = /^(?:unit|part|strand|theme|domain)\s+([0-9]+|[a-z]+)\s*(?:[:.—–-]+)\s*(.+)$/i;
const SECTION_PLAIN = /^(?:(?:section|topic)\s+)?(\d+\.\d+(?:\.\d+)*)\s*[:.—–-]?\s+([A-Z].{2,80}?)\s*$/;
const OUTCOMES = /(learners|students|pupils|you)\s+(can|will|should)\b|able to|learning (outcomes|objectives)|you will learn|by the end of/i;
const BULLET = /^(?:[•●▪◦*·-]|\d+[.)]|[a-z][.)])\s+(.+)$/;
/** Ordinary text (also the PDF reader's output, with "\f" between pages). */
export function extractPlain(text: string, extractor: ExtractedDocument["provenance"]["extractor"] = "plain-text@1"): ExtractedDocument {
  const meta: Record<string, string> = {};
  const chapters: ExtractedChapter[] = [];
  const warnings: string[] = [];
  let inOutcomes = false;
  let page = 1;
  const lines = text.replace(/\r/g, "").split("\n");
  // a book that has chapters uses "unit" and "part" for groups of chapters; otherwise a unit is a chapter
  const hasChapters = lines.some((l) => ONLY_CHAPTER.test(l.replace(/\f/g, "").trim()));
  let unit: ExtractedChapter["unit"];
  let stack: ExtractedSection[] = [];
  const here = () => stack.at(-1) ?? chapters.at(-1)!;
  lines.forEach((raw, k) => {
    page += (raw.match(/\f/g) ?? []).length;
    const line = raw.replace(/\f/g, "").trim();
    if (!line) return;
    const pg = line.match(/^(?:page|p\.)\s*(\d+)$/i);
    if (pg) return void (page = Number(pg[1]));
    if (!chapters.length) {
      const g = line.match(/\b(?:grade|class|year|standard|std\.?)\s*(\d{1,2})\b/i);
      if (g && !meta.grade) meta.grade = g[1];
      const b = line.match(/^board\s*:\s*(.+)$/i);
      if (b) meta.board = b[1].trim();
      const sj = line.match(/^subject\s*:\s*(.+)$/i);
      if (sj) meta.subject = sj[1].trim();
      const y = line.match(/academic year\s*(\d{4})\s*[–-]\s*(\d{2,4})/i);
      if (y) meta.academicYear = `${y[1]}-${y[2].slice(-2)}`;
      if (!meta.title && k === lines.findIndex((l) => l.trim())) meta.title = line.replace(/\s*[—–-]\s*/g, " — ");
      if (/synthetic|not a real/i.test(line)) meta.edition = (meta.edition ? meta.edition + "; " : "") + line;
      if (/\bcc0\b|licen[cs]e/i.test(line)) meta.licence = line;
    }
    const un = hasChapters ? line.match(UNIT_PLAIN) : null;
    if (un && Number.isFinite(numberOf(un[1]))) {
      unit = { number: numberOf(un[1]), title: withoutPages(un[2]) };
      inOutcomes = false;
      return;
    }
    const ch = line.match(hasChapters ? ONLY_CHAPTER : CHAPTER);
    if (ch && Number.isFinite(numberOf(ch[1]))) {
      chapters.push({ number: numberOf(ch[1]), title: withoutPages(ch[2]), pages: pagesIn(ch[2]), ...(unit ? { unit } : {}), outcomes: [], examples: [], exercises: [] });
      inOutcomes = false;
      stack = [];
      return;
    }
    const sc = chapters.length && !BULLET.test(line) ? line.match(SECTION_PLAIN) : null;
    if (sc) {
      const depth = sc[1].split(".").length - 1;
      stack = stack.slice(0, depth - 1);
      const s: ExtractedSection = { number: sc[1], title: withoutPages(sc[2]), pages: pagesIn(sc[2]), outcomes: [], examples: [], exercises: [], sections: [] };
      const parent = stack.at(-1);
      if (parent) parent.sections.push(s);
      else (chapters.at(-1)!.sections ??= []).push(s);
      stack.push(s);
      inOutcomes = false;
      return;
    }
    if (OUTCOMES.test(line) && !BULLET.test(line)) return void (inOutcomes = true);
    const b = line.match(BULLET);
    if (b && chapters.length && inOutcomes) {
      const pages = pagesIn(b[1]);
      here().outcomes.push({ text: withoutPages(b[1]), pages, location: { line: k + 1, page: pages ? Number(pages.split("–")[0]) : page } });
      return;
    }
    if (chapters.length && inOutcomes && !b) inOutcomes = false;
  });
  for (const c of chapters) if (!allOutcomes(c).length) warnings.push(`Chapter ${c.number} (${c.title}): no outcome list found.`);
  return finish({ meta, chapters, provenance: { extractor, cost: 0, warnings } });
}

/** Every outcome of a chapter: its own, then each section's, in book order. */
export function allOutcomes(c: { outcomes: ExtractedOutcome[]; sections?: ExtractedSection[] }): ExtractedOutcome[] {
  return [...c.outcomes, ...(c.sections ?? []).flatMap((s) => allOutcomes(s))];
}

function finish(d: ExtractedDocument): ExtractedDocument {
  if (!d.chapters.length) throw new ExtractionError("No chapters found. A chapter starts with a line like “Chapter 1: Fractions (pages 1–20)”.", "no-chapters");
  if (!d.meta.grade || !Number.isInteger(Number(d.meta.grade))) throw new ExtractionError("The grade was not found (for example “Grade 4”).", "no-grade");
  return d;
}

// ---------------------------------------------------------------- PDF text layer (no dependencies)

const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join("");
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
function pdfString(s: string): string {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e: string) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" } as Record<string, string>)[e] ?? String.fromCharCode(parseInt(e, 8)));
}
/** The text drawn by one content stream: strings of Tj/TJ/'/", new lines on T*, Td/TD with a vertical move, ET. */
function textOf(stream: string): string {
  let out = "";
  const re = /\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]*>|\[|\]|T\*|-?\d*\.?\d+\s+-?\d*\.?\d+\s+T[dD]|Tj|TJ|'|"|ET/g;
  let m: RegExpExecArray | null;
  let pending = "";
  while ((m = re.exec(stream))) {
    const t = m[0];
    if (t.startsWith("(")) pending += pdfString(t.slice(1, -1));
    else if (t.startsWith("<")) pending += t.slice(1, -1).replace(/\s/g, "").replace(/(..)/g, (h) => String.fromCharCode(parseInt(h, 16)));
    else if (t === "Tj" || t === "TJ" || t === "'" || t === '"') {
      if (t === "'" || t === '"') out += "\n";
      out += pending;
      pending = "";
    } else if (t === "T*" || t === "ET" || (/T[dD]$/.test(t) && Number(t.trim().split(/\s+/)[1]) !== 0)) out += "\n";
  }
  return out;
}
/** A PDF file's pages as text, from its own text layer. */
export async function pdfText(bytes: Uint8Array): Promise<string[]> {
  const raw = latin1(bytes);
  if (!raw.startsWith("%PDF")) throw new ExtractionError("This is not a PDF file.", "unreadable");
  const objects = new Map<string, string>();
  for (const m of raw.matchAll(/(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj/g)) objects.set(`${m[1]} ${m[2]}`, m[3]);
  const streamOf = async (body: string) => {
    const m = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!m) return "";
    const data = Uint8Array.from(m[1], (c) => c.charCodeAt(0));
    if (/\/FlateDecode/.test(body)) return latin1(await inflate(data));
    if (/\/Filter/.test(body)) return ""; // another filter: not supported (reported as no text)
    return m[1];
  };
  const pages = [...objects.entries()].filter(([, b]) => /\/Type\s*\/Page\b(?!s)/.test(b));
  const out: string[] = [];
  for (const [, body] of pages) {
    const refs = [...(body.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/)?.[1] ?? "").matchAll(/(\d+)\s+(\d+)\s+R/g)].map((r) => `${r[1]} ${r[2]}`);
    let text = "";
    for (const r of refs) text += textOf(await streamOf(objects.get(r) ?? ""));
    out.push(text);
  }
  return out;
}
export async function extractPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  const pages = await pdfText(bytes);
  if (!pages.length || pages.every((p) => !p.replace(/\s/g, ""))) throw new ExtractionError("This PDF has no text layer (it looks scanned). Reading scans needs OCR, which is not available yet, so nothing was read from it.", "scanned");
  const d = extractPlain(pages.join("\n\f"), "pdf-text-layer@1");
  d.provenance.pages = pages.length;
  return d;
}

/** Choose the extractor for a document. */
export async function extract(input: { name?: string; text?: string; bytes?: Uint8Array; aiAssisted?: boolean }): Promise<ExtractedDocument> {
  if (input.aiAssisted) throw new ExtractionError(`AI-assisted extraction is ${EXTRACTION_POLICY.aiAssisted}.`, "not-approved");
  if (input.bytes) return extractPdf(input.bytes);
  const text = input.text ?? "";
  return text.trimStart().startsWith("---") ? extractStructured(text) : extractPlain(text);
}
