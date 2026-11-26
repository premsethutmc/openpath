/**
 * own-numbers@1 (owner, 26 Nov 2026): the numbers of an explanation that a learner can change in place. A changeable
 * number sits in a soft tile (it reads as a number, not a link); one tap turns it into a box to type in, and the whole
 * explanation is written again for the new number (packages/learning/src/vary.ts). A number that does not fit gets a
 * short note and the last good one stays. The first time on a device the tiles pulse once with one line of hint.
 *
 * What the learner tried is kept in their record (record "explore"): which numbers, on which screen. It is never an
 * attempt and never evidence of the skill: it says what the child explored, for the parent and for choosing examples.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { explored, explorerFor, type Explored } from "../../../packages/learning/src/explore";
import { problemOf } from "../../../packages/learning/src/families";
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
  const line = (text: string) => {
    const parts = fillParts(text, values);
    // a matrix written in the sentence ([[a, b], [c, d]]) is drawn from the whole sentence, so its tiles follow it
    if (/\[\[/.test(text) && parts.some((p) => typeof p !== "string")) {
      const whole = parts.map((p) => (typeof p === "string" ? p : String(p.value))).join("");
      return <>{mx(whole)}<span className="own-row"> Change: {parts.filter((p): p is Exclude<Part, string> => typeof p !== "string").map((p, k) => tile(p, k))}</span></>;
    }
    return <>{parts.map((p, k) => (typeof p === "string" ? <Fragment key={k}>{mx(p)}</Fragment> : tile(p, k)))}</>;
  };
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

/**
 * own-numbers@1 in a lesson's worked example: the numbers of the example's question that its family can change
 * (explore.ts) sit in tiles in the question itself. Typing another makes the question, its picture, its working and its
 * answer again from the family (one number at a time, as the family allows). This replaces the separate "What if the
 * numbers change?" box in the child's lesson.
 */
export interface OwnExample { explored: Explored | null; line: (text: string) => ReactElement; note: ReactElement | null; back: ReactElement | null }
const NUM = /\d+(?:[.,]\d+)*/g;
export function useOwnExample(qid: string | null, competency?: string): OwnExample | null {
  const e = useMemo(() => (qid ? explorerFor(qid, { picture: false }) : null), [qid]);
  const base = useMemo(() => { try { return e ? problemOf(e.base)?.prompt ?? "" : ""; } catch { return ""; } }, [e]);
  const [at, setAt] = useState<{ dial: number; value: number } | null>(null);
  const [edit, setEdit] = useState<{ dial: number; draft: string } | null>(null);
  const [note, setNote] = useState("");
  const kept = useRef("");
  // a lesson moves to its next screen in the same component: the chosen numbers belong to one example
  const [forQid, setForQid] = useState(qid);
  if (forQid !== qid) { setForQid(qid); setAt(null); setEdit(null); setNote(""); }
  if (!e) return null;
  const x = at ? explored(e, at.dial, at.value) : null;
  const changed = !!x?.changed;
  const dials = e.dials.map((d, i) => ({ d, i, place: d.shown === null ? -1 : (base.match(NUM) ?? []).indexOf(d.shown) })).filter((t) => t.place >= 0);
  // the number the child sees for each value of a dial (the family's number may be another: x in "x − 4 = 11" is 15)
  const seen = (dial: number) => { const t = dials.find((q) => q.i === dial)!; return new Map(e.dials[dial].values.map((v) => [(explored(e, dial, v)?.prompt.match(NUM) ?? [])[t.place]?.replace(/,/g, "") ?? "", v] as const).filter(([k]) => k)); };
  const close = () => {
    setEdit(null); setNote("");
    if (at && changed && competency) { const label = `p${e.dials[at.dial].index}=${at.value}`; if (label !== kept.current) { kept.current = label; ownNumbers.record?.(competency, `example:${qid}`.slice(0, 200), label); } }
  };
  const type = (dial: number, raw: string) => {
    setEdit({ dial, draft: raw });
    const shown = seen(dial), v = shown.get(raw.replace(/,/g, "").trim());
    if (!raw.trim()) { setNote(""); return; }
    if (v === undefined) { setNote(`Try one of these: ${[...shown.keys()].map(Number).sort((x, y) => x - y).join(", ")}.`); return; }
    setNote(""); setAt({ dial, value: v });
  };
  const line = (text: string) => {
    // which number of the shown question is each dial's: in the family's own question by place, else the first match
    const shown = changed && x ? x.prompt : text;
    const tokens = [...shown.matchAll(NUM)];
    const tiles = new Map<number, number>();
    for (const t of dials) {
      const k = changed && x ? t.place : tokens.findIndex((m, j) => m[0] === t.d.shown && !tiles.has(j));
      if (k >= 0 && k < tokens.length && !tiles.has(k)) tiles.set(k, t.i);
    }
    const out: ReactElement[] = [];
    let last = 0;
    tokens.forEach((m, j) => {
      if (!tiles.has(j)) return;
      const dial = tiles.get(j)!, idx = m.index ?? 0;
      if (idx > last) out.push(<Fragment key={`t${j}`}>{mx(shown.slice(last, idx))}</Fragment>);
      out.push(edit?.dial === dial
        ? <TileInput key={`i${j}`} value={edit.draft} label={`Change ${m[0]}`} onType={(v) => type(dial, v)} onDone={close} />
        : <button key={`b${j}`} type="button" className="own-tile" data-own={`p${e.dials[dial].index}`} aria-label={`${m[0]}. Tap to change it`} onClick={() => { setEdit({ dial, draft: m[0].replace(/,/g, "") }); setNote(""); }}>{m[0]}</button>);
      last = idx + m[0].length;
    });
    if (last < shown.length) out.push(<Fragment key="end">{mx(shown.slice(last))}</Fragment>);
    return <>{out}</>;
  };
  return {
    explored: changed ? x : null, line,
    note: note ? <p className="own-note" role="status">{note}</p> : null,
    back: changed ? <button type="button" className="link own-back" onClick={() => { setAt(null); setEdit(null); setNote(""); }}>Back to the first numbers</button> : null,
  };
}
