import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { AppleShopping } from "./activities/apple-shopping/AppleShopping";
import { resetClock } from "./core/clock";
import { type Identity, clearIdentity, getIdentity, setIdentity } from "./core/identity";
import { restoreFromFile } from "./core/recovery";
import { type EvidenceStore, enrol, openStore } from "./core/store";
import type { Overview, SessionResult } from "./core/types";
import { ProfileView } from "./profile/ProfileView";

declare const __OPENPATH_API__: string | null;
const API_BASE = __OPENPATH_API__;

export function App() {
  const [identity, setIdentityState] = useState<Identity | null>(() => getIdentity());
  const [store, setStore] = useState<EvidenceStore | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGrownUps, setShowGrownUps] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [planFor, setPlanFor] = useState<Overview | null>(null);

  const refresh = useCallback(async (target: EvidenceStore, startNewGame: boolean) => {
    try {
      const fresh = await target.overview();
      setOverview(fresh);
      setLoadError(null);
      if (startNewGame) {
        setPlanFor(fresh);
        setPlayKey((key) => key + 1);
      }
    } catch (error) {
      setLoadError((error as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!identity) return;
    const opened = openStore(API_BASE, identity);
    setStore(opened);
    void refresh(opened, true);
  }, [identity, refresh]);

  if (!identity) {
    return (
      <Welcome
        onReady={(created) => {
          setIdentity(created);
          setIdentityState(created);
        }}
      />
    );
  }

  if (loadError && !planFor) {
    return (
      <main className="grownups">
        <h1>The OpenPath server is not answering</h1>
        <p className="lede">{loadError} Check that the API is running, then try again.</p>
        <button type="button" className="primary" onClick={() => store && refresh(store, true)}>
          Try again
        </button>
      </main>
    );
  }

  if (!store || !overview || !planFor) return <p className="loading">Getting the shop ready…</p>;

  return (
    <>
      <div hidden={showGrownUps} className="game-shell">
        <AppleShopping
          key={playKey}
          plan={planFor.next_session}
          store={store}
          onResult={(result, error) => {
            if (result) {
              setLastResult(result);
              setOverview(result);
              setSyncError(null);
            } else {
              setSyncError(error?.message ?? "unknown error");
            }
          }}
          onPlayAgain={() => {
            setLastResult(null);
            void refresh(store, true);
          }}
          onGrownUps={() => {
            if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
            setShowGrownUps(true);
          }}
        />
      </div>
      {showGrownUps && (
        <ProfileView
          overview={overview}
          before={planFor.profile}
          lastResult={lastResult}
          identity={identity}
          store={store}
          syncError={syncError}
          onBack={() => setShowGrownUps(false)}
          onRefresh={() => void refresh(store, false)}
          onErased={() => {
            clearIdentity();
            resetClock();
            setIdentityState(null);
            setStore(null);
            setOverview(null);
            setPlanFor(null);
            setLastResult(null);
            setShowGrownUps(false);
          }}
        />
      )}
    </>
  );
}

function Welcome({ onReady }: { onReady: (identity: Identity) => void }) {
  const [nickname, setNickname] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const consentInput = useRef<HTMLInputElement>(null);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      // A greyed-out button explains nothing; say what is missing instead.
      setNeedsConsent(true);
      consentInput.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onReady(await enrol(API_BASE, nickname.trim()));
    } catch (problem) {
      setError((problem as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="grownups welcome">
      <p className="wordmark">OpenPath</p>
      <h1>A grown-up sets this up, then hands over the screen</h1>
      <p className="lede">
        Your child helps Mom buy fruit by counting it into a basket. While they play, OpenPath records what they do and
        builds a picture of what they understand about numbers. There are no scores and no failure screens.
      </p>
      <form onSubmit={start}>
        <label className="field">
          <span>Nickname for this device (optional)</span>
          <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} autoComplete="off" />
          <small>Stays on this device. It is never sent or stored with the learning record.</small>
        </label>
        <label className={`check${needsConsent && !consent ? " missing" : ""}`}>
          <input
            id="consent"
            ref={consentInput}
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setNeedsConsent(false);
            }}
          />
          <span>
            I am this child's parent or guardian. I agree to their play being recorded as learning evidence under a
            random ID
            {API_BASE ? ", stored on the OpenPath server without their name." : ", stored only in this browser."} I can
            get a copy of it or erase it at any time.
          </span>
        </label>
        {needsConsent && !consent && (
          <p className="alert" role="alert">
            Tick the box above to start. The game cannot record anything without a grown-up's agreement.
          </p>
        )}
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Setting up…" : "Start playing"}
          </button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
            Restore from a recovery file
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              onReady(restoreFromFile(await file.text()));
            } catch (problem) {
              setError((problem as Error).message);
            }
          }}
        />
      </form>
    </main>
  );
}
