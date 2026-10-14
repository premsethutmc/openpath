/**
 * Progress: every skill with answers, as the engine and the profile see it (standing, evidence by kind, estimate
 * with its certainty), then the parent and teacher overview. What has been tried is kept apart from what has been
 * shown on one's own; nothing is summed into one score.
 */
import type { Learner } from "../logic/learner.ts";
import { patternTitle } from "../logic/plan.ts";
import { patternStatus } from "../logic/state.ts";
import { STATUS_WORDS } from "./Home.tsx";
import { ParentSummary } from "./Journey.tsx";
import { CapabilityCard, ParentOverviewView } from "./Profile.tsx";

export function ProgressView({ learner }: { learner: Learner }) {
  const { profile, overview } = learner.overview();
  const s = learner.state;
  const patterns = [...s.patterns.values()];
  const checked = profile.capabilities.filter((x) => x.standing !== "not_checked");
  const unchecked = profile.capabilities.filter((x) => x.standing === "not_checked");
  const strands = [...new Set(checked.map((x) => x.strand))];
  const shown = checked.filter((x) => x.standing === "shown" || x.standing === "confirmed").length;
  return (
    <main className="page" aria-labelledby="progress-title">
      <p className="eyebrow">Your growth</p>
      <h1 id="progress-title" className="hero">
        Your progress <span aria-hidden="true">🌱</span>
      </h1>
      <p className="sub">We separate what you've tried from what you've shown on your own. Levels are estimates on OpenPath's scale of 1 to 8, with how sure we are.</p>
      <div className="stats" aria-label="Summary">
        <div className="stat">
          <b>{checked.length}</b>
          <small>skill{checked.length === 1 ? "" : "s"} with answers</small>
        </div>
        <div className="stat">
          <b>{shown}</b>
          <small>shown on your own</small>
        </div>
      </div>
      <section aria-labelledby="profile-title">
        <h2 id="profile-title">Every skill with answers so far</h2>
        {strands.map((st) => (
          <section key={st} aria-label={st} style={{ margin: "0.5rem 0" }}>
            <h3 className="strand">{st}</h3>
            <ul className="caps">
              {checked
                .filter((x) => x.strand === st)
                .map((x) => (
                  <CapabilityCard key={x.id} cap={x} />
                ))}
            </ul>
          </section>
        ))}
        {checked.length === 0 && (
          <div className="tile">
            <b>No answers yet</b>
            <p>Progress starts with the first questions on Home. Nothing is shown until there is evidence for it.</p>
          </div>
        )}
      </section>
      {patterns.length > 0 && (
        <section aria-labelledby="patterns-title">
          <h2 id="patterns-title">Spelling patterns</h2>
          <table className="patterns-table">
            <thead>
              <tr>
                <th scope="col">Pattern</th>
                <th scope="col">Status</th>
                <th scope="col">Practice</th>
                <th scope="col">New words</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => {
                const last = p.transfers[p.transfers.length - 1];
                const prac = p.practice;
                return (
                  <tr key={p.key}>
                    <td>{patternTitle(learner.content, p.capability, p.step)}</td>
                    <td>{STATUS_WORDS[patternStatus(p)]}</td>
                    <td>{prac.length ? `${prac.filter((x) => x.correct).length}/${prac.length}` : "–"}</td>
                    <td>{last ? `${last.right}/${last.total}` : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small">"New words" is the latest check with words you had never seen: it shows whether the rule has stuck, not just the words practised.</p>
        </section>
      )}
      <section className="panel" aria-labelledby="grownups-title">
        <h2 id="grownups-title">For parents and teachers</h2>
        <p className="small">Strengths, gaps, how good the evidence is, and what comes next: never a single score, and never compared with other children.</p>
        <ParentOverviewView profile={profile} overview={overview} />
        {learner.doublingReport().started && <ParentSummary report={learner.doublingReport()} />}
      </section>
      <section aria-labelledby="others-title">
        <h2 id="others-title">Not checked yet</h2>
        <p className="small">No answers yet: nothing is known about these, and that is not a weakness. The plan checks them when it is useful.</p>
        <details>
          <summary>{unchecked.length} skills not checked yet</summary>
          <ul className="caps">
            {unchecked.map((x) => (
              <CapabilityCard key={x.id} cap={x} />
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}
