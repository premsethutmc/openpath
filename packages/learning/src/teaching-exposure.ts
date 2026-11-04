import { moduleFor } from './content';
import { exposureKey } from './families';
import type { LearnerRecords } from './records';
/** Conservative display exposure, separate from attempts and independent evidence. */
export function taughtExposureKeys(records: LearnerRecords, before = '\uffff'): Set<string> {
  const seen = new Set<string>();
  for (const t of records.teaching.filter((t) => t.at < before)) {
    const m = moduleFor(t.competency);
    if (!m) continue;
    const strategy = m.strategies.find((s) => s.id === t.strategy);
    for (const id of [strategy?.guided, ...m.chapter.map((s) => s.instance), ...(strategy?.screens.map((s) => s.instance) ?? [])]) if (id) seen.add(exposureKey(id));
  }
  return seen;
}
