/**
 * Background scenes, 1600 x 900. Groups with an "amb-" class move gently on
 * their own (clouds, leaves, grass, curtains); the player switches that motion
 * off for reduced motion.
 */

const OUT = "#5b3a24";

export const sceneDefs = `
<linearGradient id="sc-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7cc8f2"/><stop offset=".7" stop-color="#c8ecfb"/><stop offset="1" stop-color="#fff6dc"/></linearGradient>
<linearGradient id="sc-grass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9ed65a"/><stop offset="1" stop-color="#5ea33a"/></linearGradient>
<linearGradient id="sc-hill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b9e27e"/><stop offset="1" stop-color="#8cc760"/></linearGradient>
<radialGradient id="sc-leaf" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#8fd357"/><stop offset=".6" stop-color="#55a637"/><stop offset="1" stop-color="#357a27"/></radialGradient>
<linearGradient id="sc-trunk" x1="0" x2="1"><stop offset="0" stop-color="#8a5a33"/><stop offset=".5" stop-color="#a8713f"/><stop offset="1" stop-color="#704526"/></linearGradient>
<radialGradient id="sc-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff7c2"/><stop offset=".6" stop-color="#ffd84d"/><stop offset="1" stop-color="#ffc02e"/></radialGradient>
<linearGradient id="sc-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe3b8"/><stop offset="1" stop-color="#f6c98e"/></linearGradient>
<linearGradient id="sc-floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c98a52"/><stop offset="1" stop-color="#a86a3a"/></linearGradient>
<linearGradient id="sc-dawn" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8fd0f5"/><stop offset="1" stop-color="#ffe7b0"/></linearGradient>
<radialGradient id="sc-beam" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#fff5c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff5c8" stop-opacity="0"/></radialGradient>
<radialGradient id="sc-water" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#bfeaff"/><stop offset="1" stop-color="#5bb6e6"/></radialGradient>`;

