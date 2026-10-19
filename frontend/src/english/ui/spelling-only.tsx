import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./english.css";
import "./spelling-only.css";
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page">
        <h1>We couldn’t open Spelling Bee</h1>
        <p>Saved answers remain in your record.</p>
        <button onClick={() => location.reload()}>Reload saved place</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App spellingOnly />
  </Boundary>,
);
// Dedicated entry: query strings cannot switch into essays, maths or developer tools.
