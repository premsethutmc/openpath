/**
 * Builds the dashboard's per-release index (dashboard-index@1) from what the repository already holds — nothing is
 * decided here:
 *   - structure: the latest boards@1 release of each board and grade (board-releases.ts), its chapters and sections at
 *     any depth, and its ACCEPTED outcome mappings (as My Learning Year's tiles.ts reads them);
 *   - coverage: each outcome's class from the coverage compiler's committed output (coverage-matrix.v1.json, which CI
 *     regenerates and checks), and which written tasks serve it (written.v1.json, outcome-assessment.v1.json);
 *   - content: each competency's module (content.ts), its families with their review fingerprints and pool sizes
 *     (family-specs.v1.json), its written tasks, and the compiler's per-competency check.
 * Run by frontend/scripts/build-curriculum.mjs (Node only: it loads the module library).
 */
import specsData from "../../../content/learning/family-specs.v1.json";
import matrixData from "../../../content/learning/coverage-matrix.v1.json";
import oamData from "../../../content/learning/outcome-assessment.v1.json";
import { boardReleases } from "./board-releases";
import { moduleFor, moduleOrigin, poolFamilies } from "./content";
import type { Chapter, CurriculumRelease, Outcome, Section } from "./curriculum";
import { scopeOfAll, type CoverageClass, type DashCompetency, type DashIndex, type DashNode, type DashOutcome, type DashRelease } from "./dashboard";
import { graph } from "./graph";
import { contentHashOf, familiesOf } from "./review";
import { validateModule } from "./validate";
import { writtenTasks } from "./written";

type Spec = { id: string; title: string; competency: string; type: string; poolSize: number; fingerprint: string; examples: string[] };
const specs = new Map((specsData as unknown as { families: Spec[] }).families.map((s) => [s.id, s]));
type Row = { release: string; outcome: string; class: CoverageClass; why: string; competencies: string[] };
const matrix = matrixData as unknown as { summary: { requirements: number; families: { count: number; problems: number } }; requirements: Row[] };
const oam = new Map((oamData as unknown as { outcomes: { outcome: string; written: string[] }[] }).outcomes.map((o) => [o.outcome, o]));

export const boardOf = (r: CurriculumRelease): "cbse" | "tn" => (r.id.startsWith("tn-") ? "tn" : "cbse");

const competencyCache = new Map<string, DashCompetency>();
function competency(id: string): DashCompetency {
  const hit = competencyCache.get(id);
  if (hit) return hit;
  const c = graph.get(id);
  const m = moduleFor(id);
  const fams = m ? familiesOf(m) : [];
  // the families credited for this competency: the module's (its pools first), then any others that name it
  const own = [...(m ? poolFamilies(m) : []), ...fams, ...[...specs.values()].filter((s) => s.competency === id).map((s) => s.id)];
  const families = [...new Set(own)].map((f) => specs.get(f)).filter((s): s is Spec => !!s);
  const missing = m ? validateModule(m) : ["no module"];
  const written = writtenTasks.filter((t) => t.competency === id);
  const check = (matrixData as unknown as { competencies: { id: string; mode: "automatic" | "educator-marked"; complete: boolean; missing: string[] }[] }).competencies.find((x) => x.id === id);
  const sample = m ? [...m.diagnostics.slice(0, 2), ...m.practice.slice(0, 2), ...m.retention.slice(0, 1)] : [];
  const out: DashCompetency = {
    id,
    name: c.name,
    description: c.description ?? (c.objectives ?? []).join(" "),
    strand: c.strand,
    grades: c.gradeRange,
    prerequisites: graph.relationsOf(id).filter((x) => x.type === "mandatory" || x.type === "plausible").map((x) => ({ id: x.from, type: x.type as "mandatory" | "plausible" })),
    micro: graph.childrenOf(id),
    evidenceTarget: graph.evidenceTarget(id),
    module: m ? { title: m.title, origin: moduleOrigin(id), hash: contentHashOf(m), complete: !missing.length, missing, strategies: m.strategies.map((s) => s.title), counts: { diagnostics: m.diagnostics.length, practice: m.practice.length, transfer: m.transfer.length, retention: m.retention.length }, sample: [...new Set(sample)] } : null,
    families: families.map((s) => ({ id: s.id, title: s.title, type: s.type, fingerprint: s.fingerprint, problems: s.poolSize })),
    written: written.map((t) => ({ id: t.id, kind: t.kind, prompt: t.prompt.length > 160 ? `${t.prompt.slice(0, 157)}…` : t.prompt })),
    mode: check?.mode ?? (m && !m.pool && !m.pools?.length && written.length ? "educator-marked" : "automatic"),
    complete: check?.complete ?? false,
    missing: check?.missing ?? missing,
  };
  competencyCache.set(id, out);
  return out;
}

