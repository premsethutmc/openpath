/**
 * What the art library can draw and animate. The validator checks episodes
 * against this, so an episode cannot ask for a character action or a prop look
 * that does not exist.
 */
import type { ArtCatalogue } from "../engine/validate.ts";
import { PROP_VARIANTS } from "./props.ts";
import { SCENES } from "./scenes.ts";

const COMMON = ["idle", "place", "walk", "turn", "look", "blink", "react", "hop", "jump", "point", "wave", "dance", "give"];

export const ART: ArtCatalogue = {
  rigs: {
    chintoo: [...COMMON, "sleep", "wake", "stretch", "yawn", "sit", "stand", "eat", "pickup", "wash", "rub-tummy", "sniff", "run"],
    bird: [...COMMON, "fly", "peck", "flap"],
    /** An off-stage storyteller: speaks, never appears. */
    voice: [],
  },
  scenes: Object.keys(SCENES),
  props: PROP_VARIANTS,
  sounds: ["chirp", "rumble", "pop", "plop", "crunch", "splash", "thud", "chime", "whoosh", "yawn", "rustle"],
};
