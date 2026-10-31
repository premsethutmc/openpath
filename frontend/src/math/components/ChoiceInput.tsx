import { useState } from "react";
import type { InputSpec } from "../types";

/** Integration M1: multiple-choice input (the renderer's InputSpec already declared it; no component rendered it). Emits the choice id only. */
export function ChoiceInput({ choices, disabled, onChange }: { choices: NonNullable<InputSpec["choices"]>; disabled?: boolean; onChange: (id: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="lr-choices" role="radiogroup" aria-label="Choose one answer">
      {choices.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={picked === c.id} disabled={disabled} className={`lr-choice${picked === c.id ? " lr-choice-picked" : ""}`} onClick={() => { setPicked(c.id); onChange(c.id); }}>
          <span className="lr-choice-id" aria-hidden="true">{c.id}</span>
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