export function releaseIndex(r: CurriculumRelease): DashRelease {
  const key = `${r.id}@${r.version}`;
  const rows = new Map(matrix.requirements.filter((x) => x.release === key).map((x) => [x.outcome, x]));
  const outcomes: Record<string, DashOutcome> = {};
  const competencies: Record<string, DashCompetency> = {};
  const addOutcome = (o: Outcome) => {
    const row = rows.get(o.id);
    const accepted = o.mapping.competencies.filter((m) => m.status === "accepted").map((m) => m.id);
    const written = [...new Set([...(oam.get(o.id)?.written ?? []), ...writtenTasks.filter((t) => t.serves?.includes(o.id)).map((t) => t.id)])];
    outcomes[o.id] = { id: o.id, text: o.text, class: row?.class ?? (o.mapping.verdict === "unsupported" ? "unsupported" : "not-implemented"), why: row?.why ?? "Not in the coverage compiler's output.", competencies: row?.competencies ?? accepted, method: written.length > 0, written };
  };
  const leaf = (id: string, kind: "competency" | "micro"): DashNode => {
    competencies[id] = competency(id);
    return { id: kind === "competency" ? `skill:${id}` : `micro:${id}`, kind, title: graph.get(id).name, competency: id, children: graph.childrenOf(id).map((k) => leaf(k, "micro")) };
  };
  const inner = (node: Chapter | Section): DashNode[] => {
    const seen = new Set<string>();
    const kids: DashNode[] = [];
    for (const o of node.outcomes as Outcome[]) {
      addOutcome(o);
      const accepted = o.mapping.competencies.filter((m) => m.status === "accepted");
      if (o.mapping.verdict === "unsupported") kids.push({ id: `unsupported:${o.id}`, kind: "unsupported", title: o.text, subtitle: "Not supported yet", children: [], outcomes: [o.id] });
      else if (!accepted.length) kids.push({ id: `proposal:${o.id}`, kind: "proposal", title: o.text, subtitle: "Not mapped to a skill yet", children: [], outcomes: [o.id] });
      for (const m of accepted) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        kids.push(leaf(m.id, "competency"));
      }
    }
    for (const sec of node.sections ?? []) {
      const k = inner(sec);
      if (!k.length && !sec.outcomes.length) continue;
      kids.push({ id: `section:${r.id}:${sec.id}`, kind: "section", title: sec.title.startsWith(sec.number) ? sec.title : `${sec.number} ${sec.title}`, subtitle: sec.pages ? `pp. ${sec.pages}` : undefined, outcomes: (sec.outcomes as Outcome[]).map((o) => o.id), children: k });
    }
    return kids;
  };
  const maths = r.subjects.find((s) => s.id === "mathematics") ?? r.subjects[0];
  const nodes: DashNode[] = maths.chapters.map((ch) => ({ id: `chapter:${r.id}:${ch.id}`, kind: "chapter", title: ch.title, subtitle: ch.unit?.title, outcomes: (ch.outcomes as Outcome[]).map((o) => o.id), children: inner(ch) }));
  const names: Record<string, string> = {};
  for (const c of Object.values(competencies)) for (const p of c.prerequisites) if (!competencies[p.id]) names[p.id] = graph.byId.get(p.id)?.name ?? p.id;
  return {
    schema: "dashboard-index@1",
    release: { id: r.id, version: r.version, hash: r.hash, grade: r.grade, board: boardOf(r), boardLabel: r.source.board ?? r.title, title: r.title, sourceVerified: !maths.chapters.some((c) => c.sourceVerified === false) },
    nodes,
    outcomes,
    competencies,
    names,
  };
}

export const fileOf = (r: { id: string; version: string }) => `${r.id}@${r.version}.json`;

/** Every board release's index, and the small top-level index (per-grade unique competency ids for whole-subject totals). */
export function buildDashboard(): { index: DashIndex; releases: DashRelease[] } {
  const releases = boardReleases.map(releaseIndex);
  const withModule = new Set(releases.flatMap((r) => Object.values(r.competencies).filter((c) => c.module).map((c) => c.id)));
  return {
    index: {
      schema: "dashboard-index@1",
      generated: { families: specs.size, problems: [...specs.values()].reduce((n, s) => n + s.poolSize, 0), writtenTasks: writtenTasks.length, requirements: matrix.summary.requirements, modules: withModule.size },
      releases: releases
        .map((d) => ({ board: d.release.board, grade: d.release.grade, release: d.release.id, version: d.release.version, file: fileOf(d.release), chapters: d.nodes.length, competencies: scopeOfAll(d.nodes).competencies, outcomes: Object.keys(d.outcomes).length }))
        .sort((a, b) => a.board.localeCompare(b.board) || a.grade - b.grade),
    },
    releases,
  };
}
