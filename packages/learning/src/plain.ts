/** plain-reading@1: split a sentence joined with a semicolon ("…each time; find…" → "…each time. Find…"). Notation is left
 * alone: only "; " before a lower-case word is split. */
export const plainSentences = (t: string): string => t.replace(/;\s+([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`);
