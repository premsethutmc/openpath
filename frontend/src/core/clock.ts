/**
 * The app's idea of "now". Reviewers can shift it forward to see what the
 * profile looks like after days have passed, without waiting for them.
 * (The server only honours client dates when OPENPATH_TRUST_CLIENT_CLOCK is on.)
 */
import { load, save } from "./storage";

const KEY = "openpath.clockOffsetDays";
const DAY = 24 * 60 * 60 * 1000;

export const offsetDays = (): number => load<number>(KEY, 0);
export const now = (): Date => new Date(Date.now() + offsetDays() * DAY);
export const skipDays = (days: number): void => save(KEY, offsetDays() + days);
export const resetClock = (): void => save(KEY, 0);
