// Amma as the game sees her: a set of named actions and instant reactions.
//
// Gameplay only calls this interface (enter, greet, pointAtBag, notice, say ...). How each action
// looks lives here and in rig.js, and the artwork lives in the atlas. Any of those can be replaced,
// for example by a Rive or Spine character exposing the same methods, without touching gameplay.
import { ease, run, clamp, lerp } from "../../engine/kit.js";
import { Amma, REST_L, REST_R } from "./rig.js";

const walkEase = (t) => { const a = 0.7, v = 1 / (a + (1 - a) / 2); return t < a ? v * t : 1 - ((1 - t) * (1 - t) * v) / (2 * (1 - a)); };
const LIST_SHOWN = { x: -186, y: -34 }, BAG_SIDE = { x: 126, y: 114 }, BAG_FRONT = { x: 78, y: 34 };

export class AmmaActor {
  constructor({ PIXI, stage, atlas, base, sound, clock, room, lines }) {
    this.PIXI = PIXI; this.stage = stage; this.sound = sound; this.room = room; this.lines = lines || {};
    const rig = (this.rig = new Amma(PIXI, atlas, base, stage.scene));
    this.st = rig.st;
    rig.root.zIndex = 8; stage.scene.addChild(rig.root);
    this.shadow = rig.spr("shadow"); this.shadow.zIndex = 7; stage.scene.addChild(this.shadow);
    this.stool = new PIXI.Container(); this.stool.zIndex = 6.5; this.stool.position.set(room.anchors.stool.x, room.anchors.stool.y); stage.scene.addChild(this.stool);
    // the polished floor gives back a soft image of her
    this.refl = { w: 320, h: 512, k: 0.5 };
    this.reflTex = PIXI.RenderTexture.create({ width: this.refl.w, height: this.refl.h, resolution: 1 });
    this.reflSprite = new PIXI.Sprite(this.reflTex); this.reflSprite.anchor.set(0.5, 1); this.reflSprite.zIndex = 6.9; this.reflSprite.alpha = 0.17; this.reflSprite.tint = 0xffc4b0; stage.scene.addChild(this.reflSprite);
    this.reflM = new PIXI.Matrix();
    this.fxSprite = (id) => { const s = rig.spr(id); rig.tintable.pop(); return s; };
    stage.addMotes(() => this.fxSprite("mote"));

    this.A = clock.scope();   // actions
    this.Q = clock.scope();   // quick reactions layered on top of whatever she is doing
    this.I = clock.scope();   // idle fidgets
    this.line = null; this.lineClock = 0;
    this.noticeT = 0; this.noticeGaze = { x: 0, y: 0 };
    rig.onStep = () => sound.step(clamp((this.st.y - room.anchors.start.y) / (room.anchors.home.y - room.anchors.start.y), 0, 1));
    this.reset();
  }

  /* ------------------------------------------------------------------ state */
  reset() {
    this.A.cancel(); this.Q.cancel(); this.I.cancel();
    this.sound.stopVoice(); this.line = null;
    const rig = this.rig, st = this.st, a = this.room.anchors;
    rig.reset();
    this.stool.addChild(rig.bag); rig.bag.position.set(0, 0); rig.bag.scale.set(0.98); rig.bag.rotation = 0;
    st.x = a.start.x; st.y = a.start.y; st.s = this.room.scaleAt(a.start.y); st.shade = 1;
    rig.root.visible = false; this.shadow.visible = false; this.setInside(true);
    this.closeUp = false;
  }
  get hasBag() { return this.st.bag === "held"; }
  get hasList() { return this.st.list === "held"; }
  /** The things a child can touch. Gameplay attaches input to these. */
  get targets() { return { amma: this.rig.root, bag: this.rig.bag, list: this.rig.list }; }
  /** Where something is on screen, for tests and for effects. */
  where(name) {
    const t = this.targets[name]; if (!t) return null;
    const off = { amma: [0, -560], bag: [0, 140], list: [0, 0] }[name];
    const p = t.toGlobal(new this.PIXI.Point(off[0], off[1]));
    return { x: p.x, y: p.y };
  }

