/**
 * Question status (question-status@1): the one test every question selector and every grading route asks.
 *
 *   selectable(id)   false for a quarantined presentation: no learning, practice, diagnostic, transfer, retention, probe, recovery,
 *                    revision or study route may offer it (scripts/question-status.ts writes the registry; the route-coverage test
 *                    in question-status.test.ts checks every selector).
 *   quarantined(id)  the same fact for grading: decide() and the server grader return "unresolved" for it, never a verdict.
 * Quarantine never deletes anything: the question's definition and every historical record are kept.
 */
import data from "../../../content/learning/question-status.v1.json";

export interface StatusEntry { id: string; status: "quarantined"; reason: string; detail: string; since: string; evidence: string }
export const QUESTION_STATUS_SCHEMA = (data as { schema: string }).schema;
export const QUESTION_STATUS_HASH = (data as { hash: string }).hash;
const byId = new Map<string, StatusEntry>(((data as { entries: StatusEntry[] }).entries).map((e) => [e.id, e]));

export const statusEntry = (id: string): StatusEntry | null => byId.get(id) ?? null;
export const quarantined = (id: string): boolean => byId.has(id);
export const selectable = (id: string): boolean => !byId.has(id);
export const quarantinedIds = (): string[] => [...byId.keys()];
