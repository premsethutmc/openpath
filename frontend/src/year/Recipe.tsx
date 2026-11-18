/**
 * recipe@1: the one player for every lesson recipe (packages/learning/src/recipe.ts).
 *
 * It walks the recipe's parts in the order its type gives (shape@1), in the layout the rule gives (layout@1):
 *   "flow"   one page that grows (Class 6 and up): each part appears under the last once that one is done
 *   "steps"  one part on the screen at a time, with Next (Classes 1 to 5)
 * A part that asks for something (a guess, a mission, the worked steps, the last choice) must be done before the next one
 * opens. Nothing here is recorded as evidence; the module's own practice and checks follow the recipe and keep the record.
 *
 * lesson-part@1: when a part is finished, how long it took is sent as a measurement (a name from a fixed list, a number and
 * which part), so that the part where learners leave a lesson can be found. It says nothing about right or wrong.
 */
import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import { useResume } from "./resume";
import type { Scene } from "../../../packages/learning/src/scene";
import { stepsOf, workedFor, type Choice, type Recipe, type RecipeStep } from "../../../packages/learning/src/recipe";
import { layoutFor } from "./recipe-layout";
import type { Guess } from "../../../packages/learning/src/families";
import { FeedbackBox } from "./Feedback";
import { Figure } from "./Figure";
import { KID } from "./kid";
import { ScenePlayer } from "./Scene";

const LABEL = { question: "The question", predict: "Your guess", mission: "Find out", name: "Name it", solve: "How to solve it", try: "Try one", think: "Think about it" } as const;
const clean = (t: string) => t.replace(/[^A-Za-z0-9:_.,\-/ ]/g, "");
const where = (recipe: Recipe, part: string) => clean(`recipe:${recipe.competency}:${part}`);
const keyOf = (s: RecipeStep) => (s.kind === "mission" ? `mission-${s.index + 1}` : s.kind);
const headingOf = (recipe: Recipe, s: RecipeStep) => (s.kind === "mission" ? (recipe.missions.length > 1 ? `${LABEL.mission} · ${s.index + 1} of ${recipe.missions.length}` : LABEL.mission) : s.kind === "choose" ? LABEL[recipe.choose.kind] : LABEL[s.kind]);

const cookie = (name: string) => (typeof document === "undefined" ? "" : document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? "");
/** lesson-part@1: one measurement, sent and forgotten (a site with no server for it, or a failure, changes nothing). */
function partDone(recipe: Recipe, part: string, since: number) { mark(where(recipe, part), since); }
function mark(detail: string, since: number) {
  try {
    void fetch("/api/telemetry/", {
      method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(cookie("csrftoken")) },
      body: JSON.stringify({ metrics: [{ name: "lesson_part", ms: Math.min(599_999, Math.max(0, Date.now() - since)), detail }] }),
    }).catch(() => undefined);
  } catch { /* measurements never get in the way of a lesson */ }
}

/**
 * guess-first@1: a worked example in a skill's opening lesson is not shown at once. The learner sees its question and the
 * answers to choose from (the right one and the family's own predicted wrong ones, `guessOf`), and the working opens when
 * one is chosen, or when "Show me how" is tapped. A wrong choice is answered with why that answer comes out. The lesson's
 * own Next button is untouched, the guess is not evidence, and what is recorded is only whether it was right, wrong or
 * skipped (a `lesson_part` measurement).
 */
export function GuessFirst({ guess, competency, children }: { guess: Guess; competency: string; children: ReactNode }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const since = useRef(Date.now());
  const reveal = (how: string) => { if (!open) mark(clean(`guess:${competency}:${how}`), since.current); setOpen(true); };
  return (
    <div className="guess-first" data-guess={open ? "open" : "closed"}>
      {!open && <p className="eyebrow">Have a guess first</p>}
      <Choices ask={guess.prompt} choices={guess.choices} picked={picked} onPick={(i) => { setPicked(i); reveal(guess.choices[i].right ? "right" : "wrong"); }} untilRight={false} />
      {!open && <button type="button" className="secondary guess-skip" onClick={() => reveal("skipped")}>Show me how</button>}
      <div hidden={!open}>{children}</div>
    </div>
  );
}

/** play-first@1: where a worked example has a picture to move, that comes first: the working opens once the picture's goal
 *  is reached (or on "Show me how"). The picture would give a guess away, so there is no guess here. Not evidence. */