  setInside(inside) { this.rig.root.zIndex = inside ? 2 : 8; this.shadow.zIndex = inside ? 1.5 : 7; this.stage.scene.sortDirty = true; }
  look(gx, gy, yaw = 0, pitch = 0) { const st = this.st; st.gazeX = gx; st.gazeY = gy; st.yaw = yaw; st.pitch = pitch; }
  lookChild() { this.look(0, 0.08, 0, 0); }
  blink() { this.rig.blink.t = 0; }

  /* ---------------------------------------------- instant reactions (never wait) */
  /** A touch anywhere: she glances at it straight away, whatever else she is doing. */
  notice(scenePoint, warm = true) {
    if (!this.rig.root.visible) return;
    const h = this.rig.toScene(this.rig.head, 0, -90);
    this.noticeGaze.x = clamp((scenePoint.x - h.x) / 260, -1, 1);
    this.noticeGaze.y = clamp((scenePoint.y - h.y) / 320, -0.6, 1);
    this.noticeT = 0.75; this.blink();
    if (warm) { this.rig.sp.squash.v -= 40; this.happyT = 0.35; }
  }
  /** The bag on the stool answers a touch on its own. */
  wiggleBag() {
    if (this.hasBag) return;
    this.sound.rustle();
    const b = this.rig.bag;
    run(this.Q.tween(0.7, (k) => { b.rotation = Math.sin(k * Math.PI * 4) * 0.12 * (1 - k); b.scale.set(0.98 * (1 + 0.04 * Math.sin(k * Math.PI) * (1 - k)), 0.98 * (1 - 0.05 * Math.sin(k * Math.PI) * (1 - k))); }, ease.lin));
  }
  tapMark(scenePoint) { this.stage.sparkle(() => this.fxSprite("spark"), this.Q, scenePoint.x, scenePoint.y, 4); }

  /** Speak a line (a moment name from content, or a recording id); resolves when she has finished. Lips follow the audio. */
  say(key, scope = this.A) {
    const id = this.lines[key] || key;
    if (!this.sound.voices[id]) { console.warn("no recording for line", key); return scope.wait(0.2); }
    this.line = this.sound.say(id); this.lineClock = 0;
    this.onLine?.(this.line);
    return scope.wait(this.line.dur + 0.15);
  }

  /* --------------------------------------------------------------- actions */
  async enter() {
    const A = this.A, st = this.st, a = this.room.anchors, cam = this.stage.cam;
    const fade = this.stage.fade;
    fade.alpha = 1; run(A.to(fade, { alpha: 0 }, 1.0, ease.out));
    await A.wait(0.55);
    this.rig.root.visible = true; this.shadow.visible = true; st.walk = 1;
    const WALK = 3.9, STEPS = 8;
    run(A.to(cam, this.stage.fit(860, 1560, 330, 1450, 1.075), WALK + 0.6, ease.sine));
    run(A.tween(WALK, (k) => {
      const y = lerp(a.start.y, a.home.y, k);
      st.y = y; st.x = lerp(a.start.x, a.home.x, k); st.s = this.room.scaleAt(y); st.phase = k * STEPS * Math.PI; st.shade = clamp((1190 - y) / 200, 0, 1);
      if (y > a.threshold && this.rig.root.zIndex < 8) this.setInside(false);
    }, walkEase));
    await A.wait(1.25);
    st.brow = 1; st.mouth = "m-grin"; this.blink();          // she sees the child
    await A.wait(0.95);
    st.brow = 0.25; st.mouth = "m-smile";
    await A.wait(WALK - 2.2 - 0.28);
    await A.to(st, { walk: 0 }, 0.28, ease.out);
    this.rig.sp.squash.v += 60; this.rig.sp.hem.v += 60;
    run((async () => { await A.to(st, { chestDy: 5, lean: 1.6 }, 0.14, ease.out); await A.to(st, { chestDy: 0, lean: 0 }, 0.42, ease.back); })());
    await A.wait(0.35);
  }