const cloud = (x: number, y: number, s: number) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-90 20 C -110 20, -112 -10, -86 -14 C -84 -44, -40 -50, -26 -28 C -14 -60, 44 -58, 50 -22 C 80 -30, 104 -4, 88 20 Z" fill="#fff" opacity=".95"/>
    <path d="M-80 18 C -40 26, 40 26, 84 18" fill="none" stroke="#dcefff" stroke-width="6" stroke-linecap="round"/>
  </g>`;

const flower = (x: number, y: number, c: string) => `
  <g class="amb-sway" style="transform-origin:${x}px ${y + 30}px">
    <path d="M${x} ${y + 30} q -4 -14 0 -30" stroke="#3f8a2c" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-11" rx="8" ry="11" fill="${c}" transform="rotate(${a})"/>`).join("")}<circle r="7" fill="#ffd23f"/></g>
  </g>`;

const tuft = (x: number, y: number) =>
  `<path class="amb-grass" style="transform-origin:${x}px ${y}px" d="M${x - 14} ${y} q 4 -26 10 -34 q -2 18 4 34 q 4 -30 12 -40 q -4 22 0 40 Z" fill="#4f9a33"/>`;

const garden = `
<rect width="1600" height="900" fill="url(#sc-sky)"/>
<g class="amb-sun" style="transform-origin:1460px 130px">
  <circle cx="1460" cy="130" r="120" fill="#fff3b0" opacity=".35"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="1456" y="10" width="8" height="40" rx="4" fill="#ffd84d" opacity=".7" transform="rotate(${i * 30} 1460 130)"/>`).join("")}
  <circle cx="1460" cy="130" r="70" fill="url(#sc-sun)"/>
</g>
<g class="amb-cloud-a">${cloud(560, 120, 1)}</g>
<g class="amb-cloud-b">${cloud(1180, 80, 0.8)}</g>
<g class="amb-cloud-c">${cloud(930, 170, 0.55)}</g>
<path d="M0 640 C 200 540, 420 560, 620 620 C 820 540, 1100 520, 1300 600 C 1420 560, 1520 560, 1600 590 L1600 900 L0 900 Z" fill="url(#sc-hill)"/>
<g stroke="${OUT}" stroke-width="4" stroke-linejoin="round">
  ${Array.from({ length: 13 }, (_, i) => `<path d="M${290 + i * 100} 700 v-110 l 18 -22 l 18 22 v110 Z" fill="#f4e2c2"/>`).join("")}
  <rect x="280" y="612" width="1320" height="18" fill="#e9cfa0"/><rect x="280" y="660" width="1320" height="18" fill="#e9cfa0"/>
</g>
<path d="M0 720 C 300 690, 700 700, 1000 712 C 1250 722, 1450 700, 1600 708 L1600 900 L0 900 Z" fill="url(#sc-grass)"/>
<path d="M0 820 C 400 800, 900 830, 1600 810 L1600 900 L0 900 Z" fill="#579a35" opacity=".55"/>
<g>
  <path d="M0 140 L 250 140 L 250 760 L 0 760 Z" fill="#f2c27e" stroke="${OUT}" stroke-width="5"/>
  <path d="M-20 150 L 125 40 L 270 150 Z" fill="#d1553b" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
  <rect x="70" y="420" width="130" height="340" rx="64" fill="#7a4a2b" stroke="${OUT}" stroke-width="5"/>
  <rect x="84" y="436" width="102" height="324" rx="50" fill="#5b3420"/>
  <circle cx="170" cy="610" r="8" fill="#f4c542"/>
  <rect x="40" y="230" width="150" height="120" rx="12" fill="#bfe7f7" stroke="${OUT}" stroke-width="5"/>
  <path d="M115 230 v120 M40 290 h150" stroke="${OUT}" stroke-width="5"/>
  <rect x="30" y="760" width="210" height="16" rx="6" fill="#c9a77a" stroke="${OUT}" stroke-width="4"/>
</g>
<g>
  <path d="M960 800 C 970 700, 975 560, 965 470 L 1035 470 C 1028 560, 1040 700, 1060 800 Z" fill="url(#sc-trunk)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M1010 560 C 1080 520, 1150 470, 1230 452" fill="none" stroke="${OUT}" stroke-width="30" stroke-linecap="round"/>
  <path d="M1010 560 C 1080 520, 1150 470, 1230 452" fill="none" stroke="#9a6438" stroke-width="20" stroke-linecap="round"/>
  <path d="M990 520 C 940 470, 900 450, 840 440" fill="none" stroke="${OUT}" stroke-width="26" stroke-linecap="round"/>
  <path d="M990 520 C 940 470, 900 450, 840 440" fill="none" stroke="#9a6438" stroke-width="17" stroke-linecap="round"/>
  <path d="M985 640 q 14 10 30 0 M995 720 q 12 -8 26 2" stroke="#6d4325" stroke-width="4" fill="none" stroke-linecap="round"/>
  <g class="amb-canopy" style="transform-origin:1000px 800px">
    <g stroke="#2f6b20" stroke-width="5">
      <circle cx="790" cy="330" r="120" fill="url(#sc-leaf)"/>
      <circle cx="1210" cy="320" r="130" fill="url(#sc-leaf)"/>
      <circle cx="1000" cy="200" r="160" fill="url(#sc-leaf)"/>
      <circle cx="880" cy="200" r="120" fill="url(#sc-leaf)"/>
      <circle cx="1120" cy="190" r="125" fill="url(#sc-leaf)"/>
      <circle cx="1000" cy="360" r="140" fill="url(#sc-leaf)"/>
      <circle cx="870" cy="400" r="95" fill="url(#sc-leaf)"/>
      <circle cx="1130" cy="400" r="95" fill="url(#sc-leaf)"/>
    </g>
    <g fill="#8fd357" opacity=".5">
      <circle cx="950" cy="140" r="40"/><circle cx="1090" cy="130" r="34"/><circle cx="780" cy="290" r="36"/><circle cx="1200" cy="270" r="40"/><circle cx="980" cy="310" r="30"/>
    </g>
  </g>
  <path d="M1185 448 L1290 440" stroke="${OUT}" stroke-width="16" stroke-linecap="round"/>
  <path d="M1185 448 L1290 440" stroke="#9a6438" stroke-width="9" stroke-linecap="round"/>
  <g class="amb-leaf" style="transform-origin:1288px 440px"><path d="M1288 440 q 26 -18 40 4 q -22 14 -40 -4 Z" fill="#5fae3b" stroke="#2f6b20" stroke-width="3"/></g>
</g>
<g>
  <path d="M1350 800 L 1370 680 L 1430 680 L 1450 800 Z" fill="#c9cdd6" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="1400" cy="676" rx="110" ry="26" fill="#d9dde5" stroke="${OUT}" stroke-width="5"/>
  <ellipse cx="1400" cy="672" rx="88" ry="16" fill="url(#sc-water)"/>
  <ellipse class="amb-ripple" cx="1400" cy="672" rx="40" ry="7" fill="none" stroke="#fff" stroke-width="3" opacity=".6" style="transform-origin:1400px 672px"/>
</g>
${flower(330, 770, "#ff8fb1")}${flower(400, 790, "#ffffff")}${flower(560, 780, "#b98cff")}${flower(1250, 790, "#ff8fb1")}${flower(1520, 780, "#ffb347")}${flower(1560, 820, "#ffffff")}
${[300, 470, 640, 760, 880, 1110, 1290, 1480].map((x, i) => tuft(x, 820 + (i % 3) * 18)).join("")}
<g class="amb-butterfly-a"><g transform="translate(560 330)"><g class="amb-flutter"><ellipse cx="-11" cy="0" rx="12" ry="16" fill="#ffb347" stroke="${OUT}" stroke-width="2"/><ellipse cx="11" cy="0" rx="12" ry="16" fill="#ffb347" stroke="${OUT}" stroke-width="2"/></g><rect x="-2" y="-12" width="4" height="24" rx="2" fill="${OUT}"/></g></g>
<g class="amb-butterfly-b"><g transform="translate(1460 560)"><g class="amb-flutter"><ellipse cx="-9" cy="0" rx="10" ry="13" fill="#b98cff" stroke="${OUT}" stroke-width="2"/><ellipse cx="9" cy="0" rx="10" ry="13" fill="#b98cff" stroke="${OUT}" stroke-width="2"/></g><rect x="-2" y="-10" width="4" height="20" rx="2" fill="${OUT}"/></g></g>`;

