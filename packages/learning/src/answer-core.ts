/** Answer rules shared by every pathway (learning questions and authored units): one definition, no imports, safe in the browser. */

/** A whole number, optionally typed with a zero or non-zero decimal part ("5.0" is 5; "5.5" is 5.5, a different value). Null when it is not a number of this form. */
export function canonicalInteger(raw: string): string | null {
  const t = raw.trim().replace(/−/g, "-");
  return /^[+-]?\d{1,9}(\.\d{0,9})?$/.test(t) ? String(Number(t)) : null;
}

/** The elements of an unordered set written with or without braces: "{1, 2}" and "1, 2" are the same list. */
export function unbrace(raw: string): string {
  return raw.trim().replace(/^\{([^{}]*)\}$/, "$1");
}

/** Compare answers made of rational parts: ordered (a tuple) or unordered (a set). Parts are already canonical strings paired with a sort value. */
export function joinParts(parts: { show: string; value: number }[], unordered: boolean): string {
  return (unordered ? [...parts].sort((a, b) => a.value - b.value) : parts).map((p) => p.show).join(",");
}