export function PlayFirst({ scene, competency, children }: { scene: Scene; competency: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const since = useRef(Date.now());
  const reveal = (how: string) => { if (!open) mark(clean(`play:${competency}:${how}`), since.current); setOpen(true); };
  return (
    <div className="guess-first" data-play={open ? "open" : "closed"}>
      {!open && <p className="eyebrow">Try it yourself first</p>}
      <ScenePlayer scene={scene} onReached={() => reveal("done")} />
      {!open && <button type="button" className="secondary guess-skip" onClick={() => reveal("skipped")}>Show me how</button>}
      <div hidden={!open}>{children}</div>
    </div>
  );
}

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

function Worked({ worked, shown, more }: { worked: NonNullable<ReturnType<typeof workedFor>>; shown: number; more: () => void }) {
  return (
    <>
      <p>{worked.prompt}</p>
      {worked.figure && <Figure v={worked.figure} />}
      <ol className="recipe-steps">{worked.steps.slice(0, shown).map((t, k) => <li key={k}>{t}</li>)}</ol>
      {shown <= worked.steps.length
        ? <button type="button" className="secondary" onClick={more}>{shown < worked.steps.length ? "Show the next step" : "Show the answer"}</button>
        : <p className="recipe-reply right" role="status">Answer: {worked.answer}</p>}
    </>
  );
}

/** What a learner has done in a recipe: a cursor only (never evidence). */
interface Progress { g: number | null; m: number; s: number }
function useProgress(recipe: Recipe, resumeKey: string | undefined) {
  const [kept, keep] = useResume<Progress>(resumeKey, { g: null, m: 0, s: 1 });
  const guess = recipe.predict && kept && Number.isInteger(kept.g) && kept.g! >= 0 && kept.g! < recipe.predict.choices.length ? kept.g : null;
  const missions = kept && Number.isInteger(kept.m) ? Math.min(recipe.missions.length, Math.max(0, kept.m)) : 0;
  const shown = kept && Number.isInteger(kept.s) ? Math.max(1, kept.s) : 1;
  return { guess, missions, shown, keep: (p: Partial<Progress>) => keep({ g: guess, m: missions, s: shown, ...p }), reset: () => keep({ g: null, m: 0, s: 1 }) };
}

/**
 * layout@1 "flow": the recipe as one page that grows. Each part appears under the last once that one is done; what is done
 * stays in view, and a finished mission shrinks to one line. Nothing is shown before the learner has done what comes
 * before it, so nothing is given away, and there is no Next to tap between parts.
 */
function RecipeFlow({ recipe, onDone, doneLabel, resumeKey }: { recipe: Recipe; onDone: () => void; doneLabel: string; resumeKey?: string }) {
  const worked = workedFor(recipe.competency);
  const steps = stepsOf(recipe, !!worked);
  const { guess, missions, shown, keep, reset } = useProgress(recipe, resumeKey);
  const [choice, setChoice] = useState<number | null>(null);
  const done = (s: RecipeStep) => (s.kind === "predict" ? guess !== null : s.kind === "mission" ? missions > s.index : s.kind === "solve" ? shown > worked!.steps.length : s.kind === "choose" ? choice !== null && !!recipe.choose.choices[choice].right : true);
  const at = steps.findIndex((s) => !done(s));           // the part the learner is on (-1: all done)
  const open = at < 0 ? steps.length - 1 : at;
  // the newest part is brought into view when it appears (without motion for a learner who has asked for less of it)
  const newest = useRef<HTMLElement | null>(null), first = useRef(true), since = useRef(Date.now()), was = useRef(open);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (was.current !== open || at < 0) { partDone(recipe, keyOf(steps[was.current]), since.current); since.current = Date.now(); was.current = open; }
    if (at < 0) return;
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    newest.current?.scrollIntoView?.({ behavior: calm ? "auto" : "smooth", block: "start" });
  }, [open, at]);
  const body = (s: RecipeStep): JSX.Element =>
    s.kind === "question" ? <>{recipe.question!.map((t, k) => <p key={k}>{t}</p>)}</>
    : s.kind === "predict" ? <Choices ask={recipe.predict!.ask} choices={recipe.predict!.choices} picked={guess} onPick={(k) => keep({ g: k })} untilRight={false} />
    : s.kind === "mission" ? <ScenePlayer key={s.index} scene={recipe.missions[s.index] as Scene} onReached={() => keep({ m: s.index + 1 })} />
    : s.kind === "name" ? <>{recipe.name.map((t, k) => <p key={k}>{t}</p>)}</>
    : s.kind === "solve" ? <Worked worked={worked!} shown={shown} more={() => keep({ s: shown + 1 })} />
    : <Choices ask={recipe.choose.ask} choices={recipe.choose.choices} picked={choice} onPick={setChoice} untilRight />;
  return (
    <div className="stack enter" data-recipe={recipe.competency} data-recipe-layout="flow" data-recipe-step={steps[open].kind}>
      <div className="panel lesson recipe recipe-flow">
        <p className="eyebrow">{recipe.title}</p>
        {steps.slice(0, open + 1).map((s, i) => (s.kind === "mission" && done(s)
          ? <p key={keyOf(s)} className="recipe-done" data-recipe-part={keyOf(s)}><span aria-hidden="true">✓ </span>{recipe.missions[s.index].success}</p>
          : (
            <section key={keyOf(s)} className="recipe-part" data-recipe-part={keyOf(s)} ref={i === open ? (el) => { newest.current = el; } : undefined}>
              <h3>{headingOf(recipe, s)}</h3>
              {body(s)}
              {KID && <FeedbackBox key={`fb-${keyOf(s)}`} where={where(recipe, keyOf(s))} />}
            </section>
          )))}
        {/* the way on sits at the end of the page it belongs to (a bar fixed to the bottom would cover a long page) */}
        {at < 0 && <div className="recipe-end"><button className="primary" onClick={() => { reset(); onDone(); }}>{doneLabel}</button></div>}
      </div>
    </div>
  );
}

