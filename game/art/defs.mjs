// Shared paint kit for every illustrated layer.
// Layers are drawn as shapes, then pushed through these filters at bake time so the
// final textures carry form shading, soft edges, pigment mottle and paper grain.
// The runtime never draws shapes; it only ever sees the baked raster layers.

export const C = {
  skin: "#C98B5D", skinLight: "#DDA476", skinDeep: "#A9683F", blush: "#E26C5B", lip: "#B4514A", lipDeep: "#8C3338",
  hair: "#1C1728", hairSheen: "#4A4368",
  teal: "#138A8E", tealDeep: "#0B6468", tealLight: "#2FA9A6",
  gold: "#F0B43A", goldLight: "#FFE08A", goldDeep: "#C98516",
  marigold: "#F4A62A", maroon: "#A4303B", magenta: "#CC3F72", magentaDeep: "#A12B58",
  white: "#FFF9EC", ink: "#2B2A4C", leaf: "#5E9E5A", leafDeep: "#3F7D55",
  bag: "#F7CB2D", bagDeep: "#E2A716", bagRed: "#C8372D",
  apple: "#D8432F", appleDeep: "#B32E25",
};

/**
 * Form shading for one cut-out layer. Light comes from the upper left (the window).
 * warp  : px of edge wobble, so no edge is geometrically perfect
 * depth : how far the core shadow and the light creep in from the edges
 */
export function formFilter(id, o = {}) {
  const { warp = 2, wf = 0.028, depth = 10, blur = 8, shade = 0.36, light = 0.24, grain = 0.12, mottle = 0.14, seed = 2, lx = -0.62, ly = -0.78, shadeColor = "#3B1F4A", lightColor = "#FFE7B0" } = o;
  return `<filter id="${id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${wf}" numOctaves="2" seed="${seed}" result="wn"/>
<feDisplacementMap in="SourceGraphic" in2="wn" scale="${warp}" xChannelSelector="R" yChannelSelector="G" result="src"/>
<feColorMatrix in="src" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="a"/>
<feOffset in="a" dx="${(lx * depth).toFixed(2)}" dy="${(ly * depth).toFixed(2)}" result="aS"/>
<feGaussianBlur in="aS" stdDeviation="${blur}" result="aSb"/>
<feFlood flood-color="${shadeColor}" result="cS"/>
<feComposite in="cS" in2="aSb" operator="out" result="s1"/>
<feComposite in="s1" in2="a" operator="in" result="s2"/>
<feComponentTransfer in="s2" result="shadeL"><feFuncA type="linear" slope="${shade}"/></feComponentTransfer>
<feOffset in="a" dx="${(-lx * depth * 0.75).toFixed(2)}" dy="${(-ly * depth * 0.75).toFixed(2)}" result="aL"/>
<feGaussianBlur in="aL" stdDeviation="${(blur * 0.75).toFixed(2)}" result="aLb"/>
<feFlood flood-color="${lightColor}" result="cL"/>
<feComposite in="cL" in2="aLb" operator="out" result="l1"/>
<feComposite in="l1" in2="a" operator="in" result="l2"/>
<feComponentTransfer in="l2" result="lightL"><feFuncA type="linear" slope="${light}"/></feComponentTransfer>
<feBlend in="shadeL" in2="src" mode="multiply" result="b1"/>
<feBlend in="lightL" in2="b1" mode="screen" result="b2"/>
<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="${seed + 11}" result="mn"/>
<feColorMatrix in="mn" type="matrix" values="1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  0 0 0 0 ${mottle}" result="mott"/>
<feComposite in="mott" in2="a" operator="in" result="mottIn"/>
<feBlend in="mottIn" in2="b2" mode="soft-light" result="b3"/>
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed + 5}" result="gn"/>
<feColorMatrix in="gn" type="matrix" values="1.4 0 0 0 -0.2  1.4 0 0 0 -0.2  1.4 0 0 0 -0.2  0 0 0 0 ${grain}" result="gr"/>
<feComposite in="gr" in2="a" operator="in" result="grIn"/>
<feBlend in="grIn" in2="b3" mode="soft-light" result="b4"/>
<feComposite in="b4" in2="a" operator="in"/>
</filter>`;
}

/** A blurred fill, for cheeks, cast shadows and bounce light painted inside a shape. */
export const soft = (id, sd) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

export const commonDefs = () => `
${formFilter("f-skin", { depth: 9, blur: 8, shade: 0.34, light: 0.2, mottle: 0.08, grain: 0.06, warp: 1.0, seed: 3, shadeColor: "#5A2440" })}
${formFilter("f-cloth", { depth: 13, blur: 11, shade: 0.42, light: 0.2, mottle: 0.2, grain: 0.2, warp: 2.4, seed: 7 })}
${formFilter("f-hair", { depth: 10, blur: 9, shade: 0.3, light: 0.34, mottle: 0.1, grain: 0.1, warp: 1.6, seed: 9, lightColor: "#8E86C2" })}
${formFilter("f-small", { depth: 4, blur: 3, shade: 0.32, light: 0.26, mottle: 0.08, grain: 0.1, warp: 0.8, seed: 5 })}
${formFilter("f-metal", { depth: 3, blur: 2, shade: 0.36, light: 0.5, mottle: 0.05, grain: 0.06, warp: 0.5, seed: 4, lightColor: "#FFF6C8" })}
${formFilter("f-paper", { depth: 6, blur: 6, shade: 0.16, light: 0.1, mottle: 0.12, grain: 0.16, warp: 0.9, seed: 12 })}
${soft("s2", 2)}${soft("s4", 4)}${soft("s6", 6)}${soft("s10", 10)}${soft("s16", 16)}${soft("s28", 28)}
`;
