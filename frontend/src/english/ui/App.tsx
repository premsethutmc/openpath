import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { parseBackup } from "../logic/backup.ts";
import { type AppContent, GUIDED, loadContent } from "../logic/content.ts";
import { Learner } from "../logic/learner.ts";
import { type PlanStep, patternTitle } from "../logic/plan.ts";
import { type CapabilityProgress, bandDescriptor, capabilityProgress } from "../logic/progress.ts";
import { type PatternPlan, spellingPlan } from "../logic/select.ts";
import { type ProfileSummary, type Repo, openRepo } from "../logic/store.ts";
import { dueWords, patternStatus } from "../logic/state.ts";
import { Journey, ParentSummary } from "./Journey.tsx";
import { Session } from "./Session.tsx";
import { detectSpeech, speak } from "./speech.ts";

/** Real time, plus an offset in days that only tests set (to check reviews without waiting). */
const clock = () => {
  let days = 0;
  try {
    days = Number(localStorage.getItem("openpath-english-clock-offset-days") ?? 0) || 0;
  } catch {
    days = 0;
  }
  return new Date(Date.now() + days * 86_400_000).toISOString();
};
const LAST = "openpath-english-last-profile";
const remember = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LAST, id);
    else localStorage.removeItem(LAST);
  } catch {
    /* a private window may refuse; nothing depends on it */
  }
};
const lastProfile = () => {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
};

type Tab = "today" | "progress" | "settings";

