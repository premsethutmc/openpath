/**
 * subjects-home@2: the subjects as large tiles, and nothing else. Used on the welcome screen and as the first
 * screen for a learner who is already in. Each tile is one tap: English opens the English app, Maths opens /year/,
 * Tamil (icse-tamil@1, only where the build carries /tamil/) opens the Tamil course. Count with me (count-with-me@1,
 * only where the build carries /count/) opens the counting game for ages 3–6.
 */
declare const __OPENPATH_TAMIL__: boolean | undefined;
export const TAMIL_BUILT = typeof __OPENPATH_TAMIL__ !== "undefined" && __OPENPATH_TAMIL__ === true;
declare const __OPENPATH_COUNT__: boolean | undefined;
export const COUNT_BUILT = typeof __OPENPATH_COUNT__ !== "undefined" && __OPENPATH_COUNT__ === true;

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
      {COUNT_BUILT && (
        <a className="subject-tile count" href="/count/">
          <span className="subject-art" aria-hidden="true">
            <span className="subject-emoji">🐑</span>
          </span>
          <span className="subject-text">
            <span className="subject-name">Count with me</span>
            <span className="subject-sub">Numbers 1–10 · ages 3–6</span>
          </span>
          <span className="subject-go" aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}
