import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
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

const root = document.getElementById("root")!;
root.dataset.started = "1";
createRoot(root).render(
  <CrashScreen>
    <App />
  </CrashScreen>,
);

// Offline use: a service worker keeps the app's own files (never any learner data, which stays in IndexedDB).
if ("serviceWorker" in navigator && location.protocol !== "file:" && !location.search.includes("no-sw")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline use is a convenience; the app works without it */
    });
  });
}
