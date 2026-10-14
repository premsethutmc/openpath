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
import { Api, ServerRepo } from "../logic/account.ts";
import { type AppContent, loadContent } from "../logic/content.ts";
import type { LearnerBand, LearnerGoal } from "../logic/events.ts";
import { Learner } from "../logic/learner.ts";
import type { PlanStep } from "../logic/plan.ts";
import { type ProfileSummary, type Repo, openRepo } from "../logic/store.ts";
import { Home } from "./Home.tsx";
import { Journey } from "./Journey.tsx";
import { ImportBackup, Me } from "./Me.tsx";
import { AddLearner, type AuthMode, Brand, CheckIntro, ParentAuth, PupilPicker, Welcome, avatarFor } from "./Onboarding.tsx";
import { PathView } from "./PathView.tsx";
import { ProgressView } from "./ProgressView.tsx";
import { Session } from "./Session.tsx";
import { detectSpeech } from "./speech.ts";

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

type Mode = "device" | "account";
type Screen = { name: "loading" } | { name: "welcome" } | { name: "auth"; mode: AuthMode } | { name: "pupils" } | { name: "add" } | { name: "intro" } | { name: "app" };
type Tab = "home" | "journey" | "progress" | "me";
const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: "home", label: "Home", ico: "🏠" },
  { id: "journey", label: "Journey", ico: "🗺️" },
  { id: "progress", label: "Progress", ico: "📈" },
  { id: "me", label: "Me", ico: "👤" },
];

/** A reset link from the email: #reset?uid=…&token=… */
const resetLink = () => {
  const m = location.hash.match(/^#reset\?(.*)$/);
  if (!m) return null;
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
  const [inJourney, setInJourney] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const changed = useCallback(() => setTick((t) => t + 1), []);
  const [reset] = useState(resetLink);

  const openLearner = async (r: Repo, id: string) => {
    setProblem(null);
    try {
      const l = await Learner.open(content, r, id, clock);
      l.speechAvailable = !!voice;
      store.set(LAST, id);
      setLearner(l);
      setTab("home");
      setInSession(false);
      setInJourney(false);
      setScreen({ name: "app" });
    } catch (e) {
      setProblem((e as Error).message);
      setScreen({ name: "pupils" });
    }
  };

  const chooseRepo = async (r: Repo, m: Mode, reopen: boolean) => {
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
      if (reset && status.available) return setScreen({ name: "auth", mode: "reset" });
      if (status.account.authenticated) {
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
    if (learner) learner.speechAvailable = !!voice;
    changed();
  }, [voice, learner, changed]);

  const toPicker = async () => {
    setLearner(null);
    store.set(LAST, null);
    if (repo) setProfiles(await repo.profiles());
    setScreen({ name: "pupils" });
  };

  const signedIn = async (info: { email?: string }) => {
    setEmail(info.email ?? null);
    store.set(LAST, null);
    await chooseRepo(new ServerRepo(api), "account", false);
  };

  const signOut = async () => {
    await api.logout().catch(() => undefined);
    setEmail(null);
    setLearner(null);
    store.set(LAST, null);
    setRepo(deviceRepo);
    setProfiles(deviceRepo ? await deviceRepo.profiles() : []);
    setMode("device");
    setScreen({ name: "auth", mode: "login" });
  };

  if (screen.name === "loading") return <p className="loading">Opening OpenPath English…</p>;

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
        onBack={() => {
          if (reset) history.replaceState(null, "", location.pathname);
          setScreen({ name: "welcome" });
        }}
        onRegister={async (e, p) => signedIn(await api.register(e, p))}
        onLogin={async (e, p) => signedIn(await api.login(e, p))}
        onForgot={async (e) => (await api.requestReset(e)).detail}
        onReset={async (p) => {
          const msg = (await api.confirmReset(reset!.uid, reset!.token, p)).detail;
          history.replaceState(null, "", location.pathname);
          return msg;
        }}
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
          const l = await Learner.create(content, repo, name, by, clock, id, mode === "account" ? "parent_account" : "this_device_only");
          await l.setPreferences(band, goal);
          l.speechAvailable = !!voice;
          store.set(LAST, l.profileId);
          setLearner(l);
          setTab("home");
          setScreen({ name: "intro" });
        }}
      />
    );

  if (!learner) return <p className="loading">Opening OpenPath English…</p>;

  const start = async (step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose">) => {
    await learner.start(step);
    setScreen({ name: "app" });
    setInSession(true);
  };

  if (screen.name === "intro")
    return <CheckIntro name={learner.state.profile?.name ?? "Your"} onReady={() => start({ type: "placement" })} onLater={() => setScreen({ name: "app" })} />;

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
        <Home
          learner={learner}
          onStart={start}
          onResume={() => (learner.state.open?.event.type === "doubling_journey" ? setInJourney(true) : setInSession(true))}
          onJourney={async () => {
            await learner.startJourney();
            setInJourney(true);
          }}
          onWhy={() => setTab("progress")}
        />
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
          onDeleteAccount={async (password) => {
            await api.deleteAccount(password);
            setEmail(null);
            setLearner(null);
            store.set(LAST, null);
            setRepo(deviceRepo);
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
