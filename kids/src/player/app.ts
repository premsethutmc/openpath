/**
 * The child-facing player shell: a big play button, the cartoon, a sound
 * button and a pause button. Grown-up settings (age level, reduced motion,
 * sound, restart) are behind a button that must be held for a second.
 *
 * No account, no network, no links out, no camera or microphone. The only
 * thing kept on the device is the grown-up's settings.
 */
import { ART } from "../art/catalogue.ts";
import { PausableClock } from "../engine/clock.ts";
import { MemorySink } from "../engine/events.ts";
import { Runner } from "../engine/runner.ts";
import type { Episode, Level } from "../engine/types.ts";
import { validateEpisode } from "../engine/validate.ts";
import { Audio } from "./audio.ts";
import { Motion } from "./motion.ts";
import { Stage } from "./stage.ts";

interface Settings {
  level: Level;
  reducedMotion: boolean;
  muted: boolean;
}

const ICONS = {
  play: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M36 24 L78 50 L36 76 Z" fill="currentColor" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/></svg>`,
  pause: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="28" y="24" width="15" height="52" rx="6" fill="currentColor"/><rect x="57" y="24" width="15" height="52" rx="6" fill="currentColor"/></svg>`,
  sound: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 40 h16 l20 -16 v52 l-20 -16 h-16 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M64 36 q 10 14 0 28 M74 28 q 18 22 0 44" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>`,
  muted: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 40 h16 l20 -16 v52 l-20 -16 h-16 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M64 38 l20 24 M84 38 l-20 24" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>`,
  again: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M74 38 A 28 28 0 1 0 78 58" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M80 18 L80 42 L56 42 Z" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`,
  grownups: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" stroke-width="8"/><path d="M50 14 v12 M50 74 v12 M14 50 h12 M74 50 h12 M24 24 l9 9 M67 67 l9 9 M76 24 l-9 9 M33 67 l-9 9" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>`,
  turn: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="30" y="14" width="40" height="72" rx="8" fill="none" stroke="currentColor" stroke-width="6"/><path d="M14 64 a 36 36 0 0 0 30 26" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M40 82 l6 8 l-9 4" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function loadSettings(): Settings {
  const prefersReduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base: Settings = { level: "younger", reducedMotion: prefersReduced, muted: false };
  try {
    const saved = JSON.parse(localStorage.getItem("openpath-kids-settings") ?? "{}");
    if (saved.level === "younger" || saved.level === "older") base.level = saved.level;
    if (typeof saved.reducedMotion === "boolean") base.reducedMotion = saved.reducedMotion;
    if (typeof saved.muted === "boolean") base.muted = saved.muted;
  } catch {
    // Storage blocked: use the defaults.
  }
  return base;
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem("openpath-kids-settings", JSON.stringify(s));
  } catch {
    // Storage blocked: settings last for this visit only.
  }
}