  async greet() {
    const A = this.A, st = this.st, snd = this.sound;
    await A.to(st.armL, { x: -116, y: 152 }, 0.16, ease.sine);
    st.mouth = "m-grin"; st.brow = 0.9;
    run(A.to(st, { lean: -2.5, headRot: -6, hipX: 5 }, 0.5, ease.back));
    run((async () => { await A.wait(0.2); st.handL = "hand-open"; })());
    await A.to(st.armL, { x: -205, y: -240 }, 0.42, ease.back);
    const speech = this.say("greet");
    const wave = async (x, y, t, d) => { run(A.to(st, { lean: -2.5 + d * 1.4, headRot: -6 + d * 2.4, chestDy: -1.5 }, t + 0.06, ease.sine)); await A.to(st.armL, { x, y }, t, ease.sine); snd.bangles(); };
    await wave(-250, -238, 0.2, -1);
    st.eye = "happy";
    await wave(-170, -226, 0.27, 1); await wave(-248, -240, 0.27, -1); await wave(-172, -226, 0.27, 1);
    st.eye = "open"; this.blink();
    await A.to(st.armL, { x: -205, y: -240 }, 0.15, ease.sine);
    st.mouth = "m-smile"; st.brow = 0.2;
    run(A.to(st, { lean: 0, headRot: 0, hipX: 0, chestDy: 0 }, 0.6, ease.inOut));
    run((async () => { await A.wait(0.22); st.handL = "hand-relaxed"; })());
    await A.to(st.armL, { ...REST_L }, 0.55, ease.inOut);
    await speech;
  }

  /** "Where is my bag?": she looks about, puzzled, and ends looking at the child. */
  async lookForBag() {
    const A = this.A, st = this.st;
    st.brow = 1; st.mouth = "m-m";
    const speech = this.say("whereBag");
    this.look(-0.9, 0.2, -0.6, 0.1); run(A.to(st, { headRot: -4, hipX: -4 }, 0.4, ease.sine));
    await A.wait(0.7);
    this.look(0.9, 0.1, 0.55, 0.05); run(A.to(st, { headRot: 4, hipX: 4 }, 0.4, ease.sine));
    await A.wait(0.75);
    this.lookChild(); this.blink(); st.headRot = 7; st.mouth = "m-smile";
    run(A.to(st, { hipX: 0 }, 0.4, ease.sine));
    await speech;
    await A.wait(0.3);
    st.headRot = 0; st.brow = 0.4;
  }

  /** A hint without words on screen: she looks at the bag, points, and says "there!". */
  async pointAtBag() {
    const A = this.A, st = this.st, a = this.room.anchors;
    this.look(0.9, 0.5, 0.75, 0.3); st.brow = 0.9;
    await A.wait(0.2);
    st.handR = "hand-point";
    const from = { ...st.armR };
    run(A.to(st, { lean: 3 }, 0.4, ease.back));
    await A.tween(0.45, (k) => {
      const t = this.rig.chestFromScene(a.stool.x + 40, a.stool.y - 40), sx = 88, sy = -112, dx = t.x - sx, dy = t.y - sy, d = Math.hypot(dx, dy) || 1;
      st.armR.x = lerp(from.x, sx + (dx / d) * 250, k); st.armR.y = lerp(from.y, sy + (dy / d) * 250, k);
    }, ease.back);
    this.wiggleBag();
    await this.say("there");
    this.lookChild(); this.blink();
    await A.wait(0.35);
    run(A.to(st, { lean: 0 }, 0.5, ease.inOut));
    run((async () => { await A.wait(0.25); st.handR = "hand-relaxed"; })());
    await A.to(st.armR, { ...REST_R }, 0.55, ease.inOut);
    st.brow = 0.3;
  }

