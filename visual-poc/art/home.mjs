// The home: a Tamil Nadu living room on a bright morning, painted as depth layers.
// World space is 2400 x 1600. The floor meets the wall at y = 1010.
// Light comes through the window on the left. No numerals appear anywhere in the room:
// the only number in the scene is the one on Amma's list.
import { C, formFilter, soft } from "./defs.mjs";

export const W = 2400, H = 1600, FLOOR = 1010;
export const DOOR = { x0: 965, x1: 1435, y0: 236, y1: FLOOR };
const WIN = { x0: 190, x1: 520, y0: 310, y1: 730 };

const wood = "#8A5330", woodDark = "#5B331E", woodLight = "#B67A42";
const brass = "#D9A441", brassLight = "#F9E09A", brassDark = "#9C6B1E";
const steel = "#C4CFD5", steelLight = "#F4F8F9", steelDark = "#8996A0";

export const homeDefs = () => `
${formFilter("h-wood", { depth: 8, blur: 7, shade: 0.4, light: 0.22, mottle: 0.22, grain: 0.2, warp: 1.6, seed: 21 })}
${formFilter("h-soft", { depth: 14, blur: 12, shade: 0.3, light: 0.18, mottle: 0.18, grain: 0.16, warp: 2, seed: 23 })}
${formFilter("h-metal", { depth: 6, blur: 5, shade: 0.42, light: 0.55, mottle: 0.08, grain: 0.06, warp: 0.8, seed: 25, lightColor: "#FFFBE0" })}
${formFilter("h-leaf", { depth: 6, blur: 5, shade: 0.34, light: 0.3, mottle: 0.2, grain: 0.14, warp: 1.6, seed: 27, lightColor: "#F5FFB8" })}
${formFilter("h-wall", { depth: 0, blur: 1, shade: 0, light: 0, mottle: 0.16, grain: 0.14, warp: 0, seed: 29 })}
${formFilter("h-floor", { depth: 0, blur: 1, shade: 0, light: 0, mottle: 0.07, grain: 0.1, warp: 0, seed: 31 })}
${soft("b3", 3)}${soft("b8", 8)}${soft("b14", 14)}${soft("b24", 24)}${soft("b40", 40)}${soft("b70", 70)}
<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE6E6"/><stop offset=".6" stop-color="#FDF0C4"/><stop offset="1" stop-color="#FFE3A0"/></linearGradient>
<linearGradient id="g-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF1CC"/><stop offset=".45" stop-color="#F8E4B8"/><stop offset="1" stop-color="#EDD3A0"/></linearGradient>
<linearGradient id="g-dado" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EDC16C"/><stop offset=".5" stop-color="#E2B15B"/><stop offset="1" stop-color="#CF9B48"/></linearGradient>
<linearGradient id="g-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E2F27"/><stop offset=".35" stop-color="#A93C2E"/><stop offset="1" stop-color="#B8452F"/></linearGradient>
<linearGradient id="g-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE7B4"/><stop offset="1" stop-color="#F3D595"/></linearGradient>
<radialGradient id="g-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFBE0" stop-opacity="1"/><stop offset=".4" stop-color="#FFF0B0" stop-opacity=".7"/><stop offset="1" stop-color="#FFF0B0" stop-opacity="0"/></radialGradient>
<linearGradient id="g-shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".5"/><stop offset=".55" stop-color="#FFE9A8" stop-opacity=".34"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient>
<radialGradient id="g-vig" cx=".5" cy=".46" r=".75"><stop offset=".5" stop-color="#2B1230" stop-opacity="0"/><stop offset="1" stop-color="#2B1230" stop-opacity=".55"/></radialGradient>
`;

/* ------------------------------------------------------------ small things */

const bananaLeaf = (x, y, len, rot, col = "#7DB65A") => `<g transform="translate(${x} ${y}) rotate(${rot})">
<path d="M0,0 C${len * 0.18},${-len * 0.28} ${len * 0.75},${-len * 0.3} ${len},0 C${len * 0.75},${len * 0.22} ${len * 0.18},${len * 0.2} 0,0Z" fill="${col}"/>
<path d="M0,0 H${len}" stroke="#D9EFA0" stroke-width="4" opacity=".8"/>
${Array.from({ length: 7 }, (_, i) => `<path d="M${len * (0.14 + i * 0.11)},0 l${len * 0.05},${-len * 0.2} M${len * (0.14 + i * 0.11)},0 l${len * 0.05},${len * 0.15}" stroke="#4E8F3F" stroke-width="2" opacity=".35"/>`).join("")}</g>`;

