import { useState } from "react";
import type { Learner } from "../logic/learner.ts";
import type { SpellSource } from "../logic/events.ts";
import { BANK, sourceProgress } from "../logic/spelling.ts";
export function SpellingHome({
  learner,
  onStart,
  onWords,
  onManage,
  onSwitch,
  onSignOut,
  account,
}: {
  learner: Learner;
  onStart: (source: SpellSource, title: string) => void;
  onWords: () => void;
  onManage: () => void;
  onSwitch: () => void;
  onSignOut?: () => Promise<void>;
  account: boolean;
}) {
  const [parent, setParent] = useState(false),
    [error, setError] = useState("");
  const p = sourceProgress(
      learner.spelling(),
      learner.spellingWords(BANK),
      learner.clock(),
    ),
    open = learner.spellingSession();
  return (
    <main className="page spelling-home">
      <p className="eyebrow">🐝 OpenPath Spelling Bee</p>
      <h1>
        Little words.
        <br />
        Lasting memories.
      </h1>
      <p>Hello, {learner.state.profile?.name ?? "Learner"}.</p>
      <p>
        Learn a few words. Hide them. Try spelling them. Come back on another
        day.
      </p>
      {open && (
        <button
          className="primary"
          onClick={() =>
            onStart(
              open.source,
              open.source.type === "bank" ? "Spelling Bee" : "My spelling list",
            )
          }
        >
          Continue my words
        </button>
      )}
      <button className="primary" onClick={() => onStart(BANK, "Spelling Bee")}>
        Learn 5 words
      </button>
      <p>
        {p.practised} words practised · {p.reviewList} on the review list
      </p>
      <section>
        <h2>My word lists</h2>
        {learner.wordLists().length === 0 ? (
          <p>A parent can add this week’s school words.</p>
        ) : (
          learner.wordLists().map((l) => (
            <button
              className="secondary"
              key={l.id}
              onClick={() => onStart({ type: "list", id: l.id }, l.name)}
            >
              {l.name} · {l.words.length} words
            </button>
          ))
        )}
      </section>
      <button
        className="link"
        onClick={() => setParent(!parent)}
        aria-expanded={parent}
      >
        Parent area
      </button>
      {parent && (
        <section aria-label="Parent area">
          <h2>For a parent</h2>
          <button className="secondary" onClick={onManage}>
            Account, privacy and backups
          </button>
          <p>
            {account
              ? "Word lists and progress are saved in your parent account and available after signing in on another phone."
              : "Word lists and progress stay in this browser. This private preview does not synchronize them across phones."}
          </p>
          <button className="primary" onClick={onWords}>
            Load or edit word lists
          </button>
          <button className="secondary" onClick={onSwitch}>
            Switch child
          </button>
          {onSignOut && (
            <button
              className="link"
              onClick={() => onSignOut().catch((e) => setError(String(e)))}
            >
              Sign out
            </button>
          )}
        </section>
      )}
      <p className="small">
        Spelling practice is separate from verified mastery. New learning
        content is provisional.
      </p>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
export function SpellingWelcome({
  accounts,
  onBegin,
  onLogin,
  onDevice,
}: {
  accounts: boolean;
  onBegin: () => void;
  onLogin: () => void;
  onDevice: () => void;
}) {
  return (
    <main className="welcome page">
      <p className="eyebrow">🐝 OpenPath</p>
      <h1>Spelling Bee</h1>
      <p>Parents add words. Children learn, recall and review them.</p>
      <button className="primary" onClick={onBegin}>
        {accounts ? "Create a parent account" : "Start on this device"}
      </button>
      {accounts && (
        <>
          <button className="secondary" onClick={onLogin}>
            Parent sign in
          </button>
          <button className="link" onClick={onDevice}>
            Use this device only
          </button>
        </>
      )}
      <p className="small">
        Private preview for synthetic/family testing. Device-only progress stays
        on this browser.
      </p>
    </main>
  );
}
export function SpellingSetup({
  mode,
  onCreate,
  onCancel,
}: {
  mode: "account" | "device";
  onCreate: (
    name: string,
    by: "learner" | "guardian",
    band: "early" | "school" | "older",
    goal: "confidence" | "grammar" | "spelling" | "reading",
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="page">
      <button className="link" onClick={onCancel}>
        ← Back
      </button>
      <h1>Add a spelling learner</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!consent) return;
          setBusy(true);
          setError("");
          try {
            await onCreate(name, "guardian", "school", "spelling");
          } catch (e) {
            setError(String(e));
            setBusy(false);
          }
        }}
      >
        <label>
          Child’s nickname
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="inline">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            {mode === "account"
              ? "I am the parent or guardian and agree that progress is saved in my parent account."
              : "I am the parent or guardian and agree that progress is saved on this device only."}
          </span>
        </label>
        <button className="primary" disabled={busy || !consent}>
          {busy ? "Saving…" : "Start Spelling Bee"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
