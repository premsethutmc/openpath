/**
 * recovery-handoff@0 (RESEARCH; only in the `--test --deep-recovery` build with ?deep=1, and hidden when the server's switch is off: 404).
 * The parent's SEPARATE, explicit, revocable permission for an educator who already marks this learner's written work to also see the
 * learner's answers from a recovery OpenPath handed to them. It is never implied by "Share written work". Without it the educator's help
 * list shows the skill, the reason and the step only. Nobody is emailed or messaged either way.
 */
import { useEffect, useState } from "react";
import { Api } from "../english/logic/account";

const api = new Api();

export function RecoveryAnswersPermission({ learner }: { learner: string }) {
  const [on, setOn] = useState<boolean | null>(null); // null: the server's switch is off (or unknown): nothing is shown
  const [written, setWritten] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const load = async () => {
    try {
      const a = await api.request<{ shares: { email: string }[] }>("GET", `/pupils/${learner}/recovery-answers-share/`);
      const w = await api.request<{ shares: { email: string }[] }>("GET", `/pupils/${learner}/marking-share/`);
      setAllowed(a.shares.map((s) => s.email.toLowerCase())); setWritten(w.shares.map((s) => s.email.toLowerCase())); setOn(true);
    } catch { setOn(null); }
  };
  useEffect(() => { load(); }, [learner]);
  if (!on) return null;
  const act = async (method: "POST" | "DELETE", email: string) => {
    setMsg("");
    try {
      await api.request(method, `/pupils/${learner}/recovery-answers-share/`, { email });
      setMsg(method === "POST" ? `${email} can now see recovery answers on their help list.` : `${email} can no longer see recovery answers.`);
      await load();
    } catch (e) { setMsg(String((e as Error).message ?? e)); }
  };
  return (
    <section aria-label="Recovery answers" data-recovery-answers={allowed.length}>
      <div className="section-title"><h2>Recovery answers (research prototype)</h2></div>
      <p className="small">When OpenPath cannot teach your child through a problem, it puts the problem on the help list of the educators who mark their written work. That list shows the skill, why OpenPath stopped, and the step it stopped at.</p>
      <p className="small">With this permission, a chosen educator also sees your child's answers from that recovery: each question, what was answered and whether it was right, what OpenPath told your child, and the skills it checked. This is separate from sharing written work. Nothing is shared until you allow it, and you can stop it at any time. OpenPath does not email or message anyone either way.</p>
      {!written.length ? <p className="small muted">Share written work with an educator first; only an educator who marks written work can be allowed.</p> : (
        <ul className="small">
          {written.map((e) => (
            <li key={e}>
              {e}: {allowed.includes(e) ? "can see recovery answers. " : "sees the skill, the reason and the step only. "}
              {allowed.includes(e)
                ? <button className="link" onClick={() => act("DELETE", e)}>Stop showing recovery answers to {e}</button>
                : <button className="secondary" onClick={() => act("POST", e)}>Allow {e} to see recovery answers</button>}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="small" role="status">{msg}</p>}
    </section>
  );
}
