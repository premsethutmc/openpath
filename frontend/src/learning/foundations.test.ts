/** foundations@1: every start-here entry belongs to a real skill and is complete enough to teach from. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { check as checkScene, initial, met, pointer, readout, set as setScene, states, type Scene } from "../../../packages/learning/src/scene";
import { tangentOf } from "../../../packages/learning/src/scene-figures";
import { readFileSync } from "node:fs";
import { describe as describeFigure, diagramProblems, figureDraw } from "../../../packages/learning/src/figure-marks";
import { moduleFor } from "../../../packages/learning/src/content";
import { foundations as written, filledScreen, foundationsOf, PICTURES } from "../../../packages/learning/src/foundations";
// own-numbers@1: a screen with changeable numbers is read here as the learner first sees it (the example's own numbers);
// every other choice of numbers is checked in vary.test.ts
const foundations = written.map((f) => ({ ...f, screens: f.screens.map((s) => filledScreen(s)) }));

test("start-here teaching is attached to real skills and is well formed", () => {
  const seen = new Set<string>();
  for (const f of foundations) {
    assert.ok(moduleFor(f.competency), `${f.competency} is not a skill with a lesson`);
    assert.ok(!seen.has(`${f.competency}|${f.concept}`), `${f.competency}: ${f.concept} twice`);
    seen.add(`${f.competency}|${f.concept}`);
    assert.ok(f.concept.trim() && f.screens.length >= 1 && f.screens.length <= (f.lesson ? 6 : 3), `${f.competency}: ${f.concept}`);
    for (const s of f.screens) {
      assert.ok(s.title.trim() && s.text.length >= 1 && s.text.every((t) => t.trim().length > 0), `${f.competency}: ${s.title}`);
      assert.ok(!s.picture || (PICTURES as readonly string[]).includes(s.picture), `${f.competency}: picture ${s.picture}`);
      assert.ok(!s.check || (s.check.question.trim() && s.check.answer.trim()), `${f.competency}: check`);
      assert.ok(![s.title, ...s.text, ...(s.example ?? [])].some((t) => /\\\(|\$\$|\*\*|undefined|NaN/.test(t)), `${f.competency}: markup in ${s.title}`);
    }
  }
});

test("trigonometry starts with what sin, cos and tan are", () => {
  const f = foundationsOf("MATH.trigonometry.ratios");
  const all = JSON.stringify(f).toLowerCase();
  assert.ok(f.length > 0 && all.includes("opposite") && all.includes("hypotenuse") && all.includes("adjacent"));
  assert.ok(f.some((x) => x.screens.some((s) => s.picture === "right-triangle")));
});

test("every start-here idea has practice a child can check: four choices, one right, feedback on each wrong one", async () => {
  const { shownOrder } = await import("../../../packages/learning/src/foundations");
  let n = 0;
  for (const f of foundations) {
    assert.ok(f.practice && f.practice.length >= 3, `${f.competency}: ${f.concept} has no practice`);
    assert.ok((f.rounds ?? []).length >= 2 && f.rounds!.every((r) => r.length >= 3), `${f.competency}: ${f.concept} has no further rounds`);
    const asked = [f.practice!, ...f.rounds!].flat().map((q) => q.question);
    assert.equal(new Set(asked).size, asked.length, `${f.competency}: a question is repeated between rounds`);
    for (const q of [f.practice!, ...f.rounds!].flat()) {
      n++;
      const at = `${f.competency}: ${q.question}`;
      assert.equal(q.options.length, 4, at);
      assert.equal(new Set(q.options.map((o) => o.trim().toLowerCase())).size, 4, at);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.why.trim().length > 5, at);
      assert.ok(q.wrong.length === 4 && q.wrong.every((w, i) => (i === q.answer ? true : w.trim().length > 5)), at);
      assert.ok(!q.options.some((x) => /all of the above|none of the(se| above)/i.test(x)) && !/undefined|NaN|\\\(|\*\*/.test([q.question, ...q.options, q.why, ...q.wrong].join(" ")), at);
      assert.deepEqual([...shownOrder(q)].sort(), [0, 1, 2, 3], at);
    }
  }
  assert.ok(n >= 1700);
});

