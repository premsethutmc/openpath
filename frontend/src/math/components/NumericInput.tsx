import { useCallback, useRef, useState } from "react";
import type { LocaleStrings } from "../types";

interface NumericInputProps {
  placeholder?: string;
  showKeypad: boolean;
  disabled: boolean;
  onSubmit: (value: string) => void;
  onChange: (value: string) => void;
  strings: LocaleStrings;
}

const KEYPAD_KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", ".", "⌫"],
] as const;

export function NumericInput({
  placeholder,
  showKeypad,
  disabled,
  onSubmit,
  onChange,
  strings,
}: NumericInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null!);  // non-null assertion for ref init

  const updateValue = useCallback(
    (next: string) => {
      setValue(next);
      onChange(next);
    },
    [onChange],
  );

  const handleKeypadPress = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === "⌫") {
        updateValue(value.slice(0, -1));
      } else {
        // Prevent multiple decimal points
        if (key === "." && value.includes(".")) return;
        updateValue(value + key);
      }
      inputRef.current?.focus();
    },
    [disabled, value, updateValue],
  );

  const handleKeyDown = useCallback(
    (e: { key: string; preventDefault: () => void }) => {
      if (e.key === "Enter" && value.trim()) {
        e.preventDefault();
        onSubmit(value.trim());
      }
    },
    [value, onSubmit],
  );

  return (
    <div className="lr-numeric-input">
      <div className="lr-input-row">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="lr-input-field"
          value={value}
          placeholder={placeholder ?? strings.enterAnswer}
          disabled={disabled}
          aria-label={strings.enterAnswer}
          onChange={(e: { target: { value: string } }) => updateValue(e.target.value.replace(/[^0-9.\-/]/g, ""))}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {showKeypad && (
        <div className="lr-keypad" role="group" aria-label="Number pad">
          {KEYPAD_KEYS.map((row, ri) => (
            <div key={ri} className="lr-keypad-row">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`lr-keypad-key${key === "⌫" ? " lr-keypad-delete" : ""}`}
                  disabled={disabled}
                  aria-label={key === "⌫" ? "Delete" : key}
                  onClick={() => handleKeypadPress(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
