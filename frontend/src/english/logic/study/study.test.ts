/**
 * Notes, charts and maps: sound content, questions worked out from the data that are right by construction, map
 * directions that reach the place they name (and wrong ones that do not), a rule-based summary check, sittings that
 * score and record, and nothing on the engine.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { STUDY, STUDY_TASKS, StudySitting, chartSteps, checkSummary, directions, mapSteps, nextStudy, notesSteps, placeAt, stepsFor, studyProblems, studySummary, walk, wrongMoves, words, type StudyRecord } from "./study.ts";
import { Learner } from "../learner.ts";
import { loadContent } from "../content.ts";
import { MemoryRepo } from "../store.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";

test("ST-1 content is sound: four passages, four charts, three maps, each checked by rule", () => {
  assert.deepEqual(studyProblems(STUDY), []);
  assert.deepEqual([STUDY.notes.length, STUDY.charts.length, STUDY.maps.length], [4, 4, 3]);
  for (const n of STUDY.notes) assert.ok(words(n.summaries.right) <= 50, n.id);
  const bad = { ...STUDY, charts: [{ ...STUDY.charts[0], values: [1, 1, 2, 3] }], maps: [{ ...STUDY.maps[0], routes: [{ ...STUDY.maps[0].routes[0], to: "park" }] }] };
  assert.match(studyProblems(bad).join("\n"), /same height[\s\S]*does not reach/);
});

test("ST-2 chart questions come from the data: the highest, the lowest, the difference, a true comparison, a paragraph in order", () => {
  for (const c of STUDY.charts) {
    const steps = chartSteps(c);
    const max = c.labels[c.values.indexOf(Math.max(...c.values))];
    const min = c.labels[c.values.indexOf(Math.min(...c.values))];
    const [top, bottom, diff, truth, para] = steps;
    assert.ok(top.kind === "choose" && top.options[top.answer] === max, c.id);
    assert.ok(bottom.kind === "choose" && bottom.options[bottom.answer] === min, c.id);
    assert.ok(diff.kind === "choose" && Number(diff.options[diff.answer]) === Math.max(...c.values) - Math.min(...c.values), c.id);
    assert.ok(truth.kind === "choose" && truth.options[truth.answer].startsWith(`The figure for ${max} `), c.id);
    assert.ok(para.kind === "order" && para.answer.map((i) => para.parts[i]).join() === c.paragraph.join(), c.id);
    assert.notDeepEqual(para.parts, c.paragraph, `${c.id}: the parts are not shown in order`);
  }
});

test("ST-3 map directions are worked out from the moves: the right ones reach the place, the wrong ones do not", () => {
  const town = STUDY.maps[0];
  assert.equal(directions(town, "bus stand", town.routes[0].moves), "Start at the bus stand and walk north along Gandhi Road for two blocks. Turn right into School Street and walk two blocks.");
  assert.equal(placeAt(town, walk(town, "bus stand", town.routes[0].moves)), "school");
  assert.equal(walk(town, "bus stand", [{ dir: "S", blocks: 1 }]), null, "off the map");
  for (const m of STUDY.maps) {
    for (const r of m.routes) {
      assert.equal(placeAt(m, walk(m, r.from, r.moves)), r.to);
      for (const w of wrongMoves(m, r)) assert.notEqual(placeAt(m, walk(m, r.from, w)), r.to, `${m.id} ${r.from}`);
    }
    for (const s of mapSteps(m)) {
      assert.equal(s.kind, "choose");
      if (s.kind === "choose" && s.skill === "map_corner") {
        const name = s.options[s.answer].replace(/^the /, "");
        const p = m.places.find((x) => x.name === name)!;
        assert.ok(s.prompt.includes(m.cols[p.x]) && s.prompt.includes(m.rows[p.y]));
      }
    }
  }
});

test("ST-4 notes: a title, the main points and not the details, a summary; the learner's own summary checked by rule", () => {
  const n = STUDY.notes[0];
  const [title, points, summary] = notesSteps(n);
  assert.ok(title.kind === "choose" && title.options[title.answer] === n.titles.right);
  assert.ok(points.kind === "pick" && points.answer.length === n.points.filter((p) => p.main).length);
  assert.ok(summary.kind === "choose" && summary.options[summary.answer] === n.summaries.right);
  const good = checkSummary(n, n.summaries.right);
  assert.equal(good.missing.length, 0);
  assert.match(good.notes.join(" "), /good length[\s\S]*names the main ideas/);
  assert.match(checkSummary(n, "The neem tree is good.").notes.join(" "), /too short[\s\S]*leave out a main idea/);
  assert.match(checkSummary(n, "roots teeth insects crops ".repeat(14)).notes.join(" "), /fifty or fewer/);
});

test("ST-5 a sitting scores every step and records once; a wrong pick or order is marked wrong", () => {
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
  assert.ok(notes.writeOwn("The neem tree has deep roots; its twigs clean teeth, its leaves keep insects away and its seeds protect crops."));
  notes.finish();
  const [rec] = notes.take();
  assert.deepEqual(rec.answers.map((a) => a.correct), [true, false, true]);
  assert.equal(rec.own?.keys, 4);
  assert.equal(notes.take().length, 0);

  const chart = new StudySitting(STUDY_TASKS.find((x) => x.kind === "chart")!);
  chart.read();
  for (const st of chart.steps) {
    if (st.kind === "choose") chart.choose(st.answer);
    if (st.kind === "order") chart.order([...st.answer].reverse());
    chart.next();
  }
  assert.equal(chart.snapshot().phase, "done");
  assert.deepEqual(chart.take()[0].answers.map((a) => a.correct), [true, true, true, true, false]);
});

test("ST-6 the next task rotates the kinds; records are kept on the learner's log without touching the engine", async () => {
  assert.equal(nextStudy([])?.level, 5);
  const done: StudyRecord[] = [{ type: "study", task: STUDY.notes[0].id, kind: "notes", answers: [{ skill: "title", correct: true }] }];
  assert.notEqual(nextStudy(done)?.kind, "notes");
  assert.equal(nextStudy(done, "map")?.kind, "map");
  const all: StudyRecord[] = STUDY_TASKS.map((t) => ({ type: "study", task: t.id, kind: t.kind, answers: [] }));
  assert.equal(nextStudy(all), null);
  for (const t of STUDY_TASKS) assert.ok(stepsFor(t.id).length >= 3, t.id);

  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Study", "guardian", clock, "p-study");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordStudy(done);
  for (const e of await repo.load("p-study")) assert.equal(eventProblem(e), null);
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-study", clock);
  assert.deepEqual(studySummary(again.studyRecords()), { tasks: 1, right: 1, asked: 1 });
});