  /** She picks up the bag from the stool: reach, grip, take the weight, straighten. */
  async fetchBag() {
    const A = this.A, st = this.st, a = this.room.anchors;
    st.gazeX = 0.9; st.gazeY = 0.5; await A.wait(0.1);
    st.yaw = 0.8; st.pitch = 0.3; st.headRot = 3; st.handR = "hand-relaxed";
    await A.wait(0.24);
    run(A.to(st, { lean: 8, hipX: -10, chestDy: 8 }, 0.5, ease.inOut));
    const from = { ...st.armR };
    await A.tween(0.5, (k) => { const t = this.rig.chestFromScene(a.stool.x - 6, a.stool.y - 16); st.armR.x = lerp(from.x, t.x, k); st.armR.y = lerp(from.y, t.y, k); }, ease.inOut);
    st.handR = "hand-grip"; this.sound.rustle();
    const bag = this.rig.bag;
    await A.tween(0.14, (k) => bag.scale.set(0.98 * (1 + 0.03 * Math.sin(k * Math.PI)), 0.98 * (1 - 0.05 * Math.sin(k * Math.PI))), ease.lin);
    this.rig.holdBag();
    run((async () => { await A.to(st, { lean: 9.5, chestDy: 11 }, 0.14, ease.out); await A.to(st, { lean: -2.6, hipX: 8, chestDy: 0, headRot: 0 }, 0.6, ease.inOut); await A.to(st, { lean: 0, hipX: 0 }, 0.5, ease.sine); })());
    await A.wait(0.12);
    await A.to(st.armR, { x: 126, y: 100 }, 0.7, ease.inOut);
    await A.to(st.armR, { y: 114 }, 0.26, ease.sine);
    this.lookChild(); st.mouth = "m-grin"; st.brow = 0.8;
    await this.say("thanks");
    st.mouth = "m-smile"; st.brow = 0.2;
  }

  /** She takes the list out of the bag and holds it up toward the child. */
  async takeOutList() {
    const A = this.A, st = this.st;
    this.look(0.55, 0.85, 0.4, 0.55);
    await A.to(st.armR, BAG_FRONT, 0.45, ease.inOut);
    await A.to(st.armL, { x: 44, y: 62 }, 0.4, ease.inOut);
    st.handL = "hand-grip"; this.rig.holdList(); this.sound.paper();
    await A.wait(0.08);
    run(A.to(st, { listScale: 1.12, listRot: -5 }, 0.6, ease.back));
    run(A.to(st.armR, BAG_SIDE, 0.7, ease.inOut));
    run((async () => { await A.wait(0.2); this.look(-0.85, 0.2, -0.45, 0.1); await A.wait(0.55); this.lookChild(); st.brow = 0.8; this.blink(); })());
    await A.to(st.armL, LIST_SHOWN, 0.62, ease.back);
    this.sound.chime(); { const p = this.rig.toScene(this.rig.list, 0, 0); this.stage.sparkle(() => this.fxSprite("spark"), this.Q, p.x, p.y, 7); }
    run(A.to(this.stage.cam, this.stage.fit(740, 1450, 330, 1440, 1.1), 1.2, ease.sine));
    await A.wait(0.3);
    await this.sayWithList("list");
  }
  /** Speaking with the list in hand: it lifts on the stressed beat. */
  async sayWithList(id) {
    const A = this.A, st = this.st;
    const speech = this.say(id);
    const v = this.line || { stress: [], dur: 0.2 };
    for (const t of v.stress) run((async () => { await A.wait(t); st.pitch = 0.35; await A.wait(0.13); st.pitch = 0; })());
    run((async () => { await A.wait(Math.min(0.5, v.dur * 0.3)); await A.to(st.armL, { y: st.armL.y - 22 }, 0.2, ease.sine); await A.to(st.armL, { y: st.armL.y + 22 }, 0.3, ease.back); })());
    await speech;
    st.brow = 0.2;
  }

