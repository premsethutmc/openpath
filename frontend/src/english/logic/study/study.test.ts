/**
 * Notes, charts and maps: sound content; charts and maps generated without end, every one sound; questions worked
 * out from the data; the learner's own summary, paragraph and directions marked by rule (directions followed on the
 * map); sittings that score and record; nothing on the engine.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STUDY, STUDY_TASKS, StudySitting, chartSteps, directions, generateChart, generateMap, longestCopy, mapSteps, markDirections, markParagraph, markSummary, nextStudy,
  ownTrip, placeAt, readDirections, stepsFor, studyProblems, studySummary, taskFor, walk, wrongMoves, words, type MapTask, type StudyRecord,
} from "./study.ts";
import { Learner } from "../learner.ts";
import { loadContent } from "../content.ts";
import { MemoryRepo } from "../store.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";

const back = (m: MapTask) => m.routes[0].moves.slice().reverse().map((x) => ({ dir: ({ N: "S", S: "N", E: "W", W: "E" } as const)[x.dir], blocks: x.blocks }));

test("ST-1 content is sound: 32 notes passages (18 from the app's own reading texts), 4 charts, 3 maps", () => {
  assert.deepEqual(studyProblems(STUDY), []);
  assert.deepEqual([STUDY.notes.length, STUDY.notes.filter((n) => n.source).length, STUDY.charts.length, STUDY.maps.length], [32, 18, 4, 3]);
  for (const n of STUDY.notes) assert.ok(n.text.length > 200 && words(n.summaries.right) <= 50, n.id);
  const bad = { ...STUDY, charts: [{ ...STUDY.charts[0], values: [1, 1, 2, 3] }], maps: [{ ...STUDY.maps[0], routes: [{ ...STUDY.maps[0].routes[0], to: "park" }] }] };
  assert.match(studyProblems(bad).join("\n"), /same height[\s\S]*does not reach/);
});

test("ST-2 charts and maps never run out: 500 of each generated, every one sound, the same seed always the same", () => {
  const types = new Set<string>();
  for (let i = 1; i <= 500; i++) {
    const c = generateChart(`chart.g${i}`);
    const m = generateMap(`map.g${i}`);
    types.add(c.type ?? "bar");
    assert.deepEqual(studyProblems({ id: "g", version: 1, notes: [], charts: [c], maps: [m] }), [], `${c.id} ${m.id}`);
    for (const s of [...chartSteps(c), ...mapSteps(m)]) if (s.kind === "choose") assert.equal(new Set(s.options).size, 3, `${c.id}: ${s.prompt}`);
    // the paragraph the app writes passes the app's own marker; so do the directions it writes
    const para = markParagraph(c, c.paragraph.join(" "));
    assert.equal(para.passed, para.checks.length, `${c.id}: ${para.checks.filter((x) => !x.ok).map((x) => x.note)}`);
    const trip = ownTrip(m);
    assert.equal(markDirections(m, trip, directions(m, trip.from, back(m))).endsAt, trip.to, m.id);
  }
  assert.deepEqual([...types].sort(), ["bar", "line"]);
  assert.deepEqual(generateChart("chart.g9"), generateChart("chart.g9"));
  assert.deepEqual(generateMap("map.g9"), generateMap("map.g9"));
  assert.notDeepEqual(generateMap("map.g9"), generateMap("map.g10"));
});

test("ST-3 chart questions come from the data: the highest, the lowest, the difference, a true comparison, a paragraph in order", () => {
  for (const c of [...STUDY.charts, generateChart("chart.g4"), generateChart("chart.g5")]) {
    const [top, bottom, diff, truth, para] = chartSteps(c);
    const max = c.labels[c.values.indexOf(Math.max(...c.values))];
    const min = c.labels[c.values.indexOf(Math.min(...c.values))];
    assert.ok(top.kind === "choose" && top.options[top.answer] === max, c.id);
    assert.ok(bottom.kind === "choose" && bottom.options[bottom.answer] === min, c.id);
    assert.ok(diff.kind === "choose" && Number(diff.options[diff.answer]) === Math.max(...c.values) - Math.min(...c.values), c.id);
    assert.ok(truth.kind === "choose" && truth.options[truth.answer].startsWith(`The figure for ${max} `), c.id);
    assert.ok(para.kind === "order" && para.answer.map((i) => para.parts[i]).join() === c.paragraph.join(), c.id);
  }
});

test("ST-4 map directions are worked out from the moves: the right ones reach the place, the wrong ones do not", () => {
  const town = STUDY.maps[0];
  assert.equal(directions(town, "bus stand", town.routes[0].moves), "Start at the bus stand and walk north along Gandhi Road for two blocks. Turn right into School Street and walk two blocks.");
  assert.equal(placeAt(town, walk(town, "bus stand", town.routes[0].moves)), "school");
  assert.equal(walk(town, "bus stand", [{ dir: "S", blocks: 1 }]), null, "off the map");
  for (const m of STUDY.maps) for (const r of m.routes) for (const w of wrongMoves(m, r)) assert.notEqual(placeAt(m, walk(m, r.from, w)), r.to);
});

test("ST-5 typed directions are read as moves, street names and all, and followed on the map", () => {
  assert.deepEqual(readDirections("Walk south for three blocks. Turn right and go 1 block.").moves, [{ dir: "S", blocks: 3 }, { dir: "W", blocks: 1 }]);
  assert.deepEqual(readDirections("Go north along North Street for two blocks, then turn left into West Lane and walk one block.", ["North Street", "West Lane"]).moves, [{ dir: "N", blocks: 2 }, { dir: "W", blocks: 1 }]);
  assert.deepEqual(readDirections("Head east. Take the second left.").moves, [{ dir: "E", blocks: 2 }]);
  assert.match(readDirections("Turn left and walk two blocks.").problems.join(), /Start with a direction/);
  assert.match(readDirections("Walk north for some blocks.").problems.join(), /how many blocks/);

  const town = STUDY.maps[0];
  const trip = ownTrip(town);
  assert.deepEqual(trip, { from: "school", to: "bus stand" });
  const good = markDirections(town, trip, "From the school, walk west along School Street for two blocks. Then turn left into Gandhi Road and walk two blocks.");
  assert.equal(good.endsAt, "bus stand");
  assert.equal(good.passed, good.checks.length);
  const wrongTurn = markDirections(town, trip, "Walk west along School Street for two blocks. Turn right into Gandhi Road and walk two blocks.");
  assert.equal(wrongTurn.offMap, true);
  assert.match(wrongTurn.checks[0].note, /off the edge of the map, not at the bus stand/);
  const short = markDirections(town, trip, "Walk west along School Street for one block, then turn left and walk two blocks.");
  assert.match(short.checks[0].note, /end at the corner of Market Road and Station Street/);
});

test("ST-6 the learner's own summary: length, every main point, own words", () => {
  const n = STUDY.notes[0];
  const good = markSummary(n, "The neem tree survives drought with deep roots. People clean their teeth with its twigs, keep insects off grain with its leaves and protect crops with a spray made from its seeds.");
  assert.equal(good.passed, good.checks.length, JSON.stringify(good.checks));
  const thin = markSummary(n, "The neem tree has deep roots and people clean their teeth with its twigs.");
  assert.match(thin.checks.find((c) => c.id === "points")!.note, /leaves out: dried leaves keep insects from grain and clothes; seed spray protects crops/);
  const copy = markSummary(n, `${n.text.split(". ").slice(1, 3).join(". ")}.`);
  assert.equal(copy.checks.find((c) => c.id === "own_words")!.ok, false);
  assert.ok(longestCopy(n.text, "its roots go deep to find water") >= 7);
  assert.match(markSummary(n, "roots teeth insects crops ".repeat(14)).checks[0].note, /fifty or fewer/);
});

test("ST-7 the learner's own analytical paragraph is checked against the chart's data", () => {
  const c = STUDY.charts[0]; // trees: Class 6 45, Class 7 30, Class 8 60, Class 9 25
  const good = markParagraph(c, "The bar chart shows how many trees four classes planted. Class 8 planted the most, 60 trees, and Class 9 planted the fewest, only 25. Class 6 came second with 45, fifteen more than Class 7. Overall, the four classes planted 160 trees between them, so the green week was a real success for the school.");
  assert.equal(good.passed, good.checks.length, JSON.stringify(good.checks.filter((x) => !x.ok)));
  const wrongFigure = markParagraph(c, "The chart shows trees planted by four classes. Class 8 planted the most, 70 trees, and Class 9 the fewest, 25. Class 6 planted more than Class 7. Overall, every class planted some trees, which is a good start for the school.");
  assert.match(wrongFigure.checks.find((x) => x.id === "figures")!.note, /Check 70/);
  const thin = markParagraph(c, "Class 8 is big. Class 7 is small.");
  assert.deepEqual(thin.checks.filter((x) => !x.ok).map((x) => x.id), ["opening", "lowest", "figures", "compare", "conclusion", "length"]);
});

test("ST-8 a sitting scores every step, then marks the learner's own piece, and records once", () => {
  const notes = new StudySitting(STUDY_TASKS.find((t) => t.kind === "notes")!);
  notes.read();
  const [t, p, s] = notes.steps;
  if (t.kind === "choose") notes.choose(t.answer);
  notes.next();
  if (p.kind === "pick") notes.pick([...p.answer, [...p.options.keys()].find((i) => !p.answer.includes(i))!]);
  assert.equal(notes.snapshot().answered?.correct, false, "a detail picked as well is not right");
  notes.next();
  if (s.kind === "choose") notes.choose(s.answer);
  notes.next();
  assert.equal(notes.snapshot().phase, "own");
  assert.equal(notes.writeOwn("   "), null);
  assert.ok(notes.writeOwn("The neem tree has deep roots; its twigs clean teeth, its leaves keep insects away and its seeds protect crops."));
  notes.finish();
  const [rec] = notes.take();
  assert.deepEqual(rec.answers.map((a) => a.correct), [true, false, true]);
  assert.deepEqual(rec.own, { words: 20, passed: 4, of: 4 });
  assert.equal(notes.take().length, 0);

  const chart = new StudySitting(taskFor("chart.g3"));
  chart.read();
  for (const st of chart.steps) {
    if (st.kind === "choose") chart.choose(st.answer);
    if (st.kind === "order") chart.order([...st.answer].reverse());
    chart.next();
  }
  assert.equal(chart.snapshot().phase, "own");
  assert.match(chart.ownTask(), /analytical paragraph/);
  chart.finish();
  const [c] = chart.take();
  assert.deepEqual([c.task, c.answers.map((a) => a.correct), c.own], ["chart.g3", [true, true, true, true, false], undefined]);
  assert.match(new StudySitting(taskFor("map.g2")).ownTask(), /^Write directions from the .+ to the .+\. Start with a compass direction/);
});

test("ST-9 the next task rotates the kinds; after the written charts and maps come generated ones; records stay off the engine", async () => {
  assert.equal(nextStudy([])?.level, 5);
  const all: StudyRecord[] = STUDY_TASKS.map((t) => ({ type: "study", task: t.id, kind: t.kind, answers: [] }));
  assert.equal(nextStudy(all, "chart")?.id, "chart.g1");
  assert.equal(nextStudy([...all, { type: "study", task: "chart.g1", kind: "chart", answers: [] }], "chart")?.id, "chart.g2");
  assert.equal(nextStudy(all, "notes"), null, "notes passages are written, so they can be finished");
  assert.ok(["chart", "map"].includes(nextStudy(all)!.kind));
  for (const t of STUDY_TASKS) assert.ok(stepsFor(t.id).length >= 3, t.id);
  assert.throws(() => taskFor("chart.x"), /no study task/);

  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Study", "guardian", clock, "p-study");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const done: StudyRecord[] = [{ type: "study", task: "map.g4", kind: "map", answers: [{ skill: "map_corner", correct: true }], own: { words: 25, passed: 3, of: 3 } }];
  await l.recordStudy(done);
  for (const e of await repo.load("p-study")) assert.equal(eventProblem(e), null);
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-study", clock);
  assert.deepEqual(studySummary(again.studyRecords()), { tasks: 1, right: 1, asked: 1, strong: [], weak: [], own: { pieces: 1, passed: 3, of: 3 } });
});

test("ST-10 the kind going worst comes next; strengths and weaknesses are named for the parent", () => {
  const rec = (task: string, kind: "notes" | "chart" | "map", right: boolean[], own?: { words: number; passed: number; of: number }): StudyRecord => ({ type: "study", task, kind, answers: right.map((correct) => ({ skill: kind === "notes" ? "main_points" : kind === "chart" ? "chart_read" : "map_follow", correct })), ...(own ? { own } : {}) });
  const records = [rec("notes.neem", "notes", [true, true, true], { words: 30, passed: 4, of: 4 }), rec("chart.trees", "chart", [true, true, true, true]), rec("map.town", "map", [false, false, true])];
  assert.equal(nextStudy(records)?.kind, "map", "maps are going worst");
  assert.equal(nextStudy([records[1], rec("map.village", "map", [true, true, true])])?.kind, "notes", "a kind not yet tried comes before kinds going well");
  const s = studySummary(records);
  assert.deepEqual([s.strong.sort(), s.weak], [["chart_read", "main_points"], ["map_follow"]]);
  assert.deepEqual(s.own, { pieces: 1, passed: 4, of: 4 });
});
