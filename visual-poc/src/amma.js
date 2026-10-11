// Amma's rig: the baked layers assembled on bones, bending meshes and springs.
// The script (story.js) only sets intentions on `st` (where the hand should be, how wide the smile);
// this file turns them into weight, overlap and follow-through every frame.
import { DEG, clamp, lerp, Spring, Strip, Grid, Chain, reach } from "./kit.js";

const CHEST = [0, -600], HEAD = [0, -770], HEAD_SCALE = 1.1;
const SHOULDER = [88, -112];          // in chest space; mirrored for her right arm
const UPPER = 150, FORE = 112;        // arm bone lengths
const HAND_SCALE = 1.18;
export const REST_L = { x: -114, y: 138 }, REST_R = { x: 114, y: 138 };

const EYE_OPEN = [[-24, 0], [-24, -14, -14, -23, 0, -23], [14, -23, 25, -13, 25, 0], [25, 12, 14, 21, 0, 21], [-14, 21, -24, 12, -24, 0]];
const EYE_HALF = [[-24, 2], [-14, -6, 14, -6, 25, 2], [24, 13, 14, 21, 0, 21], [-14, 21, -23, 13, -24, 2]];
const MOUTHS = { rest: "m-smile", a: "m-a", e: "m-e", o: "m-o", m: "m-m" };

export class Amma {
  constructor(PIXI, atlas, base, scene) {
    this.PIXI = PIXI; this.scene = scene; this.F = atlas.frames;
    this.tex = {};
    for (const id in atlas.frames) { const [x, y, w, h] = atlas.frames[id].f; this.tex[id] = new PIXI.Texture(base, new PIXI.Rectangle(x, y, w, h)); }
    this.tintable = [];

    this.st = {
      x: 1200, y: 1390, s: 1.14, walk: 0, phase: 0,
      hipX: 0, hipRot: 0, lean: 0, chestDy: 0,
      headRot: 0, yaw: 0, pitch: 0, gazeX: 0, gazeY: 0.08,
      eye: "open", brow: 0, browTilt: 0, mouth: "m-smile", cheeks: 0,
      armL: { ...REST_L }, armR: { ...REST_R }, handL: "hand-relaxed", handR: "hand-relaxed", handLRot: 0, handRRot: 0,
      bag: "stool", list: "bag", listScale: 0.62, listRot: 6, listPop: 0, fivePulse: 0,
      shade: 0,
    };
    this.talk = null;               // { shape, open, loud } while a voice line is playing
    this.onStep = null;
    this.sp = {
      yaw: new Spring(0, 140, 17), pitch: new Spring(0, 140, 17), roll: new Spring(0, 150, 17),
      gx: new Spring(0, 420, 34), gy: new Spring(0.08, 420, 34),
      lx: new Spring(REST_L.x, 210, 22), ly: new Spring(REST_L.y, 210, 22), rx: new Spring(REST_R.x, 210, 22), ry: new Spring(REST_R.y, 210, 22),
      handL: new Spring(0, 160, 14), handR: new Spring(0, 160, 14),
      hem: new Spring(0, 60, 9), squash: new Spring(0, 190, 13),
      jhL: new Spring(0, 90, 6), jhR: new Spring(0, 90, 6), bag: new Spring(0, 0, 0),
      brow: new Spring(0, 300, 26), list: new Spring(0, 120, 10),
    };
    this.bagTheta = 0; this.bagOmega = 0;
    this.prev = { hipX: 0, headX: null, headV: 0, gripX: null, gripV: 0, faL: null, faR: null, step: 0 };
    this.blink = { next: 1.6, t: -1 };
    this.build(atlas.ground);
  }

