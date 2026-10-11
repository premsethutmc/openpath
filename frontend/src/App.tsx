import { useCallback, useEffect, useRef, useState } from "react";

import { AppleShopping } from "./activities/apple-shopping/AppleShopping";
import { resetClock } from "./core/clock";
import { type Identity, clearIdentity, createLocalIdentity, getIdentity, setIdentity } from "./core/identity";
import { type EvidenceStore, enrolOnServer, openStore } from "./core/store";
import type { Overview, SessionResult } from "./core/types";
import { ProfileView } from "./profile/ProfileView";

declare const __OPENPATH_API__: string | null;
const API_BASE = __OPENPATH_API__;

/**
 * The app opens straight into the game. There is no sign-up and nothing to
 * read: a device-only learner record is created silently, and everything a
 * grown-up might want (the profile, consent to store the record on a server,
 * export, erase) sits behind the small "Grown-ups" button.
 */
export function App() {
  const [identity, setIdentityState] = useState<Identity>(() => getIdentity() ?? createLocalIdentity());
  const [store, setStore] = useState<EvidenceStore | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGrownUps, setShowGrownUps] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [planFor, setPlanFor] = useState<Overview | null>(null);
  const hasPlan = useRef(false);

  const refresh = useCallback(async (target: EvidenceStore, startNewGame: boolean) => {
    try {
      const fresh = await target.overview();
      setOverview(fresh);
      setLoadError(null);
      if (startNewGame || !hasPlan.current) {
        hasPlan.current = true;
        setPlanFor(fresh);
        setPlayKey((key) => key + 1);
      }
    } catch (error) {
      setLoadError((error as Error).message);
    }
  }, []);

  // Open the right store whenever the record's home changes (device <-> server).
  useEffect(() => {
    const opened = openStore(API_BASE, identity);
    setStore(opened);
    void refresh(opened, false);
    // The nickname is display-only and must not reopen the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.learner_id, identity.access_token, refresh]);

  const changeIdentity = (next: Identity, restart: boolean) => {
    setIdentity(next);
    if (restart) {
      hasPlan.current = false;
      setPlanFor(null);
      setLastResult(null);
      setShowGrownUps(false);
    }
    setIdentityState(next);
  };

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
          canUseServer={Boolean(API_BASE)}
          syncError={syncError}
          onBack={() => setShowGrownUps(false)}
          onRefresh={() => void refresh(store, false)}
          onNickname={(nickname) => changeIdentity({ ...identity, nickname }, false)}
          onConsent={async () => changeIdentity(await enrolOnServer(API_BASE!, identity), false)}
          onRestored={(restored) => changeIdentity(restored, true)}
          onErased={() => {
            clearIdentity();
            resetClock();
            changeIdentity(createLocalIdentity(), true);
          }}
        />
      )}
    </>
  );
}
