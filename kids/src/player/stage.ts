/**
 * The stage: draws an episode in one SVG and carries out the runner's steps.
 * It implements the runner's Director interface, so the runner never touches
 * the DOM and the stage never decides what happens next.
 */
import { birdDefs } from "../art/bird.ts";
import { chintooDefs } from "../art/chintoo.ts";
import { PROP_ART, propDefs } from "../art/props.ts";
import { SCENES, sceneDefs } from "../art/scenes.ts";
import type { Feedback, Input } from "../engine/primitives.ts";
import type { Director, WindowSpec } from "../engine/runner.ts";
import type { Episode, Mood, Place, Point, PropStep, Step } from "../engine/types.ts";
import { STAGE } from "../engine/validate.ts";
import { Actor, RIGS } from "./actors.ts";
import type { Audio } from "./audio.ts";
import { type Motion, after } from "./motion.ts";

const SVG = "http://www.w3.org/2000/svg";
const NUMBER_WORDS = ["zero", "One!", "Two!", "Three!", "Four!", "Five!", "Six!", "Seven!", "Eight!", "Nine!", "Ten!"];
/** How far above its resting point a prop's middle is (for touch areas and badges). */
const PROP_MIDDLE: Record<string, number> = { apple: 32, basket: 70, puddle: 0, mat: 40 };

interface PropModel {
  id: string;
  asset: string;
  variant: string;
  el: SVGGElement;
  body: SVGGElement;
  x: number;
  y: number;
  scale: number;
  hidden: boolean;
  holder: Actor | null;
  badge: SVGGElement | null;
}

const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute("class", cls);
  return el;
};

export class Stage implements Director {
  readonly svg: SVGSVGElement;
  private layers: Record<"bg" | "back" | "actors" | "front" | "sceneFront" | "fx" | "talk" | "hits", SVGGElement>;
  readonly actors = new Map<string, Actor>();
  readonly props = new Map<string, PropModel>();
  private bubbles = new Map<string, () => void>();
  private caption: HTMLElement;
  private closeHits: (() => void) | null = null;
  scene = "";
  /** Every line spoken so far (for the automated walkthrough; never stored). */
  readonly spoken: string[] = [];

  constructor(
    host: HTMLElement,
    readonly episode: Episode,
    private readonly motion: Motion,
    private readonly audio: Audio,
  ) {
    this.svg = make("svg", { viewBox: `0 0 ${STAGE.width} ${STAGE.height}`, preserveAspectRatio: "xMidYMid meet", role: "img" }, "stage");
    this.svg.setAttribute("aria-label", episode.title);
    this.svg.innerHTML = `<defs>${chintooDefs}${birdDefs}${propDefs}${sceneDefs}
      <radialGradient id="halo"><stop offset=".55" stop-color="#fff7c7" stop-opacity=".9"/><stop offset="1" stop-color="#fff7c7" stop-opacity="0"/></radialGradient>
      <clipPath id="stage-clip"><rect width="${STAGE.width}" height="${STAGE.height}"/></clipPath></defs>`;
    const root = make("g", { "clip-path": "url(#stage-clip)" });
    this.svg.append(root);
    const names = ["bg", "back", "actors", "front", "sceneFront", "fx", "talk", "hits"] as const;
    this.layers = Object.fromEntries(
      names.map((n) => {
        const g = make("g", {}, `layer layer-${n}`);
        root.append(g);
        return [n, g];
      }),
    ) as Stage["layers"];
    host.append(this.svg);
    this.caption = document.createElement("div");
    this.caption.className = "caption";
    this.caption.setAttribute("aria-live", "polite");
    host.append(this.caption);

    for (const [id, c] of Object.entries(episode.characters)) {
      const rig = RIGS[c.rig];
      if (!rig) throw new Error(`no rig "${c.rig}"`);
      const actor = new Actor(id, c.rig, rig, this.point(c.at), c.facing ?? "right", c.scale ?? 1, motion);
      this.actors.set(id, actor);
      if (rig.kind !== "voice") this.layers.actors.append(actor.el);
      if (c.hidden) actor.el.style.opacity = "0";
    }
    for (const [id, p] of Object.entries(episode.props)) {
      const variant = p.variant ?? Object.keys(PROP_ART[p.asset] ?? {})[0] ?? "";
      const el = make("g", {}, `prop prop-${p.asset}`);
      el.dataset.prop = id;
      const halo = make("ellipse", { cx: 0, cy: -(PROP_MIDDLE[p.asset] ?? 30), rx: 62, ry: 62, fill: "url(#halo)" }, "halo");
      const body = make("g", {}, "prop-body");
      body.innerHTML = PROP_ART[p.asset]?.[variant] ?? "";
      body.style.transformBox = "view-box";
      body.style.transformOrigin = `0px ${-(PROP_MIDDLE[p.asset] ?? 30)}px`;
      el.append(halo, body);
      const at = this.point(p.at);
      const model: PropModel = { id, asset: p.asset, variant, el, body, x: at.x, y: at.y, scale: p.scale ?? 1, hidden: !!p.hidden, holder: null, badge: null };
      this.props.set(id, model);
      (p.front ? this.layers.front : this.layers.back).append(el);
      this.placeProp(model);
      if (model.hidden) el.style.opacity = "0";
      if (p.background) el.style.display = "none";
    }
  }

