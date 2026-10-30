import type { NavSpec, LocaleStrings } from "../types";

interface NavControlsProps {
  nav: NavSpec;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  strings: LocaleStrings;
}

export function NavControls({ nav, onSubmit, onSkip, onBack, strings }: NavControlsProps) {
  return (
    <div className="lr-nav" role="toolbar" aria-label="Question controls">
      {nav.canGoBack && (
        <button type="button" className="lr-nav-btn lr-nav-back" onClick={onBack}>
          {strings.back}
        </button>
      )}
      {nav.canSkip && (
        <button type="button" className="lr-nav-btn lr-nav-skip" onClick={onSkip}>
          {strings.skip}
        </button>
      )}
      <button
        type="button"
        className="lr-nav-btn lr-nav-submit"
        disabled={!nav.canSubmit}
        onClick={onSubmit}
      >
        {nav.submitLabel ?? strings.submit}
      </button>
    </div>
  );
}
