/**
 * The sample reviewed curriculum releases (generated from the synthetic CC0 textbooks by scripts/releases.ts). Every
 * version is kept: a learner's records refer to a release by id, version and content hash, and an older version
 * stays readable after a newer one is published. New enrolments use the latest version.
 */
import type { CurriculumRelease } from "./curriculum";
import r0 from "../../../content/learning/curricula/discovering-mathematics-learner-s-book-4.v1.1.0.json";
import r1 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-4.v1.0.0.json";
import r2 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-4.v1.1.0.json";
import r3 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-5.v1.0.0.json";
import r4 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-5.v1.1.0.json";
import r5 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-7.v1.0.0.json";
import r6 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-7.v1.1.0.json";
import r7 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-8.v1.0.0.json";
import r8 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-8.v1.1.0.json";
import r9 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-10.v1.0.0.json";
import r10 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-10.v1.1.0.json";
import r11 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-11.v1.0.0.json";
import r12 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-11.v1.1.0.json";
import r13 from "../../../content/learning/curricula/openpath-sample-mathematics-grade-12.v1.1.0.json";
import r14 from "../../../content/learning/curricula/board-b-sample-mathematics-class-10.v1.1.0.json";

import { boardReleases } from "./board-releases";

/** The synthetic sample releases (development and acceptance tests) and the real boards' releases (boards@1). */
export const allReleases = [...([r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] as unknown as CurriculumRelease[]), ...boardReleases];
const newer = (a: string, b: string) => a.split(".").map(Number).reduce((d, x, i) => d || x - Number(b.split(".")[i] ?? 0), 0) > 0;
/** The latest version of each release. */
export const sampleReleases = allReleases.filter((r) => !allReleases.some((x) => x.id === r.id && newer(x.version, r.version)));
/** The default sample textbook for a grade (the OpenPath sample series). */
export const sampleFor = (grade: number) => sampleReleases.find((r) => r.grade === grade && r.id.startsWith("openpath-sample-")) ?? null;
/** The board's release for a grade (boards@1): "cbse" (NCERT textbooks) or "tn" (Tamil Nadu State Board). */
export const boardFor = (board: "cbse" | "tn", grade: number) => sampleReleases.find((r) => r.grade === grade && r.id === `${board === "cbse" ? "cbse-ncert" : "tn-samacheer"}-mathematics-grade-${grade}`) ?? null;
/** Every latest release for a grade (several boards or textbooks). */
export const releasesFor = (grade: number) => sampleReleases.filter((r) => r.grade === grade);
/** A release by reference: any built-in version, or one the learner's own records saved (matched by hash). */
export function releaseFor(ref: { id: string; version: string; hash: string }, saved: Map<string, CurriculumRelease>): CurriculumRelease | null {
  const same = (x: CurriculumRelease | undefined) => !!x && x.id === ref.id && x.version === ref.version && x.hash === ref.hash;
  return allReleases.find(same) ?? [...saved.values()].find(same) ?? null;
}
