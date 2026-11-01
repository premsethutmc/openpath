/**
 * retention-display@1 (Workstream H1): ONE contract for when a delayed check (and a hand-over re-entry) opens, used by scheduling, the
 * availability check and everything the learner is told.
 *
 *   The opening time is an exact instant (evidence.ts: independent success + RETENTION_DAYS, to the minute; handover@1: pause + REENTRY_DAYS).
 *   It opens when now >= that instant — nothing else (the server enforces the same seven full days, learning.py RETENTION_DELAY).
 *   Whenever it is shown, it is shown with its DATE, TIME and TIME ZONE, in the viewer's time zone: "Tue 10 Mar 2026, 14:05 (IST, Asia/Kolkata)".
 *
 * The due instant is NOT moved to the start of the calendar day: that would shorten the seven-day minimum by up to a day and disagree with
 * the server's check. A learner who returns on the shown date before the shown time is told the exact time it opens.
 */
export const RETENTION_DISPLAY = "retention-display@1" as const;

/** the instant in a time zone, with date, time and the zone: deterministic for a given (instant, zone, locale) */
export function formatInstant(iso: string, timeZone: string, locale = "en-GB"): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }).formatToParts(d);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // the zone's short name in English (PDT, GMT+5:30, UTC), whatever the display locale
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  return `${v("weekday")} ${v("day")} ${v("month")} ${v("year")}, ${v("hour")}:${v("minute")} (${zone}, ${timeZone})`;
}
/** the calendar date of the instant in a time zone, YYYY-MM-DD (what a date-only display would have shown) */
export function localDate(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const v = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
/** open exactly from the instant (the one availability rule) */
export const isOpen = (openAtIso: string | null | undefined, now: number) => !!openAtIso && now >= Date.parse(openAtIso);

export type DelayedCheckFact = { label: "Not yet" | "Due now" | "Passed" | "Missed"; text: string } | { label: "Opens"; text: string; at: string };
/** the topic page's "delayed check" fact (frontend/src/year/Main.tsx), from the evidence, in the viewer's time zone */
export function delayedCheckFact(e: { retention: string; retentionDueAt: string | null }, timeZone: string): DelayedCheckFact {
  if (e.retention === "scheduled" && e.retentionDueAt) return { label: "Opens", at: e.retentionDueAt, text: `Opens ${formatInstant(e.retentionDueAt, timeZone)}` };
  if (e.retention === "none") return { label: "Not yet", text: "Not yet" };
  if (e.retention === "due") return { label: "Due now", text: "Due now" };
  if (e.retention === "passed") return { label: "Passed", text: "Passed" };
  return { label: "Missed", text: "Missed" };
}
/** what the learner is told when a visit ends: the delayed check's or the re-entry's exact opening time (null when nothing is scheduled) */
export function scheduleNote(ms: { retentionOpensAt?: string; handover?: { route: string; eligibleAt: string | null } }, timeZone: string): string | null {
  if (ms.handover) {
    if (ms.handover.route === "wait" && ms.handover.eligibleAt) return `You can try this again on your own from ${formatInstant(ms.handover.eligibleAt, timeZone)}.`;
    if (ms.handover.route === "needs-teacher") return "This opens again once a teacher has gone through it with you.";
    return null;
  }
  return ms.retentionOpensAt ? `Your delayed check opens ${formatInstant(ms.retentionOpensAt, timeZone)}.` : null;
}