  spr(id) {
    const f = this.F[id], s = new this.PIXI.Sprite(this.tex[id]);
    s.scale.set(1 / f.s);
    s.anchor.set((f.p[0] - f.r[0]) / f.r[2], (f.p[1] - f.r[1]) / f.r[3]);
    this.tintable.push(s);
    return s;
  }
  retex(sprite, id) {
    if (sprite._id === id) return;
    const f = this.F[id]; sprite._id = id; sprite.texture = this.tex[id];
    sprite.anchor.set((f.p[0] - f.r[0]) / f.r[2], (f.p[1] - f.r[1]) / f.r[3]);
    const sx = Math.sign(sprite.scale.x) || 1, k = sprite._k || 1;
    sprite.scale.set((sx * k) / f.s, k / f.s);
  }
  at(sprite, origin) { const p = this.F[sprite._src].p; sprite.position.set(p[0] - origin[0], p[1] - origin[1]); return sprite; }
  part(id, origin, parent, mirror = false) {
    const s = this.spr(id); s._src = id; this.at(s, origin);
    if (mirror) { s.scale.x *= -1; s.position.x *= -1; }
    parent.addChild(s);
    return s;
  }

  build(atlasGround) {
    const P = this.PIXI, C = () => new P.Container();
    const root = (this.root = C());                  // feet on the floor, in scene space
    const sheet = (this.sheet = C());                // the drawing's own coordinates
    sheet.position.set(0, -atlasGround);
    root.addChild(sheet);

    // back to front
    this.pallu = new Strip(P, this.tex["pallu-back"], this.F["pallu-back"], 10);
    this.footL = this.part("foot", [0, 0], sheet, true); this.footR = this.part("foot", [0, 0], sheet);
    this.chestBack = C(); this.skirt = new Grid(P, this.tex.skirt, this.F.skirt, 8, 10);
    this.chestMid = C(); this.braid = new Strip(P, this.tex.braid, this.F.braid, 12);
    this.chestHead = C(); this.chestFront = C();
    sheet.addChild(this.pallu.mesh); sheet.setChildIndex(this.pallu.mesh, 0);
    sheet.addChild(this.chestBack, this.skirt.mesh, this.chestMid, this.braid.mesh, this.chestHead, this.chestFront);
    this.tintable.push(this.pallu.mesh, this.skirt.mesh, this.braid.mesh);
    this.chests = [this.chestBack, this.chestMid, this.chestHead, this.chestFront];

    this.part("torso", CHEST, this.chestBack);

    // her left arm (viewer's right): carries the bag
    this.armR = new Strip(P, this.tex.arm, this.F.arm, 14); this.chestMid.addChild(this.armR.mesh); this.tintable.push(this.armR.mesh);
    this.bagHeld = C(); this.chestMid.addChild(this.bagHeld);
    this.handR = this.spr("hand-relaxed"); this.handR._k = HAND_SCALE; this.handR.scale.set(-HAND_SCALE / this.F["hand-relaxed"].s, HAND_SCALE / this.F["hand-relaxed"].s); this.chestMid.addChild(this.handR);
    this.part("pallu-shoulder", CHEST, this.chestMid);

    // the bag, with the list tucked inside until she takes it out
    this.bag = C(); this.listSlot = C(); this.bagSprite = this.spr("bag"); this.bag.addChild(this.listSlot, this.bagSprite);
    this.list = C();
    this.paper = this.spr("list-paper"); this.five = this.spr("list-five"); this.apple = this.spr("list-apple");
    this.five.position.set(-40, 12); this.apple.position.set(42, 48);
    this.list.addChild(this.paper, this.five, this.apple);
    this.listSlot.addChild(this.list);

    // head
    const head = (this.head = C()); head.position.set(HEAD[0] - CHEST[0], HEAD[1] - CHEST[1]); head.scale.set(HEAD_SCALE); this.chestHead.addChild(head);
    this.hairBack = this.part("hair-back", HEAD, head);
    this.earL = this.part("ear", HEAD, head, true); this.earR = this.part("ear", HEAD, head);
    this.jhL = this.part("jhumka", HEAD, head, true); this.jhR = this.part("jhumka", HEAD, head);
    this.part("face", HEAD, head);
    this.facemid = this.part("facemid", HEAD, head);
    this.eyes = [-1, 1].map((side) => {
      const e = C(); head.addChild(e);
      const white = this.spr("eye-white"); white.scale.x *= side;
      const iris = this.spr("iris");
      const mk = (path) => { const g = new P.Graphics(); g.beginFill(0xffffff); g.moveTo(path[0][0] * side, path[0][1]); for (const c of path.slice(1)) g.bezierCurveTo(c[0] * side, c[1], c[2] * side, c[3], c[4] * side, c[5]); g.closePath(); g.endFill(); g.visible = false; e.addChild(g); return g; };
      const lash = this.spr("lash-open"); lash.scale.x *= side;
      e.addChild(white, iris, lash);
      const open = mk(EYE_OPEN), half = mk(EYE_HALF);
      return { side, e, white, iris, lash, open, half, state: "" };
    });
    this.brows = [-1, 1].map((side) => { const b = this.spr("brow"); b.scale.x *= side; head.addChild(b); return b; });
    this.mouth = this.spr("m-smile"); head.addChild(this.mouth);
    this.hairFront = this.part("hair-front", HEAD, head);
    this.jasmine = this.part("jasmine", HEAD, head);

    // her right arm (viewer's left): waves, then holds up the list
    this.armL = new Strip(P, this.tex.arm, this.F.arm, 14); this.chestFront.addChild(this.armL.mesh); this.tintable.push(this.armL.mesh);
    this.listHeld = C(); this.chestFront.addChild(this.listHeld);
    this.handL = this.spr("hand-relaxed"); this.handL._k = HAND_SCALE; this.handL.scale.set(HAND_SCALE / this.F["hand-relaxed"].s); this.chestFront.addChild(this.handL);

    this.braidChain = new Chain(8, 43, { damp: 0.975, stiff: 0.07 });
    this.palluChain = new Chain(7, 50, { damp: 0.97, stiff: 0.05 });
    this.ik = { ex: 0, ey: 0, wx: 0, wy: 0 };
    this.pt = new P.Point(); this.pt2 = new P.Point();
  }

