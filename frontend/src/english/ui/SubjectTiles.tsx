/**
 * subjects-home@2: the two subjects as two large tiles, and nothing else. Used on the welcome screen and as the first
 * screen for a learner who is already in. Each tile is one tap: English opens the English app, Maths opens /year/.
 */
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
    </div>
  );
}
