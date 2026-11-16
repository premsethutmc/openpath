/**
 * recipe@1: the one player for every lesson recipe (packages/learning/src/recipe.ts).
 *
 * It walks the recipe's steps in order: the question, a guess, the missions (scenes), the name, and where the idea applies.
 * A step that asks for something (a guess, a mission, a choice) must be done before the next one opens. Nothing here is
 * recorded as evidence; the module's own practice and checks follow the recipe and keep the record.
 */
import { useState } from "react";
import { met, initial, type Scene } from "../../../packages/learning/src/scene";
import { stepsOf, type Choice, type Recipe } from "../../../packages/learning/src/recipe";
import { ScenePlayer } from "./Scene";

const LABEL = { question: "The question", predict: "Your guess", mission: "Find out", name: "Name it", choose: "When to use it" } as const;

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

export function RecipeLesson({ recipe, onDone, doneLabel = "Next" }: { recipe: Recipe; onDone: () => void; doneLabel?: string }) {
  const steps = stepsOf(recipe);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [reached, setReached] = useState<Record<number, boolean>>({});
  const [nudge, setNudge] = useState("");
  const step = steps[i];
  const last = i === steps.length - 1;
  // a guess only has to be made; a mission has to be finished; the last choice has to be the right one
  const ready = step.kind === "predict" ? guess !== null : step.kind === "mission" ? !!reached[step.index] || met(recipe.missions[step.index], initial(recipe.missions[step.index])) : step.kind === "choose" ? choice !== null && !!recipe.choose.choices[choice].right : true;
  const next = () => {
    if (!ready) { setNudge(step.kind === "mission" ? "Finish this one first." : step.kind === "predict" ? "Make a guess first. A wrong guess is fine." : choice === null ? "Choose one first." : "Try another one."); return; }
    setNudge("");
    if (last) onDone(); else setI(i + 1);
  };
  return (
    <div className="stack enter" key={`recipe-${i}`} data-recipe={recipe.competency} data-recipe-step={step.kind}>
      <div className="panel lesson recipe">
        <p className="eyebrow">{recipe.title} · {i + 1} of {steps.length}</p>
        <h3>{step.kind === "mission" && recipe.missions.length > 1 ? `${LABEL.mission} · ${step.index + 1} of ${recipe.missions.length}` : LABEL[step.kind]}</h3>
        {step.kind === "question" && recipe.question.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "predict" && <Choices ask={recipe.predict.ask} choices={recipe.predict.choices} picked={guess} onPick={(k) => { setGuess(k); setNudge(""); }} untilRight={false} />}
        {step.kind === "mission" && <Mission key={step.index} scene={recipe.missions[step.index]} onReached={() => { setReached((r) => ({ ...r, [step.index]: true })); setNudge(""); }} />}
        {step.kind === "name" && recipe.name.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "choose" && <Choices ask={recipe.choose.ask} choices={recipe.choose.choices} picked={choice} onPick={(k) => { setChoice(k); setNudge(""); }} untilRight />}
        {nudge && <p className="recipe-nudge" role="alert">{nudge}</p>}
      </div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => { setNudge(""); setI(i - 1); }}>Back</button>}
        <button className="primary" onClick={next}>{last ? doneLabel : "Next"}</button>
      </div>
    </div>
  );
}