  /** Where a point of one of her containers is, in scene space. */
  toScene(container, x, y, out) { this.pt.set(x, y); return this.scene.toLocal(this.pt, container, out || new this.PIXI.Point()); }
  /** Where a scene point is, in chest space (for reaching at things in the room). */
  chestFromScene(x, y) { this.pt.set(x, y); const p = this.chestMid.toLocal(this.pt, this.scene); return { x: p.x, y: p.y }; }
  grip(side) { const h = side === "L" ? this.handL : this.handR; const a = h.rotation; return { x: h.position.x - Math.sin(a) * 30, y: h.position.y + Math.cos(a) * 30 }; }

  holdBag() {
    this.st.bag = "held"; this.bagHeld.addChild(this.bag); this.bag.scale.set(0.86); this.bagTheta = 0; this.bagOmega = 0; this.prev.gripX = null;
  }
  holdList() { this.st.list = "held"; this.listHeld.addChild(this.list); this.list.pivot.set(56, 74); this.list.position.set(0, 0); this.sp.list.snap(0); }
  reset() {
    const s = this.st;
    Object.assign(s, { walk: 0, phase: 0, hipX: 0, hipRot: 0, lean: 0, chestDy: 0, headRot: 0, yaw: 0, pitch: 0, gazeX: 0, gazeY: 0.08, eye: "open", brow: 0, browTilt: 0, mouth: "m-smile", cheeks: 0, handL: "hand-relaxed", handR: "hand-relaxed", handLRot: 0, handRRot: 0, bag: "stool", list: "bag", listScale: 0.62, listRot: 6, listPop: 0, fivePulse: 0, shade: 0 });
    s.armL = { ...REST_L }; s.armR = { ...REST_R };
    for (const k in this.sp) this.sp[k].snap(0);
    this.sp.lx.snap(REST_L.x); this.sp.ly.snap(REST_L.y); this.sp.rx.snap(REST_R.x); this.sp.ry.snap(REST_R.y); this.sp.gy.snap(0.08);
    this.listSlot.addChild(this.list); this.list.pivot.set(0, 60); this.list.position.set(6, 112); this.list.rotation = 6 * DEG; this.list.scale.set(0.62);
    this.braidChain.ready = false; this.palluChain.ready = false; this.talk = null;
    this.prev = { hipX: 0, headX: null, headV: 0, gripX: null, gripV: 0, faL: null, faR: null, step: 0 };
  }
  setShade(k) {
    if (Math.abs(k - (this._shade ?? -1)) < 0.01) return;
    this._shade = k;
    const c = (a, b) => Math.round(lerp(a, b, k));
    const tint = (c(255, 226) << 16) | (c(255, 204) << 8) | c(255, 196);
    for (const d of this.tintable) d.tint = tint;
  }