const mangoLeaf = (x, y, s = 1, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0,0 C-11,16 -10,44 0,62 C10,44 11,16 0,0Z" fill="#5E9E4E"/><path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0,4 V56" stroke="#3F7D3A" stroke-width="2"/>`;

const tumbler = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-17,-52 H17 L13,0 H-13Z" fill="${steel}"/><ellipse cx="0" cy="-52" rx="19" ry="5" fill="${steelLight}"/><rect x="-10" y="-44" width="5" height="36" rx="2.5" fill="${steelLight}" opacity=".9"/></g>`;
const pot = (x, y, s = 1, col = steel, hi = steelLight) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22,-74 C-26,-66 -22,-62 -30,-54 C-56,-40 -58,-8 -30,0 H30 C58,-8 56,-40 30,-54 C22,-62 26,-66 22,-74Z" fill="${col}"/><ellipse cx="0" cy="-74" rx="24" ry="6" fill="${hi}"/><path d="M-36,-40 C-42,-28 -40,-14 -32,-8" fill="none" stroke="${hi}" stroke-width="7" stroke-linecap="round" opacity=".85"/></g>`;

// The standing brass lamp (kuthu vilakku), unlit: it is morning.
const lamp = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M-44,0 C-44,-14 44,-14 44,0Z" fill="${brass}"/><rect x="-30" y="-20" width="60" height="10" rx="5" fill="${brassDark}"/>
<path d="M-7,-20 C-9,-60 -16,-70 -16,-84 C-16,-98 -6,-100 -6,-112 V-150 H6 V-112 C6,-100 16,-98 16,-84 C16,-70 9,-60 7,-20Z" fill="${brass}"/>
<path d="M-40,-150 C-40,-134 40,-134 40,-150 C30,-160 -30,-160 -40,-150Z" fill="${brass}"/>
<ellipse cx="0" cy="-152" rx="40" ry="8" fill="${brassLight}"/>
<path d="M-4,-158 C-6,-176 -10,-182 0,-198 C10,-182 6,-176 4,-158Z" fill="${brass}"/>
<path d="M-3,-50 V-140" stroke="${brassLight}" stroke-width="3" opacity=".8"/></g>`;

/* ------------------------------------------------------------------ layers */

const layers = [];
const layer = (id, o) => layers.push({ id, x: 0, y: 0, w: W, h: H, scale: 1.25, ...o });

// Outside, seen through the window bars: sky, palms and a banana plant in the sun.
layer("out", {
  x: WIN.x0 - 60, y: WIN.y0 - 60, w: WIN.x1 - WIN.x0 + 120, h: WIN.y1 - WIN.y0 + 120, scale: 1.25, depth: 0.55,
  body: `<rect x="${WIN.x0 - 60}" y="${WIN.y0 - 60}" width="${WIN.x1 - WIN.x0 + 120}" height="${WIN.y1 - WIN.y0 + 120}" fill="url(#g-sky)"/>
<circle cx="${WIN.x0 + 90}" cy="${WIN.y0 + 150}" r="150" fill="url(#g-sun)"/>
<circle cx="${WIN.x0 + 90}" cy="${WIN.y0 + 150}" r="46" fill="#FFF8D6"/>
<g filter="url(#b3)" opacity=".8">
<path d="M${WIN.x0 - 60},${WIN.y1 - 80} C${WIN.x0 + 60},${WIN.y1 - 140} ${WIN.x0 + 240},${WIN.y1 - 150} ${WIN.x1 + 60},${WIN.y1 - 100} V${WIN.y1 + 60} H${WIN.x0 - 60}Z" fill="#B9D7A2"/>
<g transform="translate(${WIN.x0 + 250} ${WIN.y1 - 110})"><path d="M-6,0 C-10,-90 -2,-170 8,-250 L20,-250 C12,-170 8,-90 10,0Z" fill="#9E8A66"/>
${[-150, -115, -80, -40, -5, 30].map((r) => `<path transform="translate(14 -250) rotate(${r})" d="M0,0 C40,-18 90,-10 130,22 C92,10 44,8 0,0Z" fill="#7FAF72"/>`).join("")}</g>
</g>
<g filter="url(#h-leaf)">${bananaLeaf(WIN.x0 + 150, WIN.y1 + 20, 330, -72)}${bananaLeaf(WIN.x0 + 190, WIN.y1 + 30, 300, -48, "#8CC063")}${bananaLeaf(WIN.x0 + 120, WIN.y1 + 30, 250, -108, "#6FAE55")}${bananaLeaf(WIN.x0 + 240, WIN.y1 + 40, 230, -22, "#9ACB6C")}</g>`,
});

// The inner room, seen through the doorway Amma walks out of.
layer("far", {
  x: DOOR.x0 - 80, y: DOOR.y0 - 40, w: DOOR.x1 - DOOR.x0 + 160, h: DOOR.y1 - DOOR.y0 + 120, depth: 0.72,
  body: `<rect x="${DOOR.x0 - 80}" y="${DOOR.y0 - 40}" width="${DOOR.x1 - DOOR.x0 + 160}" height="${DOOR.y1 - DOOR.y0 + 120}" fill="url(#g-far)"/>
<rect x="${DOOR.x0 - 80}" y="930" width="${DOOR.x1 - DOOR.x0 + 160}" height="160" fill="#A23A2C"/>
<rect x="${DOOR.x0 - 80}" y="922" width="${DOOR.x1 - DOOR.x0 + 160}" height="12" fill="#7C2A22"/>
<g filter="url(#b3)">
<rect x="1000" y="330" width="180" height="210" rx="6" fill="${woodDark}"/>
<rect x="1014" y="344" width="152" height="182" fill="#D9F0EA"/>
<circle cx="1090" cy="430" r="100" fill="url(#g-sun)"/>
<g stroke="${woodDark}" stroke-width="7"><path d="M1052,344 V526 M1090,344 V526 M1128,344 V526"/></g>
<path d="M1014,526 L1166,526 L1330,930 L1040,930Z" fill="#FFF3C4" opacity=".4"/>
<rect x="1230" y="400" width="220" height="14" rx="4" fill="${wood}"/>
<g filter="url(#h-metal)">${tumbler(1270, 400, 0.8)}${tumbler(1306, 400, 0.8)}${pot(1380, 400, 0.7, brass, brassLight)}</g>
<rect x="1220" y="560" width="230" height="14" rx="4" fill="${wood}"/>
<rect x="1220" y="700" width="230" height="14" rx="4" fill="${wood}"/>
<g filter="url(#h-metal)">${pot(1270, 560, 0.8)}${tumbler(1330, 560, 0.8)}${tumbler(1366, 560, 0.8)}${pot(1420, 560, 0.62, brass, brassLight)}
${pot(1262, 700, 0.9, brass, brassLight)}${pot(1340, 700, 0.74)}${tumbler(1400, 700, 0.9)}</g>
<rect x="1180" y="800" width="300" height="130" fill="#C99A5E"/>
<rect x="1170" y="790" width="320" height="16" rx="4" fill="#5E5A5A"/>
<g filter="url(#h-metal)"><path d="M1250,790 C1250,750 1330,750 1330,790Z" fill="${steel}"/><rect x="1282" y="742" width="16" height="12" rx="4" fill="#3A3636"/><rect x="1326" y="770" width="40" height="8" rx="4" fill="#3A3636"/>
${pot(1410, 790, 0.7)}</g>
</g>
<rect x="${DOOR.x0 - 80}" y="${DOOR.y0 - 40}" width="${DOOR.x1 - DOOR.x0 + 160}" height="${DOOR.y1 - DOOR.y0 + 120}" fill="#FFF6D8" opacity=".3"/>`,
});

// The wall: lime-washed cream above, ochre below, a teak doorway and the window.
const bars = Array.from({ length: 5 }, (_, i) => WIN.x0 + 40 + i * ((WIN.x1 - WIN.x0 - 80) / 4));
layer("wall", {
  h: FLOOR + 10,
  body: `<defs><mask id="m-wall"><rect width="${W}" height="${FLOOR + 10}" fill="#fff"/><rect x="${DOOR.x0}" y="${DOOR.y0}" width="${DOOR.x1 - DOOR.x0}" height="${DOOR.y1 - DOOR.y0 + 20}" fill="#000"/><rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="#000"/></mask>
<clipPath id="cp-wall"><rect width="${W}" height="${FLOOR + 10}"/></clipPath></defs>
<g mask="url(#m-wall)">
<g filter="url(#h-wall)"><rect width="${W}" height="${FLOOR + 10}" fill="url(#g-wall)"/>
<rect y="770" width="${W}" height="${FLOOR - 770 + 10}" fill="url(#g-dado)"/></g>
<rect y="756" width="${W}" height="14" fill="#9B3530"/><rect y="774" width="${W}" height="4" fill="#9B3530" opacity=".6"/>
<rect y="${FLOOR - 26}" width="${W}" height="36" fill="#7C2A22"/>
<ellipse cx="420" cy="560" rx="620" ry="520" fill="#FFF6D0" opacity=".5" filter="url(#b70)"/>
<path d="M1500,0 H${W} V${FLOOR} H1900 C1700,700 1560,300 1500,0Z" fill="#7A4A3A" opacity=".2" filter="url(#b70)"/>
<rect width="${W}" height="150" fill="#5B3A2A" opacity=".3" filter="url(#b40)"/>
<rect y="${FLOOR - 120}" width="${W}" height="130" fill="#6B2A1E" opacity=".25" filter="url(#b24)"/>
<path d="M${DOOR.x1 + 40},${DOOR.y0 - 30} h70 V${FLOOR} h-70Z" fill="#5B3A2A" opacity=".22" filter="url(#b14)"/>
<path d="M${WIN.x1 + 44},${WIN.y0 + 10} h60 V${WIN.y1 + 60} H${WIN.x0} v-30 H${WIN.x1 + 44}Z" fill="#5B3A2A" opacity=".2" filter="url(#b14)"/>
</g>

<g filter="url(#h-wood)"><rect y="0" width="${W}" height="64" fill="${woodDark}"/>
${[120, 520, 920, 1320, 1720, 2120].map((x) => `<rect x="${x}" y="52" width="70" height="34" rx="4" fill="${wood}"/>`).join("")}</g>
<rect y="64" width="${W}" height="26" fill="#2B1230" opacity=".25" filter="url(#b8)"/>

<g filter="url(#h-wood)">
<path d="M${DOOR.x0 - 46},${DOOR.y0 - 46} H${DOOR.x1 + 46} V${FLOOR + 6} H${DOOR.x1} V${DOOR.y0} H${DOOR.x0} V${FLOOR + 6} H${DOOR.x0 - 46}Z" fill="${wood}"/>
<path d="M${DOOR.x0 - 66},${DOOR.y0 - 70} H${DOOR.x1 + 66} L${DOOR.x1 + 54},${DOOR.y0 - 40} H${DOOR.x0 - 54}Z" fill="${woodDark}"/>
</g>
<g fill="none" stroke="${woodDark}" stroke-width="4" opacity=".55"><path d="M${DOOR.x0 - 24},${DOOR.y0 - 10} V${FLOOR} M${DOOR.x1 + 24},${DOOR.y0 - 10} V${FLOOR} M${DOOR.x0 - 24},${DOOR.y0 - 22} H${DOOR.x1 + 24}"/></g>
<g fill="${woodLight}" opacity=".8">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${DOOR.x0 + 30 + i * 60},${DOOR.y0 - 23} l14,-10 l14,10 l-14,10Z"/>`).join("")}</g>
<path d="M${DOOR.x0},${DOOR.y0} h${DOOR.x1 - DOOR.x0} v26 h-${DOOR.x1 - DOOR.x0}Z" fill="#2B1230" opacity=".3" filter="url(#b8)"/>
<path d="M${DOOR.x0},${DOOR.y0} h22 V${FLOOR} h-22Z" fill="#2B1230" opacity=".22" filter="url(#b8)"/>

<path d="M${DOOR.x0 - 30},${DOOR.y0 - 52} Q${(DOOR.x0 + DOOR.x1) / 2},${DOOR.y0 - 16} ${DOOR.x1 + 30},${DOOR.y0 - 52}" fill="none" stroke="#7A5A2A" stroke-width="4"/>
<g filter="url(#h-leaf)">${Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = DOOR.x0 - 22 + t * (DOOR.x1 - DOOR.x0 + 44), y = DOOR.y0 - 52 + Math.sin(t * Math.PI) * 18; return mangoLeaf(x, y, i % 2 ? 0.95 : 1.1, (t - 0.5) * 14); }).join("")}</g>
<g filter="url(#h-leaf)">${[2, 6, 10].map((i) => { const t = i / 12, x = DOOR.x0 - 22 + t * (DOOR.x1 - DOOR.x0 + 44), y = DOOR.y0 - 50 + Math.sin(t * Math.PI) * 18; return `<circle cx="${x + 16}" cy="${y + 12}" r="11" fill="${C.marigold}"/><circle cx="${x + 16}" cy="${y + 12}" r="5" fill="#E07E16"/>`; }).join("")}</g>

