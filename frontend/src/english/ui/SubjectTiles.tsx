/**
 * subjects-home@2: the subjects as large tiles, and nothing else. Used on the welcome screen and as the first
 * screen for a learner who is already in. Each tile is one tap: English opens the English app, Maths opens /year/,
 * Tamil (icse-tamil@1, only where the build carries /tamil/) opens the Tamil course.
 */
declare const __OPENPATH_TAMIL__: boolean | undefined;
export const TAMIL_BUILT = typeof __OPENPATH_TAMIL__ !== "undefined" && __OPENPATH_TAMIL__ === true;

export function SubjectTiles({ onEnglish, englishLine, mathsLine }: { onEnglish: () => void; englishLine?: string; mathsLine?: string }) {
  return (
    <div className="subjects" role="group" aria-label="Subjects">
      <button type="button" className="subject-tile english" onClick={onEnglish}>
        <span className="subject-art" aria-hidden="true">
          <span className="subject-emoji">📖</span>
        </span>
        <span className="subject-text">
          <span className="subject-name">English</span>
          <span className="subject-sub">{englishLine ?? "Reading, words and spelling"}</span>
        </span>
        <span className="subject-go" aria-hidden="true">→</span>
      </button>
      <a className="subject-tile maths" href="/year/">
        <span className="subject-art" aria-hidden="true">
          <span className="subject-emoji">🔢</span>
        </span>
        <span className="subject-text">
          <span className="subject-name">Maths</span>
          <span className="subject-sub">{mathsLine ?? "Your class, skill by skill"}</span>
        </span>
        <span className="subject-go" aria-hidden="true">→</span>
      </a>
      {TAMIL_BUILT && (
        <a className="subject-tile tamil" href="/tamil/">
          <span className="subject-art" aria-hidden="true">
            <span className="subject-emoji tamil-glyph">அ</span>
          </span>
          <span className="subject-text">
            <span className="subject-name">Tamil</span>
            <span className="subject-sub">தமிழ் · ICSE Classes 1–10</span>
          </span>
          <span className="subject-go" aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}
