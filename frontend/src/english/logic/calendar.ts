/**
 * Calendar days for rules that ask for evidence "on a later day" (misconception resolution).
 *
 * Every timestamp is stored and replayed as UTC (ISO 8601, `Date.toISOString()`); nothing here rewrites one. A
 * calendar day is computed when a rule is evaluated: in the pupil's (or school's) IANA time zone when the record
 * carries one, and otherwise in UTC — the explicit fallback for every record made so far, which carries no time zone.
 * The source of the time zone is the latest `preferences` event that has the optional `timeZone` (not yet written by the app:
 * recording it is a separate decision). An unknown or invalid zone also falls back to UTC, and says so.
 */
import type { AppState } from "./state.ts";

export interface DayBasis {
  /** The IANA time zone used, or "UTC". */
  zone: string;
  /** Why: the pupil's recorded zone, or the fallback. */
  source: "recorded" | "fallback_no_zone" | "fallback_invalid_zone";
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat | null {
  if (formatters.has(zone)) return formatters.get(zone)!;
  try {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(zone, f);
    return f;
  } catch {
    return null;
  }
}

/**
 * The time zone to judge calendar days in, and where it came from: the zone in effect at `at` (the latest preferences
 * event recording a zone at or before that moment), so a zone recorded later never re-dates earlier answers and replay
 * is deterministic. Without `at`, the latest recorded zone. An explicit override (tests, a reviewed school setting)
 * comes first.
 */
export function dayBasis(s: AppState | null, override?: string | null, at?: string): DayBasis {
  const recorded = s ? [...s.events].reverse().find((e) => e.kind === "preferences" && !!(e as { timeZone?: string }).timeZone && (at === undefined || e.at <= at)) : undefined;
  const zone = override || (recorded as { timeZone?: string } | undefined)?.timeZone || null;
  if (!zone) return { zone: "UTC", source: "fallback_no_zone" };
  return formatter(zone) ? { zone, source: "recorded" } : { zone: "UTC", source: "fallback_invalid_zone" };
}

/** The calendar day (YYYY-MM-DD) of a UTC timestamp in a time zone (UTC when the zone is "UTC"). */
export function calendarDay(iso: string, basis: DayBasis): string {
  if (basis.zone === "UTC") return iso.slice(0, 10);
  const parts = formatter(basis.zone)!.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year").padStart(4, "0")}-${get("month")}-${get("day")}`;
}

/** In words, for reasons and reports. */
export const basisWords = (b: DayBasis) => (b.source === "recorded" ? `days in ${b.zone}` : b.source === "fallback_invalid_zone" ? "UTC days (the recorded time zone is not valid)" : "UTC days (no time zone recorded)");