export function startApp(root: HTMLElement, episode: Episode) {
  const query = new URLSearchParams(location.search);
  const speed = Math.max(1, Math.min(40, Number(query.get("speed")) || 1));
  const settings = loadSettings();
  if (query.get("level") === "older" || query.get("level") === "younger") settings.level = query.get("level") as Level;
  if (query.get("motion") === "reduced") settings.reducedMotion = true;
  if (query.get("mute") === "1") settings.muted = true;

  const report = validateEpisode(episode, ART);
  if (report.errors.length) {
    root.innerHTML = `<pre class="broken">This episode has mistakes:\n${report.errors.join("\n")}</pre>`;
    return;
  }

  root.innerHTML = `
    <div class="frame">
      <div class="host"></div>
      <div class="controls">
        <button class="ctl sound" type="button" aria-label="Sound">${settings.muted ? ICONS.muted : ICONS.sound}</button>
        <button class="ctl pause" type="button" aria-label="Pause">${ICONS.pause}</button>
      </div>
      <button class="ctl grownups" type="button" aria-label="For grown-ups (press and hold)">${ICONS.grownups}<span class="ring"></span></button>
      <div class="overlay start">
        <button class="big play" type="button" aria-label="Play">${ICONS.play}</button>
        <div class="turn" aria-hidden="true">${ICONS.turn}</div>
      </div>
      <div class="overlay paused-view" hidden><button class="big resume" type="button" aria-label="Play">${ICONS.play}</button></div>
      <div class="overlay end" hidden><button class="big again" type="button" aria-label="Watch again">${ICONS.again}</button></div>
      <div class="panel" role="dialog" aria-label="For grown-ups" hidden>
        <h2>For grown-ups</h2>
        <p class="title">${episode.title}</p>
        <fieldset><legend>Age</legend>
          <label><input type="radio" name="level" value="younger"> About 3–4</label>
          <label><input type="radio" name="level" value="older"> About 5–7</label>
        </fieldset>
        <label class="row"><input type="checkbox" name="motion"> Reduce motion</label>
        <label class="row"><input type="checkbox" name="mute"> Sound off</label>
        <p class="note">Age and motion changes apply from the start of the story. No account, no ads, no camera or microphone. Nothing about your child is collected or sent anywhere.</p>
        <div class="buttons"><button type="button" class="restart">Start again</button><button type="button" class="close">Close</button></div>
      </div>
    </div>`;

  const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const frame = $<HTMLElement>(".frame");
  const host = $<HTMLElement>(".host");
  const audio = new Audio();
  audio.setMuted(settings.muted || speed > 1);

  let motion: Motion;
  let stage: Stage;
  let clock: PausableClock;
  let runner: Runner | null = null;
  let sink: MemorySink;
  let state: "ready" | "playing" | "paused" | "ended" = "ready";

  const debug = { outcomes: {} as Record<string, string>, events: [] as unknown[], lines: [] as string[], track: "", step: -1 };
  (window as unknown as { __chintoo: typeof debug }).__chintoo = debug;

  const setState = (s: typeof state) => {
    state = s;
    frame.dataset.state = s;
    $<HTMLElement>(".start").hidden = s !== "ready";
    $<HTMLElement>(".paused-view").hidden = s !== "paused";
    $<HTMLElement>(".end").hidden = s !== "ended";
  };

  const build = () => {
    host.innerHTML = "";
    motion = new Motion(speed, settings.reducedMotion);
    frame.classList.toggle("reduced", settings.reducedMotion);
    stage = new Stage(host, episode, motion, audio);
    clock = new PausableClock(speed);
    sink = new MemorySink();
    debug.events = sink.events;
    debug.lines = stage.spoken;
    debug.outcomes = {};
    // Show the opening scene behind the play button.
    const first = episode.tracks[episode.start].find((s) => s.do === "scene");
    if (first?.do === "scene") stage.perform({ ...first, transition: "cut" }, 0);
    for (const s of episode.tracks[episode.start]) {
      if (s.do === "scene") continue;
      if (s.do === "act" && (s.action === "place" || s.action === "sleep")) stage.perform(s, 0);
      else break;
    }
    setState("ready");
  };

  const play = async () => {
    audio.unlock();
    setState("playing");
    runner = new Runner(episode, stage, clock, {
      level: settings.level,
      sink,
      onStep: (track, index) => {
        debug.track = track;
        debug.step = index;
        frame.dataset.track = track;
      },
      onOutcome: (id, outcome) => {
        debug.outcomes[id] = outcome;
        frame.dataset[`outcome_${id.replace(/-/g, "_")}`] = outcome;
      },
    });
    const current = runner;
    const result = await runner.run();
    if (current !== runner || result.stopped) return;
    setState("ended");
  };

  const pause = () => {
    if (state !== "playing") return;
    clock.pause();
    motion.pauseAll();
    audio.pause();
    frame.classList.add("paused");
    setState("paused");
  };
  const resume = () => {
    if (state !== "paused") return;
    clock.resume();
    motion.resumeAll();
    audio.resume();
    frame.classList.remove("paused");
    setState("playing");
  };
  const restart = () => {
    runner?.stop();
    runner = null;
    stage.closeAll();
    frame.classList.remove("paused");
    build();
  };

  $<HTMLButtonElement>(".play").addEventListener("click", () => void play());
  $<HTMLButtonElement>(".resume").addEventListener("click", resume);
  $<HTMLButtonElement>(".pause").addEventListener("click", () => (state === "paused" ? resume() : pause()));
  $<HTMLButtonElement>(".again").addEventListener("click", () => {
    restart();
    void play();
  });
  $<HTMLButtonElement>(".sound").addEventListener("click", (e) => {
    settings.muted = !settings.muted;
    audio.setMuted(settings.muted || speed > 1);
    (e.currentTarget as HTMLElement).innerHTML = settings.muted ? ICONS.muted : ICONS.sound;
    saveSettings(settings);
    syncPanel();
  });
  document.addEventListener("visibilitychange", () => document.hidden && pause());

  // Grown-ups: press and hold for a second, so a child tapping around does not open it.
  const panel = $<HTMLElement>(".panel");
  const gear = $<HTMLButtonElement>(".grownups");
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  const openPanel = () => {
    pause();
    syncPanel();
    panel.hidden = false;
  };
  gear.addEventListener("pointerdown", () => {
    gear.classList.add("holding");
    holdTimer = setTimeout(openPanel, 1000);
  });
  const cancelHold = () => {
    gear.classList.remove("holding");
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  };
  gear.addEventListener("pointerup", cancelHold);
  gear.addEventListener("pointerleave", cancelHold);
  gear.addEventListener("keydown", (e) => e.key === "Enter" && openPanel());

  const syncPanel = () => {
    panel.querySelectorAll<HTMLInputElement>('input[name="level"]').forEach((i) => (i.checked = i.value === settings.level));
    panel.querySelector<HTMLInputElement>('input[name="motion"]')!.checked = settings.reducedMotion;
    panel.querySelector<HTMLInputElement>('input[name="mute"]')!.checked = settings.muted;
  };
  panel.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "level") settings.level = t.value as Level;
    if (t.name === "motion") settings.reducedMotion = t.checked;
    if (t.name === "mute") {
      settings.muted = t.checked;
      audio.setMuted(settings.muted || speed > 1);
      $<HTMLButtonElement>(".sound").innerHTML = settings.muted ? ICONS.muted : ICONS.sound;
    }
    saveSettings(settings);
  });
  panel.querySelector(".close")!.addEventListener("click", () => {
    panel.hidden = true;
    // Age and motion apply from the start of the story.
    if (state === "paused") resume();
  });
  panel.querySelector(".restart")!.addEventListener("click", () => {
    panel.hidden = true;
    restart();
  });

  build();
  if (query.get("autoplay") === "1") void play();
}
