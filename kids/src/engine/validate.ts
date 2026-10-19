/**
 * Episode validation: catches authoring mistakes before a child ever sees them.
 *
 * Beyond spelling mistakes in names, it guarantees the story properties the
 * product depends on:
 *  - every interaction window has a track for every outcome, including
 *    "timeout", so the story always carries on by itself;
 *  - windows are long enough that nobody is hurried, and short enough that the
 *    story never stalls;
 *  - tracks never loop, so every episode reaches its end;
 *  - lines are short.
 */
import { PRIMITIVES } from "./primitives.ts";
import { includedAt } from "./runner.ts";
import { stepMs } from "./timing.ts";
import { EPISODE_FORMAT, type Episode, LEVELS, type Level, type Place, type Step } from "./types.ts";

export const STAGE = { width: 1600, height: 900 };
export const WINDOW_MIN_MS = 6000;
export const WINDOW_MAX_MS = 60000;
export const MAX_WORDS_PER_LINE = 14;
const MOODS = ["happy", "sad", "surprised", "hungry", "sleepy", "yuck", "proud", "neutral"];
const PROP_ACTIONS = ["show", "hide", "move", "fall", "wobble", "glow", "attach", "detach", "variant", "badge"];

/** What the art library can draw. Optional: without it, art names are not checked. */
export interface ArtCatalogue {
  rigs: Record<string, readonly string[]>;
  scenes: readonly string[];
  props: Record<string, readonly string[]>;
  sounds: readonly string[];
}

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export function validateEpisode(input: unknown, art?: ArtCatalogue): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);

  if (!input || typeof input !== "object") return { errors: ["episode is not an object"], warnings };
  const ep = input as Episode;
  if (ep.format !== EPISODE_FORMAT) err(`format must be "${EPISODE_FORMAT}"`);
  if (typeof ep.id !== "string" || !/^[a-z0-9-]+$/.test(ep.id)) err("id must be lower-case letters, digits and dashes");
  if (typeof ep.title !== "string" || !ep.title.trim()) err("title is missing");
  if (!Array.isArray(ep.ages) || ep.ages.length !== 2 || ep.ages[0] > ep.ages[1]) err("ages must be [from, to]");
  for (const key of ["characters", "backgrounds", "props", "tracks"] as const) {
    if (!ep[key] || typeof ep[key] !== "object") err(`${key} is missing`);
  }
  if (errors.length) return { errors, warnings };

  const objectives = new Set((ep.objectives ?? []).map((o) => o.id));
  const points = ep.points ?? {};
  const tracks = ep.tracks;
  const binds = new Set<string>();
  const interactionIds = new Set<string>();

  const placeOk = (p: Place | undefined, where: string) => {
    if (p === undefined) return;
    if (typeof p === "string") {
      if (p.startsWith("$")) return; // checked against binds below
      if (!(p in points) && !(p in ep.props) && !(p in ep.characters)) err(`${where}: unknown place "${p}"`);
      return;
    }
    if (typeof p.x !== "number" || typeof p.y !== "number") return err(`${where}: a place needs x and y`);
    if (p.x < -400 || p.x > STAGE.width + 400 || p.y < -400 || p.y > STAGE.height + 400) err(`${where}: place is far off stage`);
  };
  const refOk = (kind: "character" | "prop", id: string | undefined, where: string) => {
    if (id === undefined) return err(`${where}: missing ${kind}`);
    if (id.startsWith("$")) return;
    const pool = kind === "character" ? ep.characters : ep.props;
    if (!(id in pool)) err(`${where}: unknown ${kind} "${id}"`);
  };

  for (const [id, c] of Object.entries(ep.characters)) {
    if (art && !(c.rig in art.rigs)) err(`character ${id}: unknown rig "${c.rig}"`);
    placeOk(c.at, `character ${id}`);
  }
  for (const [id, p] of Object.entries(ep.props)) {
    if (art) {
      const variants = art.props[p.asset];
      if (!variants) err(`prop ${id}: unknown asset "${p.asset}"`);
      else if (p.variant && !variants.includes(p.variant)) err(`prop ${id}: asset "${p.asset}" has no variant "${p.variant}"`);
    }
    placeOk(p.at, `prop ${id}`);
    if (p.background !== undefined && !(p.background in ep.backgrounds)) err(`prop ${id}: unknown background "${p.background}"`);
  }
  for (const [id, b] of Object.entries(ep.backgrounds)) {
    if (art && !art.scenes.includes(b.scene)) err(`background ${id}: unknown scene "${b.scene}"`);
  }
  if (!(ep.start in tracks)) err(`start track "${ep.start}" does not exist`);

  const checkStep = (step: Step, where: string, nested: boolean) => {
    if (!step || typeof step !== "object" || !("do" in step)) return err(`${where}: not a step`);
    if (step.level && !step.level.every((l) => LEVELS.includes(l))) err(`${where}: level must be "younger" or "older"`);
    switch (step.do) {
      case "scene":
        if (!(step.background in ep.backgrounds)) err(`${where}: unknown background "${step.background}"`);
        break;
      case "say": {
        refOk("character", step.who, where);
        const words = String(step.line ?? "").trim().split(/\s+/).filter(Boolean).length;
        if (!words) err(`${where}: empty line`);
        if (words > MAX_WORDS_PER_LINE) err(`${where}: line has ${words} words; keep lines to ${MAX_WORDS_PER_LINE} or fewer`);
        if (step.mood && !MOODS.includes(step.mood)) err(`${where}: unknown mood "${step.mood}"`);
        break;
      }
      case "act": {
        refOk("character", step.who, where);
        const rig = ep.characters[step.who]?.rig;
        if (art && rig && art.rigs[rig] && !art.rigs[rig].includes(step.action)) err(`${where}: rig "${rig}" cannot "${step.action}"`);
        placeOk(step.to, where);
        if (step.prop) refOk("prop", step.prop, where);
        if (step.mood && !MOODS.includes(step.mood)) err(`${where}: unknown mood "${step.mood}"`);
        break;
      }
      case "prop":
        refOk("prop", step.id, where);
        if (!PROP_ACTIONS.includes(step.action)) err(`${where}: unknown prop action "${step.action}"`);
        if (step.action === "attach") refOk("character", step.who, where);
        if (step.action === "move" || step.action === "fall") {
          if (step.to === undefined) err(`${where}: "${step.action}" needs "to"`);
          placeOk(step.to, where);
        }
        if (step.action === "variant" && art && !step.id.startsWith("$")) {
          const asset = ep.props[step.id]?.asset;
          if (asset && step.variant && !art.props[asset]?.includes(step.variant)) err(`${where}: no variant "${step.variant}"`);
        }
        break;
      case "wait":
        if (typeof step.ms !== "number" || step.ms < 0) err(`${where}: wait needs ms`);
        break;
      case "sound":
        if (art && !art.sounds.includes(step.sound)) err(`${where}: unknown sound "${step.sound}"`);
        break;
      case "together":
        if (!Array.isArray(step.steps) || !step.steps.length) err(`${where}: together needs steps`);
        else step.steps.forEach((s, i) => checkStep(s, `${where}.${i}`, true));
        break;
      case "interact": {
        if (nested) err(`${where}: an interaction cannot be nested`);
        if (interactionIds.has(step.id)) err(`${where}: interaction id "${step.id}" is used twice`);
        interactionIds.add(step.id);
        const prim = PRIMITIVES[step.primitive];
        if (!prim) {
          err(`${where}: unknown interaction "${step.primitive}"`);
          break;
        }
        if (!step.targets?.length) err(`${where}: no targets`);
        step.targets?.forEach((t) => refOk("prop", t, where));
        if (!(step.window >= WINDOW_MIN_MS)) err(`${where}: window must be at least ${WINDOW_MIN_MS} ms so nobody is hurried`);
        if (!(step.window <= WINDOW_MAX_MS)) err(`${where}: window must be at most ${WINDOW_MAX_MS} ms so the story never stalls`);
        if (step.hintAfter !== undefined && !(step.hintAfter < step.window)) err(`${where}: hintAfter must be shorter than the window`);
        if (step.hint && step.hintAfter === undefined) err(`${where}: a hint needs hintAfter`);
        step.hint?.forEach((s, i) => checkStep(s, `${where}.hint.${i}`, true));
        if (step.objective && !objectives.has(step.objective)) err(`${where}: unknown objective "${step.objective}"`);
        const params = step.params ?? {};
        for (const p of prim.requiredParams ?? []) if (!(p in params)) err(`${where}: "${step.primitive}" needs params.${p}`);
        for (const tag of prim.requiredTags?.(params) ?? []) {
          for (const t of step.targets ?? []) if (ep.props[t] && !(tag in (ep.props[t].tags ?? {}))) err(`${where}: target "${t}" needs tag "${tag}"`);
        }
        for (const o of prim.outcomes) {
          if (!step.outcomes?.[o]) err(`${where}: no track for outcome "${o}"`);
        }
        for (const [o, t] of Object.entries(step.outcomes ?? {})) {
          if (!prim.outcomes.includes(o)) err(`${where}: "${step.primitive}" has no outcome "${o}"`);
          if (!(t in tracks)) err(`${where}: outcome "${o}" goes to unknown track "${t}"`);
        }
        if (step.bind) binds.add(step.bind);
        break;
      }
      case "goto":
        if (nested) err(`${where}: goto cannot be nested`);
        if (!(step.track in tracks)) err(`${where}: unknown track "${step.track}"`);
        break;
      case "end":
        if (nested) err(`${where}: end cannot be nested`);
        break;
      default:
        err(`${where}: unknown step "${(step as { do: string }).do}"`);
    }
  };

  for (const [name, steps] of Object.entries(tracks)) {
    if (!Array.isArray(steps) || !steps.length) {
      err(`track ${name}: empty`);
      continue;
    }
    steps.forEach((s, i) => checkStep(s, `${name}.${i}`, false));
    // At every level, the track must finish with a way on, and nothing may follow it.
    for (const level of LEVELS) {
      const played = steps.filter((s) => includedAt(s, level));
      const stop = played.findIndex((s) => s.do === "goto" || s.do === "end" || s.do === "interact");
      if (stop === -1) err(`track ${name}: at level "${level}" it ends without goto, end or an interaction`);
      else if (stop !== played.length - 1) err(`track ${name}: steps after "${played[stop].do}" never play (level "${level}")`);
    }
  }

  // Variables used must be bound by some interaction.
  const text = JSON.stringify(tracks);
  const used = [
    ...[...text.matchAll(/"\$([A-Za-z0-9_-]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/\{([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+\}/g)].map((m) => m[1]),
  ];
  for (const name of new Set(used)) {
    if (!binds.has(name)) err(`"${name}" is used but no interaction binds it`);
  }

  // Tracks must form a graph without cycles, so every story reaches an end.
  if (!errors.length) {
    const edges = trackEdges(ep);
    const state = new Map<string, "visiting" | "done">();
    const visit = (t: string, chain: string[]) => {
      if (state.get(t) === "done") return;
      if (state.get(t) === "visiting") return err(`tracks loop: ${[...chain, t].join(" -> ")}`);
      state.set(t, "visiting");
      for (const n of edges[t] ?? []) visit(n, [...chain, t]);
      state.set(t, "done");
    };
    visit(ep.start, []);
    for (const t of Object.keys(tracks)) if (!state.has(t)) warnings.push(`track ${t} is never played`);
  }

  return { errors, warnings };
}

/** Which tracks each track can lead to. */
export function trackEdges(ep: Episode): Record<string, string[]> {
  const edges: Record<string, string[]> = {};
  for (const [name, steps] of Object.entries(ep.tracks)) {
    const out = new Set<string>();
    for (const s of steps) {
      if (s.do === "goto") out.add(s.track);
      if (s.do === "interact") Object.values(s.outcomes).forEach((t) => out.add(t));
    }
    edges[name] = [...out];
  }
  return edges;
}

/**
 * The shortest and longest story time at a level: the shortest if the child
 * answers every window at once, the longest if the child never touches anything
 * (every window runs to its timeout). Both explore every branch.
 */
export function storyLength(ep: Episode, level: Level): { shortest: number; untouched: number } {
  const memo = new Map<string, { shortest: number; untouched: number }>();
  const walk = (track: string): { shortest: number; untouched: number } => {
    const known = memo.get(track);
    if (known) return known;
    let base = 0;
    let tail = { shortest: 0, untouched: 0 };
    for (const s of ep.tracks[track].filter((x) => includedAt(x, level))) {
      if (s.do === "goto") {
        tail = walk(s.track);
        break;
      }
      if (s.do === "end") break;
      if (s.do === "interact") {
        const touched = Object.entries(s.outcomes).filter(([o]) => o !== "timeout").map(([, t]) => walk(t).shortest);
        const timeout = walk(s.outcomes.timeout);
        tail = {
          shortest: touched.length ? Math.min(...touched) : timeout.shortest + s.window,
          untouched: s.window + timeout.untouched,
        };
        break;
      }
      base += stepMs(s);
    }
    const r = { shortest: base + tail.shortest, untouched: base + tail.untouched };
    memo.set(track, r);
    return r;
  };
  return walk(ep.start);
}
