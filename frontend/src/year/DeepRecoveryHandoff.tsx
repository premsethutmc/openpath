/**
 * recovery-handoff@0 (RESEARCH): the note on a deep-recovery stop screen, and on a module paused by deep recovery. A genuine stop (the learner
 * needs a person) is reported to the server once (deduplicated there) and the note says only what the server's answer makes true; until then,
 * or if the server cannot be reached or has the switch off (404), it shows the original honest note. A routine sitting-limit pause reports
 * nothing and says so. Nothing is emailed or messaged; see learning/deep-recovery-handoff.ts and backend/family/handoff.py.
 */
import { useEffect, useState } from "react";
import { Api } from "../english/logic/account";
import type { DeepScreen } from "../learning/deep-recovery-app";
import { ROUTINE_PAUSE, handoffReport, handoffText, moduleStop, type HandoffStatus } from "../learning/deep-recovery-handoff";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import type { Ctx } from "./Learn";

const api = new Api();
const learnerOf = (session: string) => /^learn:([^:]+):/.exec(session)?.[1];

export function DeepRecoveryHandoff({ original, screen, learner, records }: { original: string; screen: DeepScreen; learner: string | undefined; records: LearnerRecords }) {
  const [got, setGot] = useState<{ h: HandoffStatus; educatorCanSee: boolean } | null>(null);
  const report = learner ? handoffReport(original, screen, records) : null;
  const key = report && `${report.skill}|${report.episode}|${report.reason}`;
  useEffect(() => {
    if (!report || !learner) return;
    let live = true;
    api.request<HandoffStatus & { educatorCanSee: boolean }>("POST", `/pupils/${learner}/recovery-handoffs/`, report)
      .then((r) => { if (live) setGot({ h: r, educatorCanSee: r.educatorCanSee }); })
      .catch(() => { /* not reachable or switched off: the honest note stays */ });
    return () => { live = false; };
  }, [key, learner]);
  if (screen.kind === "end" && screen.phase === "pause") return <p className="small" data-handoff="routine-pause">{ROUTINE_PAUSE}</p>;
  if (screen.kind !== "end" || !screen.handover) return null;
  return <p className="small" data-deep-handover={screen.phase} data-handoff={got ? `${got.h.status}${got.h.status === "open" ? (got.educatorCanSee ? ":visible" : ":not-shared") : ""}` : "not-sent"}>{handoffText(got?.h ?? null, got?.educatorCanSee ?? false)}</p>;
}

/** a module paused BY deep recovery (deep-module.ts): the stopped episode's hand-off note; nothing for any other pause */
export function DeepModuleHandoff({ competency, ctx }: { competency: string; ctx: Ctx }) {
  const stop = moduleStop(competency, ctx.records, ctx.evidence(competency), ctx.now, ctx.session, ctx.evidence);
  return stop ? <DeepRecoveryHandoff original={stop.original} screen={stop.screen} learner={learnerOf(ctx.session)} records={ctx.records} /> : null;
}
