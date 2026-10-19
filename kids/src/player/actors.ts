/**
 * Characters on stage: a rig (layered SVG parts with pivots) plus the
 * reusable actions an episode can ask for — walk, look, blink, jump, pick up,
 * eat, react and so on. Each action is a handful of keyframed part movements;
 * the browser does the interpolation.
 */
import { BIRD_HOLD, BIRD_PIVOTS, birdSvg } from "../art/bird.ts";
import { CHINTOO_HOLD, CHINTOO_PIVOTS, chintooSvg } from "../art/chintoo.ts";
import type { Mood, Point } from "../engine/types.ts";
import { type Motion, after } from "./motion.ts";

const SVG = "http://www.w3.org/2000/svg";

export interface RigDef {
  svg: string;
  pivots: Record<string, [number, number]>;
  hold: [number, number];
  /** Height above the feet where a speech bubble points. */
  head: number;
  /** Idle movement and blinking style. */
  kind: "cat" | "bird" | "voice";
}

export const RIGS: Record<string, RigDef> = {
  chintoo: { svg: chintooSvg, pivots: CHINTOO_PIVOTS, hold: CHINTOO_HOLD, head: 300, kind: "cat" },
  bird: { svg: birdSvg, pivots: BIRD_PIVOTS, hold: BIRD_HOLD, head: 115, kind: "bird" },
  voice: { svg: "", pivots: {}, hold: [0, 0], head: 0, kind: "voice" },
};

export interface ActOptions {
  to?: Point;
  mood?: Mood;
  face?: "left" | "right";
  ms: number;
  /** For pick up / eat / wash: the prop's element, already attached by the stage when needed. */
  propEl?: SVGGElement | null;
  sound?: (name: string) => void;
}

export class Actor {
  readonly el: SVGGElement;
  private flipEl: SVGGElement;
  readonly holdEl: SVGGElement | null;
  private loops: Animation[] = [];
  private pose = new Map<string, Animation>();
  private stopWalk: (() => void) | null = null;
  x: number;
  y: number;
  facing: "left" | "right";
  mood: Mood = "neutral";

  constructor(
    readonly id: string,
    readonly rigName: string,
    readonly rig: RigDef,
    at: Point,
    facing: "left" | "right",
    readonly scale: number,
    private readonly motion: Motion,
  ) {
    this.x = at.x;
    this.y = at.y;
    this.facing = facing;
    this.el = document.createElementNS(SVG, "g");
    this.el.classList.add("rig", `rig-${rigName}`);
    this.el.dataset.actor = id;
    this.el.dataset.mood = "neutral";
    this.flipEl = document.createElementNS(SVG, "g");
    this.flipEl.classList.add("flip");
    this.flipEl.innerHTML = rig.svg;
    this.el.append(this.flipEl);
    for (const [name, [px, py]] of Object.entries(rig.pivots)) {
      for (const p of this.parts(name) as SVGElement[]) {
        p.style.transformBox = "view-box";
        p.style.transformOrigin = `${px}px ${py}px`;
      }
    }
    this.holdEl = this.flipEl.querySelector(".hold");
    this.holdEl?.setAttribute("transform", `translate(${rig.hold[0]} ${rig.hold[1]})`);
    this.place();
    this.startIdle();
  }

  private parts(name: string): Element[] {
    return [...this.flipEl.querySelectorAll(`.${name}`)];
  }
  private part(name: string): Element | null {
    return this.flipEl.querySelector(`.${name}`);
  }

  /** Put the character where the model says, with no animation. */
  place() {
    this.el.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    this.flipEl.style.transform = this.facing === "left" ? "scaleX(-1)" : "none";
  }

  /** The point a speech bubble should point at, in stage units. */
  headPoint(): Point {
    return { x: this.x, y: this.y - this.rig.head * this.scale };
  }

  /** Where a held prop is, in stage units. */
  holdPoint(): Point {
    const [hx, hy] = this.rig.hold;
    return { x: this.x + (this.facing === "left" ? -hx : hx) * this.scale, y: this.y + hy * this.scale };
  }

