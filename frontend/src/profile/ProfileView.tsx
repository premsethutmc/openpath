/** The grown-ups' view: what the evidence shows, why, and what comes next. */
import { useRef, useState } from "react";

import { now, offsetDays, resetClock, skipDays } from "../core/clock";
import { curriculum } from "../core/curriculum";
import type { Identity } from "../core/identity";
import { download, recoveryFile, restoreFromFile } from "../core/recovery";
import type { EvidenceStore } from "../core/store";
import type { Criteria, EvidenceEvent, Overview, Profile, RoundSummary, SessionResult, SkillView, Status } from "../core/types";

const STATUS: Record<Status, string> = {
  no_evidence: "Not seen yet",
  emerging: "Just starting",
  developing: "Growing",
  secure_pending_retention: "Looking secure, checking again later",
  mastered: "Secure",
  needs_review: "Worth revisiting",
};

/** True when the page runs somewhere that blocks file downloads (an embedded preview). */
declare const __OPENPATH_EMBED__: boolean;

const PLURAL: Record<string, string> = { apple: "apples", orange: "oranges", pear: "pears" };
const policy = curriculum.mastery_policy;

const CRITERIA: [keyof Criteria, string][] = [
  ["enough_observations", `Right without help at least ${policy.min_independent} times`],
  ["varied_contexts", "In more than one situation (different numbers or fruit)"],
  ["recent_accuracy", "Mostly right in the latest tries"],
  ["multiple_sessions", "On more than one visit"],
  ["retained_over_time", `Still right at least ${policy.retention_gap_days} days after the first success`],
];

