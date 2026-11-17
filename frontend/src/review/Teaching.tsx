/**
 * Teaching (teaching-review@1): the owner's dashboard for story lessons and help cards. Each is shown as the learner
 * sees it (the lesson can be played here), with where it came from (written, or made by rule from the skill's lesson),
 * and is approved, rejected or sent back in one step. The state is kept on the server (content_review.py), per version.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Api } from "../english/logic/account";
import { recipeFor, stepsOf } from "../../../packages/learning/src/recipe";
import { cardFor } from "../../../packages/learning/src/step-help";
import { RecipeLesson } from "../year/Recipe";

export interface TeachingItem {
  item: string; kind: "recipe" | "card"; competency: string; title: string; source: "written" | "rule"; from: string | null; classes: string[];
  contentHash: string; state: "submitted" | "approved" | "changes_requested" | "rejected"; changed: boolean;
  history: { state: string; by: string; at: string; note: string; current: boolean }[];
}
const WORD: Record<string, string> = { submitted: "To review", approved: "Approved", changes_requested: "Changes asked", rejected: "Rejected" };
const FROM: Record<string, string> = { method: "its “How to do it” section", lesson: "the first teaching words of its lesson", chapter: "the opening words of its chapter" };
export const sourceOf = (t: Pick<TeachingItem, "kind" | "source" | "from">) => (t.source === "written" ? "Written by hand for this skill" : `Made by rule from the skill’s own lesson (${FROM[t.from ?? ""] ?? "its lesson"})`);
/** The classes on offer, youngest first by number, with Class 5 chosen first. */
export const classesOf = (items: TeachingItem[]) => [...new Set(items.flatMap((t) => t.classes.map((c) => c.split(" ")[1])))].sort((a, b) => Number(a) - Number(b));
export const inClass = (t: TeachingItem, cls: string) => cls === "all" || t.classes.some((c) => c.split(" ")[1] === cls);

export function Teaching({ api, onError }: { api: Api; onError: (e: string) => void }) {
  const [items, setItems] = useState<TeachingItem[] | null>(null);
  const [cls, setCls] = useState("5");
  const [kind, setKind] = useState<"all" | "recipe" | "card">("all");
  const [state, setState] = useState("submitted");
  const [open, setOpen] = useState<string | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const load = () => api.request<{ items: TeachingItem[]; canDecide?: boolean }>("GET", "/content-review/teaching/").then((r) => { setItems(r.items); setCanDecide(!!r.canDecide); }).catch((e) => onError(String(e.message ?? e)));
  useEffect(() => { load(); }, []);
  const inScope = useMemo(() => (items ?? []).filter((t) => inClass(t, cls) && (kind === "all" || t.kind === kind)), [items, cls, kind]);
  if (!items) return <p className="muted">Loading the teaching…</p>;
  const shown = inScope.filter((t) => state === "all" || t.state === state);
  const count = (s: string) => inScope.filter((t) => t.state === s).length;
  const decide = async (t: TeachingItem, decision: string, note: string) => {
    onError("");
    try {
      await api.request("POST", "/content-review/decisions/", { item: t.item, decision, contentHash: t.contentHash, note });
      await load();
      return true;
    } catch (e) {
      onError(String((e as Error).message ?? e));
      return false;
    }
  };
  const current = open ? items.find((t) => t.item === open) ?? null : null;
  if (current) {
    const i = shown.findIndex((t) => t.item === current.item);
    const after = shown[i + 1] ?? shown.find((t) => t.item !== current.item) ?? null;
    return <Detail key={current.item} t={current} canDecide={canDecide} back={() => setOpen(null)} decide={async (d, n) => { if (await decide(current, d, n)) setOpen(after && state !== "all" ? after.item : current.item); }} />;
  }
  return (
    <div className="stack" data-testid="teaching">
      <h1>Teaching to approve</h1>
      <p className="small muted">Story lessons and help cards, as a child sees them. Nothing here is hidden from learners by a decision yet: this records your view of each one, for the version shown.</p>
      <div className="actions">
        <label className="field">Class<select aria-label="Class" value={cls} onChange={(x) => setCls(x.target.value)}>{classesOf(items).map((c) => <option key={c} value={c}>Class {c}</option>)}<option value="all">All classes</option></select></label>
        <label className="field">Kind<select aria-label="Kind" value={kind} onChange={(x) => setKind(x.target.value as typeof kind)}><option value="all">Lessons and cards</option><option value="recipe">Story lessons</option><option value="card">Help cards</option></select></label>
      </div>
      <nav className="review-nav" aria-label="State">
        {(["submitted", "approved", "changes_requested", "rejected"] as const).map((s) => <button key={s} className={state === s ? "primary" : "secondary"} onClick={() => setState(s)}>{WORD[s]} ({count(s)})</button>)}
        <button className={state === "all" ? "primary" : "secondary"} onClick={() => setState("all")}>All ({inScope.length})</button>
      </nav>
      {shown.length ? (
        <ul className="plain teaching-list">{shown.map((t) => (
          <li key={t.item}><button className="link" onClick={() => setOpen(t.item)}>{t.title}</button> <span className="small muted">· {t.kind === "recipe" ? "story lesson" : "help card"} · {t.source === "written" ? "written" : "by rule"}{state === "all" ? ` · ${WORD[t.state]}` : ""}{t.changed ? " · changed since you last decided" : ""}</span></li>
        ))}</ul>
      ) : <p className="muted">Nothing here.</p>}
    </div>
  );
}