  arm(strip, hand, sx, tx, ty, side, dt, key, handId, handRot, lag) {
    const sy = SHOULDER[1];
    // two candidate elbows; take the one that sits further out from the body
    const a = reach(sx, sy, tx, ty, UPPER, FORE, 1, { ...this.ik }), b = reach(sx, sy, tx, ty, UPPER, FORE, -1, this.ik);
    const k = (a.ex - b.ex) * side > 0 ? a : b;
    const ex = k.ex, ey = k.ey, wx = k.wx, wy = k.wy;
    const ux = (ex - sx) / UPPER, uy = (ey - sy) / UPPER, fx = (wx - ex) / FORE, fy = (wy - ey) / FORE, r = 30;
    strip.update((s, o) => {
      if (s <= UPPER - r) { o.x = sx + ux * s; o.y = sy + uy * s; o.nx = uy; o.ny = -ux; }
      else if (s >= UPPER + r) { const q = s - UPPER; o.x = ex + fx * q; o.y = ey + fy * q; o.nx = fy; o.ny = -fx; }
      else {
        const q = (s - (UPPER - r)) / (2 * r), ax = ex - ux * r, ay = ey - uy * r, bx = ex + fx * r, by = ey + fy * r, m = 1 - q;
        o.x = m * m * ax + 2 * m * q * ex + q * q * bx; o.y = m * m * ay + 2 * m * q * ey + q * q * by;
        const tx2 = lerp(ux, fx, q), ty2 = lerp(uy, fy, q), l = Math.hypot(tx2, ty2) || 1;
        o.nx = ty2 / l; o.ny = -tx2 / l;
      }
    });
    const fa = Math.atan2(fy, fx);
    let w = 0;
    if (this.prev[key] !== null && dt > 0) { let d = fa - this.prev[key]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; w = d / dt; }
    this.prev[key] = fa;
    lag.t = clamp(-w * 0.07, -0.6, 0.6); lag.step(dt);
    this.retex(hand, handId);
    hand.position.set(wx, wy);
    hand.rotation = fa - Math.PI / 2 + handRot * DEG + lag.x;
  }

