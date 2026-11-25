/** step-scene@1: the counter and the lift for worked add / take-away questions, and who gets it instead of words. */
import assert from "node:assert/strict";
import test from "node:test";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { STEP_SCENE_FAMILIES, breakItDown, chainOf, stepScene } from "../../../packages/learning/src/step-scenes";
import { check, draw, initial, met, readout, set, type Shape } from "../../../packages/learning/src/scene";
import { tallyAt, tallyClicks, tallyProblems } from "../../../packages/learning/src/tally";
import { classOfQuestion } from "../year/StepCoach";

const ARITH = new Set(["add", "count on", "add the prices", "move", "subtract", "take away", "count back"]);

test("step-scene@1: every pool question of a mapped family that gets a picture is a sound lift ending on its answer", () => {
  let fams = 0, questions = 0, multi = 0;
  for (const fam of Object.keys(STEP_SCENE_FAMILIES)) {
    assert.ok(FAMILIES.has(fam), fam);
    let got = 0;
    for (const pr of pool(fam).items) for (const id of FAMILIES.get(fam)!.word ? [pr.id, `${pr.id}:w`] : [pr.id]) {
      const s = stepScene(id);
      if (!s) continue;
      const p = problemOf(id)!;
      assert.deepEqual(tallyProblems(s), [], id);
      const end = tallyAt(s.start, s.tiles, s.tiles.length);
      assert.equal(String(end), String(p.answer), id);
      // the engine's own check: the player draws it (not "This picture is not available"), the goal is not met before the
      // first tile, and once every tile is in it is met with the lift on the answer
      assert.deepEqual(check(s), [], id);
      assert.equal(met(s, initial(s)), false, `${id}: not done before a tile`);
      const all = set(s, initial(s), "dropped", s.tiles.length);
      assert.ok(met(s, all), `${id}: done with every tile in`);
      assert.deepEqual(s.goal, { measure: "dropped", equals: s.tiles.length }, id);
      assert.equal(s.tiles.length, p.steps.filter((x) => ARITH.has(x.op)).length, `${id}: one tile per step`);
      assert.ok(s.floors[1] - s.floors[0] <= 60, id);
      const below = tallyClicks(s.start, s.tiles).some((n) => n < 0);
      if (!below) assert.equal(s.floors[0], 0, `${id}: the lowest floor is 0 without negatives`);
      const kind = STEP_SCENE_FAMILIES[fam];
      if (kind === "money" || kind === "change") assert.equal(s.unit, "₹", id);
      assert.ok(s.prompt.split(" ").length <= 6 && s.success.split(" ").length <= 5, `${id}: few words: ${s.prompt} / ${s.success}`);
      assert.ok(!/undefined|NaN/.test(s.prompt + s.success + (s.unit ?? "")), id);
      if (id === pr.id) { got++; questions++; if (p.steps.length >= 2) multi++; }
    }
    assert.ok(got > 0, `${fam} gives at least one picture`);
    fams++;
  }
  // the small-number families picture every question
  for (const fam of ["aaadd", "aasub", "acstory9", "abcost", "aimulti"]) {
    const items = pool(fam).items, miss = items.filter((pr) => !stepScene(pr.id) && (fam !== "aimulti" || tallyClicks(pr.params[1], [pr.params[2], -pr.params[3], pr.params[4]]).every((n) => Math.abs(n) < 50)));
    assert.deepEqual(miss.map((m) => m.id), [], `${fam}: every question that fits a lift`);
  }
  // up and back to where it started (answer = start): still a picture, not "This picture is not available"
  const round = pool("aimulti").items.filter((pr) => { const s = stepScene(pr.id); return !!s && tallyAt(s.start, s.tiles, s.tiles.length) === s.start; });
  assert.ok(round.length >= 1, "some lift questions end where they start");
  for (const pr of round) assert.deepEqual(check(stepScene(pr.id)), [], pr.id);
  for (const pr of pool("acstory").items) assert.equal(!!stepScene(pr.id), pr.params[0] <= 1, `${pr.id}: add and take away only`);
  // stories count things: the unit is the story's own noun
  assert.equal(stepScene(pool("acstory9").items[0].id)?.unit, "balloons");
  console.log(`step-scene@1: ${fams} families, ${questions} pool questions get the counter and the lift (${multi} of them shown as boxed steps, which need two or more steps)`);
});

test("step-scene@1: questions that are not a clean add / take-away chain give no picture", () => {
  for (const fam of ["aeaddn", "acsubn", "addr", "acsub2", "abneed", "aacalgap", "aamore", "mul"]) {
    if (!FAMILIES.has(fam)) continue;
    for (const pr of pool(fam).items.slice(0, 60)) assert.equal(stepScene(pr.id), null, pr.id);
  }
  for (const pr of pool("ajintl").items) if (pr.params[0] !== 0) assert.equal(stepScene(pr.id), null, `${pr.id}: only the move kind`);
  assert.equal(stepScene("gen:aaadd:999,999"), null);
  assert.equal(stepScene("nonsense"), null);
  // a chain must run on: each step starts where the last one ended
  assert.equal(chainOf([{ id: "a", op: "add", competency: "x", inputs: [10, 20], value: 30 }, { id: "b", op: "add", competency: "x", inputs: [3, 4], value: 7 }]), null);
  // too big for a lift: a ₹100 note, three-digit stories
  const big = pool("aamoney").items.find((pr) => Number(pr.answer) > 60);
  assert.ok(big && stepScene(big.id) === null);
});

