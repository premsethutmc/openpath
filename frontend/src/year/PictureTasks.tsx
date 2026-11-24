/** picture-tasks@2: a visit's picture tasks for a start-here idea, played by the scene engine's one player (Scene.tsx). */
import { useMemo, useState } from "react";
import type { Picture } from "../../../packages/learning/src/foundations";
import { exploreScene, pictureTasks } from "../../../packages/learning/src/foundation-pictures";
import { ScenePlayer } from "./Scene";

/** A few tasks on the idea's picture, made new for each visit. */
export function PictureRound({ kind, seed }: { kind: Picture; seed: number }) {
  const tasks = useMemo(() => pictureTasks(kind, seed), [kind, seed]);
  const [i, setI] = useState(0);
  const [reached, setReached] = useState(false);
  if (!tasks.length) return null;
  if (i >= tasks.length) return <section className="sh-card sh-done" role="status"><p><b>You can read the picture.</b> Come back any time: the questions change.</p></section>;
  return (
    <section className="sh-card pt" data-picture-task={kind}>
      <p className="sh-eyebrow">On the picture · {i + 1} of {tasks.length}</p>
      <ScenePlayer key={i} scene={tasks[i]} onReached={() => setReached(true)} />
      {reached && <button type="button" className="sh-show" onClick={() => { setReached(false); setI(i + 1); }}>{i + 1 < tasks.length ? "Next" : "Finish"}</button>}
    </section>
  );
}

/** Something to move and watch before the tasks, where the idea has one (a right triangle's angle and size). */
export function PictureExplore({ kind, seed }: { kind: Picture; seed: number }) {
  const scene = useMemo(() => exploreScene(kind, seed), [kind, seed]);
  return scene ? <section className="sh-card pt" data-picture-explore={kind}><p className="sh-eyebrow">Move it and watch</p><ScenePlayer scene={scene} /></section> : null;
}
