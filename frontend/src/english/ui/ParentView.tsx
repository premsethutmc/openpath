/**
 * For parents: every child of this account (or on this device), with what they have practised, the words to work
 * on, and their word lists. A parent adds a practice or a test list for a child here; the child finds it under
 * My Words. Read from each child's own record; only saving or deleting a list writes anything.
 */
import { useEffect, useMemo, useState } from "react";
import type { AppContent } from "../logic/content.ts";
import { Learner } from "../logic/learner.ts";
import { type ChildSummary, childSummary, gateQuestion, weeklyNote } from "../logic/parent-view.ts";
import type { Repo } from "../logic/store.ts";
import { MyWords } from "./MyWords.tsx";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "not yet");
const KIND = { practice: "Practice list", test: "Test list", plain: "Word list" } as const;

export function ParentGate({ seed, onPass, onBack }: { seed: number; onPass: () => void; onBack: () => void }) {
  const q = useMemo(() => gateQuestion(seed), [seed]);
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <main className="page parent" data-phase="gate" aria-labelledby="parent-gate-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">For parents</p>
      <h1 id="parent-gate-title" className="hero">
        Grown-ups only
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(text.trim()) === q.answer) onPass();
          else setWrong(true);
        }}
      >
        <label htmlFor="parent-gate">
          What is {q.a} × {q.b}?
        </label>
        <p className="ruled">
          <input id="parent-gate" inputMode="numeric" autoComplete="off" value={text} onChange={(e) => (setText(e.target.value), setWrong(false))} />
        </p>
        {wrong && <p className="warning">That is not it. Ask a grown-up.</p>}
        <button type="submit" className="primary" disabled={!text.trim()}>
          Continue
        </button>
      </form>
    </main>
  );
}

