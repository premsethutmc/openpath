// OpenPath, home scene: boot, load, wire the touch screen to the game, run the frame loop.
import "../vendor/pixi-unsafe-eval/index.ts";   // lets the renderer run where pages may not build code from strings
import atlas from "../public/assets/atlas.json";
import voices from "../public/assets/voices.json";
import { Clock, run } from "./engine/kit.js";
import { Sound } from "./engine/audio.js";
import { Stage } from "./engine/stage.js";
import { AmmaActor } from "./actors/amma/actor.js";
import { HomeGame } from "./gameplay/home.js";
import * as content from "./content/home.js";
import { reviewPanel } from "./review.js";

const PIXI = window.PIXI;
const MANUAL = !!window.__GAME_MANUAL;              // tests drive time by hand
const assetUrl = (f) => (window.__GAME_ASSETS && window.__GAME_ASSETS[f]) || `assets/${f}`;
const loadImage = (f) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("could not load " + f)); i.src = assetUrl(f); });
const el = (id) => document.getElementById(id);

async function boot() {
  const files = [atlas.atlas.file, ...Object.values(atlas.layers).map((l) => l.file)];
  const images = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await loadImage(f)])));
  const stage = new Stage(PIXI, { el: el("stage"), canvas: el("view"), atlas, images, room: content.room });
  const clock = new Clock();
  const sound = new Sound(voices, assetUrl);
  const actor = new AmmaActor({ PIXI, stage, atlas, base: PIXI.BaseTexture.from(images[atlas.atlas.file]), sound, clock, room: content.room, lines: content.lines });

  const review = location.hash === "#review" ? reviewPanel(voices) : null;
  const events = [];
  const log = (kind, text, data) => { const e = { t: +clock.t.toFixed(2), kind, text, ...data }; events.push(e); review?.add(e); };
  actor.onLine = (v) => { if (v) log("say", `${v.text} (${v.translit})`); review?.line(v); };
  const game = new HomeGame({ actor, content, sound, log });

  /* -------------------------------------------------------- touch input */
  // Every touchable thing answers on pointerdown, the moment the finger lands.
  const toRoom = (e) => stage.toScene(e.global);
  const T = actor.targets;
  // Amma answers wherever her drawing is (no box around her, so the list in her outstretched hand stays reachable)
  T.amma.eventMode = "static";
  T.bag.eventMode = "static"; T.bag.hitArea = new PIXI.Rectangle(-115, -25, 230, 320);
  T.list.eventMode = "static"; T.list.hitArea = new PIXI.Rectangle(-110, -85, 220, 190);
  for (const t of [T.amma, T.bag, T.list]) t.cursor = "pointer";
  T.amma.on("pointerdown", (e) => { e.stopPropagation(); game.tap("amma", toRoom(e)); });
  T.bag.on("pointerdown", (e) => { e.stopPropagation(); game.tap("bag", toRoom(e)); });
  T.list.on("pointerdown", (e) => { e.stopPropagation(); game.tap(actor.hasList ? "list" : "bag", toRoom(e)); });
  // a touch on anything else in the room still counts: light, dust and overlays must not catch it
  for (const o of [stage.vignette, stage.fade, stage.motes, stage.sparks, stage.layers.shafts, stage.layers.fg, actor.reflSprite, actor.shadow]) o.eventMode = "none";
  stage.app.stage.eventMode = "static"; stage.app.stage.hitArea = new PIXI.Rectangle(-1e5, -1e5, 2e5, 2e5);
  stage.app.stage.on("pointerdown", (e) => game.tap("room", toRoom(e)));

  /* --------------------------------------------------------------- loop */
  let time = 0;
  function frame(dt, draw = true) {
    dt = Math.min(dt, 1 / 20);
    time += dt; sound.sceneTime += dt; clock.advance(dt);
    game.update(dt);
    stage.update(dt, time);
    actor.update(dt, time, draw);
    if (game.state !== "waiting") sound.ambient(dt);
    if (draw) stage.render();
    review?.tick(dt, game.state);
  }
  // Slower phones: if the first seconds of play run under ~45 frames a second, drop the floor
  // reflection and render at a lower pixel density. Nothing else about the experience changes.
  const perf = { t: 0, n: 0, done: false };
  function adapt(dt) {
    if (perf.done || game.state === "waiting") return;
    perf.t += dt; perf.n++;
    if (perf.t > 3) {
      perf.done = true;
      const fps = perf.n / perf.t;
      if (fps < 45) { actor.reflSprite.renderable = false; actor.reflectionOff = true; stage.app.renderer.resolution = Math.min(stage.app.renderer.resolution, 1.25); stage.layout(); log("quality", `reduced (${fps.toFixed(0)} fps)`); }
    }
  }
  if (!MANUAL) {
    let last = performance.now();
    const tick = (now) => { requestAnimationFrame(tick); const dt = (now - last) / 1000; last = now; if (document.hidden) return; adapt(dt); frame(dt); };
    requestAnimationFrame(tick);
  } else frame(1 / 60);

  /* -------------------------------------------------------- the one button */
  const play = el("play");
  play.addEventListener("click", async () => {
    play.hidden = true;
    // on a phone, take the whole screen if the browser allows it; carry on if not
    if (matchMedia("(pointer: coarse)").matches) document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});
    await sound.unlock();
    run(game.start());
  });
  el("loading").hidden = true; play.hidden = false;

  window.__game = {
    frame, game, actor, events, clock, canvas: el("view"),
    start: () => { play.hidden = true; run(game.start()); },
    record: async (secs) => { play.hidden = true; await sound.unlockOffline(secs); run(game.start()); },
    soundtrack: () => sound.renderOffline(),
    where: (name) => actor.where(name),
    get time() { return time; },
  };
}

boot().catch((e) => { console.error(e); const l = el("loading"); if (l) { l.hidden = false; l.textContent = "!"; l.title = e.message; } });
