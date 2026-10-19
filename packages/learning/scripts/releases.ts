/**
 * Regenerate the sample reviewed curriculum releases from the synthetic textbooks (deterministic).
 * Earlier versions are kept unchanged (learners' records refer to them by hash); this writes version 1.1.0 (mapping@2).
 * The sample review accepts the top proposal of every clear or uncertain mapping and records which were uncertain;
 * it is not an educator review.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { review, synthesise, validateRelease, type ReviewDecision } from "../src/curriculum";

const root = join(import.meta.dirname, "../../../content/learning");
const VERSION = "1.1.0";
const index: { id: string; version: string; grade: number; title: string; hash: string; file: string; board?: string }[] = existsSync(join(root, "curricula", "index.json")) ? JSON.parse(readFileSync(join(root, "curricula", "index.json"), "utf8")).releases.filter((r: { version: string }) => r.version !== VERSION) : [];
for (const f of readdirSync(join(root, "textbooks")).filter((f) => f.startsWith("sample-") && (f.endsWith(".md") || f.endsWith(".txt"))).sort()) {
  const draft = synthesise(readFileSync(join(root, "textbooks", f), "utf8"), { version: VERSION });
  const outcomes = draft.subjects.flatMap((s) => s.chapters.flatMap((c) => c.outcomes));
  // the sample rule: a clear mapping's top proposal is accepted; an uncertain one only where the earlier reviewed
  // release (1.0.0) accepted that same competency for that outcome; otherwise it is left for a reviewer
  const prior = existsSync(join(root, "curricula", `${draft.id}.v1.0.0.json`)) ? JSON.parse(readFileSync(join(root, "curricula", `${draft.id}.v1.0.0.json`), "utf8")) : null;
  const priorAccepted = (oid: string): string[] => prior?.subjects.flatMap((s: { chapters: { outcomes: { id: string; mapping: { competencies: { id: string; status: string }[] } }[] }[] }) => s.chapters.flatMap((c) => c.outcomes)).find((o: { id: string }) => o.id === oid)?.mapping.competencies.filter((m: { status: string }) => m.status === "accepted").map((m: { id: string }) => m.id) ?? [];
  const decisions: ReviewDecision[] = outcomes.map((o) => {
    const top = o.mapping.competencies[0]?.id;
    if (o.mapping.verdict === "clear") return { outcome: o.id, accept: [top] };
    if (o.mapping.verdict === "uncertain" && top && priorAccepted(o.id).includes(top)) return { outcome: o.id, accept: [top] };
    return { outcome: o.id, accept: [] };
  });
  const uncertain = outcomes.filter((o) => o.mapping.verdict === "uncertain").map((o) => `${o.id}${decisions.find((d) => d.outcome === o.id)!.accept.length ? "" : " (left unmapped)"}`);
  const rel = review(draft, decisions, "OpenPath sample review (not an educator)", "2026-10-19T00:00:00.000Z", `Sample release for development and acceptance testing (mapping@2). Clear mappings: the top proposal was accepted. Uncertain mappings were accepted only where release 1.0.0 had accepted the same competency${uncertain.length ? ` (for an educator to check: ${uncertain.join(", ")})` : ""}. Not an educator review.`);
  const errs = validateRelease(rel);
  if (errs.length) throw new Error(`${f}: ${errs.join("; ")}`);
  const file = `${rel.id}.v${rel.version}.json`;
  writeFileSync(join(root, "curricula", file), JSON.stringify(rel, null, 1) + "\n");
  index.push({ id: rel.id, version: rel.version, grade: rel.grade, title: rel.title, hash: rel.hash, file, ...(rel.source.board ? { board: rel.source.board } : {}) });
  console.log(`${rel.grade} ${rel.id}@${rel.version} ${rel.hash} uncertain=${uncertain.length} missing=${outcomes.filter((o) => o.mapping.verdict === "missing").length}`);
}
index.sort((a, b) => a.grade - b.grade || a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
writeFileSync(join(root, "curricula", "index.json"), JSON.stringify({ releases: index }, null, 1) + "\n");
