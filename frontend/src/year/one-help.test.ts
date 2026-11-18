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

test("rows-of-people@1 and tried@1: children are drawn, the left over stand underneath, and each try is kept", async () => {
  const { check, draw, initial, set, triedLine } = await import("../../../packages/learning/src/scene");
  const { recipeFor } = await import("../../../packages/learning/src/recipe");
  const r = recipeFor("MATH.number.primes")!;
  const s13 = r.missions[2];
  assert.ok(s13.kind === "array" && s13.people && s13.log && s13.total === 13);
  assert.deepEqual(check(s13), []);
  // 3 rows of 4: twelve children in rows and one underneath
  const st = set(s13, set(s13, initial(s13), "r", 3), "c", 4), shapes = draw(s13, st);
  assert.equal(shapes.filter((x) => x.t === "circle" && x.role === "cell").length, 12);
  assert.equal(shapes.filter((x) => x.t === "circle" && x.role === "blank").length, 1);
  assert.equal(triedLine(s13, 3), "3 rows: 4 in each, 1 left over");
  assert.equal(triedLine(s13, 5), "5 rows: 2 in each, 3 left over");
  assert.equal(triedLine(s13, 1), null);
  assert.equal(triedLine(r.missions[0], 3), null, "no log on a scene that keeps none");
  assert.equal(triedLine({ ...s13, total: 12 } as typeof s13, 4), "4 rows: 3 in each, nobody left over");
});

test("clips@1: a clip is second-level help inside the opened rule card, lives outside the app, and shows nothing when there is none", async () => {
  const { CLIPS, clipFor, clipOk } = await import("../../../packages/learning/src/clips");
  for (const [c, clip] of Object.entries(CLIPS)) assert.ok(clipOk(clip), c);
  assert.equal(clipFor("MATH.number.long-division"), CLIPS["MATH.number.long-division"] ?? null);
  assert.equal(clipFor(null), null);
  assert.ok(clipOk({ url: "https://example.org/a/long-division.mp4", title: "Long division", seconds: 70 }));
  assert.ok(!clipOk({ url: "http://example.org/a.mp4", title: "x", seconds: 70 }), "https only");
  assert.ok(!clipOk({ url: "https://example.org/a.mp4", title: "Long division", seconds: 900 }), "short clips only");
  // offered only inside the opened card, and not fetched before it is tapped
  assert.match(coach, /\{rule && card && \([\s\S]*<ClipButton key=\{ruleOf\} competency=\{ruleOf\} \/>/);
  assert.match(coach, /if \(!open\) return <button[^>]*data-testid="coach-clip"/);
});
