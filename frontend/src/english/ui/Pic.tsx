import { ART } from "./first-art.ts";

const KEYS = Object.keys(ART).sort((a, b) => b.length - a.length);

/** Splits a picture slot ("🐱", "🐱🐱🐱", "🐱 🐶") into drawings; anything without a drawing is shown as it is. */
export function pictureParts(p: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < p.length; ) {
    const k = KEYS.find((x) => p.startsWith(x, i));
    const part = k ?? String.fromCodePoint(p.codePointAt(i)!);
    out.push(part);
    i += part.length;
  }
  return out;
}

/** A picture slot drawn on screen; sized by the surrounding font size. */
export function Pic({ p }: { p: string }) {
  return (
    <span className="pic" data-picture={p}>
      {pictureParts(p).map((x, i) =>
        ART[x] ? (
          <svg key={i} viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true" focusable="false">
            <g stroke="#2b2b2b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" dangerouslySetInnerHTML={{ __html: ART[x] }} />
          </svg>
        ) : x === " " ? (
          <span key={i} className="pic-gap" />
        ) : (
          <span key={i}>{x}</span>
        ),
      )}
    </span>
  );
}
