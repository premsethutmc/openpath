/**
 * My Words: a parent's own spelling lists. Type, paste or upload (.txt or .csv) words, check them, edit, name and save
 * the list, then practise it with the Spelling Bee's screen and engine. Lists stay in this learner's record on this
 * device. The words are shown here to the adult who sets the list up; when the learner practises, each word is only
 * spoken.
 */
import { type ChangeEvent, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { sourceProgress } from "../logic/spelling.ts";
import { LIST_LIMITS, type ListWord, type Parsed, type WordList, listText, listWords, parseWords } from "../logic/wordlists.ts";

export function MyWords({ learner, onPractise, onLeave, onChanged }: { learner: Learner; onPractise: (l: WordList) => void; onLeave: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState<WordList | "new" | null>(null);
  if (editing) return <ListEditor learner={learner} list={editing === "new" ? null : editing} onDone={() => (setEditing(null), onChanged())} />;
  const lists = learner.wordLists();
  const st = learner.spelling();
  const now = learner.clock();
  return (
    <main className="page my-words" aria-labelledby="mywords-title">
      <p>
        <button type="button" className="link" onClick={onLeave}>
          ← Home
        </button>
      </p>
      <p className="eyebrow">Spelling lists from a parent</p>
      <h1 id="mywords-title" className="hero">
        My Words
      </h1>
      <p className="sub">Type, paste or upload the words to practise. When the learner practises, each word is only spoken, never shown.</p>
      <p className="small where-kept">{keptWhere(learner)}</p>
      <button type="button" className="primary" onClick={() => setEditing("new")}>
        New word list
      </button>
      {lists.length === 0 ? (
        <p className="tile">No lists yet. A list can be this week's spelling words from school.</p>
      ) : (
        <ul className="word-lists">
          {lists.map((l) => {
            const p = sourceProgress(st, listWords(l), now);
            return (
              <li key={l.id} className="tile" data-list={l.id}>
                <h2>{l.name}</h2>
                <p className="small">
                  {l.words.length} word{l.words.length === 1 ? "" : "s"} · practised {p.practised} of {p.total}
                  {p.answers ? ` · ${p.right} of ${p.answers} right` : ""}
                  {p.reviewList ? ` · ${p.reviewList} to review` : ""}
                </p>
                <div className="row">
                  <button type="button" className="primary" onClick={() => onPractise(l)}>
                    Practise
                  </button>
                  <button type="button" className="secondary" onClick={() => setEditing(l)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    onClick={async () => {
                      if (!window.confirm(`Delete the list "${l.name}"? Its practice history stays in the learner's record.`)) return;
                      await learner.deleteWordList(l.id);
                      onChanged();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

/** Where a parent's lists are saved, said plainly before anything is typed. */
export function keptWhere(learner: Learner, what = "Lists"): string {
  return learner.contentPlace === "account"
    ? `${what} are saved in ${learner.state.profile?.name ?? "this learner"}'s record in your parent account, so they are on any device you sign in on. Only your account can open them. Deleting removes it from this screen; it stays in the learner's record until the learner is deleted.`
    : `${what} are saved in this learner's record on this device only. Nothing is sent anywhere. Deleting removes it from this screen; it stays in the learner's record until the learner is deleted.`;
}

function ListEditor({ learner, list, onDone }: { learner: Learner; list: WordList | null; onDone: () => void }) {
  const [name, setName] = useState(list?.name ?? "");
  const [text, setText] = useState(list ? listText(list.words) : "");
  const [checked, setChecked] = useState<Parsed | null>(list ? { words: list.words, problems: [], empty: 0 } : null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = (t = text) => setChecked(parseWords(t));
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > LIST_LIMITS.fileBytes) return setProblem(`That file is too big for a word list (at most ${Math.round(LIST_LIMITS.fileBytes / 1000)} KB).`);
    if (!/\.(txt|csv)$/i.test(f.name) && !/^text\//.test(f.type)) return setProblem("Choose a .txt or .csv file.");
    const t = (await f.text()).trim();
    const next = text.trim() ? `${text.trim()}\n${t}` : t;
    setProblem(null);
    setText(next);
    check(next);
    if (!name.trim()) setName(f.name.replace(/\.(txt|csv)$/i, "").slice(0, LIST_LIMITS.nameLength));
  };
  const remove = (w: ListWord) => {
    if (!checked) return;
    const words = checked.words.filter((x) => x.id !== w.id);
    setChecked({ ...checked, words });
    setText(listText(words));
  };
  const save = async () => {
    if (!checked) return;
    setBusy(true);
    try {
      await learner.saveWordList(name, checked.words, list?.id);
      onDone();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save the list");
    } finally {
      setBusy(false);
    }
  };
  const stale = checked && listText(parseWords(text).words) !== listText(checked.words);

  return (
    <main className="page my-words" aria-labelledby="editor-title">
      <p>
        <button type="button" className="link" onClick={onDone}>
          ← My Words
        </button>
      </p>
      <h1 id="editor-title" className="hero">
        {list ? "Edit the list" : "New word list"}
      </h1>
      <label className="field">
        <span>List name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={LIST_LIMITS.nameLength} placeholder="For example: Week 3 spellings" autoComplete="off" />
      </label>
      <label className="field">
        <span>Words: one per line, or separated by commas. Write another accepted spelling after a slash, for example colour/color.</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <label className="field file">
        <span>Or add words from a .txt or .csv file</span>
        <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(e) => void onFile(e)} />
      </label>
      <button type="button" className="secondary" onClick={() => check()}>
        Check the words
      </button>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      {checked && (
        <section className="tile list-review" aria-labelledby="review-title" aria-live="polite">
          <h2 id="review-title">
            {checked.words.length} word{checked.words.length === 1 ? "" : "s"} ready
          </h2>
          {stale && <p className="warning">The words were changed after the check: press "Check the words" again before saving.</p>}
          <ul className="chips">
            {checked.words.map((w) => (
              <li key={w.id}>
                <span className="written">{[w.word, ...w.variants].join(" / ")}</span>
                <button type="button" className="link" aria-label={`Remove ${w.word}`} onClick={() => remove(w)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {checked.problems.length > 0 && (
            <div className="problems">
              <b>Not added ({checked.problems.length}):</b>
              <ul>
                {checked.problems.map((p, i) => (
                  <li key={i}>
                    “{p.text}”: {p.reason}
                  </li>
                ))}
              </ul>
              <p className="small">Fix these in the box above and check again, or leave them out.</p>
            </div>
          )}
          {checked.empty > 0 && <p className="small">{checked.empty} empty entr{checked.empty === 1 ? "y was" : "ies were"} ignored.</p>}
        </section>
      )}
      <button type="button" className="primary" disabled={busy || !checked || !checked.words.length || !name.trim() || !!stale} onClick={() => void save()}>
        Save the list
      </button>
    </main>
  );
}
