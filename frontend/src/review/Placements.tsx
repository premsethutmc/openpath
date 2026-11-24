/**
 * Content review → Placements (placements@1): real sittings of the word check and Find my level, with the level given
 * and the answers behind it, so a placement can be checked against what is known about the person. Every account
 * sees its own learners; the owner also sees other learners without names or words (backend/family/placements.py).
 */
import { useEffect, useState } from "react";
import type { Api } from "../english/logic/account";
import { PART, type Placements as Data, byLevel, invented, resultLine, summaryText, wordsLine } from "./placement-lines";

export function Placements({ api, onError }: { api: Api; onError: (m: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    api.request<Data>("GET", "/placements/").then(setData).catch((e) => onError(String((e as Error).message ?? e)));
  }, []);
  if (!data) return <p className="muted">Loading placements…</p>;
  const text = summaryText(data);
  return (
    <section aria-label="Placements" data-placements={data.placements.length}>
      <h1>Placements</h1>
      <p className="small muted">
        Every sitting of the word check and Find my level in the last {data.days} days: the level given and the answers behind it. Nothing a learner typed is shown.
        {data.everyone ? " Learners on other accounts appear without a name and without the words asked, unless their parent shared them for diagnostics." : " You see the learners on your own account."}
      </p>
      {!data.placements.length && <p className="muted">No one has taken the word check or Find my level in this time.</p>}
      {!!data.placements.length && (
        <p>
          <button className="secondary" onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false))}>{copied ? "Copied" : "Copy everything as text"}</button>
        </p>
      )}
      {data.placements.map((l, i) => (
        <article className="stack" style={{ borderTop: "1px solid var(--line, #e3e6ef)", paddingTop: 12, marginTop: 12 }} key={i} data-learner={l.mine ? "mine" : l.shared ? "shared" : "unnamed"}>
          <h2 style={{ margin: 0 }}>{l.learner}{l.mine ? "" : l.shared ? " (shared)" : ""}</h2>
          {l.sittings.map((s, j) => {
            const fake = invented(s);
            const words = wordsLine(s);
            return (
              <div key={j} data-part={s.part} style={{ marginTop: 10 }}>
                <p style={{ margin: 0 }}>
                  <b>{PART[s.part]}</b>: {resultLine(s)}
                </p>
                <p className="small muted" style={{ margin: 0 }}>
                  {s.at.slice(0, 16).replace("T", " ")} UTC · {s.answers.length} answers{s.part === "words" && typeof s.start === "number" ? ` · started at level ${s.start}` : ""}{s.mode ? ` · ${s.mode} check` : ""}
                </p>
                {!!s.answers.length && <p className="small" style={{ margin: "4px 0 0" }}>{byLevel(s)}{fake.asked ? ` · invented words claimed: ${fake.claimed} of ${fake.asked}` : ""}</p>}
                {words && (
                  <details className="small">
                    <summary>What was asked</summary>
                    <p style={{ margin: "4px 0 0" }}>{words}</p>
                  </details>
                )}
              </div>
            );
          })}
        </article>
      ))}
    </section>
  );
}
