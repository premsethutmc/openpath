import { useEffect, useState, type ReactNode } from "react";
import type { Question, Screen } from "../../../packages/learning/src/content";
import type { Problem as FamilyProblem } from "../../../packages/learning/src/families";
import type { TeachingVisual } from "../../../packages/learning/src/teaching-presentation";
import type { Representation } from "../../../packages/learning/src/family-kit";

const signed = (value: number) => String(value).replace("-", "−");
const wrapped = (value: number) => value < 0 ? `(${signed(value)})` : signed(value);
const letters = (count: number) => Array.from({ length: count }, (_, i) => String.fromCharCode(97 + i));

export interface WorkedStep {
  expression: string;
  explanation: string;
}
export interface WorkedExample {
  question: string;
  steps: WorkedStep[];
}

/** A reusable rows × columns visual: labels and cell values are supplied by mathematical content adapters. */
export function PairGrid({ rows, columns }: { rows: (string | number)[]; columns: (string | number)[] }) {
  return <figure className="pair-visual" aria-label={`${rows.length} by ${columns.length} ordered-pair grid`}>
    <div className="set-pills"><span><b>A</b> = {`{${rows.join(", ")}}`}</span><span><b>B</b> = {`{${columns.join(", ")}}`}</span></div>
    <div className="pair-grid" style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}>
      <span aria-hidden="true" />
      {columns.map((column) => <b key={`h-${column}`}>{column}</b>)}
      {rows.flatMap((row) => [<b key={`r-${row}`}>{row}</b>, ...columns.map((column) => <span key={`${row}-${column}`}>({row}, {column})</span>)])}
    </div>
    <figcaption><span>Every row meets every column.</span><strong>n(A × B) = {rows.length} × {columns.length} = {rows.length * columns.length}</strong></figcaption>
  </figure>;
}

