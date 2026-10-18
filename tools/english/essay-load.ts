/** Node-side loading for essay-to-mastery: the Grade 8 profile and the lessons the app can show. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CompetencyProfile, type Context, type EssayContext, type EssayPolicy, ESSAY_POLICY_DRAFT, indexCompetencyProfile } from "../../packages/english-core/src/index.ts";
import { CONTENT, loadContext } from "./load.ts";

export const G8_PROFILE_FILE = join(CONTENT, "essay", "g8-writing.json");
export const LESSONS_FILE = join(CONTENT, "web", "lessons.json");

export function loadCompetencyProfile(path = G8_PROFILE_FILE): CompetencyProfile {
  return JSON.parse(readFileSync(path, "utf8")) as CompetencyProfile;
}

/** Lesson ids by capability, from the app's lesson file. */
export function loadLessonIndex(path = LESSONS_FILE): Map<string, string[]> {
  const file = JSON.parse(readFileSync(path, "utf8")) as { lessons: { id: string; capability: string }[] };
  const m = new Map<string, string[]>();
  for (const l of file.lessons) m.set(l.capability, [...(m.get(l.capability) ?? []), l.id]);
  return m;
}

/** The runtime framework (0.2.0), the live bank, the Grade 8 profile and the app's lessons. */
export function loadEssayContext(opts: { ctx?: Context; policy?: EssayPolicy } = {}): EssayContext {
  const ctx = opts.ctx ?? loadContext();
  return { ctx, profile: indexCompetencyProfile(loadCompetencyProfile(), ctx.index), lessons: loadLessonIndex(), policy: opts.policy ?? ESSAY_POLICY_DRAFT };
}