export function ChildCard({ s, onOpen }: { s: ChildSummary; onOpen: () => void }) {
  const work = s.lists.flatMap((l) => l.toWorkOn).slice(0, 6);
  return (
    <section className="hub-card plain parent-child" aria-label={s.name} data-child={s.id}>
      <h2>{s.name}</h2>
      <p className="small">
        Last active: {day(s.lastActive)} · practised English on {s.englishDays} of the last 7 days (spelling on {s.daysPractisedThisWeek})
      </p>
      {s.levels.length > 0 && (
        <ul className="parent-levels small" data-line="levels">
          {s.levels.map((l) => (
            <li key={l.name}>
              <b>{l.name}:</b> {l.level}
            </li>
          ))}
        </ul>
      )}
      {s.first && (
        <p className="small" data-line="first">
          First words: {s.first.met} of {s.first.total} words found, {s.first.sure} sure
        </p>
      )}
      {s.reading && (
        <p className="small" data-line="reading">
          Reading: {s.reading.passed} {s.reading.passed === 1 ? "skill" : "skills"} checked and passed{s.reading.needsPractice.length ? `. Needs more practice: ${s.reading.needsPractice.join("; ")}` : ""}
        </p>
      )}
      {s.written && (
        <p className="small" data-line="written">
          Written answers: {s.written.right} of {s.written.answered} right, {s.written.firstTry} on the first try
        </p>
      )}
      {s.long && (
        <p className="small" data-line="long">
          Long reads: {s.long.parts} {s.long.parts === 1 ? "part" : "parts"} read, {s.long.finished} {s.long.finished === 1 ? "story" : "stories"} finished, {s.long.right} of {s.long.asked} questions right
        </p>
      )}
      {s.syllabus && (
        <p className="small" data-line="syllabus">
          {s.syllabus.name} syllabus, {s.syllabus.total} lines: {s.syllabus.secure} secure, {s.syllabus.practised - s.syllabus.secure} practising, {s.syllabus.total - s.syllabus.practised} not started
          {s.syllabus.notYet.length ? `; not yet: ${s.syllabus.notYet.join("; ")}` : ""}
        </p>
      )}
      {s.study && (
        <p className="small" data-line="study">
          Notes, charts and maps: {s.study.tasks} {s.study.tasks === 1 ? "task" : "tasks"}, {s.study.right} of {s.study.asked} steps right
          {s.study.strong.length ? `; goes well: ${s.study.strong.slice(0, 2).join(", ")}` : ""}
          {s.study.weak.length ? `; to work on: ${s.study.weak.slice(0, 2).join(", ")}` : ""}
          {s.study.own.pieces ? `; own writing: ${s.study.own.pieces} ${s.study.own.pieces === 1 ? "piece" : "pieces"}, ${s.study.own.passed} of ${s.study.own.of} checks met` : ""}
        </p>
      )}
      {s.kinds && (
        <p className="small" data-line="kinds">
          Poems and everyday texts: {s.kinds.texts} read, {s.kinds.right} of {s.kinds.asked} questions right{s.kinds.weak.length ? `; to work on: ${s.kinds.weak.slice(0, 2).join(", ")}` : ""}
        </p>
      )}
      {s.writing && (
        <p className="small" data-line="writing">
          Syllabus tasks: {s.writing.tasks} done{s.writing.pieces ? `, ${s.writing.pieces} written ${s.writing.pieces === 1 ? "piece" : "pieces"} (${s.writing.words} words in all)` : ""}
        </p>
      )}
      {s.words && <p className="small">Word check: about {s.words.estimate.toLocaleString("en-IN")} word families</p>}
      {s.newWords && (
        <p className="small" data-line="new-words">
          New words: {s.newWords.learnt} learnt, {s.newWords.learning} still learning{s.newWords.tricky.length ? `. Finding hard: ${s.newWords.tricky.join(", ")}` : ""}
        </p>
      )}
      {s.listening && (
        <p className="small" data-line="listening">
          Listen and answer: {s.listening.right} of {s.listening.asked} questions right over {s.listening.passages} {s.listening.passages === 1 ? "passage" : "passages"}{s.listening.weak.length ? `. Harder for now: ${s.listening.weak.join(", ")}` : ""}
        </p>
      )}
      {s.grammar && (
        <p className="small" data-line="grammar">
          Grammar in use: {s.grammar.right} of {s.grammar.answered} sentences right{s.grammar.weak.length ? `. To look at again: ${s.grammar.weak.join(", ")}` : ""}
        </p>
      )}
      {s.dictation && (
        <p className="small" data-line="dictation">
          Listen and write: {s.dictation.perfectFirst} of {s.dictation.sentences} sentences right first time (level {s.dictation.level}){s.dictation.missed.length ? `. Words missed: ${s.dictation.missed.join(", ")}` : ""}
        </p>
      )}
      {s.bee && (
        <p className="small">
          Spelling Bee: level {s.bee.level} ({s.bee.levelName}), {s.bee.practised} of {s.bee.total} words practised
        </p>
      )}
      {s.lists.length ? (
        <ul className="parent-lists">
          {s.lists.map((l) => (
            <li key={l.id}>
              <span>
                <b>{l.name}</b> <span className="small">{KIND[l.mode]}</span>
              </span>
              <span className="small">
                {l.lastTest ? `last test ${l.lastTest.right} of ${l.lastTest.total} · ` : ""}
                {l.unaided} of {l.words} on their own
                {l.withHelp ? ` · ${l.withHelp} with help` : ""}
                {l.wrong ? ` · ${l.wrong} wrong` : ""}
                {l.notTried ? ` · ${l.notTried} not tried` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">No word lists yet.</p>
      )}
      {s.patterns.length > 0 && (
        <p className="parent-patterns">
          <b>Keeps missing:</b> {s.patterns.slice(0, 3).map((p) => `${p.name} (${p.times})`).join("; ")}
        </p>
      )}
      {work.length > 0 && (
        <p>
          <b>Words to work on:</b> {work.join(", ")}
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.lists.length ? "Word lists and results" : "Add a word list"}
      </button>
      <WeeklyNote s={s} />
    </section>
  );
}

/** weekly-note@1: this week in a few lines, to send on WhatsApp (or copy) to the other parent, a grandparent, a tutor. */
function WeeklyNote({ s }: { s: ChildSummary }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = weeklyNote(s, typeof location === "undefined" ? undefined : location.origin);
  return (
    <div className="weekly-note" data-weekly-note>
      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide this week's note" : "This week's note to share"}
      </button>
      {open && (
        <>
          <pre className="weekly-text">{text}</pre>
          <p className="choose-options">
            <a className="secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              Share on WhatsApp
            </a>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                void navigator.clipboard?.writeText(text).then(
                  () => setCopied(true),
                  () => setCopied(false),
                )
              }
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

export interface Linking {
  /** This phone is signed in to an account: it can show a code for another phone. */
  canShow: boolean;
  showCode: () => Promise<{ code: string; expires_in: number }>;
  /** Sign this phone in to the account a code belongs to; the app then opens that account's children. */
  join: (code: string) => Promise<void>;
}

/** Connect a parent's phone and a child's phone: one shows a code, the other types it, and both then see the same children. */
export function ConnectPhones({ linking }: { linking: Linking }) {
  const [shown, setShown] = useState<{ code: string; minutes: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await f();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="hub-card plain parent-connect" aria-labelledby="connect-title">
      <h2 id="connect-title">Connect another phone</h2>
      <p className="small">For a parent's phone and a child's phone. One phone shows a code, the other types it. Both then see the same children and the same results.</p>
      {linking.canShow && !shown && (
        <button type="button" className="secondary" disabled={busy} onClick={() => void run(async () => { const r = await linking.showCode(); setShown({ code: r.code, minutes: Math.round(r.expires_in / 60) }); })}>
          Show a code on this phone
        </button>
      )}
      {shown && (
        <div className="tile lilac" role="status">
          <p className="small">Type this on the other phone, under For parents → Connect another phone:</p>
          <p className="connect-code">{shown.code}</p>
          <p className="small">It works once, for {shown.minutes} minutes. Share it only with your own family: whoever types it sees these children's records.</p>
        </div>
      )}
      <form
        className="connect-join"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) void run(() => linking.join(typed.trim()));
        }}
      >
        <label htmlFor="connect-code-input">Or type the code shown on the other phone</label>
        <p className="ruled">
          <input id="connect-code-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-EFGH" maxLength={12} />
        </p>
        <p className="small">This phone will then open the other phone's family. Children already on this phone stay in its own record and are not merged.</p>
        <button type="submit" className="secondary" disabled={busy || !typed.trim()}>
          Connect
        </button>
      </form>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}

export function ParentView({ content, repo, clock, onLeave, linking }: { content: AppContent; repo: Repo; clock: () => string; onLeave: () => void; linking?: Linking }) {
  const [passed, setPassed] = useState(false);
  const [children, setChildren] = useState<Learner[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const seed = useMemo(() => Math.floor(Date.parse(clock()) / 1000) % 97, [clock]);
  useEffect(() => {
    if (!passed) return;
    let live = true;
    void (async () => {
      try {
        const profiles = await repo.profiles();
        const all: Learner[] = [];
        for (const p of profiles) all.push(await Learner.open(content, repo, p.id, clock));
        if (live) setChildren(all);
      } catch (e) {
        if (live) setProblem(e instanceof Error ? e.message : "The children's records could not be read.");
      }
    })();
    return () => {
      live = false;
    };
  }, [passed, content, repo, clock]);
  if (!passed) return <ParentGate seed={seed} onPass={() => setPassed(true)} onBack={onLeave} />;
  const child = open ? children?.find((l) => l.profileId === open) : null;
  if (child) return <MyWords learner={child} parentOf={child.state.profile?.name ?? "this child"} onChanged={() => setTick((t) => t + 1)} onLeave={() => setOpen(null)} />;
  return (
    <main className="page parent" data-phase="children" aria-labelledby="parent-title">
      <button type="button" className="link" onClick={onLeave}>
        ← Back to the child's screen
      </button>
      <p className="eyebrow">For parents</p>
      <h1 id="parent-title" className="hero">
        Your children
      </h1>
      <p className="sub">What each child has practised, the words to work on, and their word lists. Add a practice list or a test list here; your child will find it under My Words.</p>
      {problem && <p className="warning">{problem}</p>}
      {!children && !problem && <p className="loading">Reading the records…</p>}
      {children && !children.length && <p>No children yet. Add a learner first.</p>}
      {children?.map((l) => <ChildCard key={l.profileId} s={childSummary(l, clock())} onOpen={() => setOpen(l.profileId)} />)}
      {linking && <ConnectPhones linking={linking} />}
      <p className="small">This page shows the children in this account, or on this phone if there is no account. Everything shown is a count of what happened, not a grade.</p>
    </main>
  );
}
