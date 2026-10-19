/**
 * The Completing the square reference unit, for a phone: one step at a time, teaching before assessment.
 *
 *   teach    sections of short screens; predictions are asked before the answer is revealed; a wrong check opens the
 *            section's re-explanation and one similar question
 *   worked   worked examples revealed step by step, each key step predicted first, with the reason for every step
 *   questions practice: hints only in guided practice; a worked solution on request (recorded, so the answer counts as
 *            assisted); misconception-specific feedback; "see the explanation again" and "try a similar one"
 *
 * Interactive models (algebra tiles, the balance) are exploration only: nothing about them is recorded. Every answer,
 * hint and worked solution is saved to the account as the unit's own activity records.
 */
import React, { useEffect, useMemo, useState } from "react";
import { advice, canComplete, LETTERS, misconception, normalise, question, replay, resumePoint, stageOf, standing, struggling, unit, type Example, type Screen, type Section, type UnitAction, type UnitActivity, type UnitQuestion, type UnitState } from "../../../../packages/mathematics/src/unit";
import "./unit.css";

export type UnitSend = (action: UnitAction, stage: string, extra?: Partial<UnitActivity>) => Promise<boolean | undefined>;
type Where = { stage: string; section: string };
const PHASE: Record<string, string> = { teaching: "Learn", worked: "Worked examples", guided: "Guided practice", independent: "On your own", application: "Apply", transfer: "New problems", retention: "Revision" };
const minus = (t: string) => t.replace(/-/g, "−");

export function UnitView({ learnerId, events, now, saving, error, send, onBack }: { learnerId: string; events: readonly { kind: string; program?: string }[]; now: number; saving: boolean; error: string; send: UnitSend; onBack: () => void }) {
  const { state, profile } = useMemo(() => replay(learnerId, events, new Date(now).toISOString()), [learnerId, events, Math.floor(now / 30000)]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [revisit, setRevisit] = useState<Where | null>(null);
  const stageId = viewing ?? state.current;
  const stage = stageOf(stageId);
  const index = unit.stages.findIndex((s) => s.id === stageId);
  const done = state.completed.includes(stageId);
  const allDone = state.completed.length === unit.stages.length;
  const progress = Math.round((100 * (state.completed.length + (done ? 0 : stage.questions.filter((q) => state.answers[q]).length / (stage.questions.length + 1)))) / unit.stages.length);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stageId, revisit]);
  const finish = async () => {
    if (done) return setViewing(null);
    // the server dates the revision check when the step before it is finished
    if (await send("complete", stageId)) setViewing(null);
  };
  const isRetention = stageId === unit.stages.at(-1)!.id;
  const due = state.retentionDueAt && now >= Date.parse(state.retentionDueAt);

  if (revisit) return <Revisit where={revisit} onClose={() => setRevisit(null)} />;
  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <span><button className="link" onClick={onBack}>← Back</button></span>
          <strong>Completing the square</strong>
          <span className="muted small">{allDone ? 100 : progress}%</span>
        </div>
        <span className="bar thin" role="progressbar" aria-label="Unit progress" aria-valuenow={progress}><span style={{ width: `${allDone ? 100 : progress}%` }} /></span>
      </header>
      <main className="page">
        {error && <p className="error" role="alert">{error}</p>}
        <ol className="steps small-steps" aria-label="Steps in this unit">
          {unit.stages.map((s, i) => {
            const d = state.completed.includes(s.id);
            const here = s.id === stageId;
            return (
              <li key={s.id} className={d ? "done" : here ? "here" : ""}>
                <button className="step-dot" disabled={!d || here} onClick={() => setViewing(s.id)} aria-label={`${i + 1}. ${s.title}${d ? " (done)" : ""}`}>{d ? "✓" : i + 1}</button>
              </li>
            );
          })}
        </ol>
        <p className="eyebrow">Step {index + 1} of {unit.stages.length} · {PHASE[stage.phase]}</p>
        <h1 key={stageId} className="enter">{stage.title}</h1>
        <div key={`${stageId}-body`} className="enter">
          {stage.kind === "teach" && <Teach stageId={stageId} state={state} send={send} saving={saving} onDone={finish} done={done} />}
          {stage.kind === "worked" && <Worked stageId={stageId} state={state} send={send} saving={saving} onDone={finish} done={done} />}
          {stage.kind === "questions" && (!isRetention || due || done) && <Practice stageId={stageId} state={state} send={send} saving={saving} onDone={finish} done={done} onRevisit={setRevisit} />}
          {isRetention && !due && !done && (
            <div className="stack">
              <div className="panel accent-soft">
                <p className="lead">The revision check opens {state.retentionDueAt ? `on ${new Date(state.retentionDueAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}` : "a week after you finish the new problems"}.</p>
                <p className="muted small">Coming back after a week shows whether the method has stuck. Until then, you can reopen any finished step from the circles above.</p>
              </div>
              <Standing state={state} status={profile.status} onRevisit={setRevisit} />
            </div>
          )}
          {allDone && !viewing && <Standing state={state} status={profile.status} onRevisit={setRevisit} />}
        </div>
        {viewing && <button className="secondary wide" onClick={() => setViewing(null)}>Back to where I was</button>}
      </main>
    </>
  );
}

