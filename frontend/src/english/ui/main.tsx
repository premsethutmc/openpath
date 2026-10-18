import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { EssayJourney } from "./essay/EssayJourney.tsx";
import { EssayLive } from "./essay/EssayLive.tsx";
import { App } from "./App.tsx";
import { Developer } from "./Developer.tsx";
import { BUILD_CONTENT_MODE } from "../logic/content.ts";
import { installBrowserHooks, record } from "../logic/telemetry.ts";
import "./english.css";

/** A learner should never be left looking at a blank screen. */
class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OpenPath English stopped:", error, info.componentStack);
    record({ name: "runtime_error", ok: false, detail: error });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="welcome">
        <h1>Something went wrong</h1>
        <p>OpenPath stopped unexpectedly. Every answer already given is saved on this device.</p>
        <p className="small">
          <code>{this.state.error.message}</code>
        </p>
        <button type="button" className="primary" onClick={() => location.reload()}>
          Reload
        </button>
      </main>
    );
  }
}

const experience = new URLSearchParams(location.search).get("experience");
const essayDemo = experience === "essay-demo";
// the essay studio connected to the engine: synthetic essays on an on-device test learner (refused in a pilot build)
const essayLive = experience === "essay-live";
if (!essayDemo && !essayLive) installBrowserHooks();
const root = document.getElementById("root")!;
root.dataset.started = "1";
// the developer diagnostics live at /developer (the server decides who may use them)
const developer = location.pathname === "/developer" || location.pathname.startsWith("/developer/");
// a pilot build is for pupils: the developer tools are not part of it, whoever opens the address
const NotInPilot = ({ feature = "developer" }: { feature?: string }) => (
  <main className="welcome" data-pilot-refused={feature}>
    <h1>Not available here</h1>
    <p>{feature === "essay-demo" || feature === "essay-live" ? "The essay studio is not available in the reviewed pilot." : "This is the pilot version of OpenPath. The developer tools are not part of it."}</p>
    <a className="primary" href="/">
      Go to OpenPath
    </a>
  </main>
);
// This opt-in preview is part of the existing app, not another tutor or live assessment route.
const entryView = () => {
  if (BUILD_CONTENT_MODE === "pilot" && (developer || essayDemo || essayLive)) return <NotInPilot feature={essayDemo ? "essay-demo" : essayLive ? "essay-live" : "developer"} />;
  if (developer) return <Developer />;
  if (essayDemo) return <EssayJourney />;
  if (essayLive) return <EssayLive />;
  return <App />;
};
createRoot(root).render(<CrashScreen>{entryView()}</CrashScreen>);

// Offline use: a service worker keeps the app's own files (never any learner data, which stays in IndexedDB).
if (!essayDemo && !essayLive && "serviceWorker" in navigator && location.protocol !== "file:" && !location.search.includes("no-sw")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline use is a convenience; the app works without it */
    });
  });
}
