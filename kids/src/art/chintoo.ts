/**
 * Chintoo: a chubby ginger-and-cream cat with a teal scarf.
 *
 * A layered 2D rig, not a picture: every moving part is its own group with a
 * pivot, so the player animates parts (head, ears, eyes, arms, feet, tail)
 * rather than swapping whole drawings. An illustrator can replace any part's
 * artwork as long as the class names and pivots stay the same (see
 * docs/kids/ARCHITECTURE.md, "Replacing the art").
 *
 * Local coordinates: (0, 0) is between the feet; the character is about 300
 * units tall and faces right.
 */

export const CHINTOO_PIVOTS: Record<string, [number, number]> = {
  bob: [0, 0],
  body: [0, -10],
  head: [0, -150],
  "ear-l": [-62, -262],
  "ear-r": [62, -262],
  "eye-l": [-38, -222],
  "eye-r": [38, -222],
  "arm-l": [-70, -132],
  "arm-r": [70, -132],
  "foot-l": [-44, -8],
  "foot-r": [44, -8],
  tail: [78, -60],
  belly: [0, -40],
};

/** Where a held prop sits, relative to the feet, when facing right. */
export const CHINTOO_HOLD: [number, number] = [144, -92];

const OUT = "#6b3b1f";
const OW = 5;

export const chintooDefs = `
<radialGradient id="ch-fur" cx="38%" cy="30%" r="75%">
  <stop offset="0" stop-color="#ffc77d"/><stop offset=".55" stop-color="#f4a046"/><stop offset="1" stop-color="#d9772a"/>
</radialGradient>
<radialGradient id="ch-cream" cx="45%" cy="35%" r="70%">
  <stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f6dfbd"/>
</radialGradient>
<radialGradient id="ch-iris" cx="40%" cy="35%" r="70%">
  <stop offset="0" stop-color="#7fbf5a"/><stop offset=".7" stop-color="#3f7d35"/><stop offset="1" stop-color="#25502a"/>
</radialGradient>
<linearGradient id="ch-scarf" x1="0" x2="0" y1="0" y2="1">
  <stop offset="0" stop-color="#3cc6b8"/><stop offset="1" stop-color="#1f9488"/>
</linearGradient>`;

const eye = (side: "l" | "r", cx: number) => `
  <g class="part eye eye-${side}">
    <ellipse cx="${cx}" cy="-222" rx="23" ry="27" fill="#fff" stroke="${OUT}" stroke-width="4"/>
    <g class="pupil">
      <circle cx="${cx + 3}" cy="-219" r="16" fill="url(#ch-iris)"/>
      <circle cx="${cx + 4}" cy="-218" r="9" fill="#1d1a17"/>
      <circle cx="${cx + 9}" cy="-226" r="5.5" fill="#fff"/>
      <circle cx="${cx - 2}" cy="-212" r="2.5" fill="#fff" opacity=".8"/>
    </g>
    <path class="lid" d="M${cx - 24} -236 Q${cx} -252 ${cx + 24} -236 L${cx + 24} -222 Q${cx} -230 ${cx - 24} -222 Z" fill="url(#ch-fur)" opacity="0"/>
  </g>
  <path class="eye-closed eye-closed-${side}" d="M${cx - 20} -220 Q${cx} -234 ${cx + 20} -220" fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/>`;

