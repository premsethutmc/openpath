/**
 * own-numbers@1 (owner, 26 Nov 2026): the numbers of an explanation that a learner can change in place. A changeable
 * number sits in a soft tile (it reads as a number, not a link); one tap turns it into a box to type in, and the whole
 * explanation is written again for the new number (packages/learning/src/vary.ts). A number that does not fit gets a
 * short note and the last good one stays. The first time on a device the tiles pulse once with one line of hint.
 *
 * What the learner tried is kept in their record (record "explore"): which numbers, on which screen. It is never an
 * attempt and never evidence of the skill: it says what the child explored, for the parent and for choosing examples.
 */
import { Fragment, useEffect, useRef, useState, type ReactElement } from "react";
import { fillParts, inputsOf, isInput, refusal, valuesOf, type Part, type Values, type VarySpec } from "../../../packages/learning/src/vary";
import { mx } from "./MatrixText";

/** Where a learner's own example is recorded. The app sets it once a learner is known; unset, nothing is kept. */
export const ownNumbers: { record?: (competency: string, screen: string, values: string) => void } = {};

const HINT = "openpath:own-numbers-hint@1";
const seenHint = () => { try { return localStorage.getItem(HINT) === "1"; } catch { return true; } };
const markHint = () => { try { localStorage.setItem(HINT, "1"); } catch { /* private mode: the hint may show again */ } };

export interface Own {
  values: Values;
  changed: boolean;
  /** One sentence, its tiles live. */
  line: (text: string) => ReactElement;
  /** One sentence as plain text (no tiles), for steps and checks. */
  text: (text: string) => string;
  hint: ReactElement | null;
  note: ReactElement | null;
  back: ReactElement | null;
}

export function useOwnNumbers(spec: VarySpec | null, where?: { competency?: string; screen: string }): Own | null {
  const [chosen, setChosen] = useState<Values>({});
  const [edit, setEdit] = useState<{ key: string; draft: string } | null>(null);
  const [note, setNote] = useState("");
  const [hint] = useState(() => !seenHint());
  const [touched, setTouched] = useState(false);
  const kept = useRef<string>("");
  if (!spec) return null;
  const inputs = inputsOf(spec.vary);
  const values = valuesOf(spec.vary, chosen);
  const first = valuesOf(spec.vary);
  const changed = inputs.some((k) => values[k] !== first[k]);
  const close = () => {
    setEdit(null); setNote("");
    const label = inputs.map((k) => `${k}=${values[k]}`).join(",");
    if (changed && label !== kept.current && where?.competency) { kept.current = label; ownNumbers.record?.(where.competency, where.screen.slice(0, 200), label); }
  };
  const type = (key: string, raw: string) => {
    const why = refusal(spec, key, raw, values);
    setEdit({ key, draft: raw });
    if (why) { setNote(raw.trim() ? why : ""); return; }
    setNote(""); setChosen({ ...chosen, [key]: Number(raw) });
  };
  const open = (key: string) => { setEdit({ key, draft: String(values[key]) }); setNote(""); if (!touched) { setTouched(true); markHint(); } };
  const tile = (p: Exclude<Part, string>, k: number) => {
    const d = spec.vary[p.tap];
    const what = isInput(d) ? `${p.value}. Tap to change it (${d.min} to ${d.max})` : String(p.value);
    return edit?.key === p.tap
      ? <TileInput key={k} value={edit.draft} label={`Change ${p.value}`} onType={(v) => type(p.tap, v)} onDone={close} />
      : <button key={k} type="button" className={`own-tile${hint && !touched ? " pulse" : ""}`} aria-label={what} data-own={p.tap} onClick={() => open(p.tap)}>{p.value}</button>;
  };
  const line = (text: string) => <>{fillParts(text, values).map((p, k) => (typeof p === "string" ? <Fragment key={k}>{mx(p)}</Fragment> : tile(p, k)))}</>;
  const text = (t: string) => fillParts(t, values).map((p) => (typeof p === "string" ? p : String(p.value))).join("");
  return {
    values, changed, line, text,
    hint: hint && !touched ? <p className="own-hint" role="note">Tap a number to change it.</p> : null,
    note: note ? <p className="own-note" role="status">{note}</p> : null,
    back: changed ? <button type="button" className="link own-back" onClick={() => { setChosen({}); setEdit(null); setNote(""); }}>Back to the first numbers</button> : null,
  };
}

function TileInput({ value, label, onType, onDone }: { value: string; label: string; onType: (v: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return <input ref={ref} className="own-tile own-input" inputMode="numeric" autoComplete="off" aria-label={label} value={value} size={Math.max(2, value.length)} onChange={(e) => onType(e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={onDone} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onDone(); } }} />;
}