// ---------------------------------------------------------------- teaching

function Body({ sc }: { sc: Screen | NonNullable<Screen["reveal"]> }) {
  const text = sc.text ?? [];
  const at = sc.mathAt ?? text.length;
  return (
    <>
      {text.slice(0, at).map((t, i) => <p key={i}>{t}</p>)}
      {sc.math && <div className="formula">{sc.math.map((l, i) => <div key={i}>{l}</div>)}</div>}
      {text.slice(at).map((t, i) => <p key={`b${i}`}>{t}</p>)}
      {sc.tip && <p className="hint">💡 {sc.tip}</p>}
    </>
  );
}

function ScreenView({ sc, state, send, saving, stageId, still }: { sc: Screen; state: UnitState; send: UnitSend; saving: boolean; stageId: string; still?: boolean }) {
  const answered = sc.predict ? state.answers[sc.predict] : undefined;
  const open = !sc.predict || !!answered || still;
  return (
    <div className="panel lesson">
      <h3>{sc.title}</h3>
      <Body sc={sc} />
      {sc.widget?.type === "tiles" && <Tiles b={sc.widget.b ?? 6} mode={sc.widget.mode ?? "build"} choose={sc.widget.choose} />}
      {sc.widget?.type === "balance" && <Balance />}
      {sc.predict && !still && <Ask qid={sc.predict} state={state} send={send} saving={saving} stageId={stageId} label="Predict first" />}
      {sc.reveal && open && <div className="reveal enter"><Body sc={sc.reveal} /></div>}
    </div>
  );
}

