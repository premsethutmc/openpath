/**
 * Curriculum releases for the real boards (boards@1): CBSE (NCERT textbooks) and Tamil Nadu State Board (Samacheer
 * Kalvi), Grades 1–12, built from the curriculum inventory (content/learning/syllabus/*.json, syllabus@1).
 *
 * One code path for every grade and board (no grade-specific logic):
 *   unit (domain)  the mathematical domain of the chapter: the strand most of its mapped competencies belong to
 *                  (Number, Algebra, Geometry, Measurement, Data handling, …); the book's own term or part is kept
 *                  in the chapter's title line
 *   chapter        as printed in the textbook (a fact), in book order, with its source-verification flag
 *   section        as listed by the official syllabus or the book's contents; each outcome is placed in the section
 *                  whose title shares the most words with it (or stays at chapter level when none does)
 *   outcome        in OpenPath's own words, mapped by the inventory to one or more competencies (method inventory@1)
 *
 * The release is "reviewed" in OpenPath's sense (its mappings were checked against the competency graph by the
 * inventory and the expansion), and says plainly that it is NOT an educator review. A release that exists is never
 * rewritten (learners' records refer to it by hash): a change reaches learners only as a new version.
 *
 *   node --import tsx packages/learning/scripts/board-releases.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashOf, validateRelease, words, type Chapter, type CurriculumRelease, type Outcome, type Section } from "../src/curriculum";
import { graph } from "../src/graph";

const root = join(import.meta.dirname, "../../../content/learning");
const VERSION = "1.0.0";
const DOMAIN: Record<string, string> = { number: "Numbers and operations", algebra: "Algebra", geometry: "Geometry", measurement: "Measurement", statistics: "Data handling and statistics", probability: "Probability", reasoning: "Mathematical reasoning", calculus: "Calculus", coordinate: "Coordinate geometry", trigonometry: "Trigonometry", vectors: "Vectors and three-dimensional geometry" };
const DOMAIN_ORDER = Object.keys(DOMAIN);
type Syl = {
  board: "cbse" | "tn";
  boardName: string;
  grade: number;
  academicYear: string;
  textbook: { title: string; publisher: string; edition: string; terms: number | null };
  sources: { title: string; url: string; kind: string }[];
  notes: string[];
  chapters: { id: string; number: number; term: number | null; title: string; verified: boolean; sections: { id: string; title: string }[]; outcomes: { id: string; statement: string; mapped: string[]; assessment: string; questionTypes: string[] }[] }[];
};
const ID = { cbse: "cbse-ncert-mathematics", tn: "tn-samacheer-mathematics" } as const;

function placeIn(sections: { id: string; title: string }[], statement: string): string | null {
  const o = new Set(words(statement));
  let best: { id: string; n: number } | null = null;
  for (const s of sections) {
    const n = words(s.title).filter((w) => o.has(w) && w.length > 2).length;
    if (n > 0 && (!best || n > best.n)) best = { id: s.id, n };
  }
  return best?.id ?? null;
}

function build(s: Syl): CurriculumRelease {
  const id = `${ID[s.board]}-grade-${s.grade}`;
  const outcome = (o: Syl["chapters"][number]["outcomes"][number]): Outcome => {
    const ids = o.mapped.filter((c) => graph.byId.has(c));
    const unknown = o.mapped.filter((c) => !graph.byId.has(c));
    if (unknown.length) throw new Error(`${o.id}: unknown competencies ${unknown.join(", ")}`);
    return {
      id: o.id,
      text: o.statement,
      mapping: {
        competencies: ids.map((c) => ({ id: c, score: 1, method: "inventory@1" as const, status: "accepted" as const })),
        verdict: ids.length ? "clear" : "missing",
        why: ids.length ? `Mapped by the curriculum inventory (${o.assessment === "human" ? "marked by an educator" : o.assessment === "both" ? "partly marked by an educator" : "marked automatically"}; ${o.questionTypes.join(", ")}).` : "No competency carries this outcome yet.",
      },
    };
  };
  const chapters: (Chapter & { domain: string })[] = s.chapters.map((c) => {
    const placed = new Map<string, Outcome[]>();
    const own: Outcome[] = [];
    for (const o of c.outcomes) {
      const at = placeIn(c.sections, o.statement);
      const oc = outcome(o);
      if (at) placed.set(at, [...(placed.get(at) ?? []), oc]);
      else own.push(oc);
    }
    // a section title that starts with its own number ("2.1 Introduction") keeps that number, once
    const sections: Section[] = c.sections.map((x, k) => {
      const m = x.title.match(/^(\d+(?:\.\d+)+)\s+(.*)$/);
      return { id: x.id, number: m ? m[1] : `${c.number}.${k + 1}`, title: m ? m[2] : x.title, outcomes: placed.get(x.id) ?? [], examples: [], exercises: [] };
    });
    const strands = c.outcomes.flatMap((o) => o.mapped.filter((m) => graph.byId.has(m)).map((m) => graph.get(m).strand));
    const tally = new Map<string, number>();
    for (const st of strands) tally.set(st, (tally.get(st) ?? 0) + 1);
    const domain = [...tally].sort((a, b) => b[1] - a[1] || DOMAIN_ORDER.indexOf(a[0]) - DOMAIN_ORDER.indexOf(b[0]))[0]?.[0] ?? "number";
    const termLabel = c.term ? (s.board === "tn" ? `Term ${c.term}` : `Part ${c.term}`) : null;
    return {
      id: c.id,
      number: c.number,
      title: termLabel ? `${c.title} (${termLabel}, chapter ${c.number})` : c.title,
      outcomes: own,
      examples: [],
      exercises: [],
      sections,
      domain,
      ...(c.verified ? {} : { sourceVerified: false }),
    } as Chapter & { domain: string };
  });
  // the domain is the unit: Mathematics → Domain → Chapter → Section → Skill; book order kept within a domain
  const domains = [...new Set(chapters.map((c) => c.domain))].sort((a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));
  const ordered = domains.flatMap((d, k) => chapters.filter((c) => c.domain === d).map((c) => {
    const { domain, ...rest } = c;
    return { ...rest, unit: { id: `domain-${domain}`, number: k + 1, title: DOMAIN[domain] ?? domain } };
  }));
  const unverified = s.chapters.filter((c) => !c.verified).length;
  const release: CurriculumRelease = {
    id,
    version: VERSION,
    status: "reviewed",
    grade: s.grade,
    title: `${s.textbook.title} — Grade ${s.grade} Mathematics (${s.board === "cbse" ? "CBSE / NCERT" : "Tamil Nadu State Board"})`,
    hash: "",
    source: { kind: "textbook", title: s.textbook.title, edition: s.textbook.edition, publisher: s.textbook.publisher, board: s.boardName, academicYear: s.academicYear, licence: "Chapter and section titles as printed (facts); outcomes written by OpenPath in its own words; no textbook text is reproduced.", synthetic: false, extractor: "inventory@1" },
    review: {
      by: "OpenPath curriculum inventory (research from official and secondary sources; not an educator review)",
      at: "2026-10-19T00:00:00.000Z",
      note: `Built from content/learning/syllabus/${s.board}-g${String(s.grade).padStart(2, "0")}.json. ${unverified ? `${unverified} of ${s.chapters.length} chapter titles could not be checked against an official source (marked sourceVerified: false). ` : ""}Each outcome was mapped to competencies by the inventory; outcomes were placed in sections by shared title words. Sources: ${s.sources.map((x) => x.url).slice(0, 4).join(" ")}. Notes: ${s.notes.slice(0, 3).join(" ")}`.slice(0, 1900),
      educatorReviewed: false,
    },
    subjects: [{ id: "mathematics", name: "Mathematics", chapters: ordered }],
  };
  release.hash = hashOf({ ...release, hash: "" });
  return release;
}

const index = JSON.parse(readFileSync(join(root, "curricula", "index.json"), "utf8")) as { releases: { id: string; version: string; grade: number; title: string; hash: string; file: string; board?: string }[] };
let made = 0;
for (const f of readdirSync(join(root, "syllabus")).filter((x) => /^(cbse|tn)-g\d\d\.json$/.test(x)).sort()) {
  const s = JSON.parse(readFileSync(join(root, "syllabus", f), "utf8")) as Syl;
  const rel = build(s);
  const file = `${rel.id}.v${rel.version}.json`;
  if (existsSync(join(root, "curricula", file))) {
    const kept = JSON.parse(readFileSync(join(root, "curricula", file), "utf8"));
    if (kept.hash !== rel.hash) console.log(`${file}: kept (already released); the inventory changed, so a new version is needed`);
    continue;
  }
  const errs = validateRelease(rel);
  if (errs.length) throw new Error(`${rel.id}: ${errs.join("; ")}`);
  writeFileSync(join(root, "curricula", file), JSON.stringify(rel, null, 1) + "\n");
  index.releases = index.releases.filter((r) => !(r.id === rel.id && r.version === rel.version));
  index.releases.push({ id: rel.id, version: rel.version, grade: rel.grade, title: rel.title, hash: rel.hash, file, board: rel.source.board });
  made++;
}
index.releases.sort((a, b) => a.grade - b.grade || a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
writeFileSync(join(root, "curricula", "index.json"), JSON.stringify(index, null, 1) + "\n");
// the app's list of board releases (static imports, so the bundle carries them; regenerated here)
const boards = index.releases.filter((r) => /^(cbse-ncert|tn-samacheer)-mathematics-grade-/.test(r.id));
writeFileSync(
  join(import.meta.dirname, "../src/board-releases.ts"),
  `/** GENERATED by scripts/board-releases.ts: the CBSE (NCERT) and Tamil Nadu State Board releases, Grades 1–12 (boards@1). */\nimport type { CurriculumRelease } from "./curriculum";\n${boards.map((r, i) => `import b${i} from "../../../content/learning/curricula/${r.file}";`).join("\n")}\n\nexport const boardReleases = [${boards.map((_, i) => `b${i}`).join(", ")}] as unknown as CurriculumRelease[];\n`,
);
console.log(`${made} board releases written; ${index.releases.length} releases in the index`);