  setMood(mood: Mood) {
    this.mood = mood;
    this.el.dataset.mood = mood;
  }

  setTalking(on: boolean) {
    this.el.classList.toggle("talking", on);
  }

  private startIdle() {
    const m = this.motion;
    const add = (a: Animation | null) => a && this.loops.push(a);
    if (this.rig.kind === "cat") {
      add(m.loop(this.part("eye-l"), blinkFrames, 4300, { easing: "linear" }));
      add(m.loop(this.part("eye-r"), blinkFrames, 4300, { easing: "linear" }));
      add(m.loop(this.part("ear-l"), twitch(-12), 5200, { easing: "linear" }));
      add(m.loop(this.part("ear-r"), twitch(10), 6700, { easing: "linear" }));
      if (!m.reduced) {
        add(m.loop(this.part("belly"), [{ transform: "scale(1, 1)" }, { transform: "scale(1.015, 1.03)" }], 1500, { direction: "alternate" }));
        add(m.loop(this.part("tail"), [{ transform: "rotate(-5deg)" }, { transform: "rotate(7deg)" }], 1900, { direction: "alternate" }));
        add(m.loop(this.part("head"), [{ transform: "rotate(-1.5deg)" }, { transform: "rotate(1.5deg)" }], 3100, { direction: "alternate" }));
      }
    } else if (this.rig.kind === "bird") {
      add(m.loop(this.part("eye-b"), blinkFrames, 3700, { easing: "linear" }));
      if (!m.reduced) {
        add(m.loop(this.part("tail"), [{ transform: "rotate(0deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(0deg)" }], 1600));
        add(m.loop(this.part("head"), [{ transform: "rotate(0deg)" }, { transform: "rotate(0deg)", offset: 0.6 }, { transform: "rotate(-9deg)", offset: 0.7 }, { transform: "rotate(-9deg)", offset: 0.85 }, { transform: "rotate(0deg)" }], 2900));
      }
    }
  }

  /** Hold a part in a pose (replacing any earlier pose of that part) until released. */
  private hold(name: string, keyframes: Keyframe[], ms: number) {
    this.pose.get(name)?.cancel();
    const a = this.motion.animate(this.part(name), keyframes, ms, { easing: "ease-out" });
    if (a) {
      a.effect?.updateTiming({ fill: "forwards" });
      this.pose.set(name, a);
    }
  }
  private release(name: string, ms = 300) {
    const a = this.pose.get(name);
    if (!a) return;
    this.pose.delete(name);
    const el = this.part(name);
    const current = el ? getComputedStyle(el).transform : "none";
    a.cancel();
    this.motion.animate(el, [{ transform: current === "none" ? "none" : current }, { transform: "none" }], ms);
  }

  face(dir: "left" | "right", ms = 300) {
    if (dir === this.facing) return;
    this.facing = dir;
    const to = dir === "left" ? "scaleX(-1)" : "scaleX(1)";
    const from = dir === "left" ? "scaleX(1)" : "scaleX(-1)";
    this.motion.animate(this.flipEl, [{ transform: from }, { transform: "scaleX(0.05)" }, { transform: to }], ms, { commit: true });
  }

  private moveTo(to: Point, ms: number, easing = "ease-in-out", path?: Point[]) {
    const from = { x: this.x, y: this.y };
    this.x = to.x;
    this.y = to.y;
    const pts = path ?? [from, to];
    this.motion.animate(
      this.el,
      pts.map((p) => ({ transform: `translate(${p.x}px, ${p.y}px) scale(${this.scale})` })),
      ms,
      { easing, commit: true },
    );
  }