  /** Resolve a place: coordinates, a named point, a prop or a character. */
  point(place: Place | undefined): Point {
    if (!place) return { x: STAGE.width / 2, y: STAGE.height * 0.85 };
    if (typeof place !== "string") return place;
    const named = this.episode.points?.[place];
    if (named) return named;
    const prop = this.props?.get(place);
    if (prop) return prop.holder ? prop.holder.holdPoint() : { x: prop.x, y: prop.y };
    const actor = this.actors?.get(place);
    if (actor) return { x: actor.x, y: actor.y };
    const def = this.episode.props[place];
    if (def) return this.point(def.at);
    throw new Error(`unknown place "${place}"`);
  }

  private placeProp(p: PropModel) {
    p.el.style.transform = p.holder ? "none" : `translate(${p.x}px, ${p.y}px) scale(${p.scale})`;
  }

  private middleOf(p: PropModel): Point {
    const base = p.holder ? p.holder.holdPoint() : { x: p.x, y: p.y };
    const s = p.holder ? p.holder.scale : p.scale;
    return { x: base.x, y: base.y - (PROP_MIDDLE[p.asset] ?? 30) * s };
  }

  /**
   * Where a character must stand so that its hand (or beak) reaches a place.
   * For a prop, the hand meets the prop's middle.
   */
  private reachFrom(actor: Actor, to: Point, place: Place | undefined): Point {
    const prop = typeof place === "string" ? this.props.get(place) : undefined;
    const goal = prop ? { x: to.x, y: to.y - (PROP_MIDDLE[prop.asset] ?? 30) * prop.scale * 0.4 } : to;
    const facing = Math.abs(goal.x - actor.x) < 8 ? actor.facing : goal.x < actor.x ? "left" : "right";
    const [hx, hy] = actor.rig.hold;
    return { x: goal.x - (facing === "left" ? -hx : hx) * actor.scale, y: goal.y - hy * actor.scale };
  }

  // ---- Director ----

  perform(step: Step, ms: number) {
    switch (step.do) {
      case "scene":
        return this.showScene(step.background, step.transition ?? "fade", ms);
      case "say":
        return this.say(step.who, step.line, ms, step.mood);
      case "act": {
        const actor = this.actors.get(step.who);
        if (!actor) return;
        const prop = step.prop ? this.props.get(step.prop) : undefined;
        let to = step.to !== undefined ? this.point(step.to) : undefined;
        if (to && step.reach) to = this.reachFrom(actor, to, step.to);
        actor.act(step.action, {
          to,
          mood: step.mood,
          face: step.face,
          ms,
          propEl: prop?.el ?? null,
          sound: (n) => this.audio.sound(n),
        });
        if (step.action === "walk" || step.action === "run") after(this.motion, ms, () => actor.stopGait());
        if (step.action === "eat" && prop) after(this.motion, ms * 0.85, () => this.dropHeld(prop, true));
        return;
      }
      case "prop":
        return this.propAction(step, ms);
      case "sound":
        return this.audio.sound(step.sound);
      default:
        return;
    }
  }

