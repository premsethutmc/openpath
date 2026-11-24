/**
 * Pictures for questions and lessons (family-kit Visual). What a picture shows is worked out and checked in the engine
 * (packages/learning/src/figure-marks.ts) and drawn by the engine's one player (Scene.tsx): this file only chooses how a figure
 * is laid out on the page. Things that are not drawings (a table, written working, cards, money piles) are laid out here.
 * Every picture has a text description (aria-label) that says the same thing in words.
 */
import { Board } from "./Board";
import { MoneyPiles } from "./MoneyPiles";
import type { MoneyPicture } from "../../../packages/learning/src/money-piles";
import { TriangleAngleLab } from "../geometry/TriangleAngleLab";
import { FigureMarks, ScenePlayer } from "./Scene";
import type { Scene } from "../../../packages/learning/src/scene";
import { arr, describe, figureDraw, minus, type V } from "../../../packages/learning/src/figure-marks";
export { EQUIVALENCE_COMPETENCIES, describe, legacyStripKind, legacyStrips, stripsFor } from "../../../packages/learning/src/figure-marks";

export function Figure({ v }: { v: V }) {
  if (v.type === "triangle-angle-lab") return <TriangleAngleLab proof={v.proof !== false} />;
  if (v.type === "scene") return <ScenePlayer scene={v as unknown as Scene} />;
  const label = describe(v);
  if (v.type === "money") return <MoneyPiles m={v as unknown as MoneyPicture} />;
  if (v.type === "table") {
    const head = arr<string>(v.head);
    const rows = arr<(string | number)[]>(v.rows);
      // written@1: working as it is written on paper (a long division), kept in fixed-width rows so the columns line up
      if (v.as === "written") return <figure className="figure written" aria-label={label}><Board rows={rows.map((r) => String(r[0] ?? ""))} /></figure>;
      // picture-words@1: a row of things the words call a picture is drawn as cards, not as a table of data
      if (v.as === "tiles") {
        // a heading that only counts the places (1, 2, 3 or Card 1) says nothing: only words such as "left" are kept
        const caps = head.map((h) => (/^(?:|\d+|cards?(?: \d+)?|word|first|second|third|fourth|fifth|sixth)$/i.test(String(h).trim()) ? "" : String(h)));
        return (
          <figure className="figure tiles" aria-label={label}>
            {rows.map((r, i) => (
              <div className="tile-row" key={i}>
                {r.map((c, j) => <span className={`tile${c === "?" ? " ask" : ""}${String(c).trim() === "" ? " gap" : ""}`} key={j}>{i === 0 && caps[j] ? <small>{caps[j]}</small> : null}{typeof c === "number" ? minus(c) : c}</span>)}
              </div>
            ))}
          </figure>
        );
      }
      return (
        <figure className="figure" aria-label={label}>
          <table className="data">
            <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" ? minus(c) : c}</td>)}</tr>)}</tbody>
          </table>
        </figure>
      );
  }
  const d = figureDraw(v);
  if (!d) return <figure className="figure" aria-label={label}><p>{label}</p></figure>;
  if (d.as === "na") return <figure className="figure figure-unavailable" aria-label={d.message} role="img" data-invalid={d.invalid}><p>{d.message}</p></figure>;
  if (d.as === "words") return <figure className="figure figure-text" role="img" aria-label={label} data-fallback={d.fallback}><p>{label}.</p></figure>;
  return <FigureMarks w={d.w} h={d.h} marks={d.marks} label={label} />;
}
