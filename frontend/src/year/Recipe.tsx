/**
 * recipe@1: the one player for every lesson recipe (packages/learning/src/recipe.ts).
 *
 * It walks the recipe's steps in order: the question, a guess, the missions (scenes), the name, and where the idea applies.
 * A step that asks for something (a guess, a mission, a choice) must be done before the next one opens. Nothing here is
 * recorded as evidence; the module's own practice and checks follow the recipe and keep the record.
 */
import { useEffect, useRef, useState, type JSX } from "react";
import { useResume } from "./resume";
import type { Scene } from "../../../packages/learning/src/scene";
import { layoutFor, stepsOf, workedFor, type Choice, type Recipe } from "../../../packages/learning/src/recipe";
import { FeedbackBox } from "./Feedback";
import { Figure } from "./Figure";
import { KID } from "./kid";
import { ScenePlayer } from "./Scene";

const LABEL = { question: "The question", predict: "Your guess", mission: "Find out", name: "Name it", solve: "How to solve it", try: "Try one", think: "Think about it" } as const;

function Choices({ ask, choices, picked, onPick, untilRight }: { ask: string; choices: Choice[]; picked: number | null; onPick: (i: number) => void; untilRight: boolean }) {
  const chosen = picked === null ? null : choices[picked];
  return (
    <>
      <p>{ask}</p>
      <div className="recipe-choices" role="group" aria-label={ask}>
        {choices.map((c, i) => (
          <button key={c.label} type="button" className={`secondary${picked === i ? " picked" : ""}`} aria-pressed={picked === i} onClick={() => onPick(i)}>{c.label}</button>
        ))}
      </div>
      {chosen && <p className={`recipe-reply${chosen.right ? " right" : ""}`} role="status">{chosen.reply}{untilRight && !chosen.right ? " Choose again." : ""}</p>}
    </>
  );
}

/** A mission: one scene; the step is done once its goal has been reached. */
function Mission({ scene, onReached }: { scene: Scene; onReached: () => void }) {
  return <ScenePlayer scene={scene} onReached={onReached} />;
}

const where = (recipe: Recipe, part: string) => `recipe:${recipe.competency}:${part}`.replace(/[^A-Za-z0-9:_.,\-/ ]/g, "");

/**
 * layout@1 "flow": the recipe as one page that grows. Each part appears under the last once that one is done; what is done
 * stays in view, and a finished mission shrinks to one line. Nothing is shown before the learner has done what comes
 * before it, so nothing is given away, and there is no Next to tap between parts.
 */
