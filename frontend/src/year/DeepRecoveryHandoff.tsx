/**
 * recovery-handoff@0 (RESEARCH): the note on a deep-recovery stop screen. It reports the stop to the server once (deduplicated there) and says
 * only what the server's answer makes true; until then, or if the server cannot be reached or has the switch off (404), it shows the
 * original honest note. Nothing is emailed or messaged; see learning/deep-recovery-handoff.ts and backend/family/handoff.py.
 */
import { useEffect, useState } from "react";
import { Api } from "../english/logic/account";
import type { DeepScreen } from "../learning/deep-recovery-app";
import { handoffReport, handoffText, type HandoffStatus } from "../learning/deep-recovery-handoff";

const api = new Api();

export function DeepRecoveryHandoff({ original, screen, learner }: { original: string; screen: DeepScreen; learner: string | undefined }) {
  const [got, setGot] = useState<{ h: HandoffStatus; educatorCanSee: boolean } | null>(null);
  const report = learner ? handoffReport(original, screen) : null;
  const key = report && `${report.skill}|${report.episode}|${report.reason}`;
  useEffect(() => {
    if (!report || !learner) return;
    let live = true;
    api.request<HandoffStatus & { educatorCanSee: boolean }>("POST", `/pupils/${learner}/recovery-handoffs/`, report)
      .then((r) => { if (live) setGot({ h: r, educatorCanSee: r.educatorCanSee }); })
      .catch(() => { /* not reachable or switched off: the honest note stays */ });
    return () => { live = false; };
  }, [key, learner]);
  const phase = screen.kind === "end" ? screen.phase : "";
  return <p className="small" data-deep-handover={phase} data-handoff={got ? `${got.h.status}${got.h.status === "open" ? (got.educatorCanSee ? ":visible" : ":not-shared") : ""}` : "not-sent"}>{handoffText(got?.h ?? null, got?.educatorCanSee ?? false)}</p>;
}