<g filter="url(#h-wood)">
<path d="M${WIN.x0 - 34},${WIN.y0 - 34} H${WIN.x1 + 34} V${WIN.y1 + 34} H${WIN.x0 - 34}Z M${WIN.x0},${WIN.y0} V${WIN.y1} H${WIN.x1} V${WIN.y0}Z" fill-rule="evenodd" fill="${wood}"/>
<rect x="${WIN.x0 - 54}" y="${WIN.y1 + 30}" width="${WIN.x1 - WIN.x0 + 108}" height="26" rx="6" fill="${woodDark}"/>
<rect x="${WIN.x0 - 130}" y="${WIN.y0 - 20}" width="92" height="${WIN.y1 - WIN.y0 + 40}" rx="6" fill="#2E7C78"/>
<rect x="${WIN.x1 + 38}" y="${WIN.y0 - 20}" width="92" height="${WIN.y1 - WIN.y0 + 40}" rx="6" fill="#2E7C78"/>
</g>
<g stroke="#1E5F5C" stroke-width="5" opacity=".7">${Array.from({ length: 11 }, (_, i) => `<path d="M${WIN.x0 - 118},${WIN.y0 + 14 + i * 38} h68 M${WIN.x1 + 50},${WIN.y0 + 14 + i * 38} h68"/>`).join("")}</g>
<g filter="url(#h-metal)">${bars.map((x) => `<rect x="${x - 6}" y="${WIN.y0 - 4}" width="12" height="${WIN.y1 - WIN.y0 + 8}" rx="5" fill="#3D3A44"/>`).join("")}</g>
<rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="#FFF6D0" opacity=".28"/>
<path d="M${WIN.x0},${WIN.y0} h${WIN.x1 - WIN.x0} v22 h-${WIN.x1 - WIN.x0}Z" fill="#2B1230" opacity=".3" filter="url(#b8)"/>