  /** The list comes close to the child; the apple bounces. Stays until returnList(). */
  async showListClose() {
    const A = this.A, st = this.st;
    this.closeUp = true;
    this.look(-0.8, 0.2, -0.4, 0.1); st.brow = 0.9;
    run(A.to(this.stage.cam, this.stage.fit(720, 1320, 360, 1000, 1.3), 0.7, ease.inOut));
    run(A.to(st, { listScale: 1.42, listRot: 0 }, 0.45, ease.back));
    await A.to(st.armL, { x: -168, y: 26 }, 0.45, ease.back);
    await this.bounceApple();
    this.lookChild(); this.blink();
    await this.say("list");
  }
  async bounceApple() {
    const A = this.A, st = this.st;
    this.sound.pop();
    await A.to(st, { listPop: 1 }, 0.12, ease.out); await A.to(st, { listPop: -0.5 }, 0.12, ease.sine); await A.to(st, { listPop: 0 }, 0.2, ease.back);
    this.sound.chime(); { const p = this.rig.toScene(this.rig.list, 0, 0); this.stage.sparkle(() => this.fxSprite("spark"), this.Q, p.x, p.y, 8); }
    run((async () => { await A.to(st, { fivePulse: 1 }, 0.16, ease.out); await A.to(st, { fivePulse: 0 }, 0.3, ease.back); })());
  }
  async returnList() {
    const A = this.A, st = this.st;
    run(A.to(this.stage.cam, this.stage.fit(740, 1450, 330, 1440, 1.1), 0.9, ease.inOut));
    run(A.to(st, { listScale: 1.12, listRot: -5 }, 0.5, ease.inOut));
    await A.to(st.armL, LIST_SHOWN, 0.5, ease.inOut);
    this.closeUp = false;
    await this.settle();
  }

  /** She lifts the bag, looks inside, and tells the child it is empty. */
  async peekBag() {
    const A = this.A, st = this.st;
    this.look(0.5, 0.85, 0.35, 0.5); st.brow = 0.6;
    await A.to(st.armR, BAG_FRONT, 0.45, ease.inOut);
    this.sound.rustle();
    for (let i = 0; i < 3; i++) await A.to(st.armR, { x: BAG_FRONT.x + (i % 2 ? -9 : 9) }, 0.11, ease.sine);
    await A.to(st.armR, { x: BAG_FRONT.x }, 0.1, ease.sine);
    this.lookChild(); st.brow = 1; st.headRot = 6; this.blink();
    await this.say("empty");
    st.headRot = 0;
    await A.to(st.armR, BAG_SIDE, 0.5, ease.inOut);
    await this.settle();
  }

  async ask() {
    const A = this.A, st = this.st;
    st.brow = 1; st.headRot = 7; this.lookChild(); this.blink();
    run(A.to(st, { lean: 3, chestDy: 4 }, 0.3, ease.back));
    await this.say("what");
    await this.settle();
  }
  async giggle() {
    const A = this.A, st = this.st;
    this.sound.giggle(); st.eye = "happy"; st.mouth = "m-grin"; st.headRot = -5;
    for (let i = 0; i < 3; i++) { await A.to(st, { chestDy: -7 }, 0.09, ease.out); await A.to(st, { chestDy: 2 }, 0.11, ease.in); }
    const p = this.rig.toScene(this.rig.head, 0, -150); this.stage.sparkle(() => this.fxSprite("spark"), this.Q, p.x, p.y, 6);
    await A.wait(0.35);
    await this.settle();
  }
  /** "Come, let's go to the shop": she glances toward the door and back, eager. */
  async invite() {
    const A = this.A, st = this.st;
    st.brow = 0.9; st.mouth = "m-grin";
    run(A.to(st, { lean: -3, hipX: -6 }, 0.4, ease.back));
    this.look(-0.7, -0.4, -0.5, -0.2);
    await A.wait(0.5);
    this.lookChild(); this.blink(); st.mouth = "m-smile";
    run(A.to(st.armR, { x: 132, y: 92 }, 0.35, ease.back));
    await this.sayWithList("letsGo");
    run(A.to(st.armR, BAG_SIDE, 0.5, ease.inOut));
    await this.settle();
  }
  async settle() {
    const A = this.A, st = this.st;
    await A.to(st, { lean: 0, hipX: 0, chestDy: 0, headRot: 0 }, 0.4, ease.sine);
    st.brow = 0.2; st.eye = "open"; st.mouth = "m-smile"; this.lookChild();
  }