test("picture tasks are scenes of the engine: every one passes its check, can be reached, and a new visit gets new ones", async () => {
  const { exploreScene, pictureScene, pictureTasks } = await import("../../../packages/learning/src/foundation-pictures");
  const E = await import("../../../packages/learning/src/scene");
  for (const kind of PICTURES) {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const tasks = pictureTasks(kind, seed);
      assert.ok(tasks.length >= 2, kind);
      assert.deepEqual(pictureTasks(kind, seed), tasks, `${kind}: same seed, same tasks`);
      for (const t of tasks) {
        assert.deepEqual(E.check(t), [], `${kind}: ${t.prompt}`);
        assert.ok(E.draw(t, E.initial(t)).length > 0 && !/undefined|NaN/.test(t.prompt + t.success + E.describe(t)), kind);
        if (t.kind === "pick") {
          // a wrong tap is named back, never the answer; the right tap reaches the goal
          const parts = (await import("../../../packages/learning/src/scene-figures")).pickParts(t.figure);
          const wrong = parts.findIndex((p) => !t.ask.includes(p)) + 1, right = parts.indexOf(t.ask[0]) + 1;
          assert.ok(wrong > 0 && E.nudge(t, { part: wrong })?.startsWith("That is ") && !E.met(t, { part: wrong }) && E.met(t, { part: right }), `${kind}: ${t.prompt}`);
        }
      }
      seen.add(JSON.stringify(tasks));
    }
    assert.ok(seen.size >= 2, `${kind} never changes`);
    const { scene, state } = pictureScene(kind);
    assert.ok(E.draw(scene, { ...E.initial(scene), ...state }).length > 3, `${kind}: lesson picture`);
  }
  const explore = exploreScene("right-triangle", 3)!;
  assert.deepEqual(E.check(explore), []);
  assert.equal(exploreScene("venn", 3), null);
});

test("a touch on a figure lands on the part under it (the side, the point, the entry), and on nothing when far away", async () => {
  const { pickAt, pickParts } = await import("../../../packages/learning/src/scene-figures");
  const at = (f: Parameters<typeof pickAt>[0], x: number, y: number) => pickParts(f)[pickAt(f, x, y) - 1] ?? null;
  const tri = { of: "right-triangle", thetaAt: "left" } as const;
  assert.equal(at(tri, 170, 182), "bottom"); assert.equal(at(tri, 282, 110), "right"); assert.equal(at(tri, 170, 113), "slant"); assert.equal(at(tri, 120, 60), null);
  assert.equal(at({ of: "circle" }, 170, 110), "centre"); assert.equal(at({ of: "circle" }, 120, 112), "diameter"); assert.equal(at({ of: "circle" }, 128, 186), "arc");
  assert.equal(at({ of: "venn" }, 100, 110), "A"); assert.equal(at({ of: "venn" }, 170, 110), "AB"); assert.equal(at({ of: "venn" }, 40, 190), "out");
  assert.equal(at({ of: "plane" }, 170 - 3 * 22, 110 - 22), "p:-3,1"); assert.equal(at({ of: "matrix", values: [[1, 2, 3], [4, 5, 6]] }, 170 - 56, 110 + 23), "e:2,1");
});

test("one picture system: pictures are drawn by the scene engine, not by new components", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const root = new URL("../", import.meta.url).pathname;
  // the files that draw today: the engine's player, and the older question-figure and app-chrome drawings. A new picture
  // or interaction is a scene description (packages/learning/src/scene.ts), not a new file here: do not add to this list.
  const lists = JSON.parse(readFileSync(new URL("./svg-allowed.json", import.meta.url), "utf8")) as { engine: string[]; notTeaching: string[]; toMove: string[] };
  const allowed = new Set([...lists.engine, ...lists.notTeaching, ...lists.toMove]);
  const found: string[] = [];
  const walk = (dir: string) => { for (const n of readdirSync(dir)) { const p = `${dir}/${n}`; if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) && /<svg[\s>]/.test(readFileSync(p, "utf8"))) found.push(p.slice(root.length)); } };
  walk(root.replace(/\/$/, ""));
  assert.deepEqual(found.filter((f) => !allowed.has(f)), [], "these files draw their own pictures: describe the picture as a scene for the scene engine instead (see CLAUDE.md)");
  assert.ok(!found.includes("year/StartHere.tsx") && !found.includes("year/PictureTasks.tsx"));
  assert.deepEqual(lists.toMove, [], "no maths teaching picture is drawn outside the engine");
  // the lists only shrink: a file that no longer draws must leave its list
  assert.deepEqual([...allowed].filter((f) => !found.includes(f)), [], "these files no longer draw: remove them from svg-allowed.json");
});