<g transform="translate(826 236)">
<ellipse cx="6" cy="10" rx="74" ry="76" fill="#2B1230" opacity=".22" filter="url(#b14)"/>
<g filter="url(#h-wood)"><circle r="70" fill="${wood}"/><rect x="-26" y="60" width="52" height="150" rx="10" fill="${wood}"/></g>
<circle r="54" fill="#FFF8E4"/>
<g stroke="${woodDark}" stroke-width="5" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0,-46 v${i % 3 ? 5 : 10}"/>`).join("")}<path d="M0,0 L-2,-34 M0,0 L24,14"/></g>
<circle r="6" fill="${woodDark}"/><rect x="-14" y="76" width="28" height="120" rx="6" fill="#3A2216"/>
</g>

<g transform="translate(1640 410) rotate(2)">
<rect x="-84" y="-70" width="176" height="150" fill="#2B1230" opacity=".2" filter="url(#b14)"/>
<g filter="url(#h-wood)"><rect x="-90" y="-78" width="180" height="156" rx="8" fill="${woodDark}"/></g>
<rect x="-74" y="-62" width="148" height="124" fill="#FBEBC6"/>
<g filter="url(#h-soft)"><circle cx="-30" cy="-6" r="24" fill="#B77A4E"/><circle cx="28" cy="-12" r="26" fill="#C98B5D"/><circle cx="2" cy="26" r="17" fill="#D9A273"/>
<path d="M-62,62 C-58,24 -6,24 -2,62Z" fill="#3E7CA6"/><path d="M0,62 C4,18 58,18 62,62Z" fill="${C.teal}"/><path d="M-20,62 C-18,44 22,44 24,62Z" fill="${C.marigold}"/></g>
<path d="M0,-78 l-14,-22 M0,-78 l14,-22" stroke="#7A5A2A" stroke-width="3" stroke-linecap="round"/>
</g>

