/** step-scene@1: the counter and the lift for worked add / take-away questions, and who gets it instead of words. */
import assert from "node:assert/strict";
import test from "node:test";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { STEP_SCENE_FAMILIES, breakItDown, chainOf, stepScene } from "../../../packages/learning/src/step-scenes";
import { check, draw, initial, isLift, met, readout, sceneBox, set, type Shape } from "../../../packages/learning/src/scene";
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
      // change-up@1: change counted up from the price ends on the money given; how far it went is the answer
      assert.equal(String(s.goTo ? s.tiles[0] : end), String(p.answer), id);
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
    if (!s || isLift(s)) continue;
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
      for (const v of [s.start, end]) if (v !== 0 && (v === end || Math.abs(v - end) * fh >= 20) && (v !== end || dropped === s.tiles.length)) assert.ok(fl.some((x) => x.s === say(v)), `${pr.id}: floor ${v} is labelled`);
      // even-floors@1: before the lift gets there the end has no number of its own, and the numbers go up in one fixed
      // step (only the start, and later the end, may sit off it)
      const nums = fl.map((x) => Number(x.s.replace("−", "-").replace("₹", "")));
      if (dropped === 0 && end !== s.start && nums.includes(end)) {
        const regular = nums.filter((v) => v !== s.start);
        const gaps = regular.slice(1).map((v, i) => v - regular[i]);
        assert.ok(regular.every((v) => (v - regular[0]) % (gaps.length ? Math.min(...gaps) : 1) === 0), `${pr.id}: the end floor ${end} is labelled on its own before the lift is there`);
      }
      const others = nums.filter((v) => v !== s.start && v !== end && v !== 0);
      const gs = others.slice(1).map((v, i) => v - others[i]);
      if (dropped === 0 && gs.length) { const step = Math.min(...gs); assert.ok(others.every((v) => (v - others[0]) % step === 0), `${pr.id}: floor numbers ${nums} are not evenly spaced`); }
      // clear of the round 0 marker
      const zero = shapes.find((x) => x.role === "tally-zero" || x.role === "tally-zero-on") as Extract<Shape, { t: "circle" }> | undefined;
      if (zero) for (const t of fl) assert.ok(Math.abs(t.y - 5 - zero.cy) >= zero.r + 9, `${pr.id}: label ${t.s} on the 0 marker`);
      if (s.unit === "₹") {
        assert.ok(texts.filter((x) => x.role.startsWith("tally-tiletext") || x.role.startsWith("tally-cartext")).every((x) => x.s.includes("₹")), `${pr.id}: tiles and car in rupees`);
        assert.ok(roll.s.includes("₹") && readout(s, set(s, initial(s), "dropped", dropped)).includes("₹"), pr.id);
      }
    }
  }
  assert.ok(n > 100, String(n));
});

test("lift@1: every lift ride of a worked question fits a phone: big buttons, floor numbers apart, the car on its floor", () => {
  type T = Extract<Shape, { t: "text" }>;
  let n = 0, tallest = 0;
  for (const fam of Object.keys(STEP_SCENE_FAMILIES)) for (const pr of pool(fam).items) for (const cls of [1, 4, 6]) {
    const s = stepScene(pr.id, cls);
    if (!s || !isLift(s)) continue;
    n++;
    const box = sceneBox(s);
    tallest = Math.max(tallest, box.h);
    assert.ok(box.w === 340 && box.h <= 470, `${pr.id}: box ${box.h}`);
    assert.ok(s.prompt.split(" ").length <= 6 && !/tile|drop/i.test(s.prompt), `${pr.id}: ${s.prompt}`);
    for (const dropped of [0, s.tiles.length]) {
      const shapes = draw(s, set(s, initial(s), "dropped", dropped));
      for (const sh of shapes) {
        if (sh.t === "rect") assert.ok(sh.x >= 0 && sh.x + sh.w <= 340 && sh.y >= 0 && sh.y + sh.h <= box.h, `${pr.id}: ${sh.role} outside the box`);
        if (sh.t === "circle" && sh.tap) assert.ok(sh.r >= 45, `${pr.id}: a button of radius ${sh.r}`);
      }
      const nums = shapes.filter((x): x is T => x.t === "text" && x.role.startsWith("lift-no")), ys = nums.map((x) => x.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 12, `${pr.id}: floor numbers too close`);
      const end = tallyAt(s.start, s.tiles, dropped), sign = (v: number) => (v < 0 ? `−${-v}` : String(v));
      assert.ok(nums.some((x) => x.role.startsWith("lift-no-here") && x.s === sign(end)), `${pr.id}: the floor the lift is on is numbered in gold`);
      assert.ok(shapes.some((x) => x.t === "text" && x.role === "lift-disp-text" && x.s === sign(end)), `${pr.id}: the display`);
      assert.equal(shapes.filter((x) => x.t === "circle" && x.tap).length, 2, `${pr.id}: up and down`);
      if (dropped === s.tiles.length) assert.ok(shapes.some((x) => x.t === "rect" && x.tap?.label === "Again"), `${pr.id}: Again`);
    }
  }
  assert.ok(n > 300, String(n));
  console.log(`lift@1: ${n} lift rides; the tallest picture is ${tallest} high`);
});