/** layout@1 "steps": one part on the screen at a time, with Next (Classes 1 to 5). */
function RecipeSteps({ recipe, onDone, doneLabel, resumeKey }: { recipe: Recipe; onDone: () => void; doneLabel: string; resumeKey?: string }) {
  const worked = workedFor(recipe.competency);
  // one-page-story@1: the opening story is a few lines, so it is not a page of its own: it sits above the guess it asks for
  const every = stepsOf(recipe, !!worked);
  const steps = every.filter((s, k) => !(s.kind === "question" && every[k + 1]?.kind === "predict"));
  const storyWithGuess = steps.length < every.length;
  const { guess, shown, keep, reset } = useProgress(recipe, resumeKey && `${resumeKey}:p`);
  const [storedI, setStoredI] = useResume<number>(resumeKey && `${resumeKey}:i`, 0);
  const i = Number.isInteger(storedI) && storedI >= 0 && storedI < steps.length ? storedI : 0;
  const [choice, setChoice] = useState<number | null>(null);
  const [reached, setReached] = useState<Record<number, boolean>>({});
  const [nudge, setNudge] = useState("");
  const since = useRef(Date.now());
  const step = steps[i];
  const last = i === steps.length - 1;
  // a guess only has to be made; a mission has to be finished; every worked step has to be opened; the last choice has to be right
  const ready = step.kind === "predict" ? guess !== null : step.kind === "mission" ? !!reached[step.index] : step.kind === "solve" ? shown > worked!.steps.length : step.kind === "choose" ? choice !== null && !!recipe.choose.choices[choice].right : true;
  const go = (n: number) => { setNudge(""); since.current = Date.now(); setStoredI(n); };
  const next = () => {
    if (!ready) { setNudge(step.kind === "mission" ? "Finish this one first." : step.kind === "solve" ? "Look at every step first." : step.kind === "predict" ? "Make a guess first. A wrong guess is fine." : choice === null ? "Choose one first." : "Try another one."); return; }
    partDone(recipe, keyOf(step), since.current);
    if (last) { reset(); setStoredI(0); onDone(); } else go(i + 1);
  };
  return (
    <div className="stack enter" key={`recipe-${i}`} data-recipe={recipe.competency} data-recipe-layout="steps" data-recipe-step={step.kind}>
      <div className="panel lesson recipe">
        <p className="eyebrow">{recipe.title} · {i + 1} of {steps.length}</p>
        <h3>{step.kind === "predict" && storyWithGuess ? LABEL.question : headingOf(recipe, step)}</h3>
        {(step.kind === "question" || (step.kind === "predict" && storyWithGuess)) && recipe.question!.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "predict" && <Choices ask={recipe.predict!.ask} choices={recipe.predict!.choices} picked={guess} onPick={(k) => { keep({ g: k }); setNudge(""); }} untilRight={false} />}
        {step.kind === "mission" && <ScenePlayer key={step.index} scene={recipe.missions[step.index]} onReached={() => { setReached((r) => ({ ...r, [step.index]: true })); setNudge(""); }} />}
        {step.kind === "name" && recipe.name.map((t, k) => <p key={k}>{t}</p>)}
        {step.kind === "solve" && worked && <Worked worked={worked} shown={shown} more={() => { keep({ s: shown + 1 }); setNudge(""); }} />}
        {step.kind === "choose" && <Choices ask={recipe.choose.ask} choices={recipe.choose.choices} picked={choice} onPick={(k) => { setChoice(k); setNudge(""); }} untilRight />}
        {nudge && <p className="recipe-nudge" role="alert">{nudge}</p>}
        {/* feedback@1: every part of a lesson carries the testers' box, as every lesson section does */}
        {KID && <FeedbackBox key={`fb-${i}`} where={where(recipe, `${i + 1}:${keyOf(step)}`)} />}
      </div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => go(i - 1)}>Back</button>}
        <button className="primary" onClick={next}>{last ? doneLabel : "Next"}</button>
      </div>
    </div>
  );
}

export function RecipeLesson({ recipe, onDone, doneLabel = "Next", resumeKey, grade = null }: { recipe: Recipe; onDone: () => void; doneLabel?: string; resumeKey?: string; grade?: number | null }) {
  return layoutFor(recipe, grade) === "flow"
    ? <RecipeFlow recipe={recipe} onDone={onDone} doneLabel={doneLabel} resumeKey={resumeKey && `${resumeKey}:flow`} />
    : <RecipeSteps recipe={recipe} onDone={onDone} doneLabel={doneLabel} resumeKey={resumeKey && `${resumeKey}:steps`} />;
}