<g transform="translate(836 600) rotate(-3)">
<rect x="-74" y="-52" width="156" height="118" fill="#2B1230" opacity=".16" filter="url(#b8)"/>
<g filter="url(#h-soft)"><rect x="-78" y="-58" width="156" height="116" fill="#FFFDF2"/></g>
<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-54,34 V-4 L-26,-28 L2,-4 V34Z" stroke="#D8432F" stroke-width="6"/><rect x="-34" y="8" width="16" height="26" stroke="#8A5330" stroke-width="5"/>
<circle cx="44" cy="-26" r="14" stroke="${C.marigold}" stroke-width="6"/><path d="M44,-48 v-6 M44,-4 v6 M22,-26 h-6 M66,-26 h6 M28,-42 l-4,-4 M60,-10 l4,4 M60,-42 l4,-4 M28,-10 l-4,4" stroke="${C.marigold}" stroke-width="5"/>
<path d="M-70,38 C-40,30 20,44 70,34" stroke="#5E9E5A" stroke-width="7"/><path d="M22,30 C22,12 34,6 34,-2 M22,18 C14,12 12,6 14,0" stroke="#5E9E5A" stroke-width="5"/></g>
<rect x="-18" y="-66" width="36" height="16" fill="#F4D58A" opacity=".8" transform="rotate(4)"/>
</g>

