/** The Learning Journey: the pilot skills as a path, each through its four stages, read from the learner profile. */
import type { Learner } from "../logic/learner.ts";
import { learningPath } from "../logic/path.ts";
import type { PlanStep } from "../logic/plan.ts";
import { placementDone } from "../logic/state.ts";

const STATE_WORDS: Record<string, string> = { done: "done", now: "next", later: "later", not_needed: "not needed", due: "due now", not_kept: "not kept" };

export function PathView({ learner, onStart }: { learner: Learner; onStart: (s: PlanStep) => void }) {
  const profile = learner.profile();
  const s = learner.state;
  const started = placementDone(s);
  const skills = learningPath(profile, learner.content.pilot.capabilities, new Set(s.lessons.keys()), s.preferences?.goal ?? null, started);
  return (
    <main className="page" aria-labelledby="journey-title">
      <p className="eyebrow">Your English journey</p>
      <h1 id="journey-title" className="hero">
        Your learning path <span aria-hidden="true">🗺️</span>
      </h1>
      <p className="sub">Each skill goes the same way: a first check, a lesson with practice, a fresh check on your own, and a later check to see what has stuck.</p>
      {!started && (
        <div className="tile peach">
          <b>First, find your starting point</b>
          <p>The journey fills in from your answers. Start with the questions on Home.</p>
        </div>
      )}
      <ol className="path">
        {skills.map((k, i) => (
          <li key={k.id} className={`st-${k.standing}`} data-capability={k.id} data-standing={k.standing}>
            <p className="num">
              {String(i + 1).padStart(2, "0")} · {k.area}
            </p>
            <h2>{k.name}</h2>
            <ol className="stages" aria-label={`Stages for ${k.name}`}>
              {k.stages.map((st) => (
                <li key={st.key} className={st.state}>
                  {st.label}
                  <span className="sr-only">: {STATE_WORDS[st.state]}</span>
                </li>
              ))}
            </ol>
            <p>{k.line}</p>
            {k.start && learner.allows(k.start.step.type) ? (
              <button type="button" className="secondary" onClick={() => onStart(k.start!.step)}>
                {k.start.label}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ) : (
              k.later && started && <p className="small">{k.later}</p>
            )}
          </li>
        ))}
      </ol>
      {learner.content.gate ? (
        <p className="small">In the pilot version, only the starting check and the spelling check are open, with teacher-approved questions. Lessons and practice are not part of the pilot.</p>
      ) : (
        <p className="small">These are the five skills of the current pilot. Other skills appear on Progress once they have answers. Every lesson and question here is draft content awaiting teacher review.</p>
      )}
    </main>
  );
}