test("a repeat visit gets the next round of questions, round and round", async () => {
  const { roundFor } = await import("../../../packages/learning/src/foundations");
  const f = foundationsOf("MATH.trigonometry.ratios")[0];
  assert.deepEqual(roundFor(f, 0), f.practice);
  assert.deepEqual(roundFor(f, 1), f.rounds![0]);
  assert.deepEqual(roundFor(f, 2), f.rounds![1]);
  assert.deepEqual(roundFor(f, 3), f.practice);
});

test("understanding@1: a finished round is kept as what was done, moves the next visit on, and is never an attempt", async () => {
  const { readRecords } = await import("../../../packages/learning/src/records");
  const { make } = await import("../../../packages/learning/src/session");
  const { understandingOf } = await import("../../../packages/learning/src/foundations");
  const skill = "MATH.trigonometry.ratios", ideas = foundationsOf(skill);
  let n = 0;
  const c = () => ({ learnerId: "L", sessionId: "learn:L:1", at: new Date(Date.UTC(2026, 10, 24, 0, 0, n++)).toISOString() }) as never;
  const one = (firstTry: number, k = 0) => make.understand(c(), skill, ideas[k].concept, 0, 4, firstTry);
  assert.equal(understandingOf(skill, []).state, "new");
  assert.equal(understandingOf("MATH.number.no-such-skill", []).state, "none");
  const shaky = readRecords("L", [one(1)], [], []);
  assert.equal(shaky.attempts.length, 0);
  assert.deepEqual(shaky.understanding.map((u) => [u.concept, u.asked, u.firstTry]), [[ideas[0].concept, 4, 1]]);
  assert.equal(understandingOf(skill, shaky.understanding).state, "shaky");
  // the latest round of each idea is the one that counts
  const all = readRecords("L", [one(1), ...ideas.map((_, k) => one(4, k))], [], []);
  assert.equal(understandingOf(skill, all.understanding).state, "met");
  assert.equal(understandingOf(skill, all.understanding).ideas[0].rounds, 2);
  // a record that overstates itself is not read
  assert.equal(readRecords("L", [{ ...one(4), firstTry: 9 } as never], [], []).understanding.length, 0);
});

test("picture-decision@1: every idea either has a picture or says why it has none", () => {
  for (const f of foundations) {
    const pictured = f.screens.some((s) => s.picture || s.figures?.length || s.scene);
    assert.ok(pictured ? !f.show : f.show && (f.show.decision === "none" ? ["word", "symbol", "rule", "procedure"].includes(f.show.why) : f.show.figure.trim().length > 5), `${f.competency}: ${f.concept}`);
  }
});

test("figure-marks@1: a question's picture is worked out in the engine and drawn by its one player", () => {
  const fig = readFileSync(new URL("../year/Figure.tsx", import.meta.url), "utf8");
  assert.ok(!fig.includes("<svg") && fig.includes("figureDraw(v)"));
  const d = figureDraw({ type: "clock", h: 3, m: 30 });
  assert.ok(d && d.as === "marks" && d.marks.some((k) => k.tag === "line"));
  assert.equal(figureDraw({ type: "table", head: [], rows: [] }), null);
});

test("idea-figures@1: every still picture of an idea is drawn by the engine, passes its checks and says what to see", () => {
  let n = 0;
  for (const f of foundations) for (const s of f.screens) for (const g of s.figures ?? []) {
    n++;
    const d = figureDraw(g.v);
    assert.ok(d && d.as === "marks" && d.marks.length > 0, `${f.concept}: ${g.v.type} is not drawn`);
    if (g.v.type === "diagram") assert.deepEqual(diagramProblems(g.v), [], f.concept);
    assert.ok(g.caption.trim().length > 3 && !/not available/i.test(describeFigure(g.v)), f.concept);
  }
  assert.ok(n >= 40);
  // a diagram cannot show what is not true
  const base = { type: "diagram", says: "A corner with a square mark." };
  assert.match(diagramProblems({ ...base, parts: [{ p: "right", at: [50, 50], a: [100, 50], b: [90, 100] }] }).join(), /not 90°/);
  assert.match(diagramProblems({ ...base, parts: [{ p: "segment", from: [10, 10], to: [110, 10], ticks: 1 }, { p: "segment", from: [10, 30], to: [150, 30], ticks: 1 }] }).join(), /not equal in length/);
  assert.match(diagramProblems({ ...base, parts: [{ p: "point", at: [500, 10] }] }).join(), /outside the box/);
  assert.equal(figureDraw({ ...base, parts: [{ p: "right", at: [50, 50], a: [100, 50], b: [90, 100] }] })?.as, "na");
});