<g transform="translate(2000 520)">
<rect x="-210" y="0" width="420" height="34" fill="#2B1230" opacity=".25" filter="url(#b14)" transform="translate(10 22)"/>
<g filter="url(#h-wood)"><rect x="-220" y="0" width="440" height="22" rx="5" fill="${wood}"/><path d="M-190,22 l0,34 l34,-34Z M190,22 l0,34 l-34,-34Z" fill="${woodDark}"/></g>
<g filter="url(#h-metal)">${pot(-150, 0, 1.15, brass, brassLight)}${pot(-52, 0, 0.9, brass, brassLight)}${tumbler(24, 0, 1.05)}${tumbler(66, 0, 1.05)}${pot(150, 0, 1.0)}</g>
</g>`,
});

// The red oxide floor, polished, with the window's light lying across it.
layer("floor", {
  y: FLOOR - 4, h: H - FLOOR + 4,
  body: `<defs><clipPath id="cp-floor"><rect y="${FLOOR - 4}" width="${W}" height="${H - FLOOR + 4}"/></clipPath>
<linearGradient id="g-doorglow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9B0" stop-opacity=".7"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></linearGradient>
<linearGradient id="g-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD9B0" stop-opacity=".32"/><stop offset="1" stop-color="#FFD9B0" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#cp-floor)">
<g filter="url(#h-floor)"><rect y="${FLOOR - 4}" width="${W}" height="${H - FLOOR + 4}" fill="url(#g-floor)"/></g>
<rect y="${FLOOR}" width="${W}" height="70" fill="#3A0F14" opacity=".45" filter="url(#b24)"/>
<path d="M0,1072 H${W}" stroke="#E9B84E" stroke-width="7" opacity=".85"/><path d="M0,1086 H${W}" stroke="#2B1218" stroke-width="5" opacity=".7"/>
<path d="M${DOOR.x0 + 10},${FLOOR} H${DOOR.x1 - 10} L${DOOR.x1 + 130},1600 H${DOOR.x0 - 130}Z" fill="url(#g-doorglow)" opacity=".55" filter="url(#b24)"/>
<g opacity=".9" filter="url(#b8)">
<path d="M330,1090 L900,1090 L1180,1430 L500,1430Z" fill="#FFD08A" opacity=".6"/>
${[0, 1, 2, 3].map((i) => `<path d="M${420 + i * 130},1090 l${200 + i * 20},340 h38 l${-200 - i * 20},-340Z" fill="#8E2F27" opacity=".55"/>`).join("")}
</g>
<rect y="${FLOOR}" width="${W}" height="260" fill="url(#g-sheen)"/>
<ellipse cx="1200" cy="1640" rx="1500" ry="260" fill="#5A161C" opacity=".4" filter="url(#b70)"/>
<g opacity=".32" filter="url(#b40)"><ellipse cx="2000" cy="1080" rx="330" ry="70" fill="#3A0A12"/><ellipse cx="360" cy="1080" rx="270" ry="50" fill="#3A0A12"/></g>
<g opacity=".16" filter="url(#b14)"><rect x="${DOOR.x0 - 46}" y="${FLOOR}" width="46" height="330" fill="#3A0A12"/><rect x="${DOOR.x1}" y="${FLOOR}" width="46" height="330" fill="#3A0A12"/></g>
<path d="M0,1180 C600,1150 1800,1150 2400,1180" fill="none" stroke="#FFC9A0" stroke-width="60" opacity=".12" filter="url(#b40)"/>
</g>`,
});

// Furniture that stands in the room: cabinet and brass lamp, plant, and the stool by the door.
layer("furniture", {
  y: 640, h: 760, depth: 1.03,
  body: `<g transform="translate(130 800)">
