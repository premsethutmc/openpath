/**
 * play@1 (child build): "Play" — more questions just for fun. Pick a topic already met, then fresh questions of it for as
 * long as she likes, easy first and harder as she gets them right (packages/learning/src/play.ts). The same question screen
 * as practice: step help, Chintu and the scribble pad are all there. Stopping is always one tap away.
 */
import { useMemo, useState } from "react";
import { graph } from "../../../packages/learning/src/graph";
import { PLAY_CONTEXT, PLAY_STEPS, playLevel, playNext, playTopics } from "../../../packages/learning/src/play";
import { Ask, Feedback, type Ctx, type Fb } from "./Learn";
import { kidName } from "./kid";

const shortName = (s: string) => s.replace(/\s*\([^)]*\)/g, "").replace(/[;:].*$/, "").trim();
const nameOf = (c: string) => kidName(c, shortName(graph.get(c).name));

export function PlayPicker({ ctx, onPick }: { ctx: Ctx; onPick: (competency: string) => void }) {
  const topics = useMemo(() => playTopics(ctx.records), [ctx.records]);
  return (
    <div className="stack" data-testid="play-picker">
      <h1>Play</h1>
      <p className="why">Pick a topic. As many questions as you like, just for fun. They get harder as you get them right.</p>
      {topics.length === 0
        ? <p className="muted" role="note">Start a chapter first. Topics you have tried come here to play with.</p>
        : <ul className="kid-chapters">{topics.map((c) => <li key={c}><button className="kid-chapter" data-play-topic={c} onClick={() => onPick(c)}><span className="kid-chapter-icon" aria-hidden="true">🎲</span><span className="kid-chapter-name">{nameOf(c)}</span></button></li>)}</ul>}
    </div>
  );
}

export function Play({ competency, ctx, onExit }: { competency: string; ctx: Ctx; onExit: () => void }) {
  const [fb, setFb] = useState<Fb | null>(null);
  const [n, setN] = useState(0);
  const [round, setRound] = useState({ asked: 0, right: 0 });
  // the question is chosen once per turn: saving the answer must not change it under her
  const qid = useMemo(() => playNext(competency, ctx.records), [competency, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const level = playLevel(competency, ctx.records);
  const stars = Math.min(5, Math.ceil((level / PLAY_STEPS) * 5));
  return (
    <div className="stack" data-testid="play" data-play-level={level}>
      <p className="eyebrow">Play · {nameOf(competency)}</p>
      <p className="small muted" aria-label={`Level ${stars} of 5`}><span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>{round.asked > 0 && ` · ${round.right} of ${round.asked} right`}</p>
      {!qid
        ? <><p className="why" role="status">You have done every question on this topic. Amazing!</p><button className="primary wide" onClick={onExit}>Pick another topic</button></>
        : fb
          ? <Feedback fb={fb} label="Next question" onNext={() => { setFb(null); setN(n + 1); }} />
          : <Ask key={qid} qid={qid} activity="practice" context={PLAY_CONTEXT} hintAllowed ctx={ctx} onAnswered={(f) => { setRound((r) => ({ asked: r.asked + 1, right: r.right + (f.right ? 1 : 0) })); setFb(f); }} />}
      {qid && <button type="button" className="link" data-testid="play-stop" onClick={onExit}>Stop playing</button>}
    </div>
  );
}