function Detail({ t, canDecide, back, decide }: { t: TeachingItem; canDecide: boolean; back: () => void; decide: (d: string, note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [play, setPlay] = useState(false);
  const go = async (d: string) => { setBusy(true); await decide(d, note); setBusy(false); };
  return (
    <div className="stack" data-testid="teaching-item">
      <p><button className="link" onClick={back}>← Back to the list</button></p>
      <h1>{t.title}</h1>
      <p className="small muted">{t.kind === "recipe" ? "Story lesson" : "Help card"} · {t.classes.join(", ")} · {sourceOf(t)} · <b data-testid="state">{WORD[t.state]}</b>{t.changed ? " (changed since you last decided)" : ""}</p>
      <section className="panel" aria-label="Preview">{t.kind === "recipe" ? <RecipePreview competency={t.competency} play={play} setPlay={setPlay} /> : <CardPreview competency={t.competency} />}</section>
      {canDecide ? (
        <section className="panel decision" aria-label="Decision">
          <label className="field">What is wrong (needed to reject or ask for changes)<textarea aria-label="Review note" value={note} onChange={(x) => setNote(x.target.value)} /></label>
          <div className="actions">
            <button className="primary" disabled={busy} onClick={() => go("approve")}>Approve</button>
            <button className="secondary" disabled={busy || !note.trim()} onClick={() => go("request_changes")}>Ask for changes</button>
            <button className="secondary" disabled={busy || !note.trim()} onClick={() => go("reject")}>Reject</button>
          </div>
        </section>
      ) : <p className="small muted">Deciding needs the educator role.</p>}
      {t.history.length > 0 && <ol className="small history">{t.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} · {WORD[h.state] ?? h.state} by {h.by}{h.current ? "" : " (an earlier version: no longer applies)"}{h.note ? ` · “${h.note}”` : ""}</li>)}</ol>}
    </div>
  );
}

const Paras = ({ text }: { text?: string[] }) => <>{(text ?? []).map((p, i) => <p key={i}>{p}</p>)}</>;
const Choices = ({ c }: { c: { ask: string; choices: { label: string; reply: string; right?: true }[] } }) => (
  <><p>{c.ask}</p><ul>{c.choices.map((o) => <li key={o.label}><b>{o.label}</b>{o.right ? " ✓" : ""}: <span className="muted">{o.reply}</span></li>)}</ul></>
);
function RecipePreview({ competency, play, setPlay }: { competency: string; play: boolean; setPlay: (p: boolean) => void }) {
  const r = recipeFor(competency);
  if (!r) return <p className="error">This lesson is not in this build of the app.</p>;
  if (play) return <><p><button className="link" onClick={() => setPlay(false)}>Show it as text</button></p><RecipeLesson recipe={r} onDone={() => setPlay(false)} doneLabel="Finish" /></>;
  return (
    <div data-testid="recipe-preview">
      <p><button className="primary" onClick={() => setPlay(true)}>Play the lesson as a child</button> <span className="small muted">{r.type === "idea" ? "A new idea" : r.type === "method" ? "A method with steps" : "A fact"} · {stepsOf(r, true).length} parts</span></p>
      {r.question && <><h3>The question</h3><Paras text={r.question} /></>}
      {r.predict && <><h3>The guess</h3><Choices c={r.predict} /></>}
      {r.missions.length > 0 && <><h3>Things to move</h3><ol>{r.missions.map((m, i) => <li key={i}>{m.prompt} <span className="muted">→ {m.success}</span></li>)}</ol></>}
      <h3>The name and the short way</h3><Paras text={r.name} />
      <h3>{r.choose.kind === "try" ? "Try one" : "Think about it"}</h3><Choices c={r.choose} />
    </div>
  );
}
function CardPreview({ competency }: { competency: string }) {
  const c = cardFor(competency);
  if (!c) return <p className="error">This card is not in this build of the app.</p>;
  return (
    <div data-testid="card-preview">
      <h3>{c.name}</h3>
      <Paras text={c.rule} />
      {c.example ? <><h3>Example</h3><p>{c.example.prompt}</p><ol>{c.example.steps.map((s, i) => <li key={i}>{s}</li>)}</ol><p>Answer: <b>{c.example.answer}</b></p></> : <p className="small muted">No worked example on this card.</p>}
    </div>
  );
}
