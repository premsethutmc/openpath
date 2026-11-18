/**
 * clips@1: a short recorded explanation of a building-block skill (long division, multiplication facts), made once by a
 * person or a character and kept OUTSIDE the app: this file holds only where each one lives, so the app does not grow.
 *
 * Second-level help: a clip is offered inside the opened "This needs" / "Why?" card, after the written rule and its
 * example, never as the first thing. Nothing is fetched until the learner taps it. A skill with no clip shows nothing.
 *
 * To add one: host the reviewed file, then add its skill here. `url` must be an https link to a video file (mp4 or webm).
 */
export interface Clip { url: string; title: string; /** length in seconds, said on the button so the learner knows what they are opening */ seconds: number }
export const CLIPS: Record<string, Clip> = {};
export const clipOk = (c: Clip) => /^https:\/\/[^\s]+\.(mp4|webm)(\?[^\s]*)?$/.test(c.url) && c.title.trim().length > 2 && c.title.length <= 60 && Number.isInteger(c.seconds) && c.seconds >= 10 && c.seconds <= 180;
export const clipFor = (competency: string | null | undefined): Clip | null => (competency && Object.prototype.hasOwnProperty.call(CLIPS, competency) && clipOk(CLIPS[competency]) ? CLIPS[competency] : null);