export function App() {
  const content = useMemo<AppContent>(() => loadContent(), []);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [inSession, setInSession] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [tick, setTick] = useState(0);
  const changed = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    void (async () => {
      const r = await openRepo();
      setRepo(r);
      const list = await r.profiles();
      setProfiles(list);
      const last = lastProfile();
      if (last && list.some((p) => p.id === last)) await openProfile(r, last);
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* the browser decides; storage still works */
      }
    })();
    void detectSpeech().then((s) => setVoice(s.voice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (learner) learner.speechAvailable = !!voice;
    changed();
  }, [voice, learner, changed]);

  const openProfile = async (r: Repo, id: string) => {
    const l = await Learner.open(content, r, id, clock);
    l.speechAvailable = !!voice;
    remember(id);
    setLearner(l);
    setTab("today");
    setInSession(false);
  };

  const leave = async () => {
    remember(null);
    setLearner(null);
    if (repo) setProfiles(await repo.profiles());
  };

  if (!repo) return <p className="loading">Opening OpenPath English…</p>;
  if (!learner)
    return (
      <Welcome
        repo={repo}
        profiles={profiles}
        onOpen={(id) => openProfile(repo, id)}
        onCreate={async (name, by) => {
          const l = await Learner.create(content, repo, name, by, clock);
          l.speechAvailable = !!voice;
          remember(l.profileId);
          setLearner(l);
          setTab("today");
        }}
      />
    );

  if (inSession && learner.state.open?.event.type === "doubling_journey")
    return (
      <Journey
        learner={learner}
        voice={learner.state.speech ? voice : null}
        onChanged={changed}
        onLeave={() => {
          setInSession(false);
          changed();
        }}
      />
    );
  if (inSession)
    return (
      <Session
        learner={learner}
        voice={learner.state.speech ? voice : null}
        onChanged={changed}
        onLeave={() => {
          setInSession(false);
          changed();
        }}
      />
    );

  return (
    <div className="shell" data-tick={tick}>
      <header className="top">
        <p className="brand">OpenPath English</p>
        <p className="who">{learner.state.profile?.name}</p>
      </header>
      {tab === "today" && (
        <Today
          learner={learner}
          onStart={async (step) => {
            await learner.start(step);
            setInSession(true);
          }}
          onResume={() => setInSession(true)}
          onJourney={async () => {
            await learner.startJourney();
            setInSession(true);
          }}
        />
      )}
      {tab === "progress" && <Progress learner={learner} />}
      {tab === "settings" && <Settings learner={learner} repo={repo} voice={voice} onChanged={changed} onLeave={leave} onSwitch={(id) => openProfile(repo, id)} />}
      <nav className="tabs" aria-label="Sections">
        {(["today", "progress", "settings"] as Tab[]).map((t) => (
          <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
            {{ today: "Today", progress: "Progress", settings: "Settings" }[t]}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ------------------------------------------------------------------ welcome

function Welcome({ repo, profiles, onOpen, onCreate }: { repo: Repo; profiles: ProfileSummary[]; onOpen: (id: string) => void; onCreate: (name: string, by: "learner" | "guardian") => void }) {
  const [name, setName] = useState("");
  const [by, setBy] = useState<"learner" | "guardian">("guardian");
  const [agree, setAgree] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!agree) return setProblem("Tick the box to agree that progress is kept on this device.");
    onCreate(name, by);
  };
  return (
    <main className="welcome">
      <h1>OpenPath English</h1>
      <p className="lede">Spelling, grammar and vocabulary, a little each day. It starts by finding out where you are, then builds a plan.</p>
      {repo.kind === "memory" && <p className="warning">This browser is not letting OpenPath save anything (a private window, perhaps). You can try it, but progress will be lost when the page closes.</p>}
      {profiles.length > 0 && (
        <section aria-labelledby="resume-title">
          <h2 id="resume-title">Carry on</h2>
          <ul className="profiles">
            {profiles.map((p) => (
              <li key={p.id}>
                <button type="button" className="profile" onClick={() => onOpen(p.id)}>
                  <span className="written">{p.name}</span>
                  <span className="small">last used {p.lastAt.slice(0, 10)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form className="new" onSubmit={submit} aria-labelledby="new-title">
        <h2 id="new-title">{profiles.length ? "Add a learner" : "Start"}</h2>
        <label>
          Name to show (only on this device)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" placeholder="For example, Asha" />
        </label>
        <fieldset>
          <legend>Who is setting this up?</legend>
          <label className="inline">
            <input type="radio" name="by" checked={by === "guardian"} onChange={() => setBy("guardian")} /> A parent or guardian
          </label>
          <label className="inline">
            <input type="radio" name="by" checked={by === "learner"} onChange={() => setBy("learner")} /> The learner (16 or over)
          </label>
        </fieldset>
        <label className="inline consent">
          <input id="consent" type="checkbox" checked={agree} onChange={(e) => (setAgree(e.target.checked), setProblem(null))} />
          <span>I agree that answers and progress are kept in this browser on this device only. Nothing is sent anywhere. I can export or delete them at any time.</span>
        </label>
        {problem && (
          <p className="warning" role="alert">
            {problem}
          </p>
        )}
        <button type="submit" className="primary">
          Create and start
        </button>
      </form>
      <ImportBackup repo={repo} onImported={onOpen} />
      <p className="small">A private early version. All lessons and questions are draft content that teachers have not reviewed yet, and every level is an estimate.</p>
    </main>
  );
}

function ImportBackup({ repo, onImported }: { repo: Repo; onImported: (id: string) => void }) {
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

// ------------------------------------------------------------------ today

const STATUS_WORDS: Record<string, string> = {
  not_started: "not started",
  needs_work: "needs work",
  practising: "practising",
  ready_for_check: "ready for a check",
  check_again: "practise, then check again",
  secure: "secure",
};

function Today({ learner, onStart, onResume, onJourney }: { learner: Learner; onStart: (s: PlanStep) => void; onResume: () => void; onJourney: () => void }) {
  const now = learner.clock();
  const plan = learner.plan();
  const open = learner.state.open;
  const s = learner.state;
  const words = [...s.words.values()];
  const due = dueWords(s, now).length;
  const spelling: PatternPlan[] = s.sessions.size > 1 ? spellingPlan(s, learner.content, now, learner.speech).slice(0, 4) : [];
  return (
    <main className="page" aria-labelledby="today-title">
      <h1 id="today-title">Today</h1>
      {open && (
        <section className="resume">
          <p>
            You stopped in the middle of <strong>{Learner.sessionTitle(open.event.type).toLowerCase()}</strong> ({open.answered.length} answered).
          </p>
          <button type="button" className="primary" onClick={onResume}>
            Carry on
          </button>
        </section>
      )}
      <ol className="plan">
        {plan.map((p, i) => (
          <li key={`${p.type}:${p.capability ?? ""}:${p.step ?? ""}`}>
            <div>
              <h2>{p.title}</h2>
              <p>{p.reason}</p>
              {p.detail && (
                <details>
                  <summary>Why this, in detail</summary>
                  <p className="small">{p.detail}</p>
                </details>
              )}
            </div>
            <button type="button" className={i === 0 && !open ? "primary" : "secondary"} onClick={() => onStart(p)}>
              Start
            </button>
          </li>
        ))}
      </ol>
      <section className="journey-card" aria-labelledby="journey-card-title">
        <h2 id="journey-card-title">Doubling letters (new, adaptive)</h2>
        <p>hop → hopping, stop → stopped. A few questions on your own, then teaching that changes if it is not working, then new words on your own.</p>
        <button type="button" className="secondary" onClick={onJourney}>
          {learner.doublingReport().started ? "Go on with doubling letters" : "Try doubling letters"}
        </button>
      </section>
      {spelling.length > 0 && (
        <section aria-labelledby="spelling-plan">
          <h2 id="spelling-plan">Your spelling plan</h2>
          <ul className="patterns">
            {spelling.map((p) => (
              <li key={`${p.cap}#${p.step}`}>
                <span>{patternTitle(learner.content, p.cap, p.step)}</span>
                <span className={`status s-${p.status}`}>{STATUS_WORDS[p.status]}</span>
              </li>
            ))}
          </ul>
          <p className="small">
            {words.filter((w) => !w.learned).length} words in your review list, {due} due now; {words.filter((w) => w.learned).length} learned.
          </p>
        </section>
      )}
      {s.sessions.size > 0 && (
        <section className="more" aria-labelledby="more-title">
          <h2 id="more-title">More practice</h2>
          <p>Ten questions from any part of English: reading, writing, sentences and more. These areas have no lessons yet; the questions find out what to teach next.</p>
          <button type="button" className="secondary" onClick={() => onStart({ type: "explore", title: "More practice", reason: "" })}>
            Start more practice
          </button>
        </section>
      )}
    </main>
  );
}

// ------------------------------------------------------------------ progress

const CERTAINTY: Record<string, string> = { not_assessed: "Not assessed yet", early: "Early estimate", measured: "Measured" };

function Progress({ learner }: { learner: Learner }) {
  const now = learner.clock();
  const rows = capabilityProgress(learner.state, learner.content, now);
  const groups: [string, CapabilityProgress[]][] = [
    ["Spelling", rows.filter((r) => (GUIDED.spelling as readonly string[]).includes(r.id))],
    ["Grammar", rows.filter((r) => (GUIDED.grammar as readonly string[]).includes(r.id))],
    ["Vocabulary", rows.filter((r) => (GUIDED.vocabulary as readonly string[]).includes(r.id))],
  ];
  const others = rows.filter((r) => !r.guided);
  const s = learner.state;
  const patterns = [...s.patterns.values()];
  return (
    <main className="page" aria-labelledby="progress-title">
      <h1 id="progress-title">Progress</h1>
      <p className="small">
        Levels are on OpenPath's scale of 1 to 8. They are estimates from your answers, shown with how sure we are. Questions and lessons are draft content that teachers have not reviewed yet.
      </p>
      {learner.doublingReport().started && <ParentSummary report={learner.doublingReport()} />}
      {groups.map(([name, list]) => (
        <section key={name} aria-label={name}>
          <h2>{name}</h2>
          <ul className="caps">
            {list.map((r) => (
              <CapRow key={r.id} r={r} learner={learner} />
            ))}
          </ul>
        </section>
      ))}
      {patterns.length > 0 && (
        <section aria-labelledby="patterns-title">
          <h2 id="patterns-title">Spelling patterns</h2>
          <table className="patterns-table">
            <thead>
              <tr>
                <th scope="col">Pattern</th>
                <th scope="col">Status</th>
                <th scope="col">Practice</th>
                <th scope="col">New words</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => {
                const last = p.transfers[p.transfers.length - 1];
                const prac = p.practice;
                return (
                  <tr key={p.key}>
                    <td>{patternTitle(learner.content, p.capability, p.step)}</td>
                    <td>{STATUS_WORDS[patternStatus(p)]}</td>
                    <td>{prac.length ? `${prac.filter((x) => x.correct).length}/${prac.length}` : "–"}</td>
                    <td>{last ? `${last.right}/${last.total}` : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small">"New words" is the latest check with words you had never seen: it shows whether the rule has stuck, not just the words practised.</p>
        </section>
      )}
      <section aria-labelledby="others-title">
        <h2 id="others-title">Everything else</h2>
        <p className="small">These areas are measured through "More practice" with the same engine, but are not taught here yet.</p>
        <details>
          <summary>
            {others.filter((r) => r.certainty !== "not_assessed").length} of {others.length} assessed so far
          </summary>
          <ul className="caps">
            {others.map((r) => (
              <CapRow key={r.id} r={r} learner={learner} />
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}

function CapRow({ r, learner }: { r: CapabilityProgress; learner: Learner }) {
  const e = r.evidence;
  const parts = [e.assessment && `${e.assessment} independent`, e.practice && `${e.practice} practice`, e.retention && `${e.retention} later check${e.retention === 1 ? "" : "s"}`].filter(Boolean);
  const desc = r.band !== null ? bandDescriptor(learner.content, r.id, r.band) : null;
  return (
    <li className={`cap c-${r.certainty}`}>
      <div className="cap-head">
        <h3>{r.name}</h3>
        <span className="certainty">{CERTAINTY[r.certainty]}</span>
      </div>
      <p>{r.headline}</p>
      {desc && <p className="small">At this band: {desc}</p>}
      {r.certainty !== "not_assessed" && <p className="small">{r.verification}</p>}
      {r.history && <p className="small">{r.history}</p>}
      {(parts.length > 0 || e.generatedPractice > 0) && (
        <p className="small evidence">
          Evidence: {parts.length ? parts.join(", ") : "none that counts yet"}
          {e.generatedPractice ? `; ${e.generatedPractice} practice word${e.generatedPractice === 1 ? "" : "s"} recorded but not counted until checked` : ""}.
        </p>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ settings

function Settings({ learner, repo, voice, onChanged, onLeave, onSwitch }: { learner: Learner; repo: Repo; voice: SpeechSynthesisVoice | null; onChanged: () => void; onLeave: () => void; onSwitch: (id: string) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
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
    setMsg("Backup saved to your downloads. Keep it private: it contains the name and every answer.");
  };
  return (
    <main className="page" aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
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
        <h2 id="backup-title">Keep progress safe</h2>
        <p>Progress lives only in this browser. Clearing the browser's data deletes it. Export a backup now and then, and import it to carry on on another device.</p>
        <button type="button" className="primary" onClick={download}>
          Export a backup
        </button>
        {msg && <p role="status">{msg}</p>}
        <ImportBackup repo={repo} onImported={onSwitch} />
      </section>
      <section aria-labelledby="profile-title">
        <h2 id="profile-title">Learner</h2>
        <button type="button" className="secondary" onClick={onLeave}>
          Switch learner
        </button>
        <button
          type="button"
          className="danger"
          onClick={async () => {
            if (!window.confirm(`Delete ${learner.state.profile?.name} and all their progress from this device? This cannot be undone. Export a backup first if you want to keep it.`)) return;
            await repo.remove(learner.profileId);
            onLeave();
          }}
        >
          Delete this learner from this device
        </button>
      </section>
      <section aria-labelledby="about-title">
        <h2 id="about-title">About this version</h2>
        <p>A private early version of OpenPath English. It works offline once opened. It uses no accounts, adverts, tracking or AI marking, and nothing leaves this device.</p>
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
