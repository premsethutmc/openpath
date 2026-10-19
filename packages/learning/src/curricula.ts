/** The sample reviewed curriculum releases (generated from the synthetic CC0 textbooks by scripts/releases.ts). */
import type { CurriculumRelease } from "./curriculum";
import g4 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-4.v1.0.0.json";
import g5 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-5.v1.0.0.json";
import g7 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-7.v1.0.0.json";
import g8 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-8.v1.0.0.json";
import g10 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-10.v1.0.0.json";
import g11 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-11.v1.0.0.json";

export const sampleReleases = [g4, g5, g7, g8, g10, g11] as unknown as CurriculumRelease[];
export const sampleFor = (grade: number) => sampleReleases.find((r) => r.grade === grade) ?? null;
/** A release by reference: the built-in samples, or one the learner's own records saved (matched by hash). */
export function releaseFor(ref: { id: string; version: string; hash: string }, saved: Map<string, CurriculumRelease>): CurriculumRelease | null {
  const same = (x: CurriculumRelease | undefined) => !!x && x.id === ref.id && x.version === ref.version && x.hash === ref.hash;
  return sampleReleases.find(same) ?? [...saved.values()].find(same) ?? null;
}
