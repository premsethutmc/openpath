/** foundations@1: the "Start here" part of a new skill's first lesson: the ideas the lesson relies on, with a picture. */
import { useState } from "react";
import "./start-here.css";
import { foundationsOf, type FoundationScreen, type Picture } from "../../../packages/learning/src/foundations";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const A = { ...S, stroke: "var(--sh-accent, #e8862a)", strokeWidth: 3 };
const T = { fill: "currentColor", fontSize: 13, fontFamily: "inherit" };
/** A fixed, labelled drawing of the idea (not of a particular question). */
export function FoundationPicture({ kind }: { kind: Picture }) {
  const body = (() => {
    switch (kind) {
      case "right-triangle": return <><path d="M40 150H220V40Z" {...S} /><path d="M205 150v-15h15" {...S} strokeWidth={1.5} /><path d="M72 150a32 32 0 0 0-5-17" {...A} /><text x="78" y="143" {...T}>θ</text><text x="110" y="168" {...T}>adjacent (next to θ)</text><text x="226" y="100" {...T}>opposite</text><text x="14" y="62" {...T}>hypotenuse (longest)</text></>;
      case "unit-circle": return <><circle cx="130" cy="100" r="70" {...S} /><path d="M40 100H230M130 15V185" {...S} strokeWidth={1} /><path d="M130 100L179 51" {...A} /><path d="M179 51V100" {...S} strokeDasharray="4 4" /><circle cx="179" cy="51" r="4" fill="currentColor" /><text x="184" y="46" {...T}>(cos θ, sin θ)</text><text x="146" y="94" {...T}>θ</text><text x="150" y="70" {...T}>1</text></>;
      case "angle": return <><path d="M40 150H230M40 150L190 50" {...S} /><path d="M90 150a50 50 0 0 0-8-28" {...A} /><text x="98" y="138" {...T}>angle</text><text x="30" y="168" {...T}>vertex</text><text x="200" y="168" {...T}>arm</text><text x="196" y="46" {...T}>arm</text></>;
      case "circle-parts": return <><circle cx="130" cy="100" r="75" {...S} /><circle cx="130" cy="100" r="3" fill="currentColor" /><path d="M130 100H205" {...A} /><path d="M70 55L185 49" {...S} /><path d="M77 153L183 153" {...S} strokeDasharray="5 4" /><text x="150" y="94" {...T}>radius</text><text x="100" y="44" {...T}>chord</text><text x="112" y="122" {...T}>centre</text><text x="104" y="170" {...T}>arc below</text></>;
      case "number-line": return <><path d="M20 100H250" {...S} /><path d="M20 100l8-6M20 100l8 6M250 100l-8-6M250 100l-8 6" {...S} />{[-3, -2, -1, 0, 1, 2, 3].map((n) => <g key={n}><path d={`M${135 + n * 32} 93v14`} {...S} /><text x={135 + n * 32} y="128" textAnchor="middle" {...T}>{n < 0 ? `−${-n}` : n}</text></g>)}<text x="40" y="78" {...T}>smaller</text><text x="196" y="78" {...T}>bigger</text></>;
      case "coordinate-plane": return <><path d="M20 110H250M120 20V185" {...S} /><text x="240" y="126" {...T}>x</text><text x="126" y="28" {...T}>y</text><path d="M120 110H200V50" {...S} strokeDasharray="4 4" strokeWidth={1.5} /><circle cx="200" cy="50" r="4.5" fill="var(--sh-accent, #e8862a)" /><text x="176" y="42" {...T}>(x, y)</text><text x="140" y="126" {...T}>x: across</text><text x="204" y="86" {...T}>y: up</text></>;
      case "tangent-slope": return <><path d="M30 170C90 165 150 120 235 25" {...S} /><path d="M80 175L225 70" {...A} /><circle cx="160" cy="117" r="4.5" fill="currentColor" /><text x="60" y="60" {...T}>the curve</text><text x="170" y="150" {...T}>tangent: just touches,</text><text x="170" y="166" {...T}>shows the steepness here</text></>;
      case "area-under-curve": return <><path d="M30 165H250M40 20V175" {...S} /><path d="M80 165V95C120 60 160 55 200 70V165Z" fill="var(--sh-accent, #e8862a)" fillOpacity={0.3} stroke="none" /><path d="M45 130C100 50 170 45 245 85" {...S} /><text x="74" y="182" {...T}>a</text><text x="196" y="182" {...T}>b</text><text x="112" y="125" {...T}>area</text></>;
      case "fraction-bar": return <>{[0, 1, 2, 3].map((k) => <rect key={k} x={30 + k * 52} y="70" width="52" height="46" {...S} fill={k < 3 ? "var(--sh-accent, #e8862a)" : "none"} fillOpacity={0.35} />)}<text x="30" y="56" {...T}>one whole, cut into equal parts</text><text x="30" y="140" {...T}>fraction = shaded parts out of all parts</text></>;
      case "matrix-grid": return <><path d="M70 45h-10v110h10M190 45h10v110h-10" {...S} />{[["a", "b", "c"], ["d", "e", "f"]].map((r, i) => r.map((v, j) => <text key={`${i}${j}`} x={90 + j * 40} y={85 + i * 45} textAnchor="middle" {...T} fontSize={18}>{v}</text>))}<text x="210" y="84" {...T}>row 1</text><text x="210" y="129" {...T}>row 2</text><text x="64" y="178" {...T}>column 1, 2, 3</text></>;
      case "vector-arrow": return <><path d="M20 160H250M40 20V175" {...S} strokeWidth={1} /><path d="M60 150L200 60" {...A} /><path d="M200 60l-17 2M200 60l-8 15" {...A} /><path d="M60 150H200V60" {...S} strokeDasharray="4 4" strokeWidth={1.5} /><text x="110" y="168" {...T}>across</text><text x="206" y="110" {...T}>up</text><text x="70" y="92" {...T}>length = size</text></>;
      case "venn": return <><rect x="20" y="25" width="230" height="150" rx="10" {...S} strokeWidth={1.5} /><circle cx="105" cy="100" r="58" {...S} /><circle cx="165" cy="100" r="58" {...S} /><text x="66" y="104" {...T}>A</text><text x="192" y="104" {...T}>B</text><text x="120" y="104" {...T}>both</text><text x="28" y="44" {...T}>everything</text></>;
    }
  })();
  return <svg className="sh-picture" viewBox="0 0 280 195" role="img" aria-label={kind.replace(/-/g, " ")}>{body}</svg>;
}

export function FoundationCard({ s }: { s: FoundationScreen }) {
  const [shown, setShown] = useState(false);
  return (
    <section className="sh-card">
      <h3>{s.title}</h3>
      {s.picture ? <FoundationPicture kind={s.picture} /> : null}
      {s.text.map((t, i) => <p key={i}>{t}</p>)}
      {s.example?.length ? <div className="sh-example">{s.example.map((t, i) => <div key={i}>{t}</div>)}</div> : null}
      {s.check ? <div className="sh-check"><p><b>Quick check:</b> {s.check.question}</p>{shown ? <p className="sh-answer">{s.check.answer}</p> : <button type="button" className="sh-show" onClick={() => setShown(true)}>Show the answer</button>}</div> : null}
    </section>
  );
}

/** In front of a new skill's first lesson: nothing when the skill has no start-here teaching. */
export function StartHere({ competency }: { competency: string }) {
  const all = foundationsOf(competency);
  if (!all.length) return null;
  return (
    <div className="sh" data-start-here={competency}>
      <p className="sh-eyebrow">Start here</p>
      {all.flatMap((f) => f.screens).map((s, i) => <FoundationCard key={i} s={s} />)}
    </div>
  );
}