const bedroom = `
<rect width="1600" height="900" fill="url(#sc-wall)"/>
<g opacity=".25" fill="#e8a868">${Array.from({ length: 9 }, (_, i) => `<circle cx="${100 + i * 180}" cy="${90 + (i % 2) * 60}" r="10"/>`).join("")}</g>
<path d="M0 700 L1600 700 L1600 900 L0 900 Z" fill="url(#sc-floor)"/>
<g stroke="#8d5a2f" stroke-width="3" opacity=".5">${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 220} 700 L${i * 220 - 120} 900"/>`).join("")}</g>
<rect x="0" y="690" width="1600" height="16" fill="#e7b57a" stroke="${OUT}" stroke-width="4"/>
<g>
  <rect x="200" y="140" width="420" height="330" rx="18" fill="url(#sc-dawn)" stroke="${OUT}" stroke-width="7"/>
  <circle cx="300" cy="250" r="56" fill="url(#sc-sun)"/>
  ${cloud(500, 230, 0.5)}
  <path d="M200 400 C 300 360, 420 380, 620 360 L620 470 L200 470 Z" fill="#9ed65a" opacity=".85"/>
  <path d="M410 140 v330 M200 300 h420" stroke="${OUT}" stroke-width="7"/>
  <rect x="180" y="470" width="460" height="22" rx="8" fill="#e7b57a" stroke="${OUT}" stroke-width="5"/>
  <g class="amb-curtain-l" style="transform-origin:180px 120px"><path d="M170 112 C 200 260, 160 380, 210 500 L 150 500 C 130 380, 150 240, 140 112 Z" fill="#ff8fa3" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/></g>
  <g class="amb-curtain-r" style="transform-origin:640px 120px"><path d="M650 112 C 620 260, 660 380, 610 500 L 670 500 C 690 380, 670 240, 680 112 Z" fill="#ff8fa3" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/></g>
  <rect x="130" y="100" width="560" height="18" rx="9" fill="#a56a3b" stroke="${OUT}" stroke-width="4"/>
</g>
<path class="amb-beam" d="M230 480 L 620 480 L 900 900 L 300 900 Z" fill="url(#sc-beam)"/>
<g>
  <rect x="1250" y="250" width="250" height="450" rx="16" fill="#fff6d6" stroke="${OUT}" stroke-width="6"/>
  <path d="M1270 270 h210 v430 h-210 Z" fill="#c4ef8d"/>
  <path d="M1270 560 C 1330 520, 1420 530, 1480 500 L1480 700 L1270 700 Z" fill="#7ec04b"/>
  <circle cx="1400" cy="360" r="36" fill="url(#sc-sun)"/>
  <path d="M1250 250 L 1180 290 L 1180 720 L 1250 700 Z" fill="#8f5a33" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
  <circle cx="1200" cy="500" r="9" fill="#f4c542" stroke="${OUT}" stroke-width="3"/>
</g>
<g>
  <rect x="820" y="300" width="260" height="20" rx="6" fill="#b47a45" stroke="${OUT}" stroke-width="4"/>
  <rect x="850" y="250" width="40" height="50" rx="6" fill="#6fb8e8" stroke="${OUT}" stroke-width="4"/>
  <circle cx="950" cy="272" r="28" fill="#ff6f61" stroke="${OUT}" stroke-width="4"/>
  <path d="M1010 300 l 20 -50 l 20 50 Z" fill="#ffd23f" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>
</g>
<ellipse cx="520" cy="800" rx="300" ry="48" fill="#7fc6b8" stroke="${OUT}" stroke-width="5"/>
<ellipse cx="520" cy="796" rx="250" ry="32" fill="#a3dccf"/>
<g>
  <ellipse cx="520" cy="780" rx="190" ry="44" fill="#e98aa0" stroke="${OUT}" stroke-width="5"/>
  <ellipse cx="520" cy="766" rx="150" ry="26" fill="#f6b3c2"/>
</g>`;

/** Drawn in front of the characters (for depth). */
const bedroomFront = `<path d="M330 790 C 380 830, 660 830, 710 790 C 700 820, 640 840, 520 842 C 400 840, 340 820, 330 790 Z" fill="#e98aa0" stroke="${OUT}" stroke-width="5"/>`;

export const SCENES: Record<string, { back: string; front?: string }> = {
  bedroom: { back: bedroom, front: bedroomFront },
  garden: { back: garden },
};
