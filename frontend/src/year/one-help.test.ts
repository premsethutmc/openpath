/** one-help@1: "I'm stuck" and the working are one place (source shape; the behaviour is checked in a browser). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const learn = readFileSync(new URL("./Learn.tsx", import.meta.url), "utf8");
const coach = readFileSync(new URL("./StepCoach.tsx", import.meta.url), "utf8");

test("being stuck opens the working with the step help inside it, and asking is recorded as help", () => {
  assert.match(learn, /const askHelp = \(\) => \{ setCoach\(true\); setWorkingOpen\(true\); setHint\(true\); \};/);
  assert.match(learn, /canCoach = hintAllowed && KID && workable && !!stepsHelp\(qid\)/, "never without help allowed (a test)");
  assert.match(learn, /<StepCoach key=\{qid\} qid=\{qid\} shown onUsed=\{usedStep\} \/>/);
  assert.match(learn, /onClick=\{askHelp\}><span aria-hidden="true">✋ <\/span>Help me with the next step<\/button>/);
  // help-count@1: each step shown counts, up to the 5 the record allows
  assert.match(learn, /const usedStep = \(\) => \{ setHint\(true\); setHelped\(\(n\) => Math\.min\(5, n \+ 1\)\); \};/);
  assert.match(learn, /hints: Math\.max\(helped, hint \|\| showHint \|\| lower > 0 \? 1 : 0\)/);
  assert.match(coach, /Help: show me this step/);
  assert.match(coach, /onClick=\{\(\) => \{ onUsed\?\.\(\); advance\(\); \}\}/, "a step asked to be shown is help");
});

test("ldiv-shown@1: a long-division question in practice opens with the written layout, not counted as help until a step is shown", async () => {
  assert.match(learn, /const longDiv = hintAllowed && KID && [^\n]*helpMethods\(qid\)\[0\] === "Long division";/);
  assert.match(learn, /const coach = coachAsked \|\| longDiv;/);
  assert.match(learn, /!!working \|\| longDiv\)/, "the working opens by itself");
  const { helpMethods } = await import("../../../packages/learning/src/step-help");
  const { pool } = await import("../../../packages/learning/src/families");
  const id = pool("ldiv").items.find((p) => /^348 ÷ 6/.test(p.prompt))!.id;
  assert.deepEqual(helpMethods(id).slice(0, 2), ["Long division", "Answer at the side"]);
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
  assert.match(pad, /<textarea ref=\{notesBox\} className="scribble-notes"/, "scribble@2: the pad can be typed on");
  // scribble-grows@1: the paper is never full: a stroke near the bottom adds room, "More room" adds it by hand, typed notes grow
  assert.match(pad, /if \(s\.some\(\(\[, y\]\) => y > h - MORE \* 0\.6\)\) grow\(\);/);
  assert.match(pad, /height=\{h\} style=\{\{ aspectRatio: `\$\{W\} \/ \$\{h\}` \}\}/);
  assert.match(pad, />More room<\/button>/);
  assert.match(pad, /t\.style\.height = `\$\{t\.scrollHeight \+ 24\}px`/);
  // one-place@1: the pad sits inside "Work it out step by step", which is only there for a question with working
  assert.match(learn, /\{KID && <ScribblePad key=\{qid\} \/>\}\s*<\/details>/);
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

test("chintu@1: Chintu says the step help on questions of Classes 1 to 5 only, and reads maths the way it is said", async () => {
  const { spoken } = await import("./Chintu");
  assert.equal(spoken("First: multiply 11 by 2."), "First: multiply 11 by 2.");
  assert.equal(spoken("7 × 78 = 546. Left over: 551 − 546 = 5"), "7 times 78 equals 546. Left over: 551 minus 546 equals 5");
  assert.equal(spoken("348 ÷ 6 = ?"), "348 divided by 6 equals what");
  assert.match(coach, /g !== null && g <= LAST_CHINTU_CLASS/);
  const { classOfQuestion } = await import("./StepCoach");
  const { pool } = await import("../../../packages/learning/src/families");
  assert.ok(classOfQuestion(pool("ldiv").items[0].id)! <= 5, "long division is primary-school work");
  assert.ok(classOfQuestion(pool("dpow").items[0].id)! >= 11, "differentiation is not");
  assert.equal(classOfQuestion("not-a-question"), null);
  assert.match(coach, /export const LAST_CHINTU_CLASS = 5;/);
  const cat = readFileSync(new URL("./Chintu.tsx", import.meta.url), "utf8");
  assert.ok(!/fetch\(|<audio|<video|https?:/.test(cat), "nothing is downloaded or sent");
});

test("fold@2: lesson text is folded only for Classes 1 to 5, and only when there is enough to fold", async () => {
  assert.match(learn, /const worth = fold && split\.map\(\(\[, rest\]\) => rest\)\.join\(" "\)\.length >= FOLD_AT_LEAST;/);
  assert.match(learn, /<KidText competency=\{competency\} fold=\{\(grade \?\? classOfSkill\(competency\) \?\? 1\) <= 5\}/);
  const { classOfSkill } = await import("./StepCoach");
  assert.ok(classOfSkill("MATH.trigonometry.compound-angle-identities")! >= 11);
  assert.ok(classOfSkill("MATH.number.rounding")! <= 5);
});