test("young-lift@1 and change-up@1: change is counted up when that is shorter, and a Class 1–2 lift stays small", () => {
  // ₹50 − ₹48: up from ₹48 to ₹50, a tile that says where it goes, not how far
  const c = pool("abchange").items.find((pr) => { const p = problemOf(pr.id)!; const [x, y] = p.steps[0].inputs as number[]; return x - y < y && x - y <= 5; })!;
  const s = stepScene(c.id, 1)!;
  assert.ok(s && s.goTo && s.tiles.length === 1 && s.tiles[0] > 0, c.id);
  assert.equal(String(s.tiles[0]), String(problemOf(c.id)!.answer));
  assert.match(s.prompt, /^Count up from ₹\d+ to ₹\d+\.$/);
  assert.ok(s.floors[1] - s.floors[0] <= 30, String(s.floors));
  assert.ok(draw(s, initial(s)).filter((x) => x.t === "text").every((x) => !(x as { s: string }).s.includes(`+₹${s.tiles[0]}`)), "the change is not on the tile");
  assert.match(readout(s, initial(s)), /^Start at/);
  assert.match(readout(s, set(s, initial(s), "dropped", 1)), new RegExp(`\\+ ₹${s.tiles[0]} =`));
  // a small price is still taken away (₹10 − ₹1)
  const t = stepScene("gen:abchange:1,0", 1)!;
  assert.ok(t && !t.goTo && t.tiles[0] === -1);
  // Class 1–5: no tile of more than 20 clicks; Class 1–2: no shaft of more than 30 floors
  for (const fam of Object.keys(STEP_SCENE_FAMILIES)) for (const pr of pool(fam).items.slice(0, 300)) for (const cls of [1, 2, 4]) {
    const x = stepScene(pr.id, cls);
    if (!x) continue;
    assert.ok(x.tiles.every((n) => Math.abs(n) <= 20), `${pr.id}: ${x.tiles}`);
    if (cls <= 2) assert.ok(x.floors[1] - x.floors[0] <= 30, `${pr.id}: floors ${x.floors}`);
  }
});

test("sort-step@1: every absort question gets the button sort with its own buttons, ending on its answer, and no words for Class 1", async () => {
  const { sortScene, liftFor } = await import("../../../packages/learning/src/step-scenes");
  const { sortNow, sortAt, sortMoves } = await import("../../../packages/learning/src/sort");
  const items = pool("absort").items;
  assert.ok(items.length > 20);
  for (const pr of items) {
    const s = sortScene(pr.id);
    assert.ok(s, `${pr.id}: a sort`);
    assert.deepEqual(check(s!), [], pr.id);
    assert.deepEqual(s!.counts, pr.params.slice(0, 4), pr.id);
    const end = sortAt(s!, sortMoves(s!)), n = sortNow(s!, end);
    assert.ok(n.finished && met(s!, end), pr.id);
    // the buttons that end in the last jar are the question's answer
    assert.equal(String(n.jar[s!.ask.colour && s!.ask.size ? 1 : 0]), String(pr.answer), pr.id);
    assert.equal(breakItDown(pr.id, classOfQuestion(pr.id)).words, false, pr.id);
    assert.equal(breakItDown(pr.id, classOfQuestion(pr.id)).scene?.kind, "sort", pr.id);
    assert.equal(liftFor(pr.id, classOfQuestion(pr.id))?.kind, "sort", pr.id);
  }
  assert.equal(sortScene(pool("aaadd").items[0].id), null);
  assert.equal(sortScene("nonsense"), null);
  // the wording slip: one is "there is 1", never "there are 1"
  const one = items.find((p) => p.steps.some((st) => st.value === 1));
  const { FAMILIES: F } = await import("../../../packages/learning/src/families");
  for (const pr of items) for (const st of pr.steps) assert.doesNotMatch(F.get("absort")!.explain!(st) as string, /there are 1\b/, pr.id);
  if (one) assert.ok(one.steps.some((st) => /there is 1\b|are: 1/.test(F.get("absort")!.explain!(st) as string)));
});
