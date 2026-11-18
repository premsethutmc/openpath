/** one-help@1: "I'm stuck" and the working are one place (source shape; the behaviour is checked in a browser). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const learn = readFileSync(new URL("./Learn.tsx", import.meta.url), "utf8");
const coach = readFileSync(new URL("./StepCoach.tsx", import.meta.url), "utf8");

test("being stuck opens the working with the step help inside it, and asking is recorded as help", () => {
  assert.match(learn, /const askHelp = \(\) => \{ setCoach\(true\); setWorkingOpen\(true\); setHint\(true\); \};/);
  assert.match(learn, /canCoach = hintAllowed && KID && workable && !!stepsHelp\(qid\)/, "never without help allowed (a test)");
  assert.match(learn, /<StepCoach key=\{qid\} qid=\{qid\} shown \/>/);
  assert.match(learn, /onClick=\{askHelp\}>I'm stuck<\/button>/);
  assert.match(coach, /Help: show me this step/);
});

test("one-page-story@1: a lesson's opening story is shown above its guess, not on a page of its own", () => {
  const recipe = readFileSync(new URL("./Recipe.tsx", import.meta.url), "utf8");
  assert.match(recipe, /every\.filter\(\(s, k\) => !\(s\.kind === "question" && every\[k \+ 1\]\?\.kind === "predict"\)\)/);
  assert.match(recipe, /\(step\.kind === "question" \|\| \(step\.kind === "predict" && storyWithGuess\)\) && recipe\.question!\.map/);
});

test("scribble@1: the pad is scratch paper: nothing is read, saved or sent, and it is there for any question with working", () => {
  const pad = readFileSync(new URL("./ScribblePad.tsx", import.meta.url), "utf8");
  assert.ok(!/fetch\(|localStorage|setValue|setWorking|onUsed|setHint/.test(pad), "the pad talks to nothing");
  assert.match(pad, /touch-action|onPointerDown=\{down\}/);
  assert.match(learn, /\{KID && workable && <ScribblePad key=\{qid\} \/>\}/);
  assert.match(pad, /<textarea className="scribble-notes"/, "scribble@2: the pad can be typed on");
});
