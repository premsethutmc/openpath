/**
 * recovery-handoff@0 (RESEARCH): the educator's list of learners whose deep recovery stopped and needs a person, under Content review →
 * Marking. Only pupils whose parent shared their work with this educator appear (backend/family/handoff.py), under the marking pseudonym.
 * When the server's switch is off (404) or the account is not an educator (403), nothing is shown. Resolving records that the educator dealt
 * with it; it marks nothing and changes no learner record.
 */
import { useEffect, useState } from "react";
import { Api } from "../english/logic/account";
import { question } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";

const api = new Api();
type Evidence = { questionId: string; competency?: string; response: string; verdict: string | null; at?: string; step: string | null };
type Row = { id: number; pupil: string; learner: string; skill: string; step: string; reason: string; status: "open" | "resolved"; createdAt: string; reportedAt: string; reports: number; resolvedAt: string | null; note: string; answersShared: boolean; original?: string; detail?: string; path?: string[]; evidence?: Evidence[] };
const REASON: Record<string, string> = {
  "missing-content": "OpenPath has no teaching it can use for this step",
  "no-fresh-question": "OpenPath has no fresh question on the same skill",
  "teaching-not-worked": "OpenPath's teaching did not work",
  "budget-exhausted": "The recovery used its effort limit",
  unsettled: "The recovery could not settle on a next step",
};
const nameOf = (id: string) => (graph.byId.has(id) ? graph.get(id).name : id);
const promptOf = (qid: string) => { try { return question(qid.replace(/:(mc|w)$/, "")).prompt; } catch { return qid; } };
const VERDICT: Record<string, string> = { correct: "right", incorrect: "wrong", partial: "partly right", unresolved: "not decided" };

export function Handoffs() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const load = () => api.request<{ handoffs: Row[] }>("GET", "/recovery-handoffs/").then((r) => setRows(r.handoffs)).catch((e) => { if (![403, 404].includes((e as { status?: number }).status ?? 0)) setError(String((e as Error).message ?? e)); });
  useEffect(() => { load(); }, []);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!rows) return null;
  const open = rows.filter((r) => r.status === "open").length;
  return (
    <section aria-label="Learners who need help" data-handoffs={open}>
      <h2>Learners who need help ({open} open)</h2>
      <p className="small muted">Research prototype. OpenPath lists a learner here when its recovery stopped and could not teach them through. Only learners whose parents chose to share their written work with you appear, under the same pseudonym as their written answers. You see the skill, why OpenPath stopped and the step; a learner's recovery answers are shown only if their parent has separately allowed it. Nobody is emailed or messaged: this list is the only place it shows. Marking one as dealt with is not a mark or mastery. It records an auditable allowance for one fresh check on the learner’s own; earlier answers remain. The learner’s app shows your note and the way back.</p>
      {!rows.length && <p className="muted">No learner needs help.</p>}
      {rows.map((r) => <HandoffOne key={r.id} r={r} onDone={load} />)}
    </section>
  );
}

function HandoffOne({ r, onDone }: { r: Row; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <article className="qcard" data-handoff={r.id} data-handoff-status={r.status}>
      <p className="eyebrow">{r.learner} · {nameOf(r.skill)} · {r.status === "open" ? "needs help" : `dealt with ${r.resolvedAt?.slice(0, 10) ?? ""}`}</p>
      <p><b>{REASON[r.reason] ?? r.reason}</b>{r.step && r.step !== r.skill ? <> at <b>{nameOf(r.step)}</b></> : null}.</p>
      {r.answersShared && r.detail ? <p className="small">What the learner was told: {r.detail}</p> : null}
      <p className="small muted">{r.answersShared && r.original ? <>The problem: {promptOf(r.original)}{r.path && r.path.length > 1 ? <> · Checked: {r.path.map(nameOf).join(" › ")}</> : null} · </> : null}Reported {r.reportedAt.slice(0, 10)}{r.reports > 1 ? ` (${r.reports} times)` : ""}</p>
      {!r.answersShared && <p className="small muted" data-answers="not-shared">The parent has not allowed this learner's recovery answers to be shown, so only the skill, the reason and the step are here.</p>}
      {r.evidence?.length ? (
        <details><summary>The learner's answers in this recovery ({r.evidence.length})</summary>
          <table className="matrix small"><thead><tr><th>Skill</th><th>Question</th><th>Answer</th><th>Result</th></tr></thead><tbody>
            {r.evidence.map((e, i) => <tr key={i}><td>{e.step ? nameOf(e.step) : e.competency ? nameOf(e.competency) : ""}</td><td>{promptOf(e.questionId)}</td><td>{e.response}</td><td>{e.verdict ? VERDICT[e.verdict] ?? e.verdict : "not decided"}</td></tr>)}
          </tbody></table>
        </details>
      ) : null}
      {r.status === "resolved" ? (
        <p role="status" className="small">Dealt with{r.note ? `: ${r.note}` : "."}</p>
      ) : (
        <>
          <label className="field">Note for the learner (optional)<textarea aria-label="Note for the learner" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="actions">
            <button className="primary" onClick={async () => {
              try { await api.request("POST", `/recovery-handoffs/${r.id}/resolve/`, { note }); onDone(); } catch (e) { setMsg(String((e as Error).message ?? e)); }
            }}>Mark as dealt with</button>
          </div>
          {msg && <p className="error" role="alert">{msg}</p>}
        </>
      )}
    </article>
  );
}
