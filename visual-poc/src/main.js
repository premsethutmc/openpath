// OpenPath visual-quality proof of concept: one scene, Amma at home.
// The room, the camera, the script of the scene, and how she answers a tap.
import "../vendor/pixi-unsafe-eval/index.ts";   // lets the renderer run where pages may not build code from strings
import atlas from "../public/assets/atlas.json";
import voices from "../public/assets/voices.json";
import { Clock, Spring, ease, run, clamp, lerp, DEG } from "./kit.js";
import { Amma, REST_L, REST_R } from "./amma.js";
import { Sound } from "./audio.js";

const PIXI = window.PIXI;
const W = atlas.world.w, H = atlas.world.h;
const params = new URLSearchParams(location.search);
const MANUAL = params.has("manual") || !!window.__POC_MANUAL;   // tests drive time by hand
const assetUrl = (f) => (window.__POC_ASSETS && window.__POC_ASSETS[f]) || `assets/${f}`;
const loadImage = (f) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("could not load " + f)); i.src = assetUrl(f); });

const el = (id) => document.getElementById(id);
const stageEl = el("stage"), canvas = el("view"), playBtn = el("play");

const HOME = { x: 1200, y: 1390 };                 // where she stops, in front of the child
const START = { x: 1196, y: 972 };                 // inside the inner room
const BAG_ON_STOOL = { x: 1490, y: 925 };
const scaleAt = (y) => 0.62 + (y - 1010) * (0.52 / 380);

