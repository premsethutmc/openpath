/**
 * Me: the learner's own choices (who is learning, goal), hearing words, keeping the record safe, switching or
 * removing the learner, and the parent account. The privacy note says exactly where this record is kept.
 */
import { useEffect, useState } from "react";
import { parseBackup } from "../logic/backup.ts";
import type { Learner } from "../logic/learner.ts";
import type { Repo } from "../logic/store.ts";
import { BANDS, GOALS } from "./Onboarding.tsx";
import { NoteBox, saveJson } from "./Note.tsx";
import { speak } from "./speech.ts";

export function Me({
  learner,
  repo,
  voice,
  account,
  onChanged,
  onSwitch,
  onOpen,
  onRemoved,
  onSignOut,
  onDeleteAccount,
  diagnostics,
}: {
  learner: Learner;
  repo: Repo;
  voice: SpeechSynthesisVoice | null;
  account: string | null;
  onChanged: () => void;
  onSwitch: () => void;
  onOpen: (id: string) => void;
  onRemoved: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  /** Account mode: whether this learner's record is shared for developer diagnostics, and whether this parent is a developer. */
  diagnostics?: { shared: () => Promise<boolean>; share: (on: boolean) => Promise<boolean>; developer: boolean };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const prefs = learner.state.preferences;
  const band = BANDS.find((b) => b.id === prefs?.band);
  const goal = GOALS.find((g) => g.id === prefs?.goal);
  const name = learner.state.profile?.name ?? "this learner";
  const onServer = repo.kind === "server";
  const download = () => {
    const b = learner.backup();
    const blob = new Blob([JSON.stringify(b, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `openpath-english-${b.profile.name.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase() || "learner"}-${b.exported_at.slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("Copy saved to your downloads. Keep it private: it contains the name and every answer.");
  };
  return (
    <main className="page" aria-labelledby="settings-title">
      <p className="eyebrow">Your space</p>
      <h1 id="settings-title" className="hero">
        Make OpenPath yours <span aria-hidden="true">🎨</span>
      </h1>
      <section aria-labelledby="choices-title">
        <h2 id="choices-title" className="sr-only">
          Choices
        </h2>
        <div className="tile">
          <b>
            <span aria-hidden="true">👤</span> Who is learning
          </b>
          <p>{band ? `${band.label} (${band.mini.toLowerCase()})` : "Not chosen yet"}</p>
        </div>
        <div className="tile mint">
          <b>
            <span aria-hidden="true">🎯</span> Goal
          </b>
          <p>{goal ? goal.label : "Not chosen yet"}. It decides which skills the Journey shows first; your answers decide what to learn.</p>
          {!editing ? (
            <button type="button" className="secondary" onClick={() => setEditing(true)}>
              Change who is learning or the goal
            </button>
          ) : (
            <Choose
              band={prefs?.band ?? "school"}
              goal={prefs?.goal ?? "confidence"}
              onSave={async (b, g) => {
                await learner.setPreferences(b, g);
                setEditing(false);
                onChanged();
              }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
        <div className="tile peach">
          <b>
            <span aria-hidden="true">🔐</span> Privacy
          </b>
          <p>
            {onServer
              ? `${name}'s answers are kept in the parent account ${account ?? ""}, so they are there on any device after signing in. In the app, only this account can see them; OpenPath's administrators can reach the server where they are kept. No adverts, no tracking, and nothing is sent to AI marking.`
              : `${name}'s answers stay in this browser on this device. Nothing is sent anywhere: no account, no adverts, no tracking, no AI marking.`}
          </p>
        </div>
      </section>
      <section aria-labelledby="speech-title">
        <h2 id="speech-title">Hearing words</h2>
        {voice ? (
          <>
            <p>This device has its own voice ({voice.name}), so some spelling questions read the word aloud. The word is spoken by the device; nothing is recorded or sent.</p>
            <label className="inline">
              <input type="checkbox" checked={learner.state.speech} onChange={async (e) => (await learner.setSpeech(e.target.checked), onChanged())} /> Use spoken words
            </label>
            <button type="button" className="secondary" onClick={() => speak("necessary", voice)}>
              Test the voice
            </button>
          </>
        ) : (
          <p>This device has no built-in English voice that works offline, so spelling questions use written clues instead (add the ending, meanings, choosing the spelling). Nothing is missing from the plan.</p>
        )}
      </section>
      <section aria-labelledby="backup-title">
        <h2 id="backup-title">{onServer ? "A copy of the record" : "Keep progress safe"}</h2>
        <p>{onServer ? "Download every answer and lesson in one file, for your own records or a teacher." : "Progress lives only in this browser. Clearing the browser's data deletes it. Export a backup now and then, and import it to carry on on another device."}</p>
        <button type="button" className="primary" onClick={download}>
          {onServer ? "Download the record" : "Export a backup"}
        </button>
        {msg && <p role="status">{msg}</p>}
        {!onServer && <ImportBackup repo={repo} onImported={onOpen} />}
      </section>
      {!onServer && <TrialSection learner={learner} voice={voice} />}
      <section aria-labelledby="profile-title" className="stack">
        <h2 id="profile-title">Learner</h2>
        <button type="button" className="secondary" onClick={onSwitch}>
          Switch learner
        </button>
        <button
          type="button"
          className="danger"
          onClick={async () => {
            if (!window.confirm(`Delete ${name} and all their progress${onServer ? " from your account" : " from this device"}? This cannot be undone. Download a copy first if you want to keep it.`)) return;
            try {
              await repo.remove(learner.profileId);
              onRemoved();
            } catch (e) {
              setMsg(`Not deleted: ${(e as Error).message}`);
            }
          }}
        >
          {onServer ? "Delete this learner and their record" : "Delete this learner from this device"}
        </button>
      </section>
      {onServer && diagnostics && <DiagnosticsSection name={name} diagnostics={diagnostics} />}
      {onServer && <AccountSection email={account} onSignOut={onSignOut} onDelete={onDeleteAccount} />}
      <section aria-labelledby="about-title">
        <h2 id="about-title">About this version</h2>
        <p>An early version of OpenPath English. It uses no adverts, tracking or AI marking.</p>
        <p>Lessons, questions and difficulty levels are draft content written or generated by OpenPath and not yet reviewed by teachers. Levels are estimates, shown with how sure they are.</p>
        <h3>Word lists and dictionaries</h3>
        <p className="small">The spelling practice words are made by rule from these openly licensed sources:</p>
        <ul className="credits">
          {learner.content.wordSources.map((s) => (
            <li key={s.id}>
              <a href={s.url} rel="noreferrer" target="_blank">
                {s.name}
              </a>
              . {s.licence}. Used for {s.used_for}.{" "}
              <a href={`licences/${s.notice.split("/").pop()}`} target="_blank" rel="noreferrer">
                Licence text
              </a>
            </li>
          ))}
        </ul>
        <p className="small">
          Meanings and example sentences are from Open English WordNet (CC BY 4.0), used unchanged except that a word may be replaced by a blank. Princeton WordNet licence:{" "}
          <a href="licences/WordNet-LICENSE.txt" target="_blank" rel="noreferrer">
            text
          </a>
          .
        </p>
      </section>
    </main>
  );
}

function Choose({ band, goal, onSave, onCancel }: { band: (typeof BANDS)[number]["id"]; goal: (typeof GOALS)[number]["id"]; onSave: (b: (typeof BANDS)[number]["id"], g: (typeof GOALS)[number]["id"]) => void; onCancel: () => void }) {
  const [b, setB] = useState(band);
  const [g, setG] = useState(goal);
  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="stack" role="group" aria-label="Who is learning">
        {BANDS.map((x) => (
          <button key={x.id} type="button" className="choice" aria-pressed={b === x.id} onClick={() => setB(x.id)}>
            <span className="em" aria-hidden="true">
              {x.em}
            </span>
            {x.label}
          </button>
        ))}
      </div>
      <div className="stack" role="group" aria-label="Goal">
        {GOALS.map((x) => (
          <button key={x.id} type="button" className="choice" aria-pressed={g === x.id} onClick={() => setG(x.id)}>
            <span className="em" aria-hidden="true">
              {x.em}
            </span>
            {x.label}
          </button>
        ))}
      </div>
      <button type="button" className="primary" onClick={() => onSave(b, g)}>
        Save
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

/**
 * The trial record (PR #14): a summary without the learner's name to share with the OpenPath team, and notes about
 * problems. Notes are free text, so the pilot build (content mode "pilot") does not offer them: a pupil code must be the
 * only identifier in a pilot record.
 */
function TrialSection({ learner, voice }: { learner: Learner; voice: SpeechSynthesisVoice | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const c = learner.content;
  const summary = () => {
    const p = learner.pilotSummary({ speech: !!voice && learner.state.speech, standalone: window.matchMedia?.("(display-mode: standalone)").matches, width: window.innerWidth });
    saveJson(p, `openpath-trial-summary-${p.learner.code}-${p.made_at.slice(0, 10)}.json`);
    setMsg("Trial summary saved to your downloads. It has no name, but it has answers. Share it only if you choose to.");
  };
  return (
    <section aria-labelledby="trial-title">
      <h2 id="trial-title">Taking part in the trial</h2>
      <p>If you are helping to try OpenPath English, you can save a summary of the learning so far to share with the OpenPath team. It has no name, but it has answers and timings. Nothing is sent: you choose whether to share it.</p>
      <button type="button" className="secondary" onClick={summary}>
        Save a trial summary
      </button>
      {msg && <p role="status">{msg}</p>}
      {c.contentMode !== "pilot" && <NoteBox learner={learner} screen="settings" label="Tell us about a problem, or anything that got in the way" />}
      <p className="small">
        {c.contentMode === "pilot"
          ? "Pilot version: only educator-approved questions are shown, and only the starting point and the spelling check by dictation."
          : c.contentMode === "preview"
            ? `Preview of the trial: the trial's practice words, not yet reviewed by a person (${c.generated.length} practice questions).`
            : `Development version: practice words include ones not yet reviewed (${c.generated.length} practice questions); excluded words are never offered.`}
      </p>
    </section>
  );
}

function DiagnosticsSection({ name, diagnostics }: { name: string; diagnostics: NonNullable<Parameters<typeof Me>[0]["diagnostics"]> }) {
  const [shared, setShared] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    diagnostics.shared().then(setShared, () => setShared(null));
  }, [diagnostics]);
  return (
    <section aria-labelledby="diag-title" className="stack">
      <h2 id="diag-title">Help improve OpenPath</h2>
      <p className="small">
        Off unless you turn it on. When on, OpenPath's developers can read {name}'s answers and progress (read-only, and every look is logged) to check that the app is choosing and judging questions properly. Your email is never shown to them. Turn it off at any time.
      </p>
      <label className="dev-check">
        <input
          type="checkbox"
          checked={!!shared}
          disabled={shared === null}
          onChange={async (e) => {
            const on = e.target.checked;
            setProblem(null);
            setShared(on); // shown at once; put back if the server refuses
            try {
              setShared(await diagnostics.share(on));
            } catch (err) {
              setShared(!on);
              setProblem((err as Error).message);
            }
          }}
        />
        Share {name}'s record for diagnostics
      </label>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      {diagnostics.developer && (
        <a className="link" href="/developer">
          Open developer diagnostics
        </a>
      )}
    </section>
  );
}

function AccountSection({ email, onSignOut, onDelete }: { email: string | null; onSignOut: () => Promise<void>; onDelete: (password: string) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [outProblem, setOutProblem] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <section aria-labelledby="account-title" className="stack">
      <h2 id="account-title">Parent account</h2>
      <p>Signed in as {email}.</p>
      <button type="button" className="secondary" onClick={() => onSignOut().catch((e: Error) => setOutProblem(`Not signed out yet: ${e.message}`))}>
        Sign out
      </button>
      {outProblem && (
        <p className="warning" role="alert">
          {outProblem}
        </p>
      )}
      {!deleting ? (
        <button type="button" className="danger" onClick={() => setDeleting(true)}>
          Delete the account
        </button>
      ) : (
        <form
          className="tile peach"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onDelete(password);
            } catch (err) {
              setProblem((err as Error).message);
            }
          }}
        >
          <b>Delete the account and every learner's record?</b>
          <p>This deletes the parent account, every learner in it, and all their answers. It cannot be undone.</p>
          <label>
            Your password, to confirm
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {problem && (
            <p className="warning" role="alert">
              {problem}
            </p>
          )}
          <button type="submit" className="danger">
            Delete everything
          </button>
          <button type="button" className="secondary" onClick={() => setDeleting(false)}>
            Keep the account
          </button>
        </form>
      )}
    </section>
  );
}

export function ImportBackup({ repo, onImported }: { repo: Repo; onImported: (id: string) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="import" aria-labelledby="import-title">
      <h2 id="import-title">Bring progress from another device</h2>
      <label className="file">
        Choose a backup file (.json)
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const parsed = parseBackup(await f.text());
            if (!parsed.ok) return setMsg(parsed.error);
            const existing = (await repo.profiles()).find((p) => p.id === parsed.backup.profile.id);
            if (existing && !window.confirm(`${existing.name} is already on this device. Replace it with the backup from ${parsed.backup.exported_at.slice(0, 10)}?`)) return;
            await repo.replaceAll(parsed.backup.profile.id, parsed.backup.events);
            setMsg(null);
            onImported(parsed.backup.profile.id);
          }}
        />
      </label>
      {msg && (
        <p className="warning" role="alert">
          {msg}
        </p>
      )}
    </section>
  );
}
