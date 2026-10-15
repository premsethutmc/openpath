/**
 * Word mastery on Progress (PR #14): one row per practice word, kept apart from pattern mastery and from the engine's
 * spelling estimates. Read-only; derived from the attempts (logic/words.ts).
 */
import type { Learner } from "../logic/learner.ts";
import { WORD_STATUS_LABEL, type WordStatus, statusCounts, wordMastery } from "../logic/words.ts";

const WORD_ORDER: WordStatus[] = ["mastered", "retained", "recalled", "learning", "met"];

export function Words({ learner }: { learner: Learner }) {
  const words = wordMastery(learner.state, learner.content);
  if (!words.size) return null;
  const counts = statusCounts(words);
  const list = [...words.values()].sort((a, b) => WORD_ORDER.indexOf(a.status) - WORD_ORDER.indexOf(b.status) || a.word.localeCompare(b.word));
  return (
    <div className="words" aria-labelledby="words-title">
      <h3 className="sub" id="words-title">
        Words
      </h3>
      <ul className="word-counts">
        {WORD_ORDER.filter((st) => counts[st]).map((st) => (
          <li key={st} className={`w-${st}`}>
            <strong>{counts[st]}</strong> {WORD_STATUS_LABEL[st].toLowerCase()}
          </li>
        ))}
      </ul>
      <p className="small">
        A word counts as written correctly only when you typed it yourself at the first try, without help. "Remembered" means you wrote it correctly again on a later day. Choosing between two spellings is recorded but is not the same as writing the word. Word progress does not change your spelling level.
      </p>
      <details>
        <summary>All {words.size} words</summary>
        <table className="words-table">
          <thead>
            <tr>
              <th scope="col">Word</th>
              <th scope="col">Status</th>
              <th scope="col">Written</th>
              <th scope="col">Later days</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.word}>
                <td className="written">{w.word}</td>
                <td>{WORD_STATUS_LABEL[w.status]}</td>
                <td>
                  {w.independent.recall.right}✓ {w.independent.recall.wrong + w.independent.recognition.wrong}✗{w.assisted ? ` · ${w.assisted} with help` : ""}
                </td>
                <td>{w.retention.passed || w.retention.failed ? `${w.retention.passed}✓ ${w.retention.failed}✗` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