<ellipse cx="230" cy="262" rx="270" ry="26" fill="#2B0A12" opacity=".5" filter="url(#b14)"/>
<g filter="url(#h-wood)"><rect x="0" y="0" width="460" height="240" rx="10" fill="${wood}"/><rect x="-12" y="-14" width="484" height="26" rx="8" fill="${woodDark}"/>
<rect x="24" y="236" width="26" height="30" fill="${woodDark}"/><rect x="410" y="236" width="26" height="30" fill="${woodDark}"/></g>
<g fill="none" stroke="${woodDark}" stroke-width="5" opacity=".6"><rect x="26" y="36" width="190" height="176" rx="6"/><rect x="244" y="36" width="190" height="176" rx="6"/></g>
<g filter="url(#h-metal)"><circle cx="196" cy="124" r="8" fill="${brass}"/><circle cx="264" cy="124" r="8" fill="${brass}"/></g>
<g filter="url(#h-metal)">${lamp(92, -14, 1.05)}${pot(250, -14, 1.2)}${tumbler(336, -14, 1.0)}</g>
<g filter="url(#h-soft)"><rect x="372" y="-36" width="84" height="22" rx="4" fill="#C8372D"/><rect x="378" y="-56" width="74" height="20" rx="4" fill="#3E7CA6"/><rect x="384" y="-74" width="64" height="18" rx="4" fill="${C.marigold}"/></g>
</g>

<g transform="translate(40 1330)">
<ellipse cx="20" cy="6" rx="110" ry="18" fill="#2B0A12" opacity=".5" filter="url(#b14)"/>
<g filter="url(#h-leaf)">${[-64, -30, 0, 34, 66].map((r, i) => `<path transform="translate(20 -90) rotate(${r})" d="M0,0 C-34,-70 -30,-170 0,-250 C30,-170 34,-70 0,0Z" fill="${i % 2 ? "#5E9E4E" : "#3F8A45"}"/>`).join("")}</g>
<g filter="url(#h-soft)"><path d="M-44,-100 H84 L66,0 H-26Z" fill="#B5553A"/><rect x="-52" y="-112" width="144" height="22" rx="8" fill="#9C4630"/></g>
</g>