  openWindow(spec: WindowSpec, input: (input: Input) => void): () => void {
    this.svg.dataset.window = spec.id;
    const targets = spec.targets.map((id) => this.props.get(id)).filter((p): p is PropModel => !!p);
    const ctm = this.svg.getScreenCTM();
    const pxPerUnit = ctm ? ctm.a : 1;
    const minR = 34 / pxPerUnit; // at least a 68 px circle on screen
    const mids = targets.map((t) => this.middleOf(t));
    const cleanups: Array<() => void> = [];

    targets.forEach((t, i) => {
      t.el.classList.add("touchable");
      const nearest = Math.min(...mids.filter((_, j) => j !== i).map((m) => Math.hypot(m.x - mids[i].x, m.y - mids[i].y)), Infinity);
      const r = Math.max(minR, Math.min(100, nearest / 2 - 2));
      const hit = make("circle", { cx: mids[i].x, cy: mids[i].y, r }, "hit");
      hit.dataset.target = t.id;
      hit.setAttribute("role", "button");
      hit.setAttribute("aria-label", t.asset);
      this.layers.hits.append(hit);

      if (spec.gesture === "drag") {
        cleanups.push(this.dragHandle(hit, t, spec, input));
      } else {
        const onDown = (e: PointerEvent) => {
          e.preventDefault();
          input({ type: "tap", target: t.id });
        };
        hit.addEventListener("pointerdown", onDown);
      }
      cleanups.push(() => {
        hit.remove();
        t.el.classList.remove("touchable");
      });
    });

    const close = () => {
      cleanups.forEach((c) => c());
      delete this.svg.dataset.window;
      if (this.closeHits === close) this.closeHits = null;
    };
    this.closeHits = close;
    return close;
  }

