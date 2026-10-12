// The stage: the renderer, the painted room in depth layers, the camera, and small effects.
// It knows nothing about Amma or the game; actors add themselves to `scene`.
import { Spring, clamp, ease, run, DEG } from "./kit.js";

export class Stage {
  constructor(PIXI, { el, canvas, atlas, images, room }) {
    this.PIXI = PIXI; this.el = el; this.atlas = atlas; this.room = room;
    this.W = atlas.world.w; this.H = atlas.world.h;
    PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;
    // cap the pixel density: most Android phones are 2.5-3.5x, and 2x is visually identical here at a fraction of the cost
    this.app = new PIXI.Application({ view: canvas, antialias: true, backgroundColor: 0x3a1a16, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, powerPreference: "high-performance", autoStart: false });
    this.tex = (f) => PIXI.Texture.from(images[f]);
    this.view = new PIXI.Container(); this.scene = new PIXI.Container(); this.scene.sortableChildren = true;
    this.view.addChild(this.scene); this.app.stage.addChild(this.view);

    this.layers = {};
    for (const [id, z] of room.layers) this.addLayer(id, z);
    const o = this.layers.out, L = atlas.layers.out;   // the garden outside sways from the bottom of the window
    o.position.set(L.box.x + L.box.w / 2, L.box.y + L.box.h); o.children[0].position.set(-L.box.w / 2, -L.box.h); o.home = { x: o.position.x, y: o.position.y };

    this.motes = new PIXI.Container(); this.motes.zIndex = 14; this.scene.addChild(this.motes);
    this.sparks = new PIXI.Container(); this.sparks.zIndex = 15; this.scene.addChild(this.sparks);
    this.vignette = new PIXI.Sprite(this.tex(atlas.layers.vignette.file)); this.app.stage.addChild(this.vignette);
    this.fade = new PIXI.Graphics(); this.fade.beginFill(0xfff1d0).drawRect(0, 0, 10, 10).endFill(); this.fade.alpha = 0; this.app.stage.addChild(this.fade);

    this.cam = { ...room.camera };
    this.lookX = new Spring(0, 30, 9); this.lookY = new Spring(0, 30, 9);
    this.vw = 1; this.vh = 1;
    new ResizeObserver(() => this.layout()).observe(el); this.layout();
    el.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const r = el.getBoundingClientRect(); this.lookX.t = ((e.clientX - r.left) / r.width - 0.5) * 26; this.lookY.t = ((e.clientY - r.top) / r.height - 0.5) * 12; });
    el.addEventListener("pointerleave", () => { this.lookX.t = 0; this.lookY.t = 0; });
  }

  addLayer(id, z) {
    const P = this.PIXI, L = this.atlas.layers[id], c = new P.Container(), s = new P.Sprite(this.tex(L.file));
    s.scale.set(1 / L.s);
    if (L.at) c.position.set(L.at[0], L.at[1]);
    s.position.set(L.box.x, L.box.y);
    if (L.blend === "add") s.blendMode = P.BLEND_MODES.ADD;
    c.addChild(s); c.zIndex = z; c.depth = L.depth; c.home = { x: c.position.x, y: c.position.y };
    this.scene.addChild(c); this.layers[id] = c;
  }
  /** Dust in the sunbeams, using a small sprite from the character atlas. */
  addMotes(makeSprite, n = 30) {
    this.moteList = Array.from({ length: n }, () => {
      const m = makeSprite(); m.blendMode = this.PIXI.BLEND_MODES.ADD; this.motes.addChild(m);
      return { m, x: 380 + Math.random() * 820, y: 420 + Math.random() * 880, r: 0.4 + Math.random() * 0.9, p: Math.random() * 7, v: 5 + Math.random() * 12 };
    });
  }
  sparkle(makeSprite, scope, x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const s = makeSprite(); s.blendMode = this.PIXI.BLEND_MODES.ADD; this.sparks.addChild(s);
      const a = (i / n) * Math.PI * 2 + Math.random(), d = 70 + Math.random() * 90, k0 = 0.5 + Math.random() * 0.6;
      run(scope.tween(0.7 + Math.random() * 0.3, (k) => { s.position.set(x + Math.cos(a) * d * k, y + Math.sin(a) * d * k - 30 * k); s.scale.set((k0 * (1 - k * 0.7)) / 2); s.rotation = k * 2; s.alpha = 1 - k * k; }, ease.out).finally(() => s.destroy()));
    }
  }

  layout() {
    this.vw = this.el.clientWidth || 1; this.vh = this.el.clientHeight || 1;
    this.app.renderer.resize(this.vw, this.vh);
    this.vignette.width = this.fade.width = this.vw; this.vignette.height = this.fade.height = this.vh;
  }
  /** Camera framing that keeps a region of the room fully in view on this screen's shape. */
  fit(x0, x1, y0, y1, maxZ = 1.2) {
    const cover = Math.max(this.vw / this.W, this.vh / this.H);
    const z = Math.max(1.02, Math.min(maxZ, this.vw / cover / (x1 - x0), this.vh / cover / (y1 - y0)));
    // on very wide or very tall screens the region may not fit: keep its top (faces) rather than its middle
    const vh = this.vh / (cover * z);
    return { x: (x0 + x1) / 2, y: vh < y1 - y0 ? y0 + vh / 2 - 10 : (y0 + y1) / 2, z };
  }
  /** Screen point (CSS pixels inside the stage) to room coordinates, and back. */
  toScene(p) { return this.scene.toLocal(p); }
  toScreen(container, x = 0, y = 0) { return container.toGlobal(new this.PIXI.Point(x, y)); }

  update(dt, time) {
    this.lookX.step(dt); this.lookY.step(dt);
    const { cam, W, H, vw, vh } = this;
    const cover = Math.max(vw / W, vh / H), sc = cover * cam.z, hw = vw / (2 * sc), hh = vh / (2 * sc);
    const cx = clamp(cam.x + this.lookX.x + Math.sin(time * 0.23) * 5, hw, W - hw), cy = clamp(cam.y + this.lookY.x + Math.sin(time * 0.31) * 3, hh, H - hh);
    this.view.scale.set(sc); this.view.position.set(vw / 2 - cx * sc, vh / 2 - cy * sc);
    for (const id in this.layers) { const c = this.layers[id]; if (c.depth !== 1) c.position.set(c.home.x + (cx - W / 2) * (1 - c.depth), c.home.y + (cy - H / 2) * (1 - c.depth)); }
    if (this.layers.swing) this.layers.swing.rotation = Math.sin(time * 0.8) * 0.9 * DEG;
    this.layers.out.rotation = Math.sin(time * 0.5) * 0.5 * DEG;
    if (this.layers.shafts) this.layers.shafts.alpha = 0.78 + Math.sin(time * 0.7) * 0.1 + Math.sin(time * 1.9) * 0.04;
    for (const d of this.moteList || []) {
      d.y -= d.v * dt; d.x += Math.sin(time * 0.6 + d.p) * 6 * dt;
      if (d.y < 380) { d.y = 1300; d.x = 380 + Math.random() * 820; }
      d.m.position.set(d.x, d.y); d.m.scale.set(d.r / 2); d.m.alpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.3 + d.p * 3));
    }
  }
  render() { this.app.renderer.render(this.app.stage); }
}
