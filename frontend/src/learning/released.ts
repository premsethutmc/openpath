/**
 * TEST ONLY: a review registry in which the named families and modules went through the whole workflow (synced,
 * submitted, approved by a synthetic educator, released by a synthetic release manager). The repository's own
 * registry is never changed by tests.
 */
import { modules } from "../../../packages/learning/src/content";
import { decide, release, submit, sync, syncFamily, type Registry, type ReviewEntry } from "../../../packages/learning/src/review";
import { validateFamily } from "../../../packages/learning/src/spec";
import { validateModule } from "../../../packages/learning/src/validate";

export const RELEASED_AT = "2020-01-01T00:00:00Z";
export function releasedRegistry(families: string[], competencies: string[], at = RELEASED_AT): Registry {
  const reg: Registry = { schema: "content-review@2", note: "test", entries: [] };
  const approve = (e: ReviewEntry) => decide(e, { by: "A. Teacher (synthetic educator)", role: "educator" }, "approve", at, "checked in a test");
  for (const f of families) {
    const v = validateFamily(f);
    const e = approve(submit(syncFamily(undefined, f, at), "engineering (test)", at, [...v.deterministic.failures, ...v.property.failures, ...v.boundary.failures]));
    reg.entries.push(release(e, "release manager (test)", at, reg));
  }
  for (const c of competencies) {
    const m = modules.find((x) => x.competency === c)!;
    const e = approve(submit(sync(undefined, m, "OpenPath author", at), "engineering (test)", at, validateModule(m)));
    reg.entries.push(release(e, "release manager (test)", at, reg));
  }
  return reg;
}
