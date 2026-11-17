/** try-as-child@1: the skills the owner can open, and the search over them (no screens here, so it can be tested alone). */
import { moduleFor } from "../../../packages/learning/src/content";
import { BOARD_STEM, latestReleases, type BoardId } from "../../../packages/learning/src/curricula";
import { assigned, type CurriculumRelease } from "../../../packages/learning/src/curriculum";
import { graph } from "../../../packages/learning/src/graph";
import { kidName } from "./kid";

export const BOARD_NAME: Record<BoardId, string> = { icse: "ICSE", cbse: "CBSE", tn: "Tamil Nadu" };
const boardOf = (r: CurriculumRelease) => (Object.keys(BOARD_STEM) as BoardId[]).find((b) => r.id.startsWith(BOARD_STEM[b])) ?? null;
export interface Skill { competency: string; name: string; chapter: string; release: CurriculumRelease; board: BoardId }
/** Every skill of every board's latest book, in book order (a skill appears once for each class that has it). */
export function allSkills(): Skill[] {
  const out: Skill[] = [];
  for (const r of latestReleases) {
    const board = boardOf(r);
    if (!board) continue;
    const seen = new Set<string>();
    for (const a of assigned(r)) {
      if (seen.has(a.competency) || !moduleFor(a.competency)) continue;
      seen.add(a.competency);
      out.push({ competency: a.competency, name: kidName(a.competency, graph.byId.get(a.competency)?.name ?? a.competency), chapter: a.chapter.title, release: r, board });
    }
  }
  return out;
}
/** The skills to list: a search looks through every class and board (name, chapter, id); with none, the chosen class. */
export function findSkills(all: Skill[], board: BoardId, grade: number, search: string): Skill[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return all.filter((s) => s.board === board && s.release.grade === grade);
  const hay = (s: Skill) => `${s.name} ${s.chapter} ${s.competency} ${graph.byId.get(s.competency)?.name ?? ""}`.toLowerCase();
  return all.filter((s) => words.every((w) => hay(s).includes(w))).sort((a, b) => Number(b.board === board) - Number(a.board === board) || Math.abs(a.release.grade - grade) - Math.abs(b.release.grade - grade)).slice(0, 60);
}
