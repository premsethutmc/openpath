/**
 * OpenPath English: the prototype's screens on the real engine.
 *
 * Two ways to keep a record, with the same Learner, engine and screens:
 *   a parent account   the record is on OpenPath's server (ServerRepo), for any device after signing in
 *   this device only   the record is in this browser (IndexedDB), as before; used when there is no account server
 *
 * Every screen reads the learner's state, which is rebuilt from the append-only event list by the engine.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError, ServerRepo } from "../logic/account.ts";
import { now as perfNow, record, setSender } from "../logic/telemetry.ts";
import { type AppContent, loadContent } from "../logic/content.ts";
import type { LearnerBand, LearnerGoal } from "../logic/events.ts";
import { Learner } from "../logic/learner.ts";
import type { PlanStep } from "../logic/plan.ts";
import { type ProfileSummary, type Repo, openRepo } from "../logic/store.ts";
import { Home } from "./Home.tsx";
import { Journey } from "./Journey.tsx";
import { ImportBackup, Me } from "./Me.tsx";
import { AddLearner, type AuthMode, Brand, ParentAuth, PupilPicker, Welcome, avatarFor } from "./Onboarding.tsx";
import { PathView } from "./PathView.tsx";
import { ProgressView } from "./ProgressView.tsx";
import { Session } from "./Session.tsx";
import { detectSpeech } from "./speech.ts";
import { SpellingIntro } from "./SpellingIntro.tsx";
import { SpellingBee } from "./SpellingBee.tsx";
import { MyWords } from "./MyWords.tsx";
import { BookQuestions, MyBooks } from "./MyBooks.tsx";
import type { Book } from "../logic/books.ts";
import type { SpellSource } from "../logic/events.ts";

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
const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* a private window may refuse; nothing depends on it */
    }
  },
};
const LAST = "openpath-english-last-profile";
/** "account" while a parent is signed in on this device: if the server is then unreachable, say so, never fall back silently. */
const MODE = "openpath-english-mode";

type Mode = "device" | "account";
type Screen = { name: "loading" } | { name: "unreachable" } | { name: "welcome" } | { name: "auth"; mode: AuthMode } | { name: "pupils" } | { name: "add" } | { name: "app" } | { name: "spelling-intro"; step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose" | "target"> };
type Tab = "home" | "journey" | "progress" | "me";
const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: "home", label: "Home", ico: "🏠" },
  { id: "journey", label: "Journey", ico: "🗺️" },
  { id: "progress", label: "Progress", ico: "📈" },
  { id: "me", label: "Me", ico: "👤" },
];