async function boot() {
  PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;
  const app = new PIXI.Application({ view: canvas, antialias: true, backgroundColor: 0x3a1a16, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, powerPreference: "high-performance", autoStart: false });
  const files = [atlas.atlas.file, ...Object.values(atlas.layers).map((l) => l.file)];
  const images = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await loadImage(f)])));
  const tex = (f) => PIXI.Texture.from(images[f]);

  /* ---------------------------------------------------------------- room */
  const view = new PIXI.Container(), scene = new PIXI.Container();
  scene.sortableChildren = true; view.addChild(scene); app.stage.addChild(view);
  const layers = {};
  const addLayer = (id, z) => {
    const L = atlas.layers[id], c = new PIXI.Container(), s = new PIXI.Sprite(tex(L.file));
    s.scale.set(1 / L.s);
    if (L.at) { c.position.set(L.at[0], L.at[1]); s.position.set(L.box.x, L.box.y); } else s.position.set(L.box.x, L.box.y);
    if (L.blend === "add") s.blendMode = PIXI.BLEND_MODES.ADD;
    c.addChild(s); c.zIndex = z; c.depth = L.depth; c.home = { x: c.position.x, y: c.position.y };
    scene.addChild(c); layers[id] = c;
    return c;
  };
  addLayer("out", 0); addLayer("far", 1); addLayer("wall", 3); addLayer("floor", 4); addLayer("furniture", 5); addLayer("swing", 6); addLayer("fg", 12); addLayer("shafts", 13);
  // the garden outside sways from the bottom of the window
  { const o = layers.out, L = atlas.layers.out, s = o.children[0]; o.position.set(L.box.x + L.box.w / 2, L.box.y + L.box.h); s.position.set(-L.box.w / 2, -L.box.h); o.home = { x: o.position.x, y: o.position.y }; }

  const amma = new Amma(PIXI, atlas, PIXI.BaseTexture.from(images[atlas.atlas.file]), scene);
  amma.root.zIndex = 8; scene.addChild(amma.root);
  const shadow = amma.spr("shadow"); shadow.zIndex = 7; scene.addChild(shadow);
  // the polished floor gives back a soft image of her: drawn small into a texture, flipped under her feet
  const REFL = { w: 320, h: 512, k: 0.5 };
  const reflTex = PIXI.RenderTexture.create({ width: REFL.w, height: REFL.h, resolution: 1 });
  const refl = new PIXI.Sprite(reflTex); refl.anchor.set(0.5, 1); refl.zIndex = 6.9; refl.alpha = 0.17; refl.tint = 0xffc4b0; refl.visible = false; scene.addChild(refl);
  const reflM = new PIXI.Matrix();
  const stoolSpot = new PIXI.Container(); stoolSpot.zIndex = 6.5; stoolSpot.position.set(BAG_ON_STOOL.x, BAG_ON_STOOL.y); scene.addChild(stoolSpot);

  // dust in the sunbeams
  const motes = new PIXI.Container(); motes.zIndex = 14; scene.addChild(motes);
  const moteList = Array.from({ length: 30 }, (_, i) => {
    const m = amma.spr("mote"); m.blendMode = PIXI.BLEND_MODES.ADD; amma.tintable.pop();
    const d = { m, x: 380 + Math.random() * 820, y: 420 + Math.random() * 880, r: 0.4 + Math.random() * 0.9, p: Math.random() * 7, v: 5 + Math.random() * 12 };
    motes.addChild(m); return d;
  });
  const sparks = new PIXI.Container(); sparks.zIndex = 15; scene.addChild(sparks);

  const vignette = new PIXI.Sprite(tex(atlas.layers.vignette.file)); app.stage.addChild(vignette);
  const fade = new PIXI.Graphics(); fade.beginFill(0xfff1d0).drawRect(0, 0, 10, 10).endFill(); app.stage.addChild(fade);

  /* -------------------------------------------------------------- camera */
  const cam = { x: 1200, y: 800, z: 1.035 };
  const look = { x: new Spring(0, 30, 9), y: new Spring(0, 30, 9) };
  let vw = 1, vh = 1;
  function layout() {
    vw = stageEl.clientWidth || 1; vh = stageEl.clientHeight || 1;
    app.renderer.resize(vw, vh);
    vignette.width = vw; vignette.height = vh; fade.width = vw; fade.height = vh;
  }
  function applyCamera(time) {
    const cover = Math.max(vw / W, vh / H), sc = cover * cam.z, hw = vw / (2 * sc), hh = vh / (2 * sc);
    const cx = clamp(cam.x + look.x.x + Math.sin(time * 0.23) * 5, hw, W - hw), cy = clamp(cam.y + look.y.x + Math.sin(time * 0.31) * 3, hh, H - hh);
    view.scale.set(sc); view.position.set(vw / 2 - cx * sc, vh / 2 - cy * sc);
    for (const id in layers) { const c = layers[id]; if (c.depth !== 1) c.position.set(c.home.x + (cx - 1200) * (1 - c.depth), c.home.y + (cy - 800) * (1 - c.depth)); }
  }
  new ResizeObserver(layout).observe(stageEl); layout();
  stageEl.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const r = stageEl.getBoundingClientRect(); look.x.t = ((e.clientX - r.left) / r.width - 0.5) * 26; look.y.t = ((e.clientY - r.top) / r.height - 0.5) * 12; });
  stageEl.addEventListener("pointerleave", () => { look.x.t = 0; look.y.t = 0; });

  /* --------------------------------------------------------------- sound */
  const sound = new Sound(voices, assetUrl);
  let line = null, lineClock = 0;
  const caption = (v) => { const c = el("line"); if (c) c.textContent = v ? `${v.text}  ·  ${v.translit}  ·  “${v.meaning}”` : ""; };
  function say(id) { line = sound.say(id); lineClock = 0; caption(line); return line; }
  amma.onStep = () => sound.step(clamp((amma.st.y - START.y) / (HOME.y - START.y), 0, 1));

  /* -------------------------------------------------------------- script */
  const clock = new Clock();
  const S = clock.scope(), R = clock.scope(), I = clock.scope();
  const st = amma.st;
  let phase = "waiting", tapCount = 0, micro = 0;

  function setInside(inside) { amma.root.zIndex = inside ? 2 : 8; shadow.zIndex = inside ? 1.5 : 7; scene.sortDirty = true; }
  function resetScene() {
    S.cancel(); R.cancel(); I.cancel();
    sound.stopVoice(); line = null; amma.talk = null; caption(null);
    amma.reset();
    stoolSpot.addChild(amma.bag); amma.bag.position.set(0, 0); amma.bag.scale.set(0.98); amma.bag.rotation = 0;
    st.x = START.x; st.y = START.y; st.s = scaleAt(START.y); st.shade = 1;
    amma.root.visible = false; shadow.visible = false; setInside(true);
    cam.x = 1200; cam.y = 792; cam.z = 1.035; sparks.removeChildren();
    fade.alpha = 0;
    phase = "waiting"; tapCount = 0;
  }
  const blinkNow = () => { amma.blink.t = 0; };
  const lookAt = (gx, gy, yaw = 0, pitch = 0) => { st.gazeX = gx; st.gazeY = gy; st.yaw = yaw; st.pitch = pitch; };
  const lookChild = () => lookAt(0, 0.08, 0, 0);
  function sparkle(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const s = amma.spr("spark"); amma.tintable.pop(); s.blendMode = PIXI.BLEND_MODES.ADD; sparks.addChild(s);
      const a = (i / n) * Math.PI * 2 + Math.random(), d = 70 + Math.random() * 90, k0 = 0.5 + Math.random() * 0.6;
      run(R.tween(0.7 + Math.random() * 0.3, (k) => { s.position.set(x + Math.cos(a) * d * k, y + Math.sin(a) * d * k - 30 * k); s.scale.set((k0 * (1 - k * 0.7)) / 2); s.rotation = k * 2; s.alpha = 1 - k * k; }, ease.out).then(() => s.destroy()));
    }
  }

  const walkEase = (t) => { const a = 0.7, v = 1 / (a + (1 - a) / 2); return t < a ? v * t : 1 - ((1 - t) * (1 - t) * v) / (2 * (1 - a)); };

  async function sequence() {
    resetScene();
    phase = "entering";
    fade.alpha = 1; run(S.to(fade, { alpha: 0 }, 1.0, ease.out));
    await S.wait(0.55);

    /* 1. She walks in from the inner room, toward the child. */
    amma.root.visible = true; shadow.visible = true; st.walk = 1;
    const WALK = 3.9, STEPS = 8;
    run(S.to(cam, { z: 1.075, y: 812 }, WALK + 0.6, ease.sine));
    run(S.tween(WALK, (k) => {
      const y = lerp(START.y, HOME.y, k);
      st.y = y; st.x = lerp(START.x, HOME.x, k); st.s = scaleAt(y); st.phase = k * STEPS * Math.PI; st.shade = clamp((1190 - y) / 200, 0, 1);
      if (y > 1016 && amma.root.zIndex < 8) setInside(false);
    }, walkEase));
    await S.wait(1.25);
    st.brow = 1; st.mouth = "m-grin"; blinkNow();            // she sees the child
    await S.wait(0.95);
    st.brow = 0.25; st.mouth = "m-smile";
    await S.wait(WALK - 2.2 - 0.28);
    await S.to(st, { walk: 0 }, 0.28, ease.out);
    amma.sp.squash.v += 60; amma.sp.hem.v += 60;              // she stops; the saree and braid carry on a little
    run((async () => { await S.to(st, { chestDy: 5, lean: 1.6 }, 0.14, ease.out); await S.to(st, { chestDy: 0, lean: 0 }, 0.42, ease.back); })());
    phase = "greeting";
    await S.wait(0.35);

    /* 2. She smiles and waves. */
    await S.to(st.armL, { x: -116, y: 152 }, 0.16, ease.sine);  // a small dip first
    st.mouth = "m-grin"; st.brow = 0.9;
    run(S.to(st, { lean: -2.5, headRot: -6, hipX: 5 }, 0.5, ease.back));
    run((async () => { await S.wait(0.2); st.handL = "hand-open"; })());   // the palm opens as the hand comes up
    await S.to(st.armL, { x: -205, y: -240 }, 0.42, ease.back);
    // each swing of the hand is answered by the head and the body, a beat behind
    const wave = async (x, y, t, d) => { run(S.to(st, { lean: -2.5 + d * 1.4, headRot: -6 + d * 2.4, chestDy: -1.5 }, t + 0.06, ease.sine)); await S.to(st.armL, { x, y }, t, ease.sine); sound.bangles(); };
    await wave(-250, -238, 0.2, -1);
    st.eye = "happy";
    await wave(-170, -226, 0.27, 1); await wave(-248, -240, 0.27, -1); await wave(-172, -226, 0.27, 1);
    st.eye = "open"; blinkNow();
    await S.to(st.armL, { x: -205, y: -240 }, 0.15, ease.sine);
    st.mouth = "m-smile"; st.brow = 0.2;
    run(S.to(st, { lean: 0, headRot: 0, hipX: 0, chestDy: 0 }, 0.6, ease.inOut));
    run((async () => { await S.wait(0.22); st.handL = "hand-relaxed"; })());
    await S.to(st.armL, { ...REST_L }, 0.55, ease.inOut);

    /* 3. She picks up her shopping bag from the stool. */
    phase = "bag";
    st.gazeX = 0.9; st.gazeY = 0.5; await S.wait(0.12);
    st.yaw = 0.8; st.pitch = 0.3; st.headRot = 3;
    await S.wait(0.28);
    run(S.to(st, { lean: 8, hipX: -10, chestDy: 8 }, 0.5, ease.inOut));
    const from = { ...st.armR };
    await S.tween(0.5, (k) => { const t = amma.chestFromScene(BAG_ON_STOOL.x - 6, BAG_ON_STOOL.y - 16); st.armR.x = lerp(from.x, t.x, k); st.armR.y = lerp(from.y, t.y, k); }, ease.inOut);
    st.handR = "hand-grip"; sound.rustle();
    await S.tween(0.14, (k) => amma.bag.scale.set(0.98 * (1 + 0.03 * Math.sin(k * Math.PI)), 0.98 * (1 - 0.05 * Math.sin(k * Math.PI))), ease.lin);
    amma.holdBag();
    // she takes the weight first, then straightens, leaning a little away from the load before settling
    run((async () => { await S.to(st, { lean: 9.5, chestDy: 11 }, 0.14, ease.out); await S.to(st, { lean: -2.6, hipX: 8, chestDy: 0, headRot: 0 }, 0.6, ease.inOut); await S.to(st, { lean: 0, hipX: 0 }, 0.5, ease.sine); })());
    run((async () => { await S.wait(0.4); lookChild(); st.mouth = "m-grin"; await S.wait(0.55); st.mouth = "m-smile"; })());
    await S.wait(0.12);
    await S.to(st.armR, { x: 126, y: 100 }, 0.7, ease.inOut);
    await S.to(st.armR, { y: 114 }, 0.26, ease.sine);
    await S.wait(0.1);

    /* 4. She takes out the list and shows it. */
    phase = "list";
    lookAt(0.55, 0.85, 0.4, 0.55);
    await S.to(st.armR, { x: 78, y: 34 }, 0.45, ease.inOut);
    await S.to(st.armL, { x: 44, y: 62 }, 0.4, ease.inOut);
    st.handL = "hand-grip"; amma.holdList(); sound.paper();
    await S.wait(0.08);
    run(S.to(st, { listScale: 1.12, listRot: -5 }, 0.6, ease.back));
    run(S.to(st.armR, { x: 126, y: 114 }, 0.7, ease.inOut));
    run((async () => { await S.wait(0.2); lookAt(-0.85, 0.2, -0.45, 0.1); await S.wait(0.55); lookChild(); st.brow = 0.8; blinkNow(); })());
    await S.to(st.armL, { x: -186, y: -34 }, 0.62, ease.back);
    sound.chime(); { const p = amma.toScene(amma.list, 0, 0); sparkle(p.x, p.y, 7); }
    run(S.to(cam, { x: 1180, z: 1.1 }, 1.2, ease.sine));
    await S.wait(0.45);

    /* 5. She speaks. */
    phase = "speaking";
    const v = say("main");
    for (const t of v.stress) run((async () => { await S.wait(t); st.pitch = 0.35; await S.wait(0.13); st.pitch = 0; })());
    run((async () => { await S.wait(1.25); await S.to(st.armL, { y: -56 }, 0.2, ease.sine); await S.to(st.armL, { y: -34 }, 0.3, ease.back); })());
    run((async () => { await S.wait(2.05); st.headRot = 5; st.brow = 1; await S.to(st, { lean: 2 }, 0.3, ease.sine); await S.wait(0.6); st.headRot = 0; st.brow = 0.2; await S.to(st, { lean: 0 }, 0.4, ease.sine); })());
    await S.wait(v.dur + 0.2);
    st.mouth = "m-smile";
    phase = "idle";
    idle();
  }

  /* While she waits: small, unhurried things, so she never freezes. */
  function idle() {
    run((async () => {
      for (;;) {
        await I.wait(2.2 + Math.random() * 2.4);
        const pick = Math.random();
        if (pick < 0.35) { lookAt(-0.8, 0.25, -0.3, 0.05); await I.wait(0.9); lookChild(); blinkNow(); }
        else if (pick < 0.7) { const d = Math.random() < 0.5 ? 1 : -1; await I.to(st, { hipX: 7 * d, lean: -1.4 * d, headRot: 2 * d }, 0.9, ease.sine); await I.wait(1.4); await I.to(st, { hipX: 0, lean: 0, headRot: 0 }, 0.9, ease.sine); }
        else { st.brow = 0.7; st.headRot = -4; await I.wait(0.9); st.brow = 0.2; st.headRot = 0; }
      }
    })());
  }

  /* ---------------------------------------------------------------- taps */
  async function settle() { await R.to(st, { lean: 0, hipX: 0, chestDy: 0, headRot: 0 }, 0.4, ease.sine); st.brow = 0.2; st.eye = "open"; st.mouth = "m-smile"; lookChild(); }
  function tapAmma() {
    if (phase === "waiting") return;
    if (phase !== "idle") { micro = 0.7; sound.pop(); return; }   // she is busy: a quick happy glance, nothing interrupted
    I.cancel(); R.cancel(); tapCount++;
    run((async () => {
      if (tapCount % 2) {
        st.brow = 1; st.headRot = 7; lookChild(); blinkNow();
        run(R.to(st, { lean: 3, chestDy: 4 }, 0.3, ease.back));
        const v = say("enna");
        await R.wait(v.dur + 0.25);
      } else {
        sound.giggle(); st.eye = "happy"; st.mouth = "m-grin"; st.headRot = -5;
        for (let i = 0; i < 3; i++) { await R.to(st, { chestDy: -7 }, 0.09, ease.out); await R.to(st, { chestDy: 2 }, 0.11, ease.in); }
        const p = amma.toScene(amma.head, 0, -150); sparkle(p.x, p.y, 6);
        await R.wait(0.35);
      }
      await settle(); idle();
    })());
  }
  function tapList() {
    if (phase !== "idle" || st.list !== "held") { micro = 0.7; sound.pop(); return; }
    I.cancel(); R.cancel();
    run((async () => {
      lookAt(-0.8, 0.2, -0.4, 0.1); st.brow = 0.9;
      run(R.to(cam, { x: 1100, y: 790, z: 1.2 }, 0.7, ease.inOut));
      run(R.to(st, { listScale: 1.42, listRot: 0 }, 0.45, ease.back));
      await R.to(st.armL, { x: -168, y: 26 }, 0.45, ease.back);
      sound.pop();
      await R.to(st, { listPop: 1 }, 0.12, ease.out); await R.to(st, { listPop: -0.5 }, 0.12, ease.sine); await R.to(st, { listPop: 0 }, 0.2, ease.back);
      sound.chime(); { const p = amma.toScene(amma.list, 0, 0); sparkle(p.x, p.y, 8); }
      run((async () => { await R.to(st, { fivePulse: 1 }, 0.16, ease.out); await R.to(st, { fivePulse: 0 }, 0.3, ease.back); })());
      lookChild(); blinkNow();
      const v = say("ithanai");
      await R.wait(v.dur + 0.5);
      run(R.to(cam, { x: 1180, y: 812, z: 1.1 }, 0.9, ease.inOut));
      run(R.to(st, { listScale: 1.12, listRot: -5 }, 0.5, ease.inOut));
      await R.to(st.armL, { x: -186, y: -34 }, 0.5, ease.inOut);
      await settle(); idle();
    })());
  }
  amma.root.eventMode = "static"; amma.root.cursor = "pointer"; amma.root.hitArea = new PIXI.Rectangle(-175, -900, 350, 900);
  amma.root.on("pointertap", tapAmma);
  amma.list.eventMode = "static"; amma.list.cursor = "pointer"; amma.list.hitArea = new PIXI.Rectangle(-100, -75, 200, 170);
  amma.list.on("pointertap", (e) => { e.stopPropagation(); tapList(); });

  /* ---------------------------------------------------------------- loop */
  let time = 0, frames = 0, fpsT = 0;
  function frame(dt, draw = true) {
    dt = Math.min(dt, 1 / 20);
    time += dt; sound.sceneTime += dt; clock.advance(dt);
    look.x.step(dt); look.y.step(dt);

    // speech drives her mouth from the audio clock
    if (line) {
      lineClock += dt;
      const t = sound.voiceTime(lineClock);
      if (t > line.dur + 0.05 || t < 0) { line = null; amma.talk = null; } else { const [shape, open, loud] = sound.mouthAt(line, t); amma.talk = { shape, open, loud }; }
    }
    if (micro > 0) { micro -= dt; st.eye = micro > 0.25 ? "happy" : "open"; if (micro <= 0) st.eye = "open"; }

    applyCamera(time);
    amma.update(dt, time);
    shadow.position.set(st.x + 16 * st.s, st.y + 2); shadow.scale.set((st.s * 0.92) / 0.5, (st.s * 0.8) / 0.5); shadow.alpha = 0.55 - st.shade * 0.25;

    layers.swing.rotation = Math.sin(time * 0.8) * 0.9 * DEG;
    layers.out.rotation = Math.sin(time * 0.5) * 0.5 * DEG;
    layers.shafts.alpha = 0.78 + Math.sin(time * 0.7) * 0.1 + Math.sin(time * 1.9) * 0.04;
    for (const d of moteList) {
      d.y -= d.v * dt; d.x += Math.sin(time * 0.6 + d.p) * 6 * dt;
      if (d.y < 380) { d.y = 1300; d.x = 380 + Math.random() * 820; }
      d.m.position.set(d.x, d.y); d.m.scale.set(d.r / 2); d.m.alpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.3 + d.p * 3));
    }
    if (phase !== "waiting") sound.ambient(dt);
    refl.visible = amma.root.visible && amma.root.zIndex >= 8;
    if (draw && refl.visible) {
      const k = REFL.k / st.s;
      reflM.set(k, 0, 0, k, REFL.w / 2 - st.x * k, REFL.h - st.y * k);
      app.renderer.render(amma.root, { renderTexture: reflTex, clear: true, transform: reflM });
      refl.position.set(st.x, st.y + 4 * st.s); refl.scale.set(st.s / REFL.k, (-st.s / REFL.k) * 0.8);
    }
    if (draw) app.renderer.render(app.stage);

    frames++; fpsT += dt;
    if (fpsT >= 1) { const f = el("fps"); if (f) f.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
  }
  resetScene();
  if (!MANUAL) {
    let last = performance.now();
    const tick = (now) => { requestAnimationFrame(tick); const dt = (now - last) / 1000; last = now; if (document.hidden) return; frame(dt); };
    requestAnimationFrame(tick);
  } else frame(1 / 60);

  /* ------------------------------------------------------------ controls */
  async function start() {
    playBtn.hidden = true;
    await sound.unlock();
    run(sequence());
  }
  playBtn.addEventListener("click", start);
  el("replay")?.addEventListener("click", start);
  el("sound")?.addEventListener("click", (e) => { sound.setOn(!sound.on); e.currentTarget.setAttribute("aria-pressed", sound.on); });
  el("loading").hidden = true; playBtn.hidden = false;

  window.__poc = { frame, start: () => { playBtn.hidden = true; run(sequence()); }, record: async (secs) => { playBtn.hidden = true; await sound.unlockOffline(secs); run(sequence()); }, soundtrack: () => sound.renderOffline(), canvas, st, cam, amma, tapAmma, tapList, get phase() { return phase; }, get time() { return time; } };
}

boot().catch((e) => { console.error(e); const l = el("loading"); if (l) { l.hidden = false; l.textContent = "This scene could not start: " + e.message; } });
