import {
  activities,
  diagnostic,
  evidence,
  items,
  practice,
  type ResponseEvidence,
} from "../../../packages/tamil/src/index";
export type Phase = "welcome" | "diagnostic" | "teach" | "practice" | "done";
export interface Presentation {
  itemId: string;
  family: string;
  at: string;
  hint: boolean;
}
export interface Session {
  presentations: Presentation[];
  version: 1;
  learnerId: string;
  sessionId: string;
  phase: Phase;
  cursor: number;
  diagnosticIds: string[];
  practiceIds: string[];
  target: string;
  events: ResponseEvidence[];
}
export function newSession(
  learnerId: string,
  events: ResponseEvidence[] = [],
  presentations: Presentation[] = [],
): Session {
  const seen = new Set([
    ...events
      .filter((e) => e.learnerId === learnerId)
      .map((e) => e.item.family),
    ...presentations.map((p) => p.family),
  ]);
  return {
    presentations,
    version: 1,
    learnerId,
    sessionId: crypto.randomUUID(),
    phase: "welcome",
    cursor: 0,
    diagnosticIds: diagnostic.map(
      (d) =>
        (
          items.find(
            (i) =>
              i.stage === "independent" &&
              i.competencies[0] === d.competencies[0] &&
              !seen.has(i.family),
          ) ?? d
        ).id,
    ),
    practiceIds: [],
    target: "TA.composition",
    events,
  };
}
export function answerSession(
  s: Session,
  response: string,
  hint: boolean,
  at = new Date().toISOString(),
): Session {
  if (s.phase !== "diagnostic" && s.phase !== "practice")
    throw Error("No active question");
  const list = s.phase === "diagnostic" ? s.diagnosticIds : s.practiceIds;
  const item = items.find((i) => i.id === list[s.cursor]);
  if (
    !item ||
    !s.presentations.length ||
    s.presentations.at(-1)?.itemId !== item.id ||
    !response.trim() ||
    response.length > 120
  )
    throw Error("Invalid answer");
  hint = hint || s.presentations.some((p) => p.itemId === item.id && p.hint);
  const event = evidence(
    item,
    response,
    {
      id: crypto.randomUUID(),
      learnerId: s.learnerId,
      sessionId: s.sessionId,
      at,
      hint: hint || s.presentations.at(-1)!.hint,
      priorPresentations: s.presentations.slice(0, -1),
      revealed: hint || s.presentations.at(-1)!.hint || item.stage === "guided",
      instructionBefore: s.phase === "practice",
    },
    s.events,
  );
  const events = [...s.events, event];
  if (s.cursor + 1 < list.length) return { ...s, events, cursor: s.cursor + 1 };
  if (s.phase === "practice") return { ...s, events, phase: "done", cursor: 0 };
  const target =
    events.find((e) => e.sessionId === s.sessionId && !e.correct)
      ?.competencies[0] ??
    (s.diagnosticIds.length === 1 ? item.competencies[0] : "TA.composition");
  return {
    ...s,
    events,
    target,
    phase: "teach",
    cursor: 0,
    practiceIds: practice(target, events, s.presentations).map((i) => i.id),
  };
}
export const beginPractice = (s: Session): Session => ({
  ...s,
  phase: s.practiceIds.length ? "practice" : "done",
  cursor: 0,
});
export function parseSession(raw: string, learnerId?: string): Session {
  const s = JSON.parse(raw) as Session;
  if (
    s.version !== 1 ||
    !activities.some((a) => a.competency === s.target) ||
    !["welcome", "diagnostic", "teach", "practice", "done"].includes(s.phase) ||
    !s.learnerId ||
    !s.sessionId ||
    (learnerId && learnerId !== s.learnerId) ||
    !Array.isArray(s.presentations) ||
    s.presentations.some(
      (p) =>
        !items.some((i) => i.id === p.itemId && i.family === p.family) ||
        !Number.isFinite(Date.parse(p.at)) ||
        typeof p.hint !== "boolean",
    ) ||
    !Array.isArray(s.events) ||
    !Array.isArray(s.diagnosticIds) ||
    !Array.isArray(s.practiceIds) ||
    !Number.isInteger(s.cursor) ||
    s.cursor < 0 ||
    [...s.diagnosticIds, ...s.practiceIds].some(
      (id) => !items.some((i) => i.id === id),
    ) ||
    s.events.some(
      (e) =>
        e.schema !== "openpath.language-evidence.v1" ||
        e.learnerId !== s.learnerId,
    )
  )
    throw Error("Invalid saved Tamil session");
  const list = s.phase === "diagnostic" ? s.diagnosticIds : s.practiceIds;
  if (["diagnostic", "practice"].includes(s.phase) && s.cursor >= list.length)
    throw Error("Invalid saved position");
  return s;
}

/** Persist a presentation before accepting input; reload and abandoned prompts count as exposure. */
export function present(s: Session, at = new Date().toISOString()): Session {
  const id = (
    s.phase === "diagnostic"
      ? s.diagnosticIds
      : s.phase === "practice"
        ? s.practiceIds
        : []
  )[s.cursor];
  const item = items.find((i) => i.id === id);
  if (!item) return s;
  return {
    ...s,
    presentations: [
      ...s.presentations,
      { itemId: item.id, family: item.family, at, hint: false },
    ],
  };
}
export function revealHint(s: Session): Session {
  if (!s.presentations.length) throw Error("No presented item");
  return {
    ...s,
    presentations: s.presentations.map((p, i) =>
      i === s.presentations.length - 1 ? { ...p, hint: true } : p,
    ),
  };
}

/** Optional focused entry gives every pilot competency a reachable diagnostic and lesson. */
export function focusSession(s: Session, competency: string): Session {
  if (!activities.some((a) => a.competency === competency))
    throw Error("Not a pilot competency");
  const next = newSession(s.learnerId, s.events, s.presentations);
  const seen = new Set(s.presentations.map((p) => p.family));
  const pool = items.filter(
    (i) => i.competencies.includes(competency) && i.stage === "independent",
  );
  const item = pool.find((i) => !seen.has(i.family)) ?? pool[0];
  return {
    ...next,
    phase: "diagnostic",
    target: competency,
    diagnosticIds: [item.id],
  };
}