function RecipeFlow({ recipe, onDone, doneLabel, resumeKey }: { recipe: Recipe; onDone: () => void; doneLabel: string; resumeKey?: string }) {
  const worked = workedFor(recipe.competency);
  const n = recipe.missions.length;
  // a cursor only (never evidence): the guess made, how many missions are finished, how many worked steps are open
  const [kept, keep] = useResume<{ g: number | null; m: number; s: number }>(resumeKey, { g: null, m: 0, s: 1 });
  const guess = kept && Number.isInteger(kept.g) && kept.g! >= 0 && kept.g! < recipe.predict.choices.length ? kept.g : null;
  const missions = kept && Number.isInteger(kept.m) ? Math.min(n, Math.max(0, kept.m)) : 0;
  const shown = kept && Number.isInteger(kept.s) ? Math.max(1, kept.s) : 1;
  const [choice, setChoice] = useState<number | null>(null);
  const solved = !worked || shown > worked.steps.length;
  const finished = choice !== null && !!recipe.choose.choices[choice].right;
  // the newest part is brought into view when it appears (without motion for a learner who has asked for less of it)
  const newest = useRef<HTMLElement | null>(null);
  const stage = `${guess === null ? 0 : 1}:${missions}:${missions >= n ? 1 : 0}:${solved ? 1 : 0}`;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    newest.current?.scrollIntoView?.({ behavior: calm ? "auto" : "smooth", block: "start" });
  }, [stage]);
  const part = (key: string, heading: string, body: JSX.Element, latest: boolean) => (
    <section key={key} className="recipe-part" data-recipe-part={key} ref={latest ? (el) => { newest.current = el; } : undefined}>
      <h3>{heading}</h3>
      {body}
      {KID && <FeedbackBox key={`fb-${key}`} where={where(recipe, key)} />}
    </section>
  );
  const open = guess === null ? "predict" : missions < n ? `mission-${missions + 1}` : !solved ? "solve" : "choose";
  return (
    <div className="stack enter" data-recipe={recipe.competency} data-recipe-layout="flow" data-recipe-step={open.replace(/-\d+$/, "")}>
      <div className="panel lesson recipe recipe-flow">
        <p className="eyebrow">{recipe.title}</p>
        {part("question", LABEL.question, <>
          {recipe.question.map((t, k) => <p key={k}>{t}</p>)}
          <Choices ask={recipe.predict.ask} choices={recipe.predict.choices} picked={guess} onPick={(k) => keep({ g: k, m: missions, s: shown })} untilRight={false} />
        </>, false)}
        {guess !== null && recipe.missions.map((scene, k) => (k > missions ? null : k < missions
          ? <p key={k} className="recipe-done" data-recipe-part={`mission-${k + 1}`}><span aria-hidden="true">✓ </span>{scene.success}</p>
          : part(`mission-${k + 1}`, n > 1 ? `${LABEL.mission} · ${k + 1} of ${n}` : LABEL.mission, <Mission key={k} scene={scene} onReached={() => keep({ g: guess, m: k + 1, s: shown })} />, true)))}
        {guess !== null && missions >= n && part("name", LABEL.name, <>{recipe.name.map((t, k) => <p key={k}>{t}</p>)}</>, !worked ? false : !solved)}
        {guess !== null && missions >= n && worked && part("solve", LABEL.solve, <>
          <p>{worked.prompt}</p>
          {worked.figure && <Figure v={worked.figure} />}
          <ol className="recipe-steps">{worked.steps.slice(0, shown).map((t, k) => <li key={k}>{t}</li>)}</ol>
          {shown <= worked.steps.length
            ? <button type="button" className="secondary" onClick={() => keep({ g: guess, m: missions, s: shown + 1 })}>{shown < worked.steps.length ? "Show the next step" : "Show the answer"}</button>
            : <p className="recipe-reply right" role="status">Answer: {worked.answer}</p>}
        </>, false)}
        {guess !== null && missions >= n && solved && part("choose", LABEL[recipe.choose.kind], <Choices ask={recipe.choose.ask} choices={recipe.choose.choices} picked={choice} onPick={setChoice} untilRight />, true)}
        {/* the way on sits at the end of the page it belongs to (a bar fixed to the bottom would cover a long page) */}
        {finished && <div className="recipe-end"><button className="primary" onClick={() => { keep({ g: null, m: 0, s: 1 }); onDone(); }}>{doneLabel}</button></div>}
      </div>
    </div>
  );
}

export function RecipeLesson({ recipe, onDone, doneLabel = "Next", resumeKey, grade = null }: { recipe: Recipe; onDone: () => void; doneLabel?: string; resumeKey?: string; grade?: number | null }) {
  return layoutFor(recipe, grade) === "flow"
    ? <RecipeFlow recipe={recipe} onDone={onDone} doneLabel={doneLabel} resumeKey={resumeKey && `${resumeKey}:flow`} />
    : <RecipeSteps recipe={recipe} onDone={onDone} doneLabel={doneLabel} resumeKey={resumeKey} />;
}

