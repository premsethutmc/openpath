/**
 * Before the learning starts: welcome, the parent account (register, sign in, recovery), choosing or adding a
 * learner (name, who is learning, goal, consent), and the introduction to the first assessment. The screens follow
 * the approved prototype; what they record is real (the account on the server, the learner's preferences as
 * events) and nothing here decides a level.
 */
import { type FormEvent, type ReactNode, useState } from "react";
import { ApiError } from "../logic/account.ts";
import type { LearnerBand, LearnerGoal } from "../logic/events.ts";
import type { ProfileSummary } from "../logic/store.ts";

export const BANDS: { id: LearnerBand; em: string; label: string; mini: string }[] = [
  { id: "early", em: "🧸", label: "Just starting", mini: "Early reader" },
  { id: "school", em: "🎒", label: "School learner", mini: "Building skills" },
  { id: "older", em: "🚀", label: "Older learner or adult", mini: "Learning with a goal" },
];
export const GOALS: { id: LearnerGoal; em: string; label: string }[] = [
  { id: "confidence", em: "💬", label: "Speak and write confidently" },
  { id: "grammar", em: "🧩", label: "Understand grammar" },
  { id: "spelling", em: "✍️", label: "Get better at spelling" },
  { id: "reading", em: "📚", label: "Read and understand more" },
];
const AVATARS = ["🦊", "🐼", "🦉", "🐢", "🦁", "🐬", "🐙", "🦄"];
export const avatarFor = (id: string) => AVATARS[[...id].reduce((t, ch) => t + ch.charCodeAt(0), 0) % AVATARS.length];

export function Brand() {
  return (
    <p className="brand" aria-label="OpenPath">
      open<span>path</span> <span aria-hidden="true">✦</span>
    </p>
  );
}

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <main className="welcome" aria-label={label}>
      <header className="top">
        <Brand />
      </header>
      <div className="page">{children}</div>
    </main>
  );
}

const Arrow = () => (
  <span className="arrow" aria-hidden="true">
    →
  </span>
);

// ------------------------------------------------------------------ welcome

export function Welcome({ accounts, onBegin, onSignIn, onDevice, privateWindow, extra }: { accounts: boolean; onBegin: () => void; onSignIn: () => void; onDevice: () => void; privateWindow: boolean; extra?: ReactNode }) {
  return (
    <Frame label="Welcome">
      <p className="eyebrow">A better way to learn</p>
      <h1 className="hero">
        Your curiosity.
        <br />
        Your pace. <span aria-hidden="true">✨</span>
      </h1>
      <p className="sub">Learn English through little discoveries, useful practice, and a path that grows with you.</p>
      <div className="art" aria-hidden="true">
        <div className="emoji">🦊</div>
        <div className="bubble">
          Ready to find
          <br />
          your spark? ⚡
        </div>
      </div>
      {privateWindow && <p className="warning">This browser is not letting OpenPath save anything on this device (a private window, perhaps).</p>}
      <div className="stack">
        <button type="button" className="primary" onClick={onBegin}>
          Let's begin
          <Arrow />
        </button>
        {accounts && (
          <>
            <button type="button" className="secondary" onClick={onSignIn}>
              I have a parent account
            </button>
            <button type="button" className="link" onClick={onDevice}>
              Use on this device only, without an account
            </button>
          </>
        )}
      </div>
      {extra}
      <p className="small" style={{ textAlign: "center", marginTop: 16 }}>
        An early version. Lessons and questions are draft content awaiting review by teachers, and every level is an estimate.
      </p>
    </Frame>
  );
}

// ------------------------------------------------------------------ parent account

export type AuthMode = "register" | "login" | "forgot" | "reset";