/** A reset link from the email: #reset?uid=…&token=…, read once and removed from the address bar and history. */
const resetLink = () => {
  const m = location.hash.match(/^#reset\?(.*)$/);
  if (!m) return null;
  history.replaceState(null, "", location.pathname + location.search);
  const q = new URLSearchParams(m[1]);
  return q.get("uid") && q.get("token") ? { uid: q.get("uid")!, token: q.get("token")! } : null;
};

export function App() {
  const content = useMemo<AppContent>(() => loadContent(), []);
  const api = useMemo(() => new Api(), []);
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [accounts, setAccounts] = useState(false);
  const [mode, setMode] = useState<Mode>("device");
  const [email, setEmail] = useState<string | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [deviceRepo, setDeviceRepo] = useState<Repo | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [inSession, setInSession] = useState(false);
  // a spelling session's source (the Bee's words or a list) and where to go back to; My Words is its own screen
  const [bee, setBee] = useState<{ source: SpellSource; title: string; back: "home" | "mywords" | "mybooks" } | null>(null);
  const [inMyWords, setInMyWords] = useState(false);
  const [inMyBooks, setInMyBooks] = useState(false);
  const [bookQuiz, setBookQuiz] = useState<Book | null>(null);
  const [inJourney, setInJourney] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const changed = useCallback(() => setTick((t) => t + 1), []);
  const [reset] = useState(resetLink);
  const [developer, setDeveloper] = useState(false);
  useEffect(() => {
    if (mode !== "account") return setDeveloper(false);
    api.developerStatus().then((d) => setDeveloper(d.developer), () => setDeveloper(false));
  }, [mode, email, api]);
  const diagnostics = useMemo(
    () =>
      learner && mode === "account"
        ? {
            developer,
            shared: async () => !!(await api.pupils()).find((p) => p.id === learner.profileId)?.shared_for_diagnostics,
            share: async (on: boolean) => !!(await api.shareForDiagnostics(learner.profileId, on)).shared_for_diagnostics,
          }
        : undefined,
    [learner, mode, developer, api],
  );

  const openLearner = async (r: Repo, id: string) => {
    setProblem(null);
    try {
      const t = perfNow();
      const l = await Learner.open(content, r, id, clock);
      record({ name: "load_ms", ms: perfNow() - t });
      l.speechAvailable = !!voice;
      l.voiceInfo = voice ? { name: voice.name.slice(0, 60), lang: voice.lang, local: voice.localService } : null;
      store.set(LAST, id);
      setLearner(l);
      setTab("home");
      setInSession(false);
      setInJourney(false);
      setBee(null);
      setInMyWords(false);
      setInMyBooks(false);
      setBookQuiz(null);
      setScreen({ name: "app" });
    } catch (e) {
      setProblem((e as Error).message);
      setScreen({ name: "pupils" });
    }
  };

  const chooseRepo = async (r: Repo, m: Mode, reopen: boolean) => {
    // measurements go to the server only for a signed-in parent account; on a device they are dropped
    setSender(m === "account" ? async (batch) => void (await api.telemetry(batch)) : null);
    setRepo(r);
    setMode(m);
    const list = await r.profiles();
    setProfiles(list);
    const last = store.get(LAST);
    if (reopen && last && list.some((p) => p.id === last)) return openLearner(r, last);
    setScreen(list.length || m === "account" ? { name: "pupils" } : { name: "add" });
  };

  useEffect(() => {
    void (async () => {
      const [status, local] = await Promise.all([api.status(), openRepo()]);
      setDeviceRepo(local);
      setAccounts(status.available);
      if (status.unreachable && store.get(MODE) === "account") return setScreen({ name: "unreachable" });
      if (reset && status.available) return setScreen({ name: "auth", mode: "reset" });
      if (status.account.authenticated) {
        store.set(MODE, "account");
        setEmail(status.account.email ?? null);
        return chooseRepo(new ServerRepo(api), "account", true);
      }
      const last = store.get(LAST);
      const localProfiles = await local.profiles();
      if (last && localProfiles.some((p) => p.id === last)) return chooseRepo(local, "device", true);
      setRepo(local);
      setProfiles(localProfiles);
      setScreen({ name: "welcome" });
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
    if (learner) {
      learner.speechAvailable = !!voice;
      learner.voiceInfo = voice ? { name: voice.name.slice(0, 60), lang: voice.lang, local: voice.localService } : null;
    }
    changed();
  }, [voice, learner, changed]);

  const toPicker = async () => {
    setLearner(null);
    store.set(LAST, null);
    if (repo) setProfiles(await repo.profiles());
    setScreen({ name: "pupils" });
  };

  const signedIn = async (info: { email?: string }) => {
    store.set(MODE, "account");
    setEmail(info.email ?? null);
    store.set(LAST, null);
    await chooseRepo(new ServerRepo(api), "account", false);
  };

  /** Signed out only when the server says so (or the session had already ended): never just in appearance. */
  const signOut = async () => {
    try {
      await api.logout();
    } catch (e) {
      if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) throw e;
    }
    setSender(null);
    store.set(MODE, null);
    setEmail(null);
    setLearner(null);
    store.set(LAST, null);
    setRepo(deviceRepo);
    setProfiles(deviceRepo ? await deviceRepo.profiles() : []);
    setMode("device");
    setScreen({ name: "auth", mode: "login" });
  };

  if (screen.name === "loading") return <p className="loading">Opening OpenPath English…</p>;

  if (screen.name === "unreachable")
    return (
      <main className="welcome" aria-labelledby="unreachable-title">
        <header className="top">
          <Brand />
        </header>
        <div className="page">
          <h1 id="unreachable-title" className="hero">
            OpenPath can't be reached
          </h1>
          <p className="sub">Your account's records are kept safely on OpenPath's server. Check the internet connection, then try again.</p>
          <button type="button" className="primary" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );

  if (screen.name === "welcome")
    return (
      <Welcome
        accounts={accounts}
        privateWindow={deviceRepo?.kind === "memory"}
        onBegin={() => (accounts ? setScreen({ name: "auth", mode: "register" }) : deviceRepo && chooseRepo(deviceRepo, "device", false))}
        onSignIn={() => setScreen({ name: "auth", mode: "login" })}
        onDevice={() => deviceRepo && chooseRepo(deviceRepo, "device", false)}
        extra={
          deviceRepo && (
            <ImportBackup
              repo={deviceRepo}
              onImported={(id) => {
                setRepo(deviceRepo);
                setMode("device");
                void openLearner(deviceRepo, id);
              }}
            />
          )
        }
      />
    );

  if (screen.name === "auth")
    return (
      <ParentAuth
        mode={screen.mode}
        setMode={(m) => setScreen({ name: "auth", mode: m })}
        onBack={() => setScreen({ name: "welcome" })}
        onRegister={async (e, p) => signedIn(await api.register(e, p))}
        onLogin={async (e, p) => signedIn(await api.login(e, p))}
        onForgot={async (e) => (await api.requestReset(e)).detail}
        onReset={async (p) => (await api.confirmReset(reset!.uid, reset!.token, p)).detail}
      />
    );

  if (!repo) return <p className="loading">Opening OpenPath English…</p>;

  if (screen.name === "pupils")
    return (
      <>
        {problem && (
          <p className="warning" role="alert" style={{ maxWidth: 440, margin: "0 auto" }}>
            {problem}
          </p>
        )}
        <PupilPicker
          profiles={profiles}
          account={mode === "account" ? email : null}
          onOpen={(id) => openLearner(repo, id)}
          onAdd={() => setScreen({ name: "add" })}
          onSignOut={mode === "account" ? signOut : undefined}
          extra={
            mode === "device" ? (
              <>
                <ImportBackup repo={repo} onImported={(id) => openLearner(repo, id)} />
                {accounts && (
                  <p className="small" style={{ textAlign: "center" }}>
                    <button type="button" className="link" onClick={() => setScreen({ name: "auth", mode: "login" })}>
                      Sign in to a parent account instead
                    </button>
                  </p>
                )}
              </>
            ) : null
          }
        />
      </>
    );

  if (screen.name === "add")
    return (
      <AddLearner
        mode={mode}
        onCancel={() => (profiles.length || mode === "account" ? setScreen({ name: "pupils" }) : setScreen({ name: "welcome" }))}
        onCreate={async (name, by, band: LearnerBand, goal: LearnerGoal) => {
          const id = mode === "account" ? (await api.createPupil(name.trim() || "Learner")).id : undefined;
          let l: Learner;
          try {
            l = await Learner.create(content, repo, name, by, clock, id, mode === "account" ? "parent_account" : "this_device_only");
            await l.setPreferences(band, goal);
          } catch (e) {
            // never leave an empty pupil behind in the account
            if (id) await api.deletePupil(id).catch(() => undefined);
            throw e;
          }
          l.speechAvailable = !!voice;
      l.voiceInfo = voice ? { name: voice.name.slice(0, 60), lang: voice.lang, local: voice.localService } : null;
          store.set(LAST, l.profileId);
          setLearner(l);
          setTab("home");
          // straight to Home: the Spelling Bee needs no starting check, and General English's starting check is on Home
          setScreen({ name: "app" });
        }}
      />
    );

  if (!learner) return <p className="loading">Opening OpenPath English…</p>;

  const start = async (step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose" | "target">, opts?: { delivery?: "device_voice" | "adult_reader" }) => {
    // the spelling check needs the words to be heard: check the sound (or arrange an adult reader) first
    if (step.type === "spelling_assess" && !opts?.delivery) return setScreen({ name: "spelling-intro", step });
    await learner.start(step, opts);
    setScreen({ name: "app" });
    setInSession(true);
  };

  if (screen.name === "spelling-intro") return <SpellingIntro learner={learner} voice={voice} step={screen.step} onStart={start} onBack={() => setScreen({ name: "app" })} onChanged={changed} />;

  if (bee)
    return (
      <SpellingBee
        key={`${bee.source.type}:${bee.source.id}`}
        learner={learner}
        source={bee.source}
        title={bee.title}
        backTo={bee.back === "mywords" ? "My Words" : bee.back === "mybooks" ? "My Books" : "Home"}
        voice={voice}
        speechOff={!learner.state.speech}
        onTurnSpeechOn={async () => {
          await learner.setSpeech(true);
          changed();
        }}
        onChanged={changed}
        onLeave={() => {
          setInMyWords(bee.back === "mywords");
          setInMyBooks(bee.back === "mybooks");
          setBee(null);
          changed();
        }}
      />
    );
  if (bookQuiz)
    return (
      <BookQuestions
        key={bookQuiz.id}
        learner={learner}
        book={bookQuiz}
        onChanged={changed}
        onLeave={() => {
          setBookQuiz(null);
          setInMyBooks(true);
          changed();
        }}
      />
    );
  if (inMyBooks)
    return (
      <MyBooks
        learner={learner}
        onChanged={changed}
        onSpelling={(b) => (setInMyBooks(false), setBee({ source: { type: "book", id: b.id }, title: b.title, back: "mybooks" }))}
        onQuestions={(b) => (setInMyBooks(false), setBookQuiz(b))}
        onLeave={() => {
          setInMyBooks(false);
          changed();
        }}
      />
    );
  if (inMyWords)
    return (
      <MyWords
        learner={learner}
        onChanged={changed}
        onPractise={(l) => setBee({ source: { type: "list", id: l.id }, title: l.name, back: "mywords" })}
        onLeave={() => {
          setInMyWords(false);
          changed();
        }}
      />
    );

  if (inJourney || (inSession && learner.state.open?.event.type === "doubling_journey"))
    return (
      <Journey
        learner={learner}
        voice={learner.state.speech ? voice : null}
        onChanged={changed}
        onLeave={() => {
          setInJourney(false);
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

  const name = learner.state.profile?.name ?? "Learner";
  return (
    <div className="shell" data-tick={tick} data-mode={mode}>
      <header className="top">
        <Brand />
        <p className="who">
          <span className="sr-only">Learning now: </span>
          {name}
          <span className="avatar" aria-hidden="true">
            {avatarFor(learner.profileId)}
          </span>
        </p>
      </header>
      {tab === "home" && (
        <>{mode === "account" && !learner.content.gate && <section className="page"><a className="secondary" href={`/year/?learner=${encodeURIComponent(learner.profileId)}`}>My Learning Year</a></section>}<Home
          learner={learner}
          onStart={start}
          onResume={() => {
            const type = learner.state.open?.event.type;
            // an essay sitting continues in the essay studio, not in the question session screen
            if (type === "essay") return void location.assign("?experience=essay-live");
            if (type === "doubling_journey") setInJourney(true);
            else setInSession(true);
          }}
          onJourney={async () => {
            await learner.startJourney();
            setInJourney(true);
          }}
          onWhy={() => setTab("progress")}
          onBee={() => setBee({ source: { type: "bank", id: "spelling-bee" }, title: "Spelling Bee", back: "home" })}
          onMyWords={() => setInMyWords(true)}
          onMyBooks={() => setInMyBooks(true)}
        /></>
      )}
      {tab === "journey" && <PathView learner={learner} onStart={start} />}
      {tab === "progress" && <ProgressView learner={learner} />}
      {tab === "me" && (
        <Me
          learner={learner}
          repo={repo}
          voice={voice}
          account={mode === "account" ? email : null}
          onChanged={changed}
          onSwitch={toPicker}
          onOpen={(id) => openLearner(repo, id)}
          onRemoved={toPicker}
          onSignOut={signOut}
          diagnostics={diagnostics}
          onDeleteAccount={async (password) => {
            await api.deleteAccount(password);
            setSender(null);
            store.set(MODE, null);
            setEmail(null);
            setLearner(null);
            store.set(LAST, null);
            setRepo(deviceRepo);
            setProfiles(deviceRepo ? await deviceRepo.profiles() : []);
            setMode("device");
            setScreen({ name: "welcome" });
          }}
        />
      )}
      <nav className="nav" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => (setTab(t.id), scrollTo(0, 0))}>
            <span className="ico" aria-hidden="true">
              {t.ico}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
