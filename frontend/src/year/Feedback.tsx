/**
 * feedback@1: under a question or lesson, a tester (family and friends) ticks what is wrong, adds a note if they
 * like, and sends it. The family site keeps it (developers read /api/feedback/); the demo writes it to its log.
 * Shown in the child builds (family and demo), not in test or research builds.
 */
import { useState } from "react";

const KINDS = [
  ["wrong", "The answer or explanation is wrong"],
  ["lesson", "The lesson didn't help"],
  ["cluttered", "Too cluttered or hard to read"],
  ["broken", "Something looks broken"],
] as const;

const cookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";

export function FeedbackBox({ where }: { where: string }) {
  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  if (state === "sent") return <p className="feedback-done small" role="status">Thank you: sent.</p>;
  if (!open) return <button type="button" className="link feedback-open" onClick={() => setOpen(true)}>Something not right?</button>;
  const send = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/feedback/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(cookie("csrftoken")) },
        body: JSON.stringify({ where: where.slice(0, 160), kinds: ticked, note: note.trim().slice(0, 300), width: window.innerWidth }),
      });
      setState(r.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };
  return (
    <fieldset className="feedback-box">
      <legend>What's not right here?</legend>
      {KINDS.map(([k, label]) => (
        <label key={k} className="feedback-tick">
          <input type="checkbox" checked={ticked.includes(k)} onChange={(e) => setTicked(e.target.checked ? [...ticked, k] : ticked.filter((x) => x !== k))} />
          {label}
        </label>
      ))}
      <textarea aria-label="Anything else (optional)" placeholder="Anything else? (optional)" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      {state === "failed" && <p className="small" role="alert">Could not send. Please try again.</p>}
      <div className="feedback-actions">
        <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="primary" disabled={!ticked.length || state === "sending"} onClick={send}>{state === "sending" ? "Sending…" : "Send"}</button>
      </div>
    </fieldset>
  );
}