/** layout@1 "steps": one thing on the screen at a time, with Next (Classes 1 to 5). */
function RecipeSteps({ recipe, onDone, doneLabel = "Next", resumeKey }: { recipe: Recipe; onDone: () => void; doneLabel?: string; resumeKey?: string }) {
  const worked = workedFor(recipe.competency);
  const steps = stepsOf(recipe, !!worked);
  const [shown, setShown] = useState(1);
  // the place in the recipe and the guess made are kept for a learner who leaves part-way (a cursor only, never evidence);
  // a mission that was open is done again
  const [kept, keep] = useResume<{ i: number; guess: number | null }>(resumeKey, { i: 0, guess: null });
  const i = kept && Number.isInteger(kept.i) && kept.i >= 0 && kept.i < steps.length ? kept.i : 0;
  const guess = kept && Number.isInteger(kept.guess) && kept.guess! >= 0 && kept.guess! < recipe.predict.choices.length ? kept.guess : null;
  const setI = (n: number) => keep({ i: n, guess });
  const setGuess = (g: number) => keep({ i, guess: g });
  const [choice, setChoice] = useState<number | null>(null);
  const [reached, setReached] = useState<Record<number, boolean>>({});
  const [nudge, setNudge] = useState("");
  const step = steps[i];
  const last = i === steps.length - 1;
  // a guess only has to be made; a mission has to be finished; the last choice has to be the right one
  const ready = step.kind === "predict" ? guess !== null : step.kind === "mission" ? !!reached[step.index] : step.kind === "choose" ? choice !== null && !!recipe.choose.choices[choice].right : step.kind === "solve" ? shown > worked!.steps.length : true;
  const next = () => {
    if (!ready) { setNudge(step.kind === "mission" ? "Finish this one first." : step.kind === "solve" ? "Look at every step first." : step.kind === "predict" ? "Make a guess first. A wrong guess is fine." : choice === null ? "Choose one first." : "Try another one."); return; }
    setNudge("");
    if (last) { keep({ i: 0, guess: null }); onDone(); } else setI(i + 1);
  };
  return (
    <div className="stack enter" key={`recipe-${i}`} data-recipe={recipe.competency} data-recipe-layout="steps" data-recipe-step={step.kind}>
      <div className="panel lesson recipe">
        <p className="eyebrow">{recipe.title} · {i + 1} of {steps.length}</p>
        <h3>{step.kind === "mission" && recipe.missions.length > 1 ? `${LABEL.mission} · ${step.index + 1} of ${recipe.missions.length}` : step.kind === "choose" ? LABEL[recipe.choose.kind] : LABEL[step.kind]}</h3>
        {step.kind === "question" && recipe.question.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "predict" && <Choices ask={recipe.predict.ask} choices={recipe.predict.choices} picked={guess} onPick={(k) => { setGuess(k); setNudge(""); }} untilRight={false} />}
        {step.kind === "mission" && <Mission key={step.index} scene={recipe.missions[step.index]} onReached={() => { setReached((r) => ({ ...r, [step.index]: true })); setNudge(""); }} />}
        {step.kind === "name" && recipe.name.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "solve" && worked && (
          <>
            <p>{worked.prompt}</p>
            {worked.figure && <Figure v={worked.figure} />}
            <ol className="recipe-steps">{worked.steps.slice(0, shown).map((t, k) => <li key={k}>{t}</li>)}</ol>
            {shown <= worked.steps.length
              ? <button type="button" className="secondary" onClick={() => { setShown(shown + 1); setNudge(""); }}>{shown < worked.steps.length ? "Show the next step" : "Show the answer"}</button>
              : <p className="recipe-reply right" role="status">Answer: {worked.answer}</p>}
          </>
        )}
        {step.kind === "choose" && <Choices ask={recipe.choose.ask} choices={recipe.choose.choices} picked={choice} onPick={(k) => { setChoice(k); setNudge(""); }} untilRight />}
        {nudge && <p className="recipe-nudge" role="alert">{nudge}</p>}
        {/* feedback@1: every step of a lesson carries the testers' box, as every lesson section does */}
        {KID && <FeedbackBox key={`fb-${i}`} where={where(recipe, `${i + 1}:${step.kind}`)} />}
      </div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => { setNudge(""); setI(i - 1); }}>Back</button>}
        <button className="primary" onClick={next}>{last ? doneLabel : "Next"}</button>
      </div>
    </div>
  );
}