function Teach({ stageId, state, send, saving, onDone, done }: { stageId: string; state: UnitState; send: UnitSend; saving: boolean; onDone: () => void; done: boolean }) {
  const stage = stageOf(stageId);
  const sections = stage.sections!;
  const start = state.current === stageId ? resumePoint(state).part : 0;
  const [si, setSi] = useState(start);
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [si, screen]);
  const sec = sections[si];
  const atCheck = screen >= sec.screens.length;
  const sc = sec.screens[Math.min(screen, sec.screens.length - 1)];
  const blocked = !atCheck && !!sc.predict && !state.answers[sc.predict];
  const checkAnswer = sec.check ? state.answers[sec.check] : undefined;
  const lastSection = si === sections.length - 1;
  const next = () => (lastSection ? onDone() : (setSi(si + 1), setScreen(0)));
  return (
    <div className="stack">
      <div className="lesson-head">
        <p className="eyebrow">Part {si + 1} of {sections.length}</p>
        <h2>{sec.title}</h2>
        <div className="dots" aria-hidden="true">
          {sec.screens.map((_, i) => <span key={i} className={i === screen ? "on" : ""} />)}
          {sec.check && <span className={atCheck ? "on" : ""} />}
        </div>
      </div>
      {!atCheck ? (
        <>
          <div key={`${sec.id}-${screen}`} className="enter"><ScreenView sc={sc} state={state} send={send} saving={saving} stageId={stageId} /></div>
          <div className="actions sticky">
            {(screen > 0 || si > 0) && <button className="secondary" onClick={() => (screen > 0 ? setScreen(screen - 1) : (setSi(si - 1), setScreen(0)))}>Back</button>}
            {screen < sec.screens.length - 1 || sec.check ? (
              <button className="primary" disabled={blocked} onClick={() => setScreen(screen + 1)}>{blocked ? "Answer to continue" : screen === sec.screens.length - 1 ? "Check your understanding" : "Next"}</button>
            ) : (
              <button className="primary" disabled={blocked || saving || (lastSection && !canComplete(state, stageId) && !done)} onClick={next}>{lastSection ? (done ? "Continue" : "Finish this step") : "Next part"}</button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="panel lesson"><Ask qid={sec.check!} state={state} send={send} saving={saving} stageId={stageId} label="Check your understanding" similar={false} /></div>
          {checkAnswer && !checkAnswer.correct && sec.remediate && (
            <div className="panel remediate enter">
              <p className="eyebrow">Another way to see it</p>
              {sec.remediate.screens.map((r, i) => (
                <div key={i}>
                  <h3>{r.title}</h3>
                  <Body sc={r} />
                  {r.widget?.type === "tiles" && <Tiles b={r.widget.b ?? 6} mode={r.widget.mode ?? "build"} />}
                </div>
              ))}
              {sec.remediate.support && <TryOne qid={sec.remediate.support} state={state} send={send} saving={saving} stageId={stageId} />}
            </div>
          )}
          <div className="actions sticky">
            <button className="secondary" onClick={() => setScreen(sec.screens.length - 1)}>Back</button>
            <button className="primary" disabled={!checkAnswer || saving || (lastSection && !canComplete(state, stageId) && !done)} onClick={next}>{lastSection ? (done ? "Continue" : "Finish this step") : "Next part"}</button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- worked examples

function Worked({ stageId, state, send, saving, onDone, done }: { stageId: string; state: UnitState; send: UnitSend; saving: boolean; onDone: () => void; done: boolean }) {
  const stage = stageOf(stageId);
  const examples = stage.examples!;
  const start = state.current === stageId ? resumePoint(state).part : 0;
  const [ei, setEi] = useState(start);
  const atCheck = ei >= examples.length;
  const ex = examples[Math.min(ei, examples.length - 1)];
  // steps shown so far: up to the first prediction still to make (all of them once every prediction is made)
  const initial = (e: Example) => {
    const open = e.steps.findIndex((st) => st.predict && !state.answers[st.predict]);
    return open < 0 ? e.steps.length : open;
  };
  const [shown, setShown] = useState(() => initial(ex));
  useEffect(() => {
    setShown(initial(examples[Math.min(ei, examples.length - 1)]));
  }, [ei]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [ei]);
  const nextStep = ex.steps[shown];
  const waiting = !!nextStep?.predict && !state.answers[nextStep.predict];
  const all = shown >= ex.steps.length;
  const lastExample = ei === examples.length - 1;
  const moveOn = () => (lastExample && !stage.check ? onDone() : setEi(ei + 1));
  if (atCheck)
    return (
      <div className="stack">
        <div className="panel lesson"><Ask qid={stage.check!} state={state} send={send} saving={saving} stageId={stageId} label="Your turn" /></div>
        <div className="actions sticky">
          <button className="secondary" onClick={() => setEi(examples.length - 1)}>Back</button>
          <button className="primary" disabled={!state.answers[stage.check!] || saving} onClick={onDone}>{done ? "Continue" : "Finish this step"}</button>
        </div>
      </div>
    );
  return (
    <div className="stack">
      <p className="eyebrow">Example {ei + 1} of {examples.length} · {ex.title}</p>
      <div className="panel problem"><p className="eyebrow">Problem</p><p className="lead">{ex.problem}</p></div>
      <ol className="worked">
        {ex.steps.slice(0, shown).map((st, i) => <StepView key={i} step={st} />)}
      </ol>
      {nextStep?.predict && <div key={nextStep.predict} className="panel lesson enter"><Ask qid={nextStep.predict} state={state} send={send} saving={saving} stageId={stageId} label="Predict the next step" /></div>}
      <div className="actions sticky">
        {ei > 0 && <button className="secondary" onClick={() => setEi(ei - 1)}>Back</button>}
        {!all ? (
          <button className="primary" disabled={waiting} onClick={() => setShown(shown + 1)}>{waiting ? "Predict to continue" : "Show next step"}</button>
        ) : (
          <button className="primary" disabled={saving} onClick={moveOn}>{lastExample ? (stage.check ? "Your turn" : done ? "Continue" : "Finish this step") : "Next example"}</button>
        )}
      </div>
    </div>
  );
}

function StepView({ step }: { step: Example["steps"][number] }) {
  return (
    <li className="enter">
      <strong>{step.text}</strong>
      {step.math && <div className="formula">{step.math.map((l, i) => <div key={i}>{l}</div>)}</div>}
      {step.why && <p className="why"><span>Why:</span> {step.why}</p>}
    </li>
  );
}

// ---------------------------------------------------------------- practice

function Practice({ stageId, state, send, saving, onDone, done, onRevisit }: { stageId: string; state: UnitState; send: UnitSend; saving: boolean; onDone: () => void; done: boolean; onRevisit: (w: Where) => void }) {
  const stage = stageOf(stageId);
  const ids = stage.questions;
  const firstOpen = ids.findIndex((id) => !state.answers[id]);
  const [intro, setIntro] = useState(!!stage.intro && firstOpen === 0);
  const [introAt, setIntroAt] = useState(0);
  const [i, setI] = useState(firstOpen < 0 ? ids.length : firstOpen);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [i, intro, introAt]);
  if (intro && stage.intro) {
    const sc = stage.intro.screens[introAt];
    return (
      <div className="stack">
        <div key={introAt} className="enter"><ScreenView sc={sc} state={state} send={send} saving={saving} stageId={stageId} /></div>
        <div className="actions sticky">
          {introAt > 0 && <button className="secondary" onClick={() => setIntroAt(introAt - 1)}>Back</button>}
          {introAt < stage.intro.screens.length - 1 ? <button className="primary" onClick={() => setIntroAt(introAt + 1)}>Next</button> : <button className="primary" onClick={() => setIntro(false)}>Start the questions</button>}
        </div>
      </div>
    );
  }
  if (i >= ids.length) {
    const hard = struggling(state, stageId);
    const extra = advice(state).filter((a) => a.stage === stageId && a.support);
    return (
      <div className="stack">
        <StageScore stageId={stageId} state={state} />
        {hard && extra.length > 0 && (
          <div className="panel accent-soft">
            <h3>This step was hard: try these first</h3>
            <p className="muted small">One similar question for each one you missed. They are extra: you can also continue.</p>
            {extra.map((a) => <TryOne key={a.support!} qid={a.support!} state={state} send={send} saving={saving} stageId={stageId} />)}
          </div>
        )}
        <div className="actions sticky">
          <button className="secondary" onClick={() => setI(ids.length - 1)}>Back</button>
          <button className="primary" disabled={saving || !canComplete(state, stageId)} onClick={onDone}>{done ? "Continue" : "Finish this step"}</button>
        </div>
      </div>
    );
  }
  const qid = ids[i];
  const answered = state.answers[qid];
  return (
    <div className="stack">
      <p className="eyebrow">Question {i + 1} of {ids.length} · {"●".repeat(question(qid).difficulty)}{"○".repeat(3 - question(qid).difficulty)}</p>
      <div key={qid} className="enter"><Ask qid={qid} state={state} send={send} saving={saving} stageId={stageId} hints={stage.hints} solution onRevisit={onRevisit} /></div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => setI(i - 1)}>Back</button>}
        <button className="primary" disabled={!answered} onClick={() => setI(i + 1)}>{i === ids.length - 1 ? "See how this step went" : "Next question"}</button>
      </div>
    </div>
  );
}

function StageScore({ stageId, state }: { stageId: string; state: UnitState }) {
  const ids = stageOf(stageId).questions;
  const right = ids.filter((id) => state.answers[id]?.correct).length;
  const helped = ids.filter((id) => state.answers[id]?.assisted).length;
  return (
    <div className="panel">
      <p className="eyebrow">This step</p>
      <p className="big-number">{right}<span> / {ids.length} right</span></p>
      {helped > 0 && <p className="muted small">{helped} answered with a hint or after seeing the solution: they count as help, not as independent work.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- one question: answer, hint, solution, feedback

const blank = (q: UnitQuestion) => (q.type === "values" ? q.fields!.map(() => "") : [""]);
export function formatAnswer(q: UnitQuestion, text = q.answer): string {
  if (q.type === "choice") return `${text}: ${q.options![LETTERS.indexOf(text as "A")]}`;
  if (q.type !== "values") return minus(text);
  const v = (normalise(q, text) ?? text).split(",");
  if (q.unordered) return `x = ${minus(v[0])} or x = ${minus(v[1])}`;
  return q.fields!.map((f, i) => `${f} = ${minus(v[i])}`).join(", ");
}

function Ask({ qid, state, send, saving, stageId, label, hints = true, solution = false, onRevisit, similar = true }: { qid: string; state: UnitState; send: UnitSend; saving: boolean; stageId: string; label?: string; hints?: boolean; solution?: boolean; onRevisit?: (w: Where) => void; similar?: boolean }) {
  const q = question(qid);
  const answered = state.answers[qid];
  const [values, setValues] = useState<string[]>(blank(q));
  const hinted = state.hints.includes(qid);
  const solved = state.solutions.includes(qid);
  const ready = values.every((v) => v.trim() !== "" && v !== "−" && v !== "-");
  const response = values.join(",").replace(/−/g, "-");
  const valid = normalise(q, response) !== null;
  useEffect(() => {
    if (answered) document.getElementById(`fb-${qid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [!!answered]);
  const help = advice(state).find((a) => a.questionId === qid);
  return (
    <div className="stack ask" data-qid={qid}>
      {label && <p className="eyebrow">{label}</p>}
      <p className="lead prompt">{q.prompt}</p>
      <Inputs q={q} values={answered ? (q.type === "values" ? answered.response.split(",") : [answered.response]) : values} setValues={setValues} disabled={!!answered || saving} />
      {!answered && ready && !valid && <p className="muted small">{q.type === "choice" ? "Choose one option." : "Use whole numbers or fractions such as −5/2."}</p>}
      {!answered && (
        <div className="help-row">
          {hints && q.hint && (hinted ? null : <button className="link" onClick={() => send("hint", stageId, { questionId: qid })}>Show a hint</button>)}
          {solution && !solved && <button className="link" onClick={() => send("solution", stageId, { questionId: qid })}>Show the worked solution</button>}
        </div>
      )}
      {!answered && hinted && q.hint && <p className="hint enter">💡 {q.hint}</p>}
      {!answered && solved && <p className="feedback neutral enter"><strong>Worked solution.</strong> {q.solution} <span className="muted small">(Your answer now counts as helped.)</span></p>}
      {!answered && <button className="primary" disabled={!ready || !valid || saving} onClick={() => send("answer", stageId, { questionId: qid, response })}>{saving ? "Saving…" : "Check answer"}</button>}
      {answered && (
        <div id={`fb-${qid}`} className={`feedback enter ${answered.correct ? "good" : "bad"}`} role="status">
          {answered.correct ? <strong>Correct!</strong> : <strong>Not quite.</strong>}
          {!answered.correct && <p>{misconception(q, answered.response) ?? "Compare your answer with the solution below, one line at a time, to find where they part."}</p>}
          {!answered.correct && <p><strong>Answer:</strong> {formatAnswer(q)}</p>}
          <p>{q.solution}</p>
          {!answered.correct && help?.revisit && onRevisit && <button className="link" onClick={() => onRevisit(help.revisit!)}>See the explanation again</button>}
        </div>
      )}
      {answered && !answered.correct && similar && q.support && <TryOne qid={q.support} state={state} send={send} saving={saving} stageId={stageId} />}
    </div>
  );
}

/** One similar extra question (offered after a wrong answer). */
function TryOne({ qid, state, send, saving, stageId }: { qid: string; state: UnitState; send: UnitSend; saving: boolean; stageId: string }) {
  return (
    <div className="panel try enter">
      <Ask qid={qid} state={state} send={send} saving={saving} stageId={stageId} label="Try a similar one" />
    </div>
  );
}

function Inputs({ q, values, setValues, disabled }: { q: UnitQuestion; values: string[]; setValues: (v: string[]) => void; disabled: boolean }) {
  if (q.type === "choice")
    return (
      <div className="options" role="radiogroup" aria-label="Choose one answer">
        {q.options!.map((o, i) => (
          <button key={i} role="radio" aria-checked={values[0] === LETTERS[i]} className={`option ${values[0] === LETTERS[i] ? "picked" : ""}`} disabled={disabled} onClick={() => setValues([LETTERS[i]])}>
            <span className="letter">{LETTERS[i]}</span>
            <span className="pre">{o}</span>
          </button>
        ))}
      </div>
    );
  const labels = q.type === "values" ? q.fields! : ["Your answer"];
  const set = (i: number, v: string) => setValues(values.map((x, j) => (j === i ? v : x)));
  return (
    <div className={`fields ${labels.length > 2 ? "three" : ""}`}>
      {labels.map((label, i) => {
        const v = (values[i] ?? "").replace(/-/g, "−");
        const negative = v.startsWith("−");
        return (
          <label key={i} className="field">
            <span>{label}</span>
            <span className="number">
              <button type="button" className="sign" disabled={disabled} aria-label={`Make ${label} ${negative ? "positive" : "negative"}`} onClick={() => set(i, negative ? v.slice(1) : `−${v}`)}>±</button>
              <input inputMode={q.type === "integer" ? "numeric" : "text"} autoComplete="off" value={v} disabled={disabled} onChange={(e) => set(i, e.target.value.replace(/[^0-9/−-]/g, "").replace(/-/g, "−"))} placeholder={q.type === "integer" ? "e.g. 12" : "e.g. −5/2"} aria-label={label} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- where the learner stands

function Standing({ state, status, onRevisit }: { state: UnitState; status: string; onRevisit: (w: Where) => void }) {
  const s = standing(state, { status });
  const open = advice(state);
  return (
    <div className="stack">
      <h2>Where you stand</h2>
      <div className="standing">
        <div className="panel"><p className="eyebrow">Steps done</p><p className="big-number">{state.completed.length}<span> / {unit.stages.length}</span></p><p className="muted small">Activity: what you have worked through.</p></div>
        <div className="panel"><p className="eyebrow">Shown on your own</p><p className="big-number">{s.demonstrated.correct}<span> / {s.demonstrated.answered}</span></p><p className="muted small">Right first time, without hints, in the later steps. Practice questions only: not yet reviewed by a teacher.</p></div>
        <div className="panel"><p className="eyebrow">Verified mastery</p><p className="lead">{s.verified ? "Verified" : "Not verified"}</p><p className="muted small">Only teacher-reviewed questions can verify mastery, and this unit's are not reviewed yet.</p></div>
      </div>
      {open.length > 0 && (
        <div className="panel">
          <h3>Worth another look</h3>
          <ul className="plain">
            {open.slice(0, 6).map((a) => (
              <li key={a.questionId}>
                {question(a.questionId).prompt.split("\n")[0]}
                {a.revisit && <> · <button className="link" onClick={() => onRevisit(a.revisit!)}>see the explanation</button></>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- revisit: earlier teaching, read again

function Revisit({ where, onClose }: { where: Where; onClose: () => void }) {
  const stage = stageOf(where.stage);
  const section: Section | undefined = stage.sections?.find((s) => s.id === where.section);
  const example = stage.examples?.find((e) => e.id === where.section);
  const intro = stage.intro?.id === where.section ? stage.intro : undefined;
  const screens = section?.screens ?? intro?.screens ?? [];
  return (
    <main className="page">
      <p className="eyebrow">Explanation again · {stage.title}</p>
      <h1>{section?.title ?? example?.title ?? "Before the questions"}</h1>
      <div className="stack">
        {screens.map((sc, i) => (
          <div key={i} className="panel lesson">
            <h3>{sc.title}</h3>
            <Body sc={sc} />
            {sc.widget?.type === "tiles" && <Tiles b={sc.widget.b ?? 6} mode={sc.widget.mode === "split" ? "build" : sc.widget.mode ?? "build"} choose={sc.widget.choose} />}
            {sc.widget?.type === "balance" && <Balance />}
            {sc.reveal && <div className="reveal"><Body sc={sc.reveal} /></div>}
          </div>
        ))}
        {example && (
          <>
            <div className="panel problem"><p className="eyebrow">Problem</p><p className="lead">{example.problem}</p></div>
            <ol className="worked">{example.steps.map((st, i) => <StepView key={i} step={st} />)}</ol>
          </>
        )}
      </div>
      <div className="actions sticky"><button className="primary" onClick={onClose}>Back to the question</button></div>
    </main>
  );
}

// ---------------------------------------------------------------- interactive models

/**
 * Algebra tiles for x² + bx: an x-by-x square, b strips (x by 1) and unit tiles (1 by 1). Move strips to the right or
 * the bottom; with b/2 on each side a b/2-by-b/2 corner is missing, and (b/2)² unit tiles complete the square.
 */
export function Tiles({ b: start, mode, choose }: { b: number; mode: "show" | "split" | "build"; choose?: boolean }) {
  const [b, setB] = useState(start);
  const [right, setRight] = useState(mode === "show" ? start / 2 : start);
  const [filled, setFilled] = useState(mode === "show" ? (start / 2) ** 2 : 0);
  const bottom = b - right;
  const X = 120, u = 12, pad = 22;
  const W = pad + X + Math.max(right, 1) * u + 8, H = pad + X + Math.max(bottom, 1) * u + 8;
  const corner = right * bottom;
  const square = right === bottom && filled === corner && corner > 0;
  const pickB = (n: number) => { setB(n); setRight(n); setFilled(0); };
  const tiles: React.ReactNode[] = [];
  for (let k = 0; k < Math.min(filled, corner); k++) {
    const c = k % Math.max(right, 1), r = Math.floor(k / Math.max(right, 1));
    tiles.push(<rect key={`t${k}`} x={pad + X + c * u} y={pad + X + r * u} width={u} height={u} className="tile-unit" />);
  }
  const terms = [`x²`, right ? `${right}x` : "", bottom ? `${bottom}x` : "", filled ? `${filled}` : ""].filter(Boolean).join(" + ");
  return (
    <figure className="tiles">
      {choose && (
        <div className="chips" role="group" aria-label="Number of strips">
          {[2, 4, 6, 8, 10].map((n) => <button key={n} className={`chip ${n === b ? "on" : ""}`} onClick={() => pickB(n)}>x² + {n}x</button>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${right} strips on the right, ${bottom} at the bottom, ${filled} unit tiles. ${square ? "A complete square." : ""}`}>
        <text x={pad + X / 2} y={pad - 7} className="tile-label">x</text>
        <text x={pad - 12} y={pad + X / 2} className="tile-label">x</text>
        <rect x={pad} y={pad} width={X} height={X} className="tile-x2" />
        <text x={pad + X / 2} y={pad + X / 2 + 6} className="tile-name">x²</text>
        {Array.from({ length: right }, (_, i) => <rect key={`r${i}`} x={pad + X + i * u} y={pad} width={u} height={X} className="tile-x" />)}
        {Array.from({ length: bottom }, (_, j) => <rect key={`b${j}`} x={pad} y={pad + X + j * u} width={X} height={u} className="tile-x" />)}
        {corner > 0 && filled < corner && <rect x={pad + X} y={pad + X} width={right * u} height={bottom * u} className="tile-gap" />}
        {tiles}
        {right > 0 && <text x={pad + X + (right * u) / 2} y={pad - 7} className="tile-label">{right}</text>}
        {bottom > 0 && <text x={pad - 12} y={pad + X + (bottom * u) / 2 + 4} className="tile-label">{bottom}</text>}
      </svg>
      <figcaption>
        <strong>{terms}</strong>
        <span>
          {square
            ? `= x² + ${b}x + ${corner} = (x + ${b / 2})². A complete square: the corner was ${b / 2} × ${b / 2} = ${corner}.`
            : right !== bottom
              ? `Not a square yet: ${right} strips on the right, ${bottom} at the bottom.`
              : mode === "split"
                ? `The strips are split evenly. Look at the empty corner.`
                : `${corner - filled} more unit tile${corner - filled === 1 ? "" : "s"} to fill the corner.`}
        </span>
      </figcaption>
      {mode !== "show" && (
        <div className="tile-controls">
          <div className="control-row">
            <button className="secondary" disabled={right === 0} onClick={() => setRight(right - 1)}>Strip to the bottom</button>
            <button className="secondary" disabled={bottom === 0} onClick={() => setRight(right + 1)}>Strip to the right</button>
          </div>
          {mode === "build" && (
            <div className="control-row">
              <button className="secondary" disabled={filled === 0} onClick={() => setFilled(filled - 1)}>− unit tile</button>
              <button className="secondary" disabled={corner === 0 || filled >= corner} onClick={() => setFilled(filled + 1)}>+ unit tile</button>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** The balance: x² + 6x = −5 is true for x = −1. Add 9 to one side, or to both, and test x = −1. */
export function Balance() {
  const [how, setHow] = useState<"none" | "left" | "both">("none");
  const x = -1;
  const left = x * x + 6 * x + (how === "none" ? 0 : 9);
  const right = -5 + (how === "both" ? 9 : 0);
  const eq = how === "none" ? "x² + 6x = −5" : how === "left" ? "x² + 6x + 9 = −5" : "x² + 6x + 9 = −5 + 9";
  return (
    <figure className="balance">
      <div className="formula"><div>{eq}</div></div>
      <div className="pans">
        <div className={`pan ${left === right ? "even" : "off"}`}><span className="muted small">Left side at x = −1</span><strong>{minus(String(left))}</strong></div>
        <div className={`pan ${left === right ? "even" : "off"}`}><span className="muted small">Right side</span><strong>{minus(String(right))}</strong></div>
      </div>
      <figcaption>{left === right ? "Equal: the equation is still true for x = −1, so its solutions have not changed." : "Not equal: adding to one side only made a different equation, with different solutions."}</figcaption>
      <div className="control-row">
        <button className="secondary" onClick={() => setHow("left")}>Add 9 to the left only</button>
        <button className="secondary" onClick={() => setHow("both")}>Add 9 to both sides</button>
      </div>
      {how !== "none" && <button className="link" onClick={() => setHow("none")}>Start again</button>}
    </figure>
  );
}
