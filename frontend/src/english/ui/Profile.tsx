import type { DevelopmentRecommendation } from "../../../../packages/english-core/src/index.ts";
import { STANDING_WORDS, evidenceLine } from "../../../../packages/english-core/src/index.ts";
import type { CapabilityProfile, LearnerProfile, ParentOverview } from "../logic/profile.ts";

const CERTAINTY: Record<string, string> = { not_assessed: "Not assessed yet", early: "Early estimate", measured: "Measured" };
const names = (xs: CapabilityProfile[]) => xs.map((x) => x.name).join(", ");

/** For a parent or teacher: what has been shown, what is unsure, where help was needed, what changed, and what comes next. */
export function ParentOverviewView({ profile, overview }: { profile: LearnerProfile; overview: ParentOverview }) {
  const o = overview;
  return (
    <section className="overview" aria-labelledby="overview-title">
      <h2 id="overview-title">Overview for a parent or teacher</h2>
      <dl>
        <dt>Demonstrated independently</dt>
        <dd data-part="shown">
          {o.shown.length ? (
            <>
              <ul>
                {o.shown.map((x) => (
                  <li key={x.id}>{`${x.name}${x.shownLevel !== null ? `: at about level ${x.shownLevel} of 8` : ""}.`}</li>
                ))}
              </ul>
              <p className="small">Shown on fresh questions, without help, outside a lesson. The level is what has been shown, not a ceiling: harder questions at that skill may still be wrong.</p>
            </>
          ) : (
            "Nothing yet."
          )}
        </dd>
        <dt>Improving during practice, awaiting confirmation</dt>
        <dd data-part="improving">
          {o.improving.length ? (
            <ul>
              {o.improving.map((x) => (
                <li key={x.id}>{`${x.name}: ${x.evidence.afterTeachingRight} of ${x.evidence.afterTeaching} right in practice straight after a lesson. That is improvement, not yet independent: fresh questions without help come next.`}</li>
              ))}
            </ul>
          ) : (
            "Nothing at the moment."
          )}
        </dd>
        <dt>Insufficient evidence</dt>
        <dd data-part="uncertain">{o.uncertain.length ? `${names(o.uncertain)}. Not enough answers on their own to say yet.` : "Nothing."}</dd>
        <dt>Found hard so far</dt>
        <dd data-part="hard">
          {o.hard.length ? (
            <ul>
              {o.hard.map((x) => (
                <li key={x.id}>
                  {x.name}: {x.evidence.independentRight} of {x.evidence.independent} right on their own.
                  {x.notes.map((n, i) => (
                    <span key={i} className="note">
                      {" "}
                      {n}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            "Nothing."
          )}
        </dd>
        <dt>Needed help</dt>
        <dd data-part="helped">{o.helped.length ? <ul>{o.helped.map((x) => <li key={x.id}>{`${x.name}: right with help ${x.evidence.assistedRight} of ${x.evidence.assisted} times; on their own ${x.evidence.independentRight} of ${x.evidence.independent}. Help is recorded, but only answers on their own show what is secure.`}</li>)}</ul> : "No help used so far."}</dd>
        <dt>Due for a later check</dt>
        <dd data-part="due">{o.due.length ? <ul>{o.due.map((x) => <li key={x.id}>{`${x.name}: ${x.retention}`}</li>)}</ul> : "Nothing due."}</dd>
        <dt>Not kept at a later check</dt>
        <dd data-part="not-kept">{o.notKept.length ? <ul>{o.notKept.map((x) => <li key={x.id}>{`${x.name}: ${x.retention}`}</li>)}</ul> : "Nothing."}</dd>
        <dt>What has changed</dt>
        <dd data-part="improved">
          {o.improved.length ? <ul>{o.improved.map((t, i) => <li key={i}>{t}</li>)}</ul> : "No change to report yet."}
          <p className="small">This shows change over time in the answers. It does not show what caused it.</p>
        </dd>
        <dt>What OpenPath recommends next</dt>
        <dd data-part="next">
          {profile.plan.today.length ? (
            <ol className="recs">
              {profile.plan.today.map((r) => (
                <Rec key={`${r.action}:${r.capability}`} r={r} />
              ))}
            </ol>
          ) : (
            "Nothing the app can offer right now."
          )}
          {profile.plan.forAdults.length > 0 && (
            <>
              <p className="small">Needs a person, or content the app does not have yet:</p>
              <ul className="recs adults">
                {profile.plan.forAdults.map((r) => (
                  <Rec key={`${r.action}:${r.capability}`} r={r} />
                ))}
              </ul>
            </>
          )}
        </dd>
        <dt>Why the plan changed</dt>
        <dd data-part="changes">
          <ul>
            {o.changes.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </dd>
        <dt>Not checked yet</dt>
        <dd data-part="not-checked">{`${o.notChecked.length} areas have no answers yet. That says nothing about how well they are done: they simply have not been checked.`}</dd>
      </dl>
      {o.provisional.length > 0 && (
        <ul className="small">
          {o.provisional.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
      <p className="small">
        Every question so far is draft content that teachers have not reviewed yet, so "shown" means shown on draft questions, not a validated result. The rules behind the plan and these labels are drafts too (development-policy@0-draft), not yet reviewed by an educator. This describes answers and how sure we are about them. It is not a score of ability or potential, and it is never compared with other
        children.
      </p>
    </section>
  );
}

function Rec({ r }: { r: DevelopmentRecommendation }) {
  return (
    <li data-action={r.action} data-capability={r.capability ?? ""} data-evidence={r.evidence.flatMap((e) => e.ids).join(" ")}>
      <strong>{r.what}.</strong> {r.why}
      <details>
        <summary>Evidence, and what would change this</summary>
        <ul className="small">
          {r.evidence.map((e) => (
            <li key={e.capability}>{e.summary}</li>
          ))}
          {r.evidence.length === 0 && <li>No answers yet: this is a first look.</li>}
          <li>Would change if: {r.changeIf}</li>
          <li>{r.content.available ? "Available in the app: " : "Not available in the app: "}{r.content.note}.</li>
        </ul>
      </details>
    </li>
  );
}

/** One capability, as the profile sees it. */
export function CapabilityCard({ cap }: { cap: CapabilityProfile }) {
  return (
    <li className={`cap c-${cap.estimate.certainty} st-${cap.standing}`} data-capability={cap.id} data-standing={cap.standing}>
      <div className="cap-head">
        <h3>{cap.name}</h3>
        <span className="certainty">{CERTAINTY[cap.estimate.certainty]}</span>
      </div>
      <p className="small">
        {cap.subject} · {cap.strand} · <strong>{STANDING_WORDS[cap.standing]}</strong>
      </p>
      <p>{cap.estimate.headline}</p>
      {cap.evidence.afterTeaching > 0 && <p className="small note">{`This estimate includes ${cap.evidence.afterTeaching} answer${cap.evidence.afterTeaching === 1 ? "" : "s"} given straight after a lesson. They can raise the estimate but never make the skill "shown".`}</p>}
      <p className="small evidence">
        Evidence: {evidenceLine(cap)}
        {cap.evidence.practiceOnly ? "; practice words are recorded but not counted until checked" : ""}.{cap.basis.draft ? " All on draft questions." : ""}
      </p>
      {cap.strengths.map((t, i) => (
        <p key={`s${i}`} className="small strength">
          {t}
        </p>
      ))}
      {cap.difficulties.map((t, i) => (
        <p key={`d${i}`} className="small difficulty">
          {t}
        </p>
      ))}
      {cap.notes.map((t, i) => (
        <p key={`n${i}`} className="small note">
          {t}
        </p>
      ))}
      {cap.standing !== "not_checked" && <p className="small">Remembered later: {cap.retention}</p>}
      {cap.lastAssessedAt && <p className="small">Last answered on their own: {cap.lastAssessedAt.slice(0, 10)}.</p>}
      {cap.next && (
        <p className="small next">
          Next: {cap.next.what}
          {cap.next.content.available ? "" : ` (${cap.next.content.note})`}.
        </p>
      )}
    </li>
  );
}
