/**
 * reading-ai@1: a second check by the AI when the on-device rules mark a typed reading answer wrong. The server holds
 * the key, the prompt and the limits (backend/family/reading_ai.py). Only for a signed-in parent account, where the
 * server says it is on, after a parent's own yes for this. A failure or a "no" leaves the rules' mark as it was.
 */
import type { Api } from "../account.ts";

export interface ReadingAiStatus {
  available: boolean;
  consent: boolean;
}
export interface ReadingAiService {
  status(): Promise<ReadingAiStatus>;
  agree(granted: boolean): Promise<void>;
  /** True: the AI says the answer is right. Throws when there is no second check (limit, error, switched off). */
  check(item: string, answer: string): Promise<boolean>;
}

export const READING_AI_TIMEOUT_MS = 20_000;
export const READING_AI_CONSENT = "For a parent: when the app marks a typed reading answer wrong, it may send that answer (not the child's name) to an AI model for a second check. E-mail addresses and phone numbers are removed, and the answer is not kept.";

export function readingAiFor(api: Pick<Api, "request">, pupil: string): ReadingAiService {
  const path = `/pupils/${pupil}/reading-ai/`;
  return {
    status: () => api.request<ReadingAiStatus>("GET", path),
    agree: async (granted) => void (await api.request("POST", `${path}consent/`, { granted })),
    check: async (item, answer) => (await api.request<{ right: boolean }>("POST", path, { item, answer }, READING_AI_TIMEOUT_MS)).right === true,
  };
}
