import { useState } from "react";
import type { Learner } from "../logic/learner.ts";

/** Save a JSON file to the device's downloads (nothing is sent anywhere). */
export function saveJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** A note about a problem or anything that got in the way, kept with the learner's record. */
export function NoteBox({ learner, screen, label, onSaved }: { learner: Learner; screen: string; label: string; onSaved?: () => void }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const id = `note-${screen.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <form
      className="note-box"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await learner.note(screen, text);
        setText("");
        setSaved(true);
        onSaved?.();
      }}
    >
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={3} maxLength={1000} value={text} onChange={(e) => (setText(e.target.value), setSaved(false))} placeholder="For example: the word was hard to hear, or a button was hard to find. Please don't write anyone's name." />
      <button type="submit" className="secondary" disabled={!text.trim()}>
        Save note
      </button>
      {saved && <p role="status">Note saved on this device.</p>}
    </form>
  );
}
