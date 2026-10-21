import { useState, type ReactNode } from "react";
import type { Question, Screen } from "../../../packages/learning/src/content";
import type { Problem as FamilyProblem } from "../../../packages/learning/src/families";

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

/** The page asks for one tap per reasoning step; no answer or learner evidence is submitted. */
export function ProgressiveWorkedExample({ example }: { example: WorkedExample }) {
  const [shown, setShown] = useState(0);
  return <section className="progressive-worked" aria-label="Progressive worked example">
    <p className="worked-question">{example.question}</p>
    <div className="worked-steps" aria-live="polite">
      {example.steps.slice(0, shown).map((step, index) => <div className="worked-step" key={`${step.expression}-${index}`}>
        <span className="step-number">{index + 1}</span>
        <div><div className="step-expression">{step.expression}</div><p>{step.explanation}</p></div>
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
