/** Node-side loading for essay-to-mastery: the Grade 8 profile and the lessons the app can show. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CompetencyProfile, type Context, type EssayContext, type EssayPolicy, ESSAY_POLICY_DRAFT, indexCompetencyProfile, indexContent, indexFramework, type Item, type ItemPool, type Passage } from "../../packages/english-core/src/index.ts";
import { CONTENT, frameworkFile, loadBundle, loadContext, loadFramework, RUNTIME_FRAMEWORK, viewFor } from "./load.ts";

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

/** What each capability's lessons show (rule, examples, tip, check), to find questions whose answer they give away. */
export function loadLessonTexts(path = LESSONS_FILE): Map<string, string[]> {
  const file = JSON.parse(readFileSync(path, "utf8")) as { lessons: { capability: string; rule?: string; tip?: string; examples?: { text: string }[]; check?: { prompt: string; options: string[]; explain?: string } }[] };
  const m = new Map<string, string[]>();
  for (const l of file.lessons) {
    const parts = [l.rule ?? "", ...(l.examples ?? []).map((e) => e.text), l.tip ?? "", l.check?.prompt ?? "", ...(l.check?.options ?? []), l.check?.explain ?? ""].filter(Boolean);
    m.set(l.capability, [...(m.get(l.capability) ?? []), ...parts]);
  }
  return m;
}

/** The runtime framework (0.2.0), the live bank, the Grade 8 profile and the app's lessons (ids and teaching text). */
export function loadEssayContext(opts: { ctx?: Context; policy?: EssayPolicy; teachingText?: Map<string, string[]> } = {}): EssayContext {
  const ctx = opts.ctx ?? loadContext();
  return { ctx, profile: indexCompetencyProfile(loadCompetencyProfile(), ctx.index), lessons: loadLessonIndex(), teachingText: opts.teachingText ?? loadLessonTexts(), policy: opts.policy ?? ESSAY_POLICY_DRAFT };
}

export const PILOT_MANIFEST_FILE = join(CONTENT, "pilot", "manifest.json");

/** The pilot manifest's pools (pilot-content@2): existing item-role metadata, one use per question. */
export function loadPilotPools(path = PILOT_MANIFEST_FILE): Map<string, ItemPool> {
  const m = JSON.parse(readFileSync(path, "utf8")) as { pools: Record<string, { pool: ItemPool }> };
  return new Map(Object.entries(m.pools).map(([id, p]) => [id, p.pool]));
}

/**
 * The essay context with the bank the app ships (frontend/src/english/logic/content.ts): the core bank plus the
 * pilot's candidate questions and passages, and the pilot pools. The simulations and the coverage report use this,
 * so they describe what a learner would actually meet.
 */
export function loadAppEssayContext(opts: { policy?: EssayPolicy } = {}): EssayContext {
  const index = indexFramework(loadFramework(frameworkFile(RUNTIME_FRAMEWORK)));
  const bundle = loadBundle("current");
  const pilotItems = JSON.parse(readFileSync(join(CONTENT, "pilot", "items.json"), "utf8")) as Item[];
  const pilotPassages = JSON.parse(readFileSync(join(CONTENT, "pilot", "passages.json"), "utf8")) as Passage[];
  const content = indexContent(viewFor({ ...bundle, items: [...bundle.items, ...pilotItems], passages: [...bundle.passages, ...pilotPassages] }, index), index);
  const ctx: Context = { index, content, allowCandidateAnchors: false };
  return { ...loadEssayContext({ ctx, ...(opts.policy ? { policy: opts.policy } : {}) }), pools: loadPilotPools() };
}