  /** While she waits: small, unhurried things, so she never freezes. Stopped by any action. */
  idle() {
    const I = this.I, st = this.st;
    this.I.cancel();
    run((async () => {
      for (;;) {
        await I.wait(2.2 + Math.random() * 2.4);
        const pick = Math.random();
        if (pick < 0.35 && this.hasList) { this.look(-0.8, 0.25, -0.3, 0.05); await I.wait(0.9); this.lookChild(); this.blink(); }
        else if (pick < 0.7) { const d = Math.random() < 0.5 ? 1 : -1; await I.to(st, { hipX: 7 * d, lean: -1.4 * d, headRot: 2 * d }, 0.9, ease.sine); await I.wait(1.4); await I.to(st, { hipX: 0, lean: 0, headRot: 0 }, 0.9, ease.sine); }
        else { st.brow = 0.7; st.headRot = -4; await I.wait(0.9); st.brow = 0.2; st.headRot = 0; }
      }
    })());
  }
  stopIdle() { this.I.cancel(); }

  /* ------------------------------------------------------------- per frame */
  update(dt, time, draw) {
    const st = this.st, rig = this.rig;
    if (this.line) {
      this.lineClock += dt;
      const t = this.sound.voiceTime(this.lineClock);
      if (t > this.line.dur + 0.05 || t < 0) { this.line = null; rig.talk = null; this.onLine?.(null); }
      else { const [shape, open, loud] = this.sound.mouthAt(this.line, t); rig.talk = { shape, open, loud }; }
    }
    // an instant glance toward a touch, layered over the current action and then released
    const saved = [st.gazeX, st.gazeY, st.yaw, st.eye];
    if (this.noticeT > 0) {
      this.noticeT -= dt;
      st.gazeX = this.noticeGaze.x; st.gazeY = this.noticeGaze.y; st.yaw = lerp(st.yaw, this.noticeGaze.x * 0.35, 0.8);
      if (this.happyT > 0 && st.eye === "open") st.eye = "happy";
      this.happyT -= dt;
    }
    rig.update(dt, time);
    [st.gazeX, st.gazeY, st.yaw, st.eye] = saved;

    this.shadow.position.set(st.x + 16 * st.s, st.y + 2); this.shadow.scale.set((st.s * 0.92) / 0.5, (st.s * 0.8) / 0.5); this.shadow.alpha = 0.55 - st.shade * 0.25;
    const r = this.reflSprite; r.visible = !this.reflectionOff && rig.root.visible && rig.root.zIndex >= 8;
    if (draw && r.visible) {
      const k = this.refl.k / st.s;
      this.reflM.set(k, 0, 0, k, this.refl.w / 2 - st.x * k, this.refl.h - st.y * k);
      this.stage.app.renderer.render(rig.root, { renderTexture: this.reflTex, clear: true, transform: this.reflM });
      r.position.set(st.x, st.y + 4 * st.s); r.scale.set(st.s / this.refl.k, (-st.s / this.refl.k) * 0.8);
    }
  }
}
