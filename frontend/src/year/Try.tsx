/**
 * try-as-child@1 (/year/#try): the owner's view of the app as a child gets it. Search any skill of any class and open
 * its real screens (the same components the child's app uses): the whole journey, the lesson alone, a practice
 * question, or a test question. Everything runs on a sandbox learner kept in this page's memory: nothing is sent to
 * the server and no child's record is touched; leaving or reloading the page forgets it.
 */
import React, { useMemo, useRef, useState } from "react";
import { moduleFor } from "../../../packages/learning/src/content";
import type { BoardId } from "../../../packages/learning/src/curricula";
import { modulePhasePool } from "../../../packages/learning/src/library";
import type { LearningActivity, LearningRecord } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";
import { Ask, Feedback, Lesson, Module, type Ctx, type Fb } from "./Learn";
import { allSkills, BOARD_NAME, findSkills, type Skill } from "./try-skills";

const academicYear = (d = new Date()) => { const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, "0")}`; };
type Mode = "journey" | "lesson" | "practice" | "test";
const MODES: [Mode, string][] = [["journey", "The whole journey"], ["lesson", "Lesson"], ["practice", "Practice question"], ["test", "Test question"]];

export function TryAsChild() {
  const all = useMemo(allSkills, []);
  const [board, setBoard] = useState<BoardId>("icse");
  const [grade, setGrade] = useState(5);
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState<Skill | null>(null);
  const grades = [...new Set(all.filter((s) => s.board === board).map((s) => s.release.grade))].sort((a, b) => a - b);
  const list = useMemo(() => findSkills(all, board, grade, search), [all, board, grade, search]);
  if (skill) return <Sandbox key={`${skill.release.id}:${skill.competency}`} skill={skill} back={() => setSkill(null)} />;
  let chapter = "";
  return (
    <main className="page try-page" data-testid="try">
      <h1>Try it as a child</h1>
      <p className="muted">Open any skill and use the real screens. Nothing you do here is saved or counted for anyone.</p>
      <label className="field">Find a skill<input type="search" aria-label="Find a skill" placeholder="money, fractions, integration…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      {!search.trim() && (
        <div className="try-pick">
          <label className="field">Board<select aria-label="Board" value={board} onChange={(e) => { const b = e.target.value as BoardId; setBoard(b); const gs = all.filter((s) => s.board === b).map((s) => s.release.grade); if (!gs.includes(grade)) setGrade(Math.min(...gs)); }}>{(Object.keys(BOARD_NAME) as BoardId[]).map((b) => <option key={b} value={b}>{BOARD_NAME[b]}</option>)}</select></label>
          <label className="field">Class<select aria-label="Class" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{grades.map((g) => <option key={g} value={g}>Class {g}</option>)}</select></label>
        </div>
      )}
      <p className="small muted" role="status">{list.length ? `${list.length}${search.trim() && list.length === 60 ? "+" : ""} skill${list.length === 1 ? "" : "s"}` : "No skill matches."}</p>
      <ul className="plain try-list">
        {list.map((s) => {
          const head = !search.trim() && s.chapter !== chapter ? (chapter = s.chapter) : null;
          return (
            <React.Fragment key={`${s.release.id}:${s.competency}`}>
              {head && <li className="try-chapter">{head}</li>}
              <li><button type="button" className="link" onClick={() => setSkill(s)}>{s.name}</button>{search.trim() ? <span className="small muted"> · {BOARD_NAME[s.board]} Class {s.release.grade}</span> : null}</li>
            </React.Fragment>
          );
        })}
      </ul>
    </main>
  );
}

function Sandbox({ skill, back }: { skill: Skill; back: () => void }) {
  const at = () => ({ learnerId: "sandbox", sessionId: "try:sandbox:1", at: new Date().toISOString() });
  const [events, setEvents] = useState<LearningRecord[]>(() => [make.curriculum(at(), skill.release), make.enrol(at(), skill.release.grade, academicYear(), skill.release)]);
  const [mode, setMode] = useState<Mode>("journey");
  const [n, setN] = useState(0);
  const [round, setRound] = useState(0);
  const [fb, setFb] = useState<Fb | null>(null);
  const now = useRef(Date.now()).current + events.length; // moves on with every record, as the app's clock does after a save
  const st = useMemo(() => learnerState("sandbox", events as never, now, { currentSession: "try:sandbox:1" }), [events, now]);
  const push = async (r: LearningRecord) => { setEvents((e) => [...e, r]); return true; };
  const ctx: Ctx = {
    records: st.records, evidence: st.evidence, now, session: "try:sandbox:1", saving: false,
    answer: (qid: string, response: string, activity: LearningActivity, o = {}) => push(make.attempt(at(), qid, response, activity, o)),
    teach: (competency: string, strategy: string, rule: string) => push(make.teach(at(), competency, strategy, rule.slice(0, 40))),
    recorded: () => null,
  };
  const m = moduleFor(skill.competency)!;
  const pick = (phase: "practice" | "retention", own: string[]) => { const ids = own.length ? own : modulePhasePool(m, phase); return ids.length ? ids[n % ids.length] : null; };
  const qid = mode === "practice" ? pick("practice", m.practice) : mode === "test" ? pick("retention", m.retention) : null;
  const go = (next: Mode) => { setMode(next); setN(0); setFb(null); setRound(round + 1); };
  return (
    <main className="page try-page" data-testid="try-skill">
      <p><button type="button" className="link" onClick={back}>← All skills</button></p>
      <h1>{skill.name}</h1>
      <p className="small muted">{BOARD_NAME[skill.board]} Class {skill.release.grade} · {skill.chapter} · sandbox: nothing is saved</p>
      <nav className="try-modes" aria-label="What to try">{MODES.map(([k, label]) => <button key={k} type="button" className={mode === k ? "primary" : "secondary"} onClick={() => go(k)}>{label}</button>)}</nav>
      <div className="try-stage" key={`${mode}:${round}:${n}:${fb ? "fb" : "q"}`}>
        {mode === "journey" && <Module competency={skill.competency} ctx={ctx} onExit={() => setRound(round + 1)} />}
        {mode === "lesson" && (m.strategies[0] ? <Lesson s={m.strategies[0]} onDone={() => go("practice")} saving={false} competency={skill.competency} opening grade={skill.release.grade} doneLabel="Try a question" /> : <p className="muted">This skill has no lesson.</p>)}
        {(mode === "practice" || mode === "test") && (qid
          ? fb
            ? <Feedback fb={fb} onNext={() => { setFb(null); setN(n + 1); }} label="Another question" />
            : <><Ask qid={qid} activity={mode === "practice" ? "practice" : "retention"} ctx={ctx} hintAllowed={mode === "practice"} onAnswered={setFb} /><p><button type="button" className="secondary" onClick={() => setN(n + 1)}>Skip to another question</button></p></>
          : <p className="muted">This skill has no {mode} question.</p>)}
      </div>
    </main>
  );
}
