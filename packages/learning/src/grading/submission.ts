/**
 * D1: how one typed submission is split into the final answer and the working lines. Syntax only — nothing here judges mathematics.
 *   "3x = 15; x = 5"  -> response "x = 5", working ["3x = 15", "x = 5"]   (lines separated by ";" or new lines; the answer line stays in the working)
 *   "x = 5" / "5"     -> response "x = 5", working []                        (a bare answer is an answer, never working)
 *   "3x = 15"         -> response "",      working ["3x = 15"]              (an equation that does not isolate the unknown is a step, not an answer;
 *                                                                         so is a line of words: "divide by 3 so x is 5")
 * Splitting applies only to questions whose task the derivation authority reads (`stated`); any other question's text is its answer, unchanged.
 */
const isAnswerLine = (l: string) => (!l.includes("=") && !/[A-Za-z]{2,}/.test(l)) || /^[a-z]\s*=\s*[^a-z=<>]+$/i.test(l) || /^[a-z]\s*=\s*[^=<>]+(?:\s+or\s+[a-z]\s*=\s*[^=<>]+)+$/i.test(l);
export function readSubmission(text: string, stated: boolean): { response: string; working: string[] } {
  if (!stated) return { response: text, working: [] };
  const lines = text.split(/;|\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (!lines.length) return { response: "", working: [] };
  const last = lines[lines.length - 1];
  if (lines.length === 1) return isAnswerLine(last) ? { response: last, working: [] } : { response: "", working: lines };
  return { response: isAnswerLine(last) ? last : "", working: lines };
}