function Field({ label, type, value, onChange, error, autoComplete, hint }: { label: string; type: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string }) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} required />
      {hint && !error && (
        <p id={`${id}-h`} className="small">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-e`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Register, sign in, ask for a reset link, or set a new password from one. */
export function ParentAuth({
  mode,
  setMode,
  onRegister,
  onLogin,
  onForgot,
  onReset,
  onBack,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  onRegister: (email: string, password: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onForgot: (email: string) => Promise<string>;
  onReset: (password: string) => Promise<string>;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiError | Error | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const field = (k: string) => (problem instanceof ApiError ? problem.fields[k] : undefined);
  const run = async (e: FormEvent, f: () => Promise<void | string>) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const msg = await f();
      if (typeof msg === "string") setDone(msg);
    } catch (err) {
      setProblem(err as Error);
    } finally {
      setBusy(false);
    }
  };
  const general = problem && !(problem instanceof ApiError && (problem.fields.email || problem.fields.password || problem.fields.consent)) ? problem.message : null;
  const titles: Record<AuthMode, [string, string, string]> = {
    register: ["Parent account", "Create your parent account", "One account for your children's learning, on any device. You add each child next."],
    login: ["Parent account", "Welcome back", "Sign in to see your children's learning."],
    forgot: ["Parent account", "Forgot your password?", "We'll email you a link to choose a new one."],
    reset: ["Parent account", "Choose a new password", "Use at least 10 characters. Signing in again is needed on every device."],
  };
  const [eyebrow, hero, sub] = titles[mode];
  return (
    <Frame label={hero}>
      <p>
        <button type="button" className="link" onClick={onBack}>
          ← Back
        </button>
      </p>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="hero">{hero}</h1>
      <p className="sub">{sub}</p>
      {done ? (
        <div className="stack">
          <p className="ok-note" role="status">
            {done}
          </p>
          <button type="button" className="primary" onClick={() => (setDone(null), setMode("login"))}>
            Sign in
          </button>
        </div>
      ) : mode === "register" ? (
        <form onSubmit={(e) => run(e, () => (agree ? onRegister(email, password) : Promise.reject(new ApiError(400, "Tick the box to agree to how records are kept.", { consent: "Tick the box to agree to how records are kept." }))))} noValidate>
          <Field label="Email" type="email" value={email} onChange={setEmail} error={field("email")} autoComplete="email" />
          <Field label="Password" type="password" value={password} onChange={setPassword} error={field("password")} autoComplete="new-password" hint="At least 10 characters, not a common password." />
          <label className="inline consent">
            <input id="account-consent" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I am a parent or guardian. I agree that OpenPath keeps my email and my children's learning records on its server, to show their learning to me. OpenPath's developers read a child's record only if I turn on sharing for diagnostics for that child in Me (every look is logged), and the app sends performance measurements that never include answers or names. Records are not sold or given to anyone else, and I can export or delete them at any time.</span>
          </label>
          {field("consent") && (
            <p className="field-error" role="alert">
              {field("consent")}
            </p>
          )}
          {general && (
            <p className="warning" role="alert">
              {general}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="small" style={{ textAlign: "center" }}>
            <button type="button" className="link" onClick={() => setMode("login")}>
              I already have an account
            </button>
          </p>
        </form>
      ) : mode === "login" ? (
        <form onSubmit={(e) => run(e, () => onLogin(email, password))} noValidate>
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          {problem && (
            <p className="warning" role="alert">
              {problem.message}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="link" onClick={() => setMode("forgot")}>
              Forgot your password?
            </button>
            <button type="button" className="link" onClick={() => setMode("register")}>
              Create an account
            </button>
          </div>
        </form>
      ) : mode === "forgot" ? (
        <form onSubmit={(e) => run(e, () => onForgot(email))} noValidate>
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {problem && (
            <p className="warning" role="alert">
              {problem.message}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy}>
            Send the reset link
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => run(e, () => onReset(password))} noValidate>
          <Field label="New password" type="password" value={password} onChange={setPassword} error={field("password")} autoComplete="new-password" />
          {general && (
            <p className="warning" role="alert">
              {general}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy}>
            Change password
          </button>
        </form>
      )}
    </Frame>
  );
}

// ------------------------------------------------------------------ choosing a learner

export function PupilPicker({ profiles, account, onOpen, onAdd, onSignOut, extra }: { profiles: ProfileSummary[]; account: string | null; onOpen: (id: string) => void; onAdd: () => void; onSignOut?: () => void; extra?: ReactNode }) {
  return (
    <Frame label="Who is learning today?">
      <p className="eyebrow">{account ? `Signed in as ${account}` : "On this device"}</p>
      <h1 className="hero">Who is learning today?</h1>
      <p className="sub">{profiles.length ? "Choose a learner to carry on, or add another." : "Add your first learner to start."}</p>
      <ul className="profiles">
        {profiles.map((p) => (
          <li key={p.id}>
            <button type="button" className="choice profile" onClick={() => onOpen(p.id)}>
              <span className="em" aria-hidden="true">
                {avatarFor(p.id)}
              </span>
              <span>
                <span className="written" style={{ color: "inherit" }}>
                  {p.name}
                </span>
                <span className="mini">{p.events > 1 ? `Last used ${p.lastAt.slice(0, 10)}` : "Not started yet"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div style={{ height: 18 }} />
      <button type="button" className="primary" onClick={onAdd}>
        Add a learner
        <Arrow />
      </button>
      {onSignOut && (
        <button type="button" className="secondary" onClick={onSignOut}>
          Sign out
        </button>
      )}
      {extra}
    </Frame>
  );
}

// ------------------------------------------------------------------ adding a learner

export function AddLearner({ mode, onCreate, onCancel }: { mode: "device" | "account"; onCreate: (name: string, by: "learner" | "guardian", band: LearnerBand, goal: LearnerGoal) => Promise<void>; onCancel: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [band, setBand] = useState<LearnerBand>("school");
  const [goal, setGoal] = useState<LearnerGoal>("confidence");
  const [by, setBy] = useState<"learner" | "guardian">("guardian");
  const [agree, setAgree] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (step === 1)
    return (
      <Frame label="Who is learning?">
        <p>
          <button type="button" className="link" onClick={onCancel}>
            ← Back
          </button>
        </p>
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="hero">Who is learning?</h1>
        <p className="sub">This is kept with the learner's record. Your answers, not your age, decide the difficulty.</p>
        <label>
          Name to show {mode === "device" ? "(only on this device)" : "(a first name or nickname is enough)"}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" placeholder="For example, Arun" />
        </label>
        <div className="stack" role="group" aria-label="Who is learning">
          {BANDS.map((b) => (
            <button key={b.id} type="button" className="choice" aria-pressed={band === b.id} onClick={() => setBand(b.id)}>
              <span className="em" aria-hidden="true">
                {b.em}
              </span>
              <span>
                {b.label}
                <span className="mini">{b.mini}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ height: 22 }} />
        <button type="button" className="primary" onClick={() => setStep(2)}>
          Continue
          <Arrow />
        </button>
      </Frame>
    );
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) return setProblem("Tick the box to agree to how progress is kept.");
    setBusy(true);
    try {
      await onCreate(name, mode === "account" ? "guardian" : by, band, goal);
    } catch (err) {
      setProblem((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <Frame label="What brings you here?">
      <p>
        <button type="button" className="link" onClick={() => setStep(1)}>
          ← Back
        </button>
      </p>
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="hero">What brings you here?</h1>
      <p className="sub">Choose a goal. You can always change it later. It decides which part of the journey you see first; your answers decide what to learn.</p>
      <form onSubmit={create} noValidate>
        <div className="stack" role="group" aria-label="Goal">
          {GOALS.map((g) => (
            <button key={g.id} type="button" className="choice" aria-pressed={goal === g.id} onClick={() => setGoal(g.id)}>
              <span className="em" aria-hidden="true">
                {g.em}
              </span>
              {g.label}
            </button>
          ))}
        </div>
        {mode === "device" && (
          <fieldset>
            <legend>Who is setting this up?</legend>
            <label className="inline">
              <input type="radio" name="by" checked={by === "guardian"} onChange={() => setBy("guardian")} /> A parent or guardian
            </label>
            <label className="inline">
              <input type="radio" name="by" checked={by === "learner"} onChange={() => setBy("learner")} /> The learner (16 or over)
            </label>
          </fieldset>
        )}
        <label className="inline consent">
          <input id="consent" type="checkbox" checked={agree} onChange={(e) => (setAgree(e.target.checked), setProblem(null))} />
          <span>
            {mode === "device"
              ? "I agree that answers and progress are kept in this browser on this device only. Nothing is sent anywhere. I can export or delete them at any time."
              : "I am this learner's parent or guardian. I agree that their answers and progress are kept in my OpenPath account, so I can see them on any device. I can export or delete them at any time."}
          </span>
        </label>
        {problem && (
          <p className="warning" role="alert">
            {problem}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Building…" : "Build my path"}
          {!busy && <Arrow />}
        </button>
      </form>
    </Frame>
  );
}

// ------------------------------------------------------------------ before the first assessment

export function CheckIntro({ name, onReady, onLater }: { name: string; onReady: () => void; onLater: () => void }) {
  return (
    <Frame label="Find your starting point">
      <span className="pill">
        <span aria-hidden="true">✨</span> {name}'s first discovery
      </span>
      <h1 className="hero">Let's find your starting point.</h1>
      <p className="sub">About 12 to 24 quick questions on spelling, grammar and words. No grades, no pressure. Your answers decide where to begin.</p>
      <div className="art" style={{ background: "linear-gradient(135deg, var(--mint), var(--lilac-2))" }} aria-hidden="true">
        <div className="emoji">🔎</div>
        <div className="bubble">
          What do you
          <br />
          already know?
        </div>
      </div>
      <div className="tile mint">
        <b>💡 It's okay to get things wrong.</b>
        <p>Every answer helps. You'll see a short explanation after each one, and you can stop and carry on later.</p>
      </div>
      <button type="button" className="primary" onClick={onReady}>
        I'm ready
        <Arrow />
      </button>
      <button type="button" className="secondary" onClick={onLater}>
        Look around first
      </button>
    </Frame>
  );
}
