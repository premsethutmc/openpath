/** plain-reading@1: split a sentence joined with a semicolon ("…each time; find…" → "…each time. Find…"). Notation is left
 * alone (only "; " before a lower-case word is split), and so is anything quoted (“…”): a quoted question stays as asked. */
export const plainSentences = (t: string): string =>
  t.split(/(“[^”]*”)/).map((part) => (part.startsWith("“") ? part : part.replace(/;\s+([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`))).join("");