test("taught-lesson@1 and conic-tangent@1: a taught lesson moves a real ellipse, and every scene on a screen can reach its goal", () => {
  const taught = foundations.filter((f) => f.lesson);
  assert.ok(taught.some((f) => f.competency === "MATH.coordinate.conic-tangents-normals"));
  for (const f of taught) assert.ok(f.screens.length >= 4 && f.screens.some((s) => s.scene) && f.screens.some((s) => (s.steps ?? []).length >= 4) && f.practice?.length, `${f.concept}: a taught lesson shows, explains, works every step and asks`);
  for (const f of foundations) for (const s of f.screens) if (s.scene) {
    assert.deepEqual(checkScene(s.scene), [], f.concept);
    const start = initial(s.scene); assert.ok(!met(s.scene, start), "the goal is not met before the learner moves anything");
    let reached = false; for (const st of states(s.scene)) if (met(s.scene, st)) { reached = true; break; }
    assert.ok(reached, `${f.concept}: the goal of "${s.title}" cannot be reached`);
  }
  // the slope is the exact slope of the tangent: −b²x/(a²y); flat at the top, no slope at the ends
  const p = tangentOf(4, 3, 45); assert.ok(Math.abs(p.slope - -0.75) < 1e-9 && Math.abs((p.x * p.x) / 16 + (p.y * p.y) / 9 - 1) < 1e-9);
  assert.ok(tangentOf(4, 3, 90).flat && tangentOf(4, 3, 90).slope === 0 && tangentOf(4, 3, 0).upright && Number.isNaN(tangentOf(4, 3, 180).slope));
  const sc: Scene = { type: "scene", kind: "tangent", a: 4, b: 3, prompt: "p", success: "s", goal: { measure: "flat", equals: 1 } };
  assert.match(readout(sc, setScene(sc, initial(sc), "turn", 0)), /no slope/);
  assert.equal(pointer(sc, initial(sc), 170, 20).turn, 90); // a finger above the centre puts the point at the top
  assert.match(checkScene({ ...sc, a: 9 }).join(), /2 to 6/);
});

test("break-it-down@1: a worked problem is separate steps, and every step can say why in plain words", () => {
  let n = 0;
  for (const f of foundations) for (const s of f.screens) if (s.steps) {
    assert.ok(s.ask?.trim() && s.steps.length >= 3 && s.steps.length <= 7, `${f.concept}: ${s.title}`);
    for (const st of s.steps) { n++; assert.ok(st.do.trim() && st.do.length <= 70 && st.lines.length >= 1 && st.lines.length <= 4 && st.lines.every((l) => l.trim() && l.length <= 40) && st.why.length >= 1 && st.why.every((w) => w.trim().length > 20), `${s.title}: ${st.do}`); }
  }
  assert.ok(n >= 15);
});

test("step-why@1: a family's step reasons are plain sentences for every step it makes, and the lesson lines them up", async () => {
  const { FAMILIES, pool, stepWhys } = await import("../../../packages/learning/src/families");
  let fams = 0, steps = 0, covered = 0;
  for (const [id, f] of FAMILIES) {
    if (!f.stepWhy) continue;
    fams++;
    for (const pr of pool(id).items.slice(0, 6)) for (const st of pr.steps) {
      steps++;
      const w = f.stepWhy(st);
      if (!w) continue;
      covered++;
      assert.ok(Array.isArray(w) && w.length >= 1 && w.length <= 4 && w.every((x) => typeof x === "string" && x.trim().length > 20 && x.length <= 400 && !/undefined|NaN|\[object/.test(x)), `${id} ${st.id}: ${JSON.stringify(w)}`);
    }
  }
  assert.ok(fams >= 1 && covered >= 1);
  const ex = pool("asline").items[0];
  if (ex) assert.equal(stepWhys(ex.id)?.length, ex.steps.length);
  console.log(`step-why@1: ${fams} families, ${covered} of ${steps} sampled steps have a reason`);
});