  /** Perform an action. Returns at once; the animation plays for opts.ms. */
  act(action: string, o: ActOptions) {
    const m = this.motion;
    const ms = Math.max(1, o.ms);
    if (o.mood) this.setMood(o.mood);
    if (o.face) this.face(o.face);
    const cat = this.rig.kind === "cat";

    switch (action) {
      case "idle":
        return;
      case "place":
        if (o.to) {
          this.x = o.to.x;
          this.y = o.to.y;
        }
        this.place();
        return;
      case "turn":
        if (!o.face && o.to) this.face(o.to.x < this.x ? "left" : "right", ms);
        return;
      case "walk":
      case "run": {
        if (!o.to) return;
        if (Math.abs(o.to.x - this.x) > 4) this.face(o.to.x < this.x ? "left" : "right");
        const step = action === "run" ? 260 : 420;
        this.moveTo(o.to, ms, "linear");
        this.gait(ms, step);
        return;
      }
      case "fly": {
        if (!o.to) return;
        if (Math.abs(o.to.x - this.x) > 4) this.face(o.to.x < this.x ? "left" : "right");
        const from = { x: this.x, y: this.y };
        const lift = Math.min(220, 60 + Math.abs(o.to.x - from.x) * 0.25);
        const top = Math.min(from.y, o.to.y) - lift;
        const path = [from, { x: from.x + (o.to.x - from.x) * 0.3, y: top }, { x: from.x + (o.to.x - from.x) * 0.7, y: top + 10 }, o.to];
        this.moveTo(o.to, ms, "ease-in-out", path);
        this.flap(ms, 180);
        m.animate(this.part("body"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-10deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(0deg)" }], ms);
        o.sound?.("whoosh");
        return;
      }
      case "flap":
        this.flap(ms, 200);
        return;
      case "look": {
        const dx = o.to ? Math.sign(o.to.x - this.x) * (this.facing === "left" ? -1 : 1) : 0;
        const dy = o.to ? Math.max(-1, Math.min(1, (o.to.y - (this.y - this.rig.head * this.scale * 0.7)) / 250)) : 0;
        const px = dx * 7;
        const py = dy * 7;
        for (const p of this.parts("pupil")) m.animate(p, [{ transform: `translate(${px}px, ${py}px)` }], 250, { commit: true, easing: "ease-out" });
        if (cat) this.hold("head", [{ transform: `rotate(${dy * -8 + dx * 3}deg)` }], 400);
        if (o.to && Math.abs(o.to.x - this.x) > 60 && !o.face) this.face(o.to.x < this.x ? "left" : "right");
        return;
      }
      case "blink":
        for (const e of this.parts("eye")) m.animate(e, [{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)" }, { transform: "scaleY(1)" }], Math.min(ms, 320));
        return;
      case "react":
        this.react(o.mood ?? this.mood, ms, o.sound);
        return;
      case "hop":
        this.bounce(m.reduced ? 12 : 50, ms);
        return;
      case "jump": {
        const h = m.reduced ? 20 : 150;
        this.bounce(h, ms, true);
        if (cat) {
          this.limb("arm-l", 130, ms * 0.8, 0.2);
          this.limb("arm-r", -130, ms * 0.8, 0.2);
        }
        return;
      }
      case "point": {
        const arm = cat ? "arm-r" : "wing-near";
        this.limb(arm, cat ? -120 : -40, ms);
        return;
      }
      case "wave": {
        const arm = cat ? "arm-r" : "wing-near";
        m.animate(
          this.part(arm),
          [
            { transform: "rotate(0deg)" },
            { transform: `rotate(${cat ? -150 : -50}deg)`, offset: 0.2 },
            { transform: `rotate(${cat ? -120 : -30}deg)`, offset: 0.35 },
            { transform: `rotate(${cat ? -150 : -50}deg)`, offset: 0.5 },
            { transform: `rotate(${cat ? -120 : -30}deg)`, offset: 0.65 },
            { transform: `rotate(${cat ? -150 : -50}deg)`, offset: 0.8 },
            { transform: "rotate(0deg)" },
          ],
          ms,
        );
        return;
      }
      case "dance": {
        const sway = m.reduced ? 3 : 10;
        m.animate(this.part("bob"), [0, 1, 2, 3, 4].flatMap((i) => [{ transform: `translateY(${i % 2 ? -18 : 0}px) rotate(${i % 2 ? sway : -sway}deg)` }]).concat({ transform: "none" }), ms);
        if (cat) {
          this.limb("arm-l", 150, ms, 0.15);
          this.limb("arm-r", -150, ms, 0.15);
        } else this.flap(ms, 260);
        return;
      }
      case "give": {
        const arm = cat ? "arm-r" : "head";
        m.animate(this.part(arm), [{ transform: "rotate(0deg)" }, { transform: `rotate(${cat ? -70 : 14}deg)`, offset: 0.4 }, { transform: `rotate(${cat ? -70 : 14}deg)`, offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        m.animate(this.part("bob"), [{ transform: "none" }, { transform: "rotate(4deg)", offset: 0.4 }, { transform: "rotate(4deg)", offset: 0.8 }, { transform: "none" }], ms);
        return;
      }
      case "peck":
        m.animate(this.part("head"), [{ transform: "rotate(0deg)" }, { transform: "rotate(28deg) translate(4px, 6px)", offset: 0.35 }, { transform: "rotate(0deg)", offset: 0.6 }, { transform: "rotate(28deg) translate(4px, 6px)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        o.sound?.("pop");
        return;
      case "sleep":
        this.zzz?.cancel();
        this.el.dataset.asleep = "";
        this.setMood("sleepy");
        this.hold("head", [{ transform: "rotate(-9deg) translateY(10px)" }], 600);
        this.hold("arm-l", [{ transform: "rotate(18deg)" }], 600);
        this.hold("arm-r", [{ transform: "rotate(-18deg)" }], 600);
        this.zzz = m.loop(this.part("zzz"), [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 0.9, transform: "translateY(0)", offset: 0.4 }, { opacity: 0, transform: "translateY(-30px)" }], 2600, { easing: "ease-out" });
        return;
      case "wake":
        this.zzz?.cancel();
        this.zzz = null;
        delete this.el.dataset.asleep;
        this.setMood("sleepy");
        this.release("head", 500);
        this.release("arm-l", 400);
        this.release("arm-r", 400);
        for (const e of this.parts("eye")) m.animate(e, [{ transform: "scaleY(0.1)" }, { transform: "scaleY(0.6)", offset: 0.3 }, { transform: "scaleY(0.1)", offset: 0.45 }, { transform: "scaleY(1)", offset: 0.7 }, { transform: "scaleY(1)" }], ms * 0.6, { delay: ms * 0.1 });
        this.stretch(ms * 0.6, ms * 0.4);
        after(m, ms, () => this.setMood("neutral"));
        return;
      case "stretch":
        this.stretch(ms, 0);
        return;
      case "yawn":
        this.yawn(ms);
        o.sound?.("yawn");
        return;
      case "sit":
        this.hold("bob", [{ transform: "translateY(8px) scale(1.05, 0.93)" }], ms);
        return;
      case "stand":
        this.release("bob", ms);
        return;
      case "rub-tummy":
        this.setMood(o.mood ?? "hungry");
        m.animate(this.part("arm-l"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-55deg)", offset: 0.2 }, { transform: "rotate(-40deg)", offset: 0.4 }, { transform: "rotate(-55deg)", offset: 0.6 }, { transform: "rotate(-40deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        m.animate(this.part("arm-r"), [{ transform: "rotate(0deg)" }, { transform: "rotate(55deg)", offset: 0.2 }, { transform: "rotate(40deg)", offset: 0.4 }, { transform: "rotate(55deg)", offset: 0.6 }, { transform: "rotate(40deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        if (!m.reduced) m.animate(this.part("belly"), [{ transform: "none" }, { transform: "scale(1.04, 0.98)" }, { transform: "scale(0.98, 1.03)" }, { transform: "scale(1.03, 0.99)" }, { transform: "none" }], ms);
        return;
      case "sniff":
        m.animate(this.part("head"), [{ transform: "none" }, { transform: "rotate(-6deg) translateY(-4px)", offset: 0.2 }, { transform: "rotate(-4deg)", offset: 0.35 }, { transform: "rotate(-7deg) translateY(-5px)", offset: 0.5 }, { transform: "rotate(-4deg)", offset: 0.65 }, { transform: "none" }], ms);
        return;
      case "pickup":
        m.animate(this.part("bob"), [{ transform: "none" }, { transform: "translateY(18px) scale(1.06, 0.9)", offset: 0.4 }, { transform: "translateY(18px) scale(1.06, 0.9)", offset: 0.55 }, { transform: "none" }], ms);
        if (cat) this.hold("arm-r", [{ transform: "rotate(0deg)" }, { transform: "rotate(-20deg)", offset: 0.5 }, { transform: "rotate(-58deg)" }], ms);
        return;
      case "eat":
        this.eat(ms, o.propEl ?? null, o.sound);
        return;
      case "wash":
        this.wash(ms, o.sound);
        return;
    }
  }

  private zzz: Animation | null = null;

  /** Arm holding something up (used after a prop is attached). */
  holdingPose(on: boolean) {
    if (this.rig.kind !== "cat") return;
    if (on) this.hold("arm-r", [{ transform: "rotate(-58deg)" }], 300);
    else this.release("arm-r", 300);
  }

  private gait(ms: number, step: number) {
    const m = this.motion;
    const n = Math.max(1, Math.round(ms / step));
    const it = { iterations: n, easing: "ease-in-out" };
    const per = ms / n;
    const loops: (Animation | null)[] = [];
    if (this.rig.kind === "cat") {
      if (!m.reduced) loops.push(m.animate(this.part("bob"), [{ transform: "translateY(0) rotate(-2deg)" }, { transform: "translateY(-12px) rotate(0deg)" }, { transform: "translateY(0) rotate(2deg)" }, { transform: "translateY(-12px) rotate(0deg)" }, { transform: "translateY(0) rotate(-2deg)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
      loops.push(m.animate(this.part("foot-l"), [{ transform: "translate(0,0)" }, { transform: "translate(14px,-14px) rotate(-10deg)" }, { transform: "translate(0,0)" }, { transform: "translate(-8px,0)" }, { transform: "translate(0,0)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
      loops.push(m.animate(this.part("foot-r"), [{ transform: "translate(0,0)" }, { transform: "translate(-8px,0)" }, { transform: "translate(0,0)" }, { transform: "translate(14px,-14px) rotate(-10deg)" }, { transform: "translate(0,0)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
      loops.push(m.animate(this.part("arm-l"), [{ transform: "rotate(14deg)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(14deg)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
      if (!this.pose.has("arm-r")) loops.push(m.animate(this.part("arm-r"), [{ transform: "rotate(-14deg)" }, { transform: "rotate(14deg)" }, { transform: "rotate(-14deg)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
      loops.push(m.animate(this.part("tail"), [{ transform: "rotate(-8deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-8deg)" }], per * 2, { ...it, iterations: Math.ceil(n / 2) }));
    } else {
      loops.push(m.animate(this.part("bob"), [{ transform: "translateY(0)" }, { transform: "translateY(-16px)" }, { transform: "translateY(0)" }], per, it));
    }
    this.stopWalk = () => loops.forEach((a) => a?.cancel());
  }

  private flap(ms: number, beat: number) {
    const m = this.motion;
    const n = Math.max(1, Math.round(ms / beat));
    m.animate(this.part("wing-near"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-55deg)" }, { transform: "rotate(20deg)" }, { transform: "rotate(0deg)" }], ms / n, { iterations: n, easing: "linear" });
    m.animate(this.part("wing-far"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-45deg)" }, { transform: "rotate(15deg)" }, { transform: "rotate(0deg)" }], ms / n, { iterations: n, easing: "linear" });
  }

  /** Up and down with squash and stretch. */
  private bounce(height: number, ms: number, squash = false) {
    const s = squash && !this.motion.reduced;
    this.motion.animate(
      this.part("bob"),
      [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: s ? "translateY(6px) scale(1.1, 0.88)" : "translateY(0)", offset: 0.18 },
        { transform: `translateY(${-height}px) scale(${s ? "0.94, 1.08" : "1, 1"})`, offset: 0.5, easing: "ease-in" },
        { transform: s ? "translateY(4px) scale(1.08, 0.9)" : "translateY(0)", offset: 0.82 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      ms,
      { easing: "ease-out" },
    );
  }

  /** Swing a limb out and back. */
  private limb(name: string, deg: number, ms: number, hold = 0.4) {
    const a = (1 - hold) / 2;
    this.motion.animate(this.part(name), [{ transform: "rotate(0deg)" }, { transform: `rotate(${deg}deg)`, offset: a }, { transform: `rotate(${deg}deg)`, offset: a + hold }, { transform: "rotate(0deg)" }], ms);
  }

  private stretch(ms: number, delay: number) {
    const m = this.motion;
    const kf = (deg: number) => [{ transform: "rotate(0deg)" }, { transform: `rotate(${deg}deg)`, offset: 0.35 }, { transform: `rotate(${deg * 0.9}deg)`, offset: 0.7 }, { transform: "rotate(0deg)" }];
    m.animate(this.part("arm-l"), kf(150), ms, { delay });
    m.animate(this.part("arm-r"), kf(-150), ms, { delay });
    m.animate(this.part("bob"), [{ transform: "none" }, { transform: "scale(0.96, 1.07)", offset: 0.4 }, { transform: "scale(0.97, 1.05)", offset: 0.7 }, { transform: "none" }], ms, { delay });
    this.yawn(ms, delay);
  }

  private yawn(ms: number, delay = 0) {
    const mouth = this.part("mouth-o");
    this.motion.animate(mouth, [{ opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.6, 2)", offset: 0.3 }, { opacity: 1, transform: "scale(1.6, 2)", offset: 0.7 }, { opacity: 0, transform: "scale(1)" }], ms, { delay });
    if (mouth instanceof SVGElement) {
      mouth.style.transformBox = "fill-box";
      mouth.style.transformOrigin = "center top";
    }
  }

  private react(mood: Mood, ms: number, sound?: (n: string) => void) {
    const m = this.motion;
    this.setMood(mood);
    switch (mood) {
      case "happy":
      case "proud":
        this.bounce(m.reduced ? 10 : 40, Math.min(ms, 700));
        m.animate(this.part("tail"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-16deg)" }, { transform: "rotate(12deg)" }, { transform: "rotate(0deg)" }], ms);
        break;
      case "surprised":
        this.bounce(m.reduced ? 8 : 34, Math.min(ms, 500));
        for (const e of this.parts("eye")) m.animate(e, [{ transform: "scale(1)" }, { transform: "scale(1.18)", offset: 0.2 }, { transform: "scale(1.12)", offset: 0.8 }, { transform: "scale(1)" }], ms);
        for (const e of this.parts("ear")) m.animate(e, [{ transform: "rotate(0deg)" }, { transform: "translateY(-10px)", offset: 0.2 }, { transform: "rotate(0deg)" }], ms);
        break;
      case "yuck":
        m.animate(this.part("head"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-10deg) translateX(-8px)", offset: 0.2 }, { transform: "rotate(8deg)", offset: 0.4 }, { transform: "rotate(-8deg)", offset: 0.6 }, { transform: "rotate(5deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        m.animate(this.part("bob"), [{ transform: "none" }, { transform: "rotate(-6deg) translateX(-10px)", offset: 0.3 }, { transform: "rotate(-6deg) translateX(-10px)", offset: 0.7 }, { transform: "none" }], ms);
        break;
      case "sad":
        m.animate(this.part("head"), [{ transform: "rotate(0deg)" }, { transform: "rotate(6deg) translateY(10px)", offset: 0.3 }, { transform: "rotate(6deg) translateY(10px)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        for (const e of this.parts("ear")) m.animate(e, [{ transform: "rotate(0deg)" }, { transform: "rotate(20deg)", offset: 0.3 }, { transform: "rotate(20deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], ms);
        break;
      case "hungry":
        this.act("rub-tummy", { ms, mood: "hungry", sound });
        break;
      default:
        break;
    }
  }

  private eat(ms: number, prop: SVGGElement | null, sound?: (n: string) => void) {
    const m = this.motion;
    if (this.rig.kind === "cat") {
      // Bring the food to the mouth, three bites, then it is gone.
      const mouth = { x: 36 - this.rig.hold[0], y: -142 - this.rig.hold[1] };
      if (this.holdEl) m.animate(this.holdEl, [{ transform: `translate(${this.rig.hold[0]}px, ${this.rig.hold[1]}px)` }, { transform: `translate(${this.rig.hold[0] + mouth.x}px, ${this.rig.hold[1] + mouth.y}px)`, offset: 0.2 }, { transform: `translate(${this.rig.hold[0] + mouth.x}px, ${this.rig.hold[1] + mouth.y}px)`, offset: 0.85 }, { transform: `translate(${this.rig.hold[0]}px, ${this.rig.hold[1]}px)` }], ms);
      this.hold("arm-r", [{ transform: "rotate(-58deg)" }, { transform: "rotate(-120deg)", offset: 0.2 }, { transform: "rotate(-120deg)", offset: 0.85 }, { transform: "rotate(-58deg)" }], ms);
      const talk = this.part("mouth-talk");
      m.animate(talk, [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((offset, i) => ({ opacity: i % 2 ? 1 : 0, offset })).concat({ opacity: 0, offset: 1 }), ms, { easing: "steps(1, end)" });
      if (prop) {
        const body = prop.querySelector(".prop-body") ?? prop;
        m.animate(body, [{ transform: "scale(1)" }, { transform: "scale(1)", offset: 0.3 }, { transform: "scale(0.75)", offset: 0.45 }, { transform: "scale(0.5)", offset: 0.6 }, { transform: "scale(0.25)", offset: 0.75 }, { transform: "scale(0)", offset: 0.82 }, { transform: "scale(0)" }], ms, { commit: true });
      }
      [0.35, 0.5, 0.65].forEach((f) => after(m, ms * f, () => sound?.("crunch")));
      after(m, ms * 0.9, () => this.setMood("happy"));
    } else {
      this.act("peck", { ms, sound });
    }
  }

  private wash(ms: number, sound?: (n: string) => void) {
    const m = this.motion;
    if (!this.holdEl) return;
    const [hx, hy] = this.rig.hold;
    const dip = (d: number) => ({ transform: `translate(${hx}px, ${hy - 70 + d}px)` });
    m.animate(this.holdEl, [{ transform: `translate(${hx}px, ${hy}px)` }, dip(0), dip(40), dip(0), dip(40), dip(0), dip(40), dip(0), { transform: `translate(${hx}px, ${hy}px)` }], ms);
    this.hold("arm-r", [{ transform: "rotate(-58deg)" }, { transform: "rotate(-95deg)" }, { transform: "rotate(-80deg)" }, { transform: "rotate(-95deg)" }, { transform: "rotate(-80deg)" }, { transform: "rotate(-95deg)" }, { transform: "rotate(-80deg)" }, { transform: "rotate(-95deg)" }, { transform: "rotate(-58deg)" }], ms);
    [0.16, 0.5, 0.83].forEach((f) => after(m, ms * f, () => sound?.("splash")));
  }

  /** Stop any walking cycle (called by the stage when the walk's time is up). */
  stopGait() {
    this.stopWalk?.();
    this.stopWalk = null;
  }
}

const blinkFrames: Keyframe[] = [
  { transform: "scaleY(1)", offset: 0 },
  { transform: "scaleY(1)", offset: 0.93 },
  { transform: "scaleY(0.08)", offset: 0.96 },
  { transform: "scaleY(1)", offset: 1 },
];
const twitch = (deg: number): Keyframe[] => [
  { transform: "rotate(0deg)", offset: 0 },
  { transform: "rotate(0deg)", offset: 0.9 },
  { transform: `rotate(${deg}deg)`, offset: 0.93 },
  { transform: "rotate(0deg)", offset: 0.97 },
  { transform: "rotate(0deg)", offset: 1 },
];