  update(dt, time) {
    const s = this.st, sp = this.sp, P = this.PIXI;
    const w = s.walk, sn = Math.sin(s.phase), cs = Math.cos(s.phase);
    const breath = Math.sin(time * 1.75), sway = Math.sin(time * 0.62);

    // footfalls
    const stepIndex = Math.floor(s.phase / Math.PI);
    if (w > 0.4 && stepIndex !== this.prev.step) { this.prev.step = stepIndex; if (this.onStep) this.onStep(); sp.squash.v += 26 * w; }
    sp.squash.step(dt);

    const bob = -w * (1 - cs * cs) * 14 + sp.squash.x;
    const hipX = s.hipX + w * sn * 11 + sway * 1.2 * (1 - w);
    const hipRot = s.hipRot + w * sn * 2.6;
    const chestRot = s.lean - w * sn * 2.0 + breath * 0.22;
    const chestX = hipX * 0.8, chestY = bob + s.chestDy - breath * 1.5;

    this.root.position.set(s.x, s.y); this.root.scale.set(s.s);
    for (const c of this.chests) { c.position.set(CHEST[0] + chestX, CHEST[1] + chestY); c.rotation = chestRot * DEG; }

    // head: turns are springy; features slide across the face to fake depth
    sp.yaw.t = s.yaw; sp.pitch.t = s.pitch; sp.roll.t = s.headRot + w * sn * 1.4 - chestRot * 0.5;
    const yw = sp.yaw.step(dt), pt = sp.pitch.step(dt), roll = sp.roll.step(dt);
    const head = this.head;
    head.position.set(HEAD[0] - CHEST[0] + yw * 5, HEAD[1] - CHEST[1] + pt * 4 + w * (1 - cs * cs) * 2);
    head.rotation = roll * DEG; head.scale.set(HEAD_SCALE * (1 - Math.abs(yw) * 0.025), HEAD_SCALE);
    const O = (sprite, dx, dy) => { const p = this.F[sprite._src].p; sprite.position.set((p[0] - HEAD[0]) * (sprite._m || 1) + dx, p[1] - HEAD[1] + dy); };
    this.earL._m = -1; this.jhL._m = -1;
    O(this.hairBack, -yw * 7, -pt * 3); O(this.earL, -yw * 6, 0); O(this.earR, -yw * 6, 0);
    O(this.facemid, yw * 10, pt * 6); O(this.hairFront, yw * 3, pt * 2); O(this.jasmine, -yw * 9, -pt * 2);
    this.earL.visible = yw < 0.75; this.earR.visible = yw > -0.75;

    // earrings swing from the head's sideways motion
    const hp = this.toScene(head, 0, -90, this.pt2), hx = hp.x / s.s;
    let hacc = 0;
    if (this.prev.headX !== null && dt > 0) { const v = (hx - this.prev.headX) / dt; hacc = (v - this.prev.headV) / dt; this.prev.headV = v; }
    this.prev.headX = hx;
    for (const [j, spr, m] of [[sp.jhL, this.jhL, -1], [sp.jhR, this.jhR, 1]]) {
      j.v += (clamp(-hacc, -4000, 4000) / 26) * dt * (m < 0 ? 0.9 : 1.1); j.t = -roll * DEG; j.step(dt);
      O(spr, -yw * 7, 0); spr.rotation = clamp(j.x, -0.7, 0.7);
    }

    // eyes
    sp.gx.t = s.gazeX; sp.gy.t = s.gazeY;
    const gx = sp.gx.step(dt), gy = sp.gy.step(dt);
    const bl = this.blink;
    bl.next -= dt;
    if (bl.t < 0 && bl.next <= 0) { bl.t = 0; bl.next = 2.2 + Math.random() * 3.2; }
    let eye = s.eye;
    if (bl.t >= 0) { bl.t += dt; if (eye === "open") eye = bl.t < 0.04 ? "half" : bl.t < 0.11 ? "closed" : bl.t < 0.16 ? "half" : "open"; if (bl.t >= 0.16) bl.t = -1; }
    sp.brow.t = s.brow; const brow = sp.brow.step(dt);
    for (const E of this.eyes) {
      const sd = E.side;
      E.e.position.set(41 * sd + yw * 8, -96 + pt * 5); E.e.scale.set(1 - yw * 0.07 * sd, 1);
      if (E.state !== eye) {
        E.state = eye;
        const seen = eye === "open" || eye === "half";
        E.white.visible = E.iris.visible = seen;
        this.retex(E.white, eye === "half" ? "eye-white-half" : "eye-white"); E.white.scale.x = Math.abs(E.white.scale.x) * sd;
        this.retex(E.lash, { open: "lash-open", half: "lash-half", closed: "lash-closed", happy: "lash-happy" }[eye]); E.lash.scale.x = Math.abs(E.lash.scale.x) * sd;
        E.iris.mask = null; E.open.visible = E.half.visible = false;
        if (seen) { const m = eye === "half" ? E.half : E.open; m.visible = true; E.iris.mask = m; }
      }
      E.iris.position.set(clamp(gx, -1, 1) * 6 + yw * 1.5, 1.5 + clamp(gy, -1, 1) * 4.5);
    }
    this.brows.forEach((b, i) => { const sd = i ? 1 : -1; b.position.set(42 * sd + yw * 8, -136 + pt * 6 - brow * 8); b.rotation = (s.browTilt * sd - brow * 3 * sd) * DEG; });

    // mouth: speech shapes while a line plays, otherwise the expression she is holding
    let mouthId = s.mouth, my = 1, mx = 1;
    if (this.talk) { mouthId = MOUTHS[this.talk.shape] || "m-smile"; if (this.talk.shape !== "rest" && this.talk.shape !== "m") { my = 0.62 + 0.5 * this.talk.open * (0.45 + 0.55 * this.talk.loud); mx = 0.94 + 0.06 * this.talk.open; } }
    this.retex(this.mouth, mouthId);
    this.mouth.position.set(yw * 9, -23 + pt * 5);
    const mk = 1 / this.F[mouthId].s; this.mouth.scale.set(mk * mx, mk * my);

    // arms
    sp.lx.t = s.armL.x; sp.ly.t = s.armL.y; sp.rx.t = s.armR.x; sp.ry.t = s.armR.y;
    const swing = w * sn * 22, drift = Math.sin(time * 0.9) * 2.2 * (1 - w);
    this.arm(this.armL, this.handL, -SHOULDER[0], sp.lx.step(dt) - Math.abs(swing) * 0.25 - drift, sp.ly.step(dt) - swing + breath * 1.2, -1, dt, "faL", s.handL, s.handLRot, sp.handL);
    this.arm(this.armR, this.handR, SHOULDER[0], sp.rx.step(dt) + Math.abs(swing) * 0.25 + drift, sp.ry.step(dt) + swing + breath * 1.2, 1, dt, "faR", s.handR, s.handRRot, sp.handR);

    // the bag hangs from her hand and swings with it
    if (s.bag === "held") {
      const g = this.grip("R");
      this.bagHeld.position.set(g.x, g.y - 6);
      const gp = this.toScene(this.chestMid, g.x, g.y, this.pt2), gxs = gp.x / s.s;
      let acc = 0;
      if (this.prev.gripX !== null && dt > 0) { const v = (gxs - this.prev.gripX) / dt; acc = clamp((v - this.prev.gripV) / dt, -6000, 6000); this.prev.gripV = v; }
      this.prev.gripX = gxs;
      const L = 190;
      this.bagOmega += (-(2600 / L) * Math.sin(this.bagTheta) - (acc / L) * Math.cos(this.bagTheta) - 2.6 * this.bagOmega) * dt;
      this.bagTheta = clamp(this.bagTheta + this.bagOmega * dt, -0.6, 0.6);
      this.bagHeld.rotation = -chestRot * DEG + this.bagTheta;
    }
    if (s.list === "held") {
      const g = this.grip("L");
      this.listHeld.position.set(g.x, g.y);
      sp.list.t = 0; sp.list.v += (this.handL.rotation - (this._lhr ?? this.handL.rotation)) * 14; this._lhr = this.handL.rotation; sp.list.step(dt);
      this.list.rotation = s.listRot * DEG - chestRot * DEG + sp.list.x * 0.5;
      this.list.scale.set(s.listScale);
    }
    this.apple.scale.set((1 + s.listPop * 0.22) / 3, (1 - s.listPop * 0.16 + Math.max(0, -s.listPop) * 0.1) / 3);
    this.five.scale.set((1 + s.fivePulse * 0.16) / 3);

    // hair and cloth that hang: simulated in the room's space so walking and stopping drag them
    const scale = s.s, M = this.sheetFromScene();
    const ba = this.toScene(head, 60, -6, this.pt2), bax = ba.x, bay = ba.y;
    this.braidChain.step(dt, bax, bay, (i, o) => { o.x = bax - i * 2.2 * scale + chestRot * 0.2 * i; o.y = bay + i * 43 * scale; }, scale);
    this.chainStrip(this.braid, this.braidChain, 43, M);
    const pa = this.toScene(this.chestBack, SHOULDER[0] + 4, SHOULDER[1] + 2, this.pt2), pax = pa.x, pay = pa.y;
    this.palluChain.step(dt, pax, pay, (i, o) => { o.x = pax + i * 2.5 * scale; o.y = pay + i * 50 * scale; }, scale);
    this.chainStrip(this.pallu, this.palluChain, 50, M);

    // the saree skirt: follows the hips, lags at the hem, and is pushed out by each knee
    const hv = dt > 0 ? (hipX - this.prev.hipX) / dt : 0; this.prev.hipX = hipX;
    sp.hem.t = clamp(-hv * 0.11, -26, 26); const hem = sp.hem.step(dt);
    const kL = Math.max(0, sn) * w, kR = Math.max(0, -sn) * w, hr = hipRot * DEG;
    this.skirt.update((x, y, o) => {
      const t = clamp((y + 598) / 450, 0, 1.06), t2 = t * t;
      const rot = hr * (1 - 0.7 * t), dx = x, dy = y + 596;
      let px = dx * Math.cos(rot) - dy * Math.sin(rot), py = dx * Math.sin(rot) + dy * Math.cos(rot) - 596;
      px += hipX * (1 - 0.45 * t) + hem * t2;
      const knee = x < 0 ? kL : kR, sideW = clamp(Math.abs(x) / 70, 0, 1), mid = Math.exp(-Math.pow((t - 0.55) / 0.3, 2));
      px += Math.sign(x) * knee * 16 * mid * sideW; py += -knee * 24 * t2 * sideW;
      px += x * 0.035 * t2 * -sp.squash.x * 0.4;
      o.x = px; o.y = py + bob * (1 - 0.5 * t);
    });
    const lift = (k) => -k * 26;
    this.footL.position.set(-46 + hipX * 0.3, -160 + lift(kL)); this.footL.scale.y = Math.abs(this.footL.scale.x) * (1 + kL * 0.1);
    this.footR.position.set(46 + hipX * 0.3, -160 + lift(kR)); this.footR.scale.y = Math.abs(this.footR.scale.x) * (1 + kR * 0.1);

    this.setShade(s.shade);
  }

  /** Matrix that takes scene points into the drawing's space. */
  sheetFromScene() {
    this.toScene(this.sheet, 0, 0, this.pt2);   // refreshes both transforms
    const a = this.sheet.worldTransform.clone().invert();
    return a.append(this.scene.worldTransform);
  }
  chainStrip(strip, chain, seg, M) {
    const pts = (this._cp ||= []); const n = chain.n;
    for (let i = 0; i < n; i++) { const p = chain.p[i]; pts[i] = pts[i] || { x: 0, y: 0 }; pts[i].x = M.a * p.x + M.c * p.y + M.tx; pts[i].y = M.b * p.x + M.d * p.y + M.ty; }
    strip.update((s, o) => {
      const f = clamp(s / seg, -0.5, n - 0.5), i = clamp(Math.floor(f), 0, n - 2), q = f - i;
      const a = pts[i], b = pts[i + 1], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      o.x = a.x + tx * q; o.y = a.y + ty * q; o.nx = ty / l; o.ny = -tx / l;
    });
  }
}
