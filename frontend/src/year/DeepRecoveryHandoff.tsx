/**
 * recovery-handoff@0 (RESEARCH): the note on a deep-recovery stop screen, and on a module paused by deep recovery. A genuine stop is reported only after an explicit request (deduplicated there) and the note says only what the server's answer makes true; until then,
 * or if the server cannot be reached or has the switch off (404), it shows the original honest note. A routine sitting-limit pause reports
 * nothing and says so. Nothing is emailed or messaged; see learning/deep-recovery-handoff.ts and backend/family/handoff.py.
 */
import { useEffect, useState } from "react";
import { Api } from "../english/logic/account";
import type { DeepScreen } from "../learning/deep-recovery-app";
import { ROUTINE_PAUSE, handoffReport, handoffText, moduleStop, type HandoffStatus } from "../learning/deep-recovery-handoff";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import { Ask, Feedback, type Fb, type Ctx } from "./Learn";
import { deepModuleState } from "../learning/deep-module";

const api = new Api();
const learnerOf = (session: string) => /^learn:([^:]+):/.exec(session)?.[1];

export function DeepRecoveryHandoff({ original, screen, learner, records, ctx }: { original: string; screen: DeepScreen; learner: string | undefined; records: LearnerRecords; ctx?: Ctx }) {
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Fb | null>(null);
  const [consent, setConsent] = useState<string | null>(null);
  const [got, setGot] = useState<{ h: HandoffStatus; educatorCanSee: boolean } | null>(null);
  const report = learner ? handoffReport(original, screen, records) : null;
  const key = report && `${learner}|${report.skill}|${report.episode}|${report.reason}`;
  useEffect(() => {
    setGot(null); setChecking(false); setFeedback(null);
    if (!report || !learner) return;
    let live = true;
    api.request<{ handoffs: HandoffStatus[]; educatorCanSee: boolean }>("GET", `/pupils/${learner}/recovery-handoffs/`).then(r => {
      const h = r.handoffs.find(h => h.episode === report.episode);
      if (live) setGot(h ? { h, educatorCanSee: r.educatorCanSee } : null);
    }).catch(() => {});
    return () => { live = false; };
  }, [key, learner]);
  useEffect(() => {
    if (!report || !learner || consent !== key) return;
    let live = true;
    api.request<HandoffStatus & { educatorCanSee: boolean }>("POST", `/pupils/${learner}/recovery-handoffs/`, report)
      .then((r) => { if (live) setGot({ h: r, educatorCanSee: r.educatorCanSee }); })
      .catch(() => { if (live) setConsent(null); /* honest note stays; retry requires another explicit choice */ });
    return () => { live = false; };
  }, [key, learner, consent]);
  if (screen.kind === "end" && screen.phase === "pause") return <p className="small" data-handoff="routine-pause">{ROUTINE_PAUSE}</p>;
  if (screen.kind !== "end" || !screen.handover) return null;
  const ms = got?.h.status === "resolved" && ctx ? deepModuleState(true, got.h.skill, records, ctx.evidence(got.h.skill), ctx.now, ctx.session, null, ctx.evidence) : null;
  if (feedback) return <Feedback fb={feedback} onNext={() => { setFeedback(null); setChecking(false); }} />;
  if (checking && ms?.phase === "reentry" && ms.question && ctx) return <Ask qid={ms.question} activity="diagnostic" context={ms.context} ctx={ctx} onAnswered={setFeedback} />;
  return <div><p className="small" data-deep-handover={screen.phase} data-handoff={got ? `${got.h.status}${got.h.status === "open" ? (got.educatorCanSee ? ":visible" : ":not-shared") : ""}` : "not-sent"}>{handoffText(got?.h ?? null, got?.educatorCanSee ?? false)}</p>
    {consent !== key && !got && <><p>Your record stays private unless your family chooses to share it. You can carry on with other skills without making a help request.</p><button onClick={() => setConsent(key || null)}>Request help: share the skill and reason with my family’s educators</button></>}
    {ms?.phase === "reentry" && <button onClick={() => setChecking(true)}>Try one fresh check on my own</button>}
    {got?.h.status === "resolved" && <p>Resolution authorises one fresh check, if available; it does not mark the skill mastered. Refresh to load a new educator response. A used check is not reopened, and your earlier history stays recorded.</p>}
  </div>;
}

/** a module paused BY deep recovery (deep-module.ts): the stopped episode's hand-off note; nothing for any other pause */
export function DeepModuleHandoff({ competency, ctx }: { competency: string; ctx: Ctx }) {
  const stop = moduleStop(competency, ctx.records, ctx.evidence(competency), ctx.now, ctx.session, ctx.evidence);
  return stop ? <DeepRecoveryHandoff original={stop.original} screen={stop.screen} learner={learnerOf(ctx.session)} records={ctx.records} ctx={ctx} /> : null;
}
