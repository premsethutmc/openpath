import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

/** A child should never be left looking at a blank screen. */
class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OpenPath stopped:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grownups crash">
        <h1>Something went wrong</h1>
        <p className="lede">The game stopped unexpectedly. Nothing already recorded has been lost.</p>
        <p className="note">
          <code>{this.state.error.message}</code>
        </p>
        <button type="button" className="primary" onClick={() => this.setState({ error: null })}>
          Start again
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
