/** line-check@1: the extra keys under the working box on a question beyond arithmetic, and how a key joins a line. */
export const MORE_KEYS = ["x", "²", "³", "^", "√", "π", "∫", "to", "[", "]", "sin", "cos", "tan"];
/** How a key joins what is already typed: a power sits against its base (3², x^4), an opening bracket against what follows it. */
const TIGHT = new Set(["²", "³", "^"]), OPENS = new Set(["(", "[", "√"]), CLOSES = new Set([")", "]"]);
export function typeKey(line: string, k: string): string {
  if (TIGHT.has(k)) return `${line.replace(/\s+$/, "")}${k}`;
  if (CLOSES.has(k)) return `${line.replace(/\s+$/, "")}${k} `;
  const lead = /\s$|^$|[(\[√^]$/.test(line) ? "" : " ";
  return OPENS.has(k) ? `${line}${lead}${k}` : `${line}${lead}${k} `;
}
