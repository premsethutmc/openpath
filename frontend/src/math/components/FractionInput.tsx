/**
 * Fraction input component — numerator/denominator entry.
 *
 * Renders two stacked input fields with a fraction bar between them.
 * Submits as "numerator/denominator" string format.
 */
import { useCallback, useRef, useState } from "react";
import type { LocaleStrings } from "../types";

interface FractionInputProps {
  placeholder?: string;
  disabled: boolean;
  onSubmit: (value: string) => void;
  onChange: (value: string) => void;
  strings: LocaleStrings;
}

export function FractionInput({
  placeholder: _placeholder,
  disabled,
  onSubmit,
  onChange,
  strings,
}: FractionInputProps) {
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const numRef = useRef<HTMLInputElement>(null!);
  const denRef = useRef<HTMLInputElement>(null!);

  const emitChange = useCallback(
    (num: string, den: string) => {
      const value = den ? `${num}/${den}` : num;
      onChange(value);
    },
    [onChange],
  );

  const handleNumChange = useCallback(
    (e: { target: { value: string } }) => {
      const v = e.target.value.replace(/[^0-9\-]/g, "");
      setNumerator(v);
      emitChange(v, denominator);
    },
    [denominator, emitChange],
  );

  const handleDenChange = useCallback(
    (e: { target: { value: string } }) => {
      const v = e.target.value.replace(/[^0-9]/g, "");
      setDenominator(v);
      emitChange(numerator, v);
    },
    [numerator, emitChange],
  );

  const handleKeyDown = useCallback(
    (e: { key: string; preventDefault: () => void }) => {
      if (e.key === "Enter" && numerator.trim() && denominator.trim()) {
        e.preventDefault();
        onSubmit(`${numerator.trim()}/${denominator.trim()}`);
      }
    },
    [numerator, denominator, onSubmit],
  );

  return (
    <div className="lr-fraction-input" aria-label={strings.enterAnswer}>
      <div className="lr-fraction-stack">
        <input
          ref={numRef}
          type="text"
          inputMode="numeric"
          className="lr-fraction-field lr-fraction-num"
          value={numerator}
          placeholder="?"
          disabled={disabled}
          aria-label="Numerator"
          onChange={handleNumChange}
          onKeyDown={(e: { key: string; preventDefault: () => void }) => {
            if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "/") {
              e.preventDefault();
              denRef.current?.focus();
            }
          }}
          autoComplete="off"
        />
        <div className="lr-fraction-bar-input" aria-hidden="true" />
        <input
          ref={denRef}
          type="text"
          inputMode="numeric"
          className="lr-fraction-field lr-fraction-den"
          value={denominator}
          placeholder="?"
          disabled={disabled}
          aria-label="Denominator"
          onChange={handleDenChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      <p className="lr-fraction-help">
        Enter the numerator and denominator, then press Enter
      </p>
    </div>
  );
}