  feedback(spec: WindowSpec, fb: Feedback) {
    const p = this.props.get(fb.target);
    if (!p) return;
    if (fb.kind === "counted") {
      this.pop(p);
      this.setBadge(p, String(fb.n));
      this.audio.sound("pop");
      const who = String(spec.params.voice ?? "");
      const voice = this.episode.characters[who]?.voice;
      this.audio.say(NUMBER_WORDS[fb.n] ?? String(fb.n), voice);
      const hit = this.layers.hits.querySelector(`[data-target="${fb.target}"]`);
      hit?.classList.add("done");
      return;
    }
    if (fb.kind === "returned") {
      this.motion.animate(p.el, [{ transform: p.el.style.transform }, { transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})` }], 400, { commit: true });
      return;
    }
    this.pop(p);
    this.audio.sound("pop");
  }

  // ---- steps ----

  private showScene(name: string, transition: "fade" | "cut", ms: number) {
    const scene = SCENES[this.episode.backgrounds[name]?.scene];
    if (!scene) return;
    this.scene = name;
    this.svg.dataset.scene = name;
    const showProps = () => {
      for (const [id, def] of Object.entries(this.episode.props)) {
        const p = this.props.get(id);
        if (p) p.el.style.display = def.background && def.background !== name ? "none" : "";
      }
    };
    const back = make("g", {}, `scene scene-${name}`);
    back.innerHTML = scene.back;
    const front = make("g", {}, `scene scene-${name}`);
    front.innerHTML = scene.front ?? "";
    const oldBack = [...this.layers.bg.children];
    const oldFront = [...this.layers.sceneFront.children];
    this.layers.bg.append(back);
    this.layers.sceneFront.append(front);
    if (transition === "cut" || !oldBack.length) {
      oldBack.forEach((e) => e.remove());
      oldFront.forEach((e) => e.remove());
      showProps();
      return;
    }
    // A soft fade through warm white: gentle, never a flash.
    const veil = make("rect", { width: STAGE.width, height: STAGE.height, fill: "#fff8ec" }, "veil");
    this.layers.fx.append(veil);
    this.motion.animate(veil, [{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], ms);
    back.style.opacity = "0";
    front.style.opacity = "0";
    after(this.motion, ms / 2, () => {
      oldBack.forEach((e) => e.remove());
      oldFront.forEach((e) => e.remove());
      back.style.opacity = "1";
      front.style.opacity = "1";
      showProps();
    });
    after(this.motion, ms, () => veil.remove());
  }

  private say(who: string, line: string, ms: number, mood?: Mood) {
    const actor = this.actors.get(who);
    const voice = this.episode.characters[who]?.voice;
    this.audio.say(line, voice);
    this.spoken.push(line);
    if (!actor || actor.rig.kind === "voice") {
      this.caption.textContent = line;
      this.caption.classList.add("on");
      this.svg.dataset.caption = line;
      after(this.motion, ms * 0.95, () => {
        if (this.caption.textContent === line) this.caption.classList.remove("on");
      });
      return;
    }
    if (mood) actor.setMood(mood);
    actor.setTalking(true);
    after(this.motion, Math.max(500, ms * 0.8), () => actor.setTalking(false));
    this.bubble(actor, line, ms);
  }

  private bubble(actor: Actor, line: string, ms: number) {
    this.bubbles.get(actor.id)?.();
    const g = make("g", {}, "bubble");
    g.dataset.speaker = actor.id;
    const text = make("text", { "text-anchor": "middle", "dominant-baseline": "central" });
    text.textContent = line;
    const box = make("rect", { rx: 34, ry: 34 });
    const tail = make("path", {});
    g.append(box, tail, text);
    this.layers.talk.append(g);
    const w = Math.min(760, Math.max(200, text.getComputedTextLength?.() + 70 || line.length * 24 + 70));
    const h = 92;
    const head = actor.headPoint();
    const cx = Math.max(w / 2 + 16, Math.min(STAGE.width - w / 2 - 16, head.x));
    const top = Math.max(16, head.y - h - 46);
    box.setAttribute("x", String(cx - w / 2));
    box.setAttribute("y", String(top));
    box.setAttribute("width", String(w));
    box.setAttribute("height", String(h));
    text.setAttribute("x", String(cx));
    text.setAttribute("y", String(top + h / 2 + 2));
    const tx = Math.max(cx - w / 2 + 40, Math.min(cx + w / 2 - 40, head.x));
    tail.setAttribute("d", `M${tx - 18} ${top + h - 2} L${tx} ${Math.min(head.y - 6, top + h + 36)} L${tx + 18} ${top + h - 2} Z`);
    g.style.transformBox = "view-box";
    g.style.transformOrigin = `${tx}px ${top + h}px`;
    this.motion.animate(g, [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1)" }], 260, { easing: "cubic-bezier(.3,1.5,.6,1)" });
    let gone = false;
    const remove = () => {
      if (gone) return;
      gone = true;
      this.bubbles.delete(actor.id);
      this.motion.animate(g, [{ opacity: 1 }, { opacity: 0 }], 200)?.finished.then(() => g.remove(), () => g.remove());
    };
    this.bubbles.set(actor.id, remove);
    after(this.motion, ms * 0.96, remove);
  }

  private pop(p: PropModel) {
    this.motion.animate(p.body, [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], 380, { easing: "ease-out" });
  }

  private setBadge(p: PropModel, text: string) {
    p.badge?.remove();
    p.badge = null;
    if (!text) return;
    const mid = this.middleOf(p);
    const g = make("g", {}, "badge");
    g.dataset.badgeFor = p.id;
    const y = mid.y - 74;
    g.innerHTML = `<circle cx="${mid.x}" cy="${y}" r="34"/><text x="${mid.x}" y="${y + 2}" text-anchor="middle" dominant-baseline="central">${text}</text>`;
    g.style.transformBox = "view-box";
    g.style.transformOrigin = `${mid.x}px ${y}px`;
    this.layers.fx.append(g);
    p.badge = g;
    this.motion.animate(g, [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1)" }], 300, { easing: "cubic-bezier(.3,1.5,.6,1)" });
  }

  /** Remove every count badge (when a scene moves on). */
  clearBadges() {
    for (const p of this.props.values()) this.setBadge(p, "");
  }

  private dropHeld(p: PropModel, vanish: boolean) {
    const holder = p.holder;
    if (!holder) return;
    const at = holder.holdPoint();
    p.holder = null;
    holder.holdingPose(false);
    p.x = at.x;
    p.y = at.y;
    this.layers.back.append(p.el);
    this.placeProp(p);
    if (vanish) {
      p.hidden = true;
      p.el.style.opacity = "0";
      p.body.style.transform = "scale(1)";
    }
  }

  private propAction(step: PropStep, ms: number) {
    const p = this.props.get(step.id);
    if (!p) return;
    const m = this.motion;
    switch (step.action) {
      case "show":
        p.hidden = false;
        m.animate(p.el, [{ opacity: 0 }, { opacity: 1 }], ms, { commit: true });
        m.animate(p.body, [{ transform: "scale(0.3)" }, { transform: "scale(1.1)", offset: 0.7 }, { transform: "scale(1)" }], ms);
        return;
      case "hide":
        p.hidden = true;
        m.animate(p.el, [{ opacity: 1 }, { opacity: 0 }], ms, { commit: true });
        return;
      case "move":
      case "fall": {
        if (p.holder) this.dropHeld(p, false);
        const to = this.point(step.to);
        const from = { x: p.x, y: p.y };
        p.x = to.x;
        p.y = to.y;
        const tf = (pt: Point, rot = 0) => `translate(${pt.x}px, ${pt.y}px) scale(${p.scale}) rotate(${rot}deg)`;
        if (step.action === "move") {
          const lift = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 40 };
          m.animate(p.el, [{ transform: tf(from) }, { transform: tf(lift) }, { transform: tf(to) }], ms, { commit: true });
        } else {
          const bounce = { x: to.x + (to.x - from.x) * 0.05, y: to.y - (m.reduced ? 4 : 26) };
          m.animate(
            p.el,
            [
              { transform: tf(from), easing: "ease-in" },
              { transform: tf(to, 160), offset: 0.7, easing: "ease-out" },
              { transform: tf(bounce, 250), offset: 0.85, easing: "ease-in" },
              { transform: tf(to, 360) },
            ],
            ms,
            { commit: true },
          );
          after(m, ms * 0.7, () => this.audio.sound("thud"));
        }
        return;
      }
      case "wobble":
        m.animate(p.body, [{ transform: "rotate(0deg)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(0deg)" }], ms);
        this.audio.sound("rustle");
        return;
      case "glow": {
        const halo = p.el.querySelector(".halo");
        m.animate(halo, [{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }], ms);
        this.pop(p);
        return;
      }
      case "attach": {
        const who = step.who ? this.actors.get(step.who) : undefined;
        if (!who?.holdEl) return;
        if (p.holder) this.dropHeld(p, false);
        p.holder = who;
        p.hidden = false;
        p.el.style.opacity = "1";
        who.holdEl.append(p.el);
        this.placeProp(p);
        who.holdingPose(true);
        return;
      }
      case "detach":
        this.dropHeld(p, false);
        return;
      case "variant": {
        if (!step.variant) return;
        p.variant = step.variant;
        const art = PROP_ART[p.asset]?.[step.variant];
        if (art !== undefined) p.body.innerHTML = art;
        p.el.dataset.variant = step.variant;
        this.pop(p);
        this.audio.sound("chime");
        return;
      }
      case "badge":
        this.setBadge(p, step.text ?? "");
        if (step.text) this.pop(p);
        return;
    }
  }

  private dragHandle(hit: SVGCircleElement, p: PropModel, spec: WindowSpec, input: (i: Input) => void) {
    const toStage = (e: PointerEvent): Point => {
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const r = pt.matrixTransform(this.svg.getScreenCTM()?.inverse());
      return { x: r.x, y: r.y };
    };
    let start: Point | null = null;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      hit.setPointerCapture(e.pointerId);
      start = toStage(e);
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const now = toStage(e);
      p.el.style.transform = `translate(${p.x + now.x - start.x}px, ${p.y + now.y - start.y}px) scale(${p.scale})`;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const now = toStage(e);
      start = null;
      const zone = String(spec.params.zone ?? "");
      const target = zone ? this.point(zone) : null;
      const onZone = target && Math.hypot(now.x - target.x, now.y - target.y) < 140;
      if (onZone && target) {
        p.x = target.x;
        p.y = target.y;
        this.placeProp(p);
      }
      input({ type: "drop", item: p.id, on: onZone ? zone : null });
    };
    hit.addEventListener("pointerdown", down);
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerup", up);
    hit.addEventListener("pointercancel", up);
    return () => {};
  }

  /** Close any open window (leaving the player). */
  closeAll() {
    this.closeHits?.();
    this.audio.hush();
  }
}