<g transform="translate(1490 1330)">
<ellipse cx="0" cy="8" rx="130" ry="20" fill="#2B0A12" opacity=".55" filter="url(#b14)"/>
<g filter="url(#h-wood)">
<path d="M-78,-128 L-92,0 H-70 L-58,-128Z M78,-128 L92,0 H70 L58,-128Z" fill="${woodDark}"/>
<rect x="-80" y="-64" width="160" height="12" rx="4" fill="${woodDark}"/>
<rect x="-100" y="-150" width="200" height="30" rx="10" fill="${wood}"/>
</g>
<ellipse cx="0" cy="-148" rx="92" ry="9" fill="${woodLight}" opacity=".6" filter="url(#b3)"/>
</g>`,
});

// The oonjal: a plank swing on brass chains. It hangs from (0,0) and sways as one piece.
layer("swing", {
  x: -330, y: -20, w: 660, h: 1010, depth: 1.03, pivot: [0, 0], at: [2010, 74],
  body: `<g filter="url(#h-metal)" fill="none" stroke="${brassDark}" stroke-width="7" stroke-dasharray="14 7" stroke-linecap="round">
<path d="M-250,0 L-270,850 M250,0 L270,850"/><path d="M-200,0 L-214,840 M200,0 L214,840" opacity=".7"/></g>
<g filter="url(#h-metal)"><circle cx="-250" cy="0" r="12" fill="${brass}"/><circle cx="250" cy="0" r="12" fill="${brass}"/><circle cx="-200" cy="0" r="10" fill="${brass}"/><circle cx="200" cy="0" r="10" fill="${brass}"/></g>
<g filter="url(#h-wood)"><path d="M-310,840 H310 L296,900 H-296Z" fill="${wood}"/><rect x="-316" y="826" width="632" height="26" rx="10" fill="${woodLight}"/></g>
<g filter="url(#h-soft)"><rect x="-240" y="778" width="480" height="52" rx="24" fill="#C8372D"/><rect x="-240" y="778" width="480" height="18" rx="9" fill="#E26F5A" opacity=".7"/>
<ellipse cx="-180" cy="770" rx="70" ry="34" fill="${C.marigold}"/><ellipse cx="-180" cy="770" rx="20" ry="34" fill="#E07E16" opacity=".5"/></g>
<g fill="${woodDark}" opacity=".6">${[-240, -120, 0, 120, 240].map((x) => `<path d="M${x},862 l10,-8 l10,8 l-10,8Z"/>`).join("")}</g>`,
});

// Close to the child, out of focus: their own toys on the floor.
layer("fg", {
  y: 1300, h: 300, depth: 1.5, scale: 1,
  body: `<g filter="url(#b8)">
<g transform="translate(690 1560)">
<ellipse cx="0" cy="26" rx="150" ry="20" fill="#2B0A12" opacity=".5"/>
<g filter="url(#h-soft)"><rect x="-14" y="-190" width="28" height="200" rx="12" fill="${woodLight}"/>
<ellipse cx="0" cy="0" rx="118" ry="36" fill="#C8372D"/><ellipse cx="0" cy="-46" rx="98" ry="32" fill="${C.marigold}"/><ellipse cx="0" cy="-88" rx="78" ry="28" fill="#2F9E66"/><ellipse cx="0" cy="-126" rx="58" ry="24" fill="#3E7CA6"/></g>
</g>
<g transform="translate(1760 1560) rotate(14)">
<ellipse cx="0" cy="40" rx="110" ry="18" fill="#2B0A12" opacity=".5"/>
<g filter="url(#h-soft)"><path d="M-70,-60 C-70,-110 70,-110 70,-60 C70,-10 20,20 0,54 C-20,20 -70,-10 -70,-60Z" fill="#E26F5A"/><path d="M-70,-66 C-40,-50 40,-50 70,-66" fill="none" stroke="${C.marigold}" stroke-width="16"/><rect x="-8" y="-128" width="16" height="40" rx="7" fill="${woodLight}"/></g>
</g>
</g>`,
});

// Light itself: beams from the window, added over everything.
layer("shafts", {
  x: 150, y: 250, w: 1250, h: 1250, scale: 0.5, blend: "add",
  body: `<g filter="url(#b24)">${[0, 1, 2, 3].map((i) => `<path d="M${WIN.x0 + 46 + i * 62},${WIN.y0} l40,0 L${760 + i * 150},1440 l-190,0Z" fill="url(#g-shaft)" opacity="${0.85 - i * 0.08}"/>`).join("")}</g>`,
});

layer("vignette", { scale: 0.25, body: `<rect width="${W}" height="${H}" fill="url(#g-vig)"/>` });

export const home = { layers };