/** A compact, labelled number-line move. It is used when the movement matters more than every unit tick. */
export function MovementNumberLine({ start, end }: { start: number; end: number }) {
  const low = Math.min(start, end, 0);
  const high = Math.max(start, end, 0);
  const pad = Math.max(2, Math.ceil((high - low) * .08));
  const from = low - pad;
  const to = high + pad;
  const x = (value: number) => 24 + ((value - from) / (to - from || 1)) * 312;
  const mid = (x(start) + x(end)) / 2;
  const direction = end >= start ? "right" : "left";
  return <figure className="movement-line" role="img" aria-label={`Number line movement ${direction} from ${signed(start)} to ${signed(end)}`}>
    <svg viewBox="0 0 360 112" aria-hidden="true">
      <defs><marker id={`movement-arrow-${start}-${end}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6654cc" /></marker></defs>
      <line x1="18" y1="76" x2="342" y2="76" stroke="#252834" strokeWidth="2" />
      {[0, start, end].filter((value, index, values) => values.indexOf(value) === index).map((value) => <g key={value}><line x1={x(value)} y1="69" x2={x(value)} y2="83" stroke="#252834" /><text x={x(value)} y="101" textAnchor="middle">{signed(value)}</text></g>)}
      <path d={`M ${x(start)} 68 Q ${mid} 13 ${x(end)} 68`} fill="none" stroke="#6654cc" strokeWidth="3" markerEnd={`url(#movement-arrow-${start}-${end})`} />
      <circle cx={x(start)} cy="76" r="5" fill="#6654cc" />
      <text className="movement-label" x={mid} y="24" textAnchor="middle">{signed(end - start)}</text>
    </svg>
  </figure>;
}

export function PlaceValueChart({ headings, rows }: Extract<TeachingVisual, { kind: "place-value" }>) {
  return <figure className="teaching-data-visual place-value-visual"><table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table><figcaption>Each digit keeps the value of its column.</figcaption></figure>;
}

export function FractionStrip({ numerator, denominator, comparison }: Extract<TeachingVisual, { kind: "fraction-strip" }>) {
  const strip = (top: number, bottom: number, label: string) => <div className="fraction-strip-row" aria-label={`${top} out of ${bottom} equal parts`}><b>{label}</b><span className="fraction-parts" style={{ gridTemplateColumns: `repeat(${bottom}, 1fr)` }}>{Array.from({ length: bottom }, (_, index) => <i className={index < top ? "shaded" : ""} key={index} />)}</span><strong>{top}/{bottom}</strong></div>;
  return <figure className="teaching-data-visual fraction-strip-visual">{strip(numerator, denominator, "Whole")}{comparison ? strip(comparison.numerator, comparison.denominator, "Compare") : null}<figcaption>Equal fractions cover the same length of the same whole.</figcaption></figure>;
}

export function EquationTransformation({ lines }: Extract<TeachingVisual, { kind: "equation" }>) {
  return <figure className="teaching-data-visual equation-visual" aria-label="Equation transformation">{lines.map((line, index) => <div key={`${line}-${index}`}><span>{line}</span>{index < lines.length - 1 ? <small>↓</small> : null}</div>)}</figure>;
}

export function LabeledGeometry({ shape, labels }: Extract<TeachingVisual, { kind: "geometry" }>) {
  const dimensionUnit = String(labels.dimensionUnit ?? "");
  const length = `${String(labels.length ?? labels.base ?? "l")} ${dimensionUnit}`.trim();
  const width = `${String(labels.width ?? labels.height ?? "w")} ${dimensionUnit}`.trim();
  const unit = String(labels.measureUnit ?? "");
  return <figure className={`teaching-data-visual geometry-visual ${shape}`} aria-label={`Labeled ${shape}`}><svg viewBox="0 0 320 170"><rect x="55" y="30" width="210" height="105" rx="2" /><text x="160" y="22" textAnchor="middle">{length}</text><text x="35" y="88" textAnchor="middle">{width}</text></svg><figcaption>{Object.entries(labels).filter(([key]) => key !== "measureUnit" && key !== "dimensionUnit").map(([key, value]) => <span key={key}><b>{key}</b>: {value}{key === "area" || key === "perimeter" ? ` ${unit}` : ""}</span>)}</figcaption></figure>;
}

/** One renderer for typed presentation data. No grade or competency routing lives here. */
export function TeachingVisualRenderer({ visual }: { visual: TeachingVisual }) {
  if (visual.kind === "place-value") return <PlaceValueChart {...visual} />;
  if (visual.kind === "number-line") return <MovementNumberLine start={visual.from} end={visual.to} />;
  if (visual.kind === "fraction-strip") return <FractionStrip {...visual} />;
  if (visual.kind === "cartesian-grid") return <PairGrid rows={visual.rows} columns={visual.columns} />;
  if (visual.kind === "equation") return <EquationTransformation {...visual} />;
  return <LabeledGeometry {...visual} />;
}

/** teaching-contract@1: a picture of the question's own mathematical object, drawn from its values (never decoration). */
export function RepresentationRenderer({ representation: r }: { representation: Representation }) {
  if (r.kind === "dot-array" || r.kind === "dot-triangle") {
    const rows = r.kind === "dot-array" ? Array.from({ length: r.rows }, () => r.cols) : Array.from({ length: r.rows }, (_, k) => k + 1);
    const width = Math.max(...rows), gap = 26, w = width * gap + 12, h = rows.length * gap + 12;
    const label = r.kind === "dot-array" ? `${r.rows} rows of ${r.cols} dots, ${r.value} in all` : `A triangle of dots with rows of ${rows.join(", ")}: ${r.value} in all`;
    return <figure className="teaching-data-visual dot-visual" role="img" aria-label={label} data-kind={r.kind} data-value={r.value}>
      <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {rows.flatMap((count, row) => Array.from({ length: count }, (_, col) => <circle key={`${row}-${col}`} cx={6 + gap / 2 + col * gap} cy={6 + gap / 2 + row * gap} r={8} />))}
      </svg>
      <figcaption>{r.caption}</figcaption>
    </figure>;
  }
  if (r.kind === "right-triangle") {
    const side = (v: number | null, name: string) => (v === null ? `${name} = ?` : `${name} = ${v} cm`);
    return <figure className="teaching-data-visual triangle-visual" role="img" aria-label={`Right triangle: ${side(r.a, "a")}, ${side(r.b, "b")}, hypotenuse ${side(r.c, "c")}`} data-kind={r.kind}>
      <svg viewBox="0 0 300 190" aria-hidden="true">
        <polygon points="80,160 280,160 80,30" />
        <polyline points="80,144 96,144 96,160" fill="none" />
        <text x="180" y="182" textAnchor="middle">{r.b === null ? "b = ?" : `b = ${r.b}`}</text>
        <text x="72" y="98" textAnchor="end">{r.a === null ? "a = ?" : `a = ${r.a}`}</text>
        <text x="190" y="86" textAnchor="start" className={r.c === null ? "asked" : ""}>{r.c === null ? "c = ?" : `c = ${r.c}`}</text>
      </svg>
      <figcaption>{r.caption}</figcaption>
    </figure>;
  }
  if (r.kind === "counts") {
    const total = r.items.reduce((n, it) => n + it.count, 0);
    return <figure className="teaching-data-visual counts-visual" role="img" aria-label={`${total} equally likely: ${r.items.map((it) => `${it.count} ${it.label}`).join(", ")}`} data-kind={r.kind}>
      <div className="count-balls">{r.items.flatMap((it) => Array.from({ length: it.count }, (_, k) => <span key={`${it.label}-${k}`} className={`ball ball-${it.label}${it.asked ? " asked" : ""}`} />))}</div>
      <figcaption>{r.items.map((it) => <span key={it.label} className={it.asked ? "asked" : ""}>{it.count} {it.label}</span>)}<span>{r.caption}</span></figcaption>
    </figure>;
  }
  if (r.kind === "division-chain") {
    return <figure className="teaching-data-visual sequence-visual chain-visual" aria-label={r.caption} data-kind={r.kind}>
      <table><thead><tr><th>Divide</th><th>by</th><th>quotient</th><th>remainder</th></tr></thead>
        <tbody>{r.rows.map((row, k) => <tr key={k}><td>{row.dividend}</td><td>{row.divisor}</td><td>{row.quotient}</td><td className={row.remainder === 0 ? "zero" : ""}>{row.remainder}</td></tr>)}</tbody></table>
      <figcaption>{r.caption}</figcaption>
    </figure>;
  }
  const change = r.change;
  return <figure className="teaching-data-visual sequence-visual" aria-label={r.caption} data-kind={r.kind}>
    <table>
      <thead><tr><th scope="row">Term</th>{r.rows.map((row) => <th key={row.n}>{row.n}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">Value</th>{r.rows.map((row) => <td key={row.n}>{row.value}</td>)}</tr>
        {r.rows.some((row) => row.how) ? <tr className="sequence-how"><th scope="row">Made by</th>{r.rows.map((row) => <td key={row.n}>{row.how}</td>)}</tr> : null}
        {change ? <tr className="sequence-change"><th scope="row">{change === "ratio" ? "Ratio" : "Gap"}</th>{r.rows.map((row, k) => <td key={row.n}>{k === 0 ? "" : change === "ratio" ? `×${row.value / r.rows[k - 1].value}` : `+${row.value - r.rows[k - 1].value}`}</td>)}</tr> : null}
      </tbody>
    </table>
    <figcaption>{r.caption}</figcaption>
  </figure>;
}

/** The page asks for one tap per reasoning step; no answer or learner evidence is submitted. */
export function ProgressiveWorkedExample({ example, storageKey }: { example: WorkedExample; storageKey?: string }) {
  const [shown, setShown] = useState(() => {
    if (!storageKey) return 0;
    try { return Math.min(example.steps.length, Math.max(0, Number(localStorage.getItem(storageKey)) || 0)); } catch { return 0; }
  });
  useEffect(() => { if (storageKey) try { localStorage.setItem(storageKey, String(shown)); } catch { /* resume is optional; the ledger stays authoritative */ } }, [shown, storageKey]);
  return <section className="progressive-worked" aria-label="Progressive worked example">
    <p className="worked-question">{example.question}</p>
    <div className="worked-steps" aria-live="polite">
      {example.steps.slice(0, shown).map((step, index) => <div className="worked-step" key={`${step.expression}-${index}`}>
        <span className="step-number">{index + 1}</span>
        <div><div className="step-expression">{step.expression}</div>{step.explanation ? <p>{step.explanation}</p> : null}</div>
      </div>)}
    </div>
    {shown < example.steps.length
      ? <button className="next-step" type="button" onClick={() => setShown((value) => value + 1)}>Next step <span aria-hidden="true">→</span></button>
      : <p className="worked-complete"><span aria-hidden="true">✓</span> Example complete</p>}
  </section>;
}

/** Family adapters turn existing deterministic problem data into learner-facing teaching steps. */
export function workedExampleFor(problem: FamilyProblem | null, q: Question | null, screen: Screen): WorkedExample | null {
  if (problem?.family === "aocart") {
    const [m, n, mode] = problem.params;
    if (mode === 2) return {
      question: q?.prompt ?? screen.math?.[0] ?? "",
      steps: [
        { expression: "n(A × B) = n(A) × n(B)", explanation: "The product has one ordered pair for every choice from A and every choice from B." },
        { expression: `${m * n} = ${m} × n(B)`, explanation: `Substitute the known values: A has ${m} elements and the product has ${m * n} ordered pairs.` },
        { expression: `n(B) = ${m * n} ÷ ${m} = ${n}`, explanation: `Division undoes multiplication. Split the ${m * n} pairs equally across the ${m} choices from A, giving ${n} choices in B.` },
      ],
    };
    return {
      question: q?.prompt ?? screen.math?.[0] ?? "",
      steps: [
        { expression: "n(A × B) = n(A) × n(B)", explanation: "Each element of A pairs with every element of B." },
        { expression: `n(A × B) = ${m} × ${n}`, explanation: `The ordered-pair grid has ${m} rows and ${n} columns.` },
        { expression: `n(A × B) = ${m * n}`, explanation: `There are ${m * n} cells, so there are ${m * n} ordered pairs.` },
      ],
    };
  }
  if (problem?.family === "aiint") {
    const [a, b, operation] = problem.params;
    const result = operation ? a - b : a + b;
    if (operation && b < 0) return {
      question: q?.prompt ?? screen.math?.[0] ?? "",
      steps: [
        { expression: `${signed(a)} − ${wrapped(b)} = ${signed(a)} + ${signed(-b)}`, explanation: `Subtracting ${wrapped(b)} means adding its opposite, ${signed(-b)}.` },
        { expression: `${signed(a)} + ${signed(-b)}`, explanation: `Start at ${signed(a)} on the number line and move ${Math.abs(b)} places to the right.` },
        { expression: `${signed(a)} − ${wrapped(b)} = ${signed(result)}`, explanation: `The move ends at ${signed(result)}, so the answer is ${signed(result)}.` },
      ],
    };
    const move = operation ? -b : b;
    return {
      question: q?.prompt ?? screen.math?.[0] ?? "",
      steps: [
        { expression: operation ? `${signed(a)} − ${wrapped(b)} = ${signed(a)} + ${signed(-b)}` : `${signed(a)} + ${wrapped(b)}`, explanation: operation ? "Change subtraction into adding the opposite." : `Start at ${signed(a)} on the number line.` },
        { expression: `${signed(a)} ${move < 0 ? "move left" : "move right"} ${Math.abs(move)}`, explanation: `${move < 0 ? "Negative" : "Positive"} movement goes ${move < 0 ? "left" : "right"} on the number line.` },
        { expression: `= ${signed(result)}`, explanation: `The move finishes at ${signed(result)}.` },
      ],
    };
  }
  const math = screen.math ?? [];
  if (!math.length) return null;
  return { question: math[0], steps: math.slice(1).map((expression, index) => ({ expression, explanation: screen.text[index] ?? screen.text.at(-1) ?? "Follow the calculation one step at a time." })) };
}

export function teachingVisualFor(problem: FamilyProblem | null): ReactNode {
  if (problem?.family === "aocart") {
    const [m, n] = problem.params;
    return <div className="concept-visual"><p>A smaller example</p><PairGrid rows={Array.from({ length: m }, (_, i) => i + 1)} columns={letters(n)} /></div>;
  }
  if (problem?.family === "aiint") {
    const [a, b, operation] = problem.params;
    const result = operation ? a - b : a + b;
    return <div className="concept-visual"><p>See the movement</p><MovementNumberLine start={a} end={result} /></div>;
  }
  return null;
}