export const chintooSvg = `
<g class="bob">
  <g class="part tail">
    <path d="M78 -60 C 140 -60, 170 -110, 150 -165 C 140 -195, 112 -196, 108 -178" fill="none" stroke="${OUT}" stroke-width="40" stroke-linecap="round"/>
    <path d="M78 -60 C 140 -60, 170 -110, 150 -165 C 140 -195, 112 -196, 108 -178" fill="none" stroke="url(#ch-fur)" stroke-width="30" stroke-linecap="round"/>
    <path d="M140 -186 C 128 -196, 114 -192, 109 -180" fill="none" stroke="#fffaf0" stroke-width="30" stroke-linecap="round"/>
    <path d="M150 -110 l 22 6 M156 -140 l 22 -2" stroke="#d07024" stroke-width="7" stroke-linecap="round"/>
  </g>
  <g class="part foot foot-l">
    <ellipse cx="-44" cy="-12" rx="34" ry="18" fill="url(#ch-cream)" stroke="${OUT}" stroke-width="${OW}"/>
    <path d="M-56 -8 v-8 M-44 -6 v-9 M-32 -8 v-8" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  </g>
  <g class="part foot foot-r">
    <ellipse cx="44" cy="-12" rx="34" ry="18" fill="url(#ch-cream)" stroke="${OUT}" stroke-width="${OW}"/>
    <path d="M32 -8 v-8 M44 -6 v-9 M56 -8 v-8" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  </g>
  <g class="part belly">
    <path d="M-92 -70 C -100 -150, -60 -170, 0 -170 C 60 -170, 100 -150, 92 -70 C 88 -20, 50 -12, 0 -12 C -50 -12, -88 -20, -92 -70 Z" fill="url(#ch-fur)" stroke="${OUT}" stroke-width="${OW}"/>
    <path d="M-56 -78 C -60 -128, -30 -142, 0 -142 C 30 -142, 60 -128, 56 -78 C 54 -40, 30 -26, 0 -26 C -30 -26, -54 -40, -56 -78 Z" fill="url(#ch-cream)"/>
    <path d="M-86 -110 q 14 4 18 16 M-90 -84 q 14 2 20 12 M86 -110 q -14 4 -18 16 M90 -84 q -14 2 -20 12" fill="none" stroke="#d07024" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g class="part arm arm-l">
    <path d="M-70 -132 C -96 -120, -104 -86, -96 -66" fill="none" stroke="${OUT}" stroke-width="36" stroke-linecap="round"/>
    <path d="M-70 -132 C -96 -120, -104 -86, -96 -66" fill="none" stroke="url(#ch-fur)" stroke-width="27" stroke-linecap="round"/>
    <ellipse cx="-96" cy="-62" rx="20" ry="17" fill="url(#ch-cream)" stroke="${OUT}" stroke-width="4"/>
  </g>
  <g class="part head">
    <g class="part ear ear-l">
      <path d="M-92 -232 L-78 -306 Q -72 -318 -60 -308 L-28 -266 Z" fill="url(#ch-fur)" stroke="${OUT}" stroke-width="${OW}" stroke-linejoin="round"/>
      <path d="M-80 -244 L-72 -290 L-48 -264 Z" fill="#f7a6a6"/>
    </g>
    <g class="part ear ear-r">
      <path d="M92 -232 L78 -306 Q 72 -318 60 -308 L28 -266 Z" fill="url(#ch-fur)" stroke="${OUT}" stroke-width="${OW}" stroke-linejoin="round"/>
      <path d="M80 -244 L72 -290 L48 -264 Z" fill="#f7a6a6"/>
    </g>
    <path d="M-104 -206 C -110 -262, -60 -290, 0 -290 C 60 -290, 110 -262, 104 -206 C 116 -196, 112 -182, 100 -178 C 92 -148, 50 -138, 0 -138 C -50 -138, -92 -148, -100 -178 C -112 -182, -116 -196, -104 -206 Z" fill="url(#ch-fur)" stroke="${OUT}" stroke-width="${OW}" stroke-linejoin="round"/>
    <path d="M-14 -286 q 4 18 0 30 M0 -289 q 3 20 0 34 M14 -286 q -4 18 0 30" fill="none" stroke="#d07024" stroke-width="7" stroke-linecap="round"/>
    <path d="M-50 -176 C -56 -204, -26 -212, 0 -200 C 26 -212, 56 -204, 50 -176 C 46 -152, 20 -146, 0 -150 C -20 -146, -46 -152, -50 -176 Z" fill="url(#ch-cream)"/>
    <ellipse class="cheek" cx="-66" cy="-182" rx="17" ry="10" fill="#ff8a8a" opacity=".45"/>
    <ellipse class="cheek" cx="66" cy="-182" rx="17" ry="10" fill="#ff8a8a" opacity=".45"/>
    <g class="brows">
      <path class="brow brow-l" d="M-56 -262 q 16 -9 32 -2" fill="none" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>
      <path class="brow brow-r" d="M56 -262 q -16 -9 -32 -2" fill="none" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>
    </g>
    ${eye("l", -38)}
    ${eye("r", 38)}
    <path d="M-10 -196 h20 q 2 0 0 3 l-8 8 q -2 2 -4 0 l-8 -8 q -2 -3 0 -3 Z" fill="#f07f8f" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <g class="mouths" stroke="${OUT}" stroke-linecap="round" stroke-linejoin="round">
      <path class="mouth mouth-neutral" d="M-18 -178 q 9 9 18 0 q 9 9 18 0 M0 -185 v7" fill="none" stroke-width="4"/>
      <path class="mouth mouth-smile" d="M-24 -180 q 24 30 48 0 Z" fill="#7a2a2a" stroke-width="4"/>
      <path class="mouth mouth-open" d="M-14 -180 q 14 -4 28 0 q 2 24 -14 24 q -16 0 -14 -24 Z" fill="#7a2a2a" stroke-width="4"/>
      <path class="mouth mouth-sad" d="M-16 -166 q 16 -14 32 0" fill="none" stroke-width="4.5"/>
      <path class="mouth mouth-o" d="M-9 -176 a 9 11 0 1 0 18 0 a 9 11 0 1 0 -18 0" fill="#7a2a2a" stroke-width="4"/>
      <g class="mouth mouth-yuck"><path d="M-20 -172 q 7 -7 13 0 q 7 7 14 0 q 7 -7 13 0" fill="none" stroke-width="4"/><path d="M4 -170 q 8 16 16 2" fill="#f07f8f" stroke-width="3"/></g>
      <g class="mouth-talk"><path d="M-12 -180 q 12 -3 24 0 q 1 15 -12 15 q -13 0 -12 -15 Z" fill="#7a2a2a" stroke-width="4"/></g>
    </g>
    <g stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity=".7">
      <path d="M-58 -192 l-44 -6 M-58 -184 l-44 4 M58 -192 l44 -6 M58 -184 l44 4"/>
    </g>
  </g>
  <g class="part scarf">
    <path d="M-70 -150 C -40 -132, 40 -132, 70 -150 L 66 -128 C 36 -112, -36 -112, -66 -128 Z" fill="url(#ch-scarf)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M36 -128 l 10 40 l 18 -6 l -6 -38 Z" fill="url(#ch-scarf)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="40" cy="-128" r="10" fill="#2bb3a6" stroke="${OUT}" stroke-width="4"/>
  </g>
  <g class="part arm arm-r">
    <path d="M70 -132 C 96 -120, 104 -86, 96 -66" fill="none" stroke="${OUT}" stroke-width="36" stroke-linecap="round"/>
    <path d="M70 -132 C 96 -120, 104 -86, 96 -66" fill="none" stroke="url(#ch-fur)" stroke-width="27" stroke-linecap="round"/>
    <ellipse cx="96" cy="-62" rx="20" ry="17" fill="url(#ch-cream)" stroke="${OUT}" stroke-width="4"/>
  </g>
  <g class="hold"></g>
  <g class="zzz" opacity="0" font-family="'Baloo 2', 'Trebuchet MS', sans-serif" font-weight="800" fill="#5a6fb0">
    <text x="70" y="-300" font-size="34">z</text><text x="96" y="-336" font-size="44">z</text><text x="128" y="-380" font-size="56">Z</text>
  </g>
</g>`;