const ERRORS: Record<string, string> = {
  too_few: "stopped too early",
  too_many: "took too many",
  took_all: "took everything on the shelf",
  wrong_kind: "added a different fruit",
  empty: "checked with an empty basket",
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "";

function describeRound(round: RoundSummary): string {
  const what = `${round.target} ${PLURAL[round.target_kind] ?? round.target_kind}`;
  const how = round.representation === "set" ? "to match pictured plates" : "from a written numeral";
  const first = round.first_error ? ERRORS[round.first_error] : "";
  let result: string;
  if (round.outcome === "independent") {
    result = round.self_corrected ? "right at the first check, after fixing a slip unprompted" : "right at the first check";
  } else if (round.outcome === "supported") {
    result = `${first} at first, then got there with help (${round.wrong_checks} ${round.wrong_checks === 1 ? "hint" : "hints"})`;
  } else if (round.outcome === "not_yet") {
    result = `${first}, and did not finish`;
  } else {
    result = "not attempted";
  }
  return `${what} ${how}: ${result}.`;
}

function Dots({ skill }: { skill: SkillView }) {
  const dots: string[] = [
    ...Array<string>(skill.counts.independent).fill("independent"),
    ...Array<string>(skill.counts.supported).fill("supported"),
    ...Array<string>(skill.counts.not_yet).fill("not_yet"),
  ];
  if (!dots.length) return null;
  const parts = [
    skill.counts.independent && `${skill.counts.independent} without help`,
    skill.counts.supported && `${skill.counts.supported} with help`,
    skill.counts.not_yet && `${skill.counts.not_yet} not yet`,
  ].filter(Boolean);
  return (
    <p className="dots">
      <span aria-hidden="true">
        {dots.map((kind, i) => (
          <i key={i} className={`dot ${kind}`} />
        ))}
      </span>
      {parts.join(", ")}
    </p>
  );
}

function SkillRow({ skill, names }: { skill: SkillView; names: Map<string, string> }) {
  const seen = skill.status !== "no_evidence";
  return (
    <li className={`skill status-${skill.status}${skill.ready ? "" : " later"}`}>
      <div className="skill-head">
        <h3>{skill.name}</h3>
        <span className="chip">{STATUS[skill.status]}</span>
      </div>
      <p className="skill-about">{skill.description}</p>
      <Dots skill={skill} />
      {seen && skill.status !== "mastered" && (
        <details className="why">
          <summary>What it takes to call this secure</summary>
          <ul className="criteria">
          {CRITERIA.map(([key, label]) => (
            <li key={key} className={skill.criteria[key] ? "met" : ""}>
              <span aria-hidden="true">{skill.criteria[key] ? "✓" : "○"}</span>
              {label}
              <span className="sr-only">{skill.criteria[key] ? " (met)" : " (not yet)"}</span>
            </li>
          ))}
          </ul>
        </details>
      )}
      {skill.next_review_at && (
        <p className="note">
          {skill.review_due ? "Ready to be checked again now." : `Will be checked again from ${day(skill.next_review_at)}.`}
        </p>
      )}
      {!seen && !skill.assessed && (
        <p className="note">
          {skill.ready
            ? "Open: the skills it builds on look secure. No activity for it exists in this prototype yet."
            : `Opens once these look secure: ${skill.waiting_on.map((key) => names.get(key)).join(", ")}.`}
        </p>
      )}
    </li>
  );
}

export function ProfileView({
  overview,
  before,
  lastResult,
  identity,
  store,
  canUseServer,
  syncError,
  onBack,
  onRefresh,
  onNickname,
  onConsent,
  onRestored,
  onErased,
}: {
  overview: Overview;
  /** The profile as it stood when this visit began. */
  before: Profile;
  lastResult: SessionResult | null;
  identity: Identity;
  store: EvidenceStore;
  /** True when this build can keep the record on an OpenPath server. */
  canUseServer: boolean;
  syncError: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onNickname: (nickname: string) => void;
  onConsent: () => Promise<void>;
  onRestored: (identity: Identity) => void;
  onErased: () => void;
}) {
  const [events, setEvents] = useState<EvidenceEvent[] | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [shown, setShown] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Hand the family a file, or show it as text where downloads are blocked. */
  const give = (title: string, filename: string, data: unknown) => {
    if (__OPENPATH_EMBED__) {
      setCopied(false);
      setShown({ title, text: JSON.stringify(data, null, 2) });
    } else {
      download(filename, data);
    }
  };
  const names = new Map(overview.profile.skills.map((s) => [s.key, s.name]));
  const who = identity.nickname || "This learner";
  const plan = overview.next_session;
  const shifted = offsetDays();
  const was = new Map(before.skills.map((s) => [s.key, s.status]));
  const changes = overview.profile.skills.filter((s) => was.get(s.key) !== s.status);

  const loadEvents = async () => {
    const data = (await store.exportAll()) as { sessions: { events: EvidenceEvent[] }[] };
    setEvents(data.sessions.length ? data.sessions[data.sessions.length - 1].events : []);
  };

  return (
    <main className="grownups">
      <button type="button" className="back" onClick={onBack}>
        Back to the game
      </button>
      <h1>What {who === "This learner" ? "this learner" : who} has shown so far</h1>
      <p className="lede">
        Each line is a reading of the evidence about one skill, never a judgement of the child. Nothing is called secure
        after one good visit.
      </p>
      {syncError && (
        <p className="alert" role="alert">
          The last visit could not be sent to the server ({syncError}) It is saved on this device and will be sent the
          next time the server is reachable.
        </p>
      )}

      {lastResult && (
        <section>
          <h2>The latest visit</h2>
          {lastResult.session.integrity !== "ok" ? (
            <p className="alert">This recording did not replay cleanly, so it was stored but not assessed.</p>
          ) : (
            <ol className="rounds">
              {lastResult.session.rounds.map((round) => (
                <li key={round.round}>{describeRound(round)}</li>
              ))}
            </ol>
          )}
          {changes.length > 0 && (
            <ul className="changes">
              {changes.map((skill) => (
                <li key={skill.key}>
                  <strong>{skill.name}</strong> moved from “{STATUS[was.get(skill.key)!]}” to “{STATUS[skill.status]}”.
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2>Skills</h2>
        <ol className="path">
          {overview.profile.skills.map((skill) => (
            <SkillRow key={skill.key} skill={skill} names={names} />
          ))}
        </ol>
      </section>

      <section>
        <h2>The next visit</h2>
        <p>{plan.reason}</p>
        <ol className="rounds">
          {plan.rounds.map((round) => (
            <li key={round.id}>
              {round.target} {PLURAL[round.target_kind]} {round.representation === "set" ? "to match pictured plates" : "from a written numeral"}
              {Object.keys(round.available).length > 1 ? ", with another fruit mixed in" : ""}.
            </li>
          ))}
        </ol>
        <p className="note">{overview.sessions_completed} completed {overview.sessions_completed === 1 ? "visit" : "visits"} so far.</p>
      </section>

      <section>
        <h2>The raw record</h2>
        <p>
          The game only records what happened. The assessment rules replay this record to reach the readings above, and
          can be rerun whenever the rules improve.
        </p>
        {events === null ? (
          <button type="button" className="secondary" onClick={loadEvents}>
            Show the latest visit's record
          </button>
        ) : events.length === 0 ? (
          <p className="note">Nothing recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Trip</th>
                  <th>What happened</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.seq}>
                    <td>{(event.t / 1000).toFixed(1)}s</td>
                    <td>{event.round ?? ""}</td>
                    <td>{event.type}</td>
                    <td>
                      <code>{Object.keys(event.data).length ? JSON.stringify(event.data) : ""}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Your data</h2>
        <p>
          {store.kind === "server"
            ? "The record is kept on the OpenPath server under a random ID. The nickname stays on this device and is never sent."
            : "Everything is kept in this browser on this device. Nothing has been sent anywhere."}
        </p>
        {canUseServer && store.kind === "device" && (
          <div className="consent">
            <h3>Keep the record on the OpenPath server</h3>
            <p>This keeps it safe if this device is lost and lets you use more than one device. No name is sent.</p>
            <label className="check">
              <input id="consent" type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>
                I am this child's parent or guardian. I agree to their play being stored on the OpenPath server as
                learning evidence under a random ID. I can get a copy of it or erase it at any time.
              </span>
            </label>
            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={async () => {
                if (!agreed) {
                  setProblem("Tick the box to agree first.");
                  return;
                }
                setSaving(true);
                setProblem(null);
                try {
                  await onConsent();
                } catch (error) {
                  setProblem((error as Error).message);
                }
                setSaving(false);
              }}
            >
              {saving ? "Saving…" : "Agree and save"}
            </button>
          </div>
        )}
        {problem && (
          <p className="alert" role="alert">
            {problem}
          </p>
        )}
        <label className="field">
          <span>Nickname on this device (optional)</span>
          <input id="nickname" value={identity.nickname} onChange={(event) => onNickname(event.target.value)} maxLength={24} autoComplete="off" />
          <small>Only shown here. It is never sent or stored with the learning record.</small>
        </label>
        <p className="note">
          Learner ID <code>{identity.learner_id}</code>
        </p>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={async () => give("All data", `openpath-data-${identity.learner_id}.json`, await store.exportAll())}
          >
            {__OPENPATH_EMBED__ ? "Show all data" : "Download all data"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => give("Recovery file", `openpath-recovery-${identity.learner_id}.json`, recoveryFile(identity))}
          >
            {__OPENPATH_EMBED__ ? "Show recovery file" : "Download recovery file"}
          </button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
            Restore from a recovery file
          </button>
          {!confirmErase && (
            <button type="button" className="danger" onClick={() => setConfirmErase(true)}>
              Erase this learner
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              onRestored(restoreFromFile(await file.text()));
            } catch (error) {
              setProblem((error as Error).message);
            }
          }}
        />
        {confirmErase && (
          <div className="alert" role="alertdialog" aria-label="Confirm erasing">
            <p>This erases the learner and every recorded visit. It cannot be undone.</p>
            <div className="actions">
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  await store.erase();
                  onErased();
                }}
              >
                Erase everything
              </button>
              <button type="button" className="secondary" onClick={() => setConfirmErase(false)}>
                Keep it
              </button>
            </div>
          </div>
        )}
        {shown && (
          <div className="shown">
            <div className="actions">
              <strong>{shown.title}</strong>
              <button
                type="button"
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shown.text);
                    setCopied(true);
                  } catch {
                    document.querySelector<HTMLTextAreaElement>("#shown-text")?.select();
                  }
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="secondary" onClick={() => setShown(null)}>
                Close
              </button>
            </div>
            <textarea id="shown-text" readOnly value={shown.text} rows={10} aria-label={shown.title} />
            <p className="note">Downloads are blocked in this preview. Copy the text and save it as a .json file.</p>
          </div>
        )}
      </section>

      <section className="review-tools">
        <h2>For reviewers</h2>
        <p>
          Retention needs real days to pass. To see it without waiting, move this device's clock forward and play
          another visit.
          {shifted > 0 && ` The clock is currently ${shifted} days ahead (${day(now().toISOString())}).`}
        </p>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              skipDays(policy.retention_gap_days);
              onRefresh();
            }}
          >
            Skip ahead {policy.retention_gap_days} days
          </button>
          {shifted > 0 && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                resetClock();
                onRefresh();
              }}
            >
              Reset the clock
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