test("step-scene@1: the class rule: pictures instead of words up to Class 5, no written reasons for Class 1–3", () => {
  const first = (fam: string, ok: (id: string) => boolean = () => true) => pool(fam).items.map((p) => p.id).find(ok)!;
  // Class 1, a picture: the picture, no words
  const a = first("aaadd");
  assert.equal(classOfQuestion(a), 1);
  assert.deepEqual(Object.keys(breakItDown(a, classOfQuestion(a))), ["scene", "words"]);
  assert.ok(breakItDown(a, 1).scene && breakItDown(a, 1).words === false);
  // Class 2, no picture (column addition): still no words
  const b = first("aeaddn");
  assert.ok((classOfQuestion(b) ?? 9) <= 3);
  assert.deepEqual(breakItDown(b, classOfQuestion(b)), { scene: null, words: false });
  // every question of a Class 1–3 family: no written reasons
  for (const fam of ["aaadd", "aasub", "acstory9", "acstory", "aastadd", "aeaddn", "addr", "acsub2"]) for (const pr of pool(fam).items.slice(0, 40)) {
    const c = classOfQuestion(pr.id);
    assert.ok(c !== null && c <= 3, pr.id);
    assert.equal(breakItDown(pr.id, c).words, false, pr.id);
  }
  // Class 4–5 with no picture keeps the reasons
  assert.deepEqual(breakItDown(b, 4), { scene: null, words: true });
  // Class 6+: the reasons stay; the picture too only when the numbers go below 0
  const neg = first("aimulti");
  assert.equal(classOfQuestion(neg), 6);
  const n = breakItDown(neg, 6);
  assert.ok(n.scene && n.words);
  const pos = first("aiint", (id) => { const s = stepScene(id); return !!s && tallyClicks(s.start, s.tiles).every((x) => x >= 0); });
  assert.deepEqual(breakItDown(pos, 6), { scene: null, words: true });
  // an unknown class keeps things as they were
  assert.deepEqual(breakItDown(a, null), { scene: null, words: true });
});

test("step-scene@1: the picture's layout: labels never reach the counter, floors are not crowded, money reads in rupees", () => {
  type T = Extract<Shape, { t: "text" }>;
  let n = 0;
  for (const fam of Object.keys(STEP_SCENE_FAMILIES)) for (const pr of pool(fam).items) {
    const s = stepScene(pr.id);
    if (!s) continue;
    n++;
    for (const dropped of [0, s.tiles.length]) {
      const shapes = draw(s, set(s, initial(s), "dropped", dropped));
      const texts = shapes.filter((x): x is T => x.t === "text");
      const counter = shapes.find((x) => x.role === "tally-counter") as Extract<Shape, { t: "rect" }>;
      // a step label ("+2", "−₹48") is centred in its own column and ends before the counter's column starts
      for (const t of texts.filter((x) => /^tally-step-(up|down)-text$/.test(x.role))) assert.ok(t.x + (t.s.length * 9) / 2 < counter.x, `${pr.id}: ${t.s} reaches the counter`);
      // the rolling digit is clipped to the counter's window
      const roll = texts.find((x) => x.role.startsWith("tally-roll"))!;
      assert.ok(roll.clip && roll.clip.x >= counter.x && roll.clip.x + roll.clip.w <= counter.x + counter.w, pr.id);
      // floor numbers: at most 16, never two on top of each other, the start and the end always among them
      const fl = texts.filter((x) => x.role === "tally-flabel");
      assert.ok(fl.length <= 16, `${pr.id}: ${fl.length} floor labels`);
      const ys = fl.map((x) => x.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 13, `${pr.id}: floor labels too close`);
      const end = tallyAt(s.start, s.tiles, s.tiles.length), say = (v: number) => (v < 0 ? `−${-v}` : String(v));
      // (the start gives way to the end when the two are too close to write both)
      const fh = 382 / (s.floors[1] - s.floors[0] + 1);
      for (const v of [s.start, end]) if (v !== 0 && (v === end || Math.abs(v - end) * fh >= 15)) assert.ok(fl.some((x) => x.s === say(v)), `${pr.id}: floor ${v} is labelled`);
      // clear of the round 0 marker
      const zero = shapes.find((x) => x.role === "tally-zero" || x.role === "tally-zero-on") as Extract<Shape, { t: "circle" }> | undefined;
      if (zero) for (const t of fl) assert.ok(Math.abs(t.y - 5 - zero.cy) >= zero.r + 5, `${pr.id}: label ${t.s} on the 0 marker`);
      if (s.unit === "₹") {
        assert.ok(texts.filter((x) => x.role.startsWith("tally-tiletext") || x.role.startsWith("tally-cartext")).every((x) => x.s.includes("₹")), `${pr.id}: tiles and car in rupees`);
        assert.ok(roll.s.includes("₹") && readout(s, set(s, initial(s), "dropped", dropped)).includes("₹"), pr.id);
      }
    }
  }
  assert.ok(n > 300, String(n));
});
