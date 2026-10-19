/**
 * Props: things characters and children can touch. Local (0, 0) is the
 * object's resting point (the bottom of an apple, the bottom of the basket).
 */

const OUT = "#5a2e1a";

export const propDefs = `
<radialGradient id="ap-red" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff7a6b"/><stop offset=".55" stop-color="#e2332a"/><stop offset="1" stop-color="#a51c1c"/></radialGradient>
<radialGradient id="ap-green" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#c9f07a"/><stop offset=".55" stop-color="#7cc73a"/><stop offset="1" stop-color="#4c8f23"/></radialGradient>
<radialGradient id="ap-yellow" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#fff2a0"/><stop offset=".55" stop-color="#f6cf2c"/><stop offset="1" stop-color="#d39a12"/></radialGradient>
<linearGradient id="bk-weave" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d8a25e"/><stop offset="1" stop-color="#a86a32"/></linearGradient>`;

const appleBody = (fill: string) => `
  <path d="M0 -6 C -26 -2, -34 -30, -30 -44 C -26 -60, -10 -62, 0 -54 C 10 -62, 26 -60, 30 -44 C 34 -30, 26 -2, 0 -6 Z" fill="${fill}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="-12" cy="-42" rx="6" ry="9" fill="#fff" opacity=".55" transform="rotate(-20 -12 -42)"/>
  <path d="M0 -54 q 2 -10 6 -16" fill="none" stroke="#6b3f1f" stroke-width="4" stroke-linecap="round"/>
  <path d="M5 -66 q 16 -10 24 2 q -14 8 -24 -2 Z" fill="#5fae3b" stroke="#2f6b20" stroke-width="2.5"/>`;

const mud = `
  <g class="mud">
    <path d="M-24 -26 q 8 -10 18 -2 q 8 8 -2 12 q -12 6 -16 -10 Z" fill="#6d4a2b" opacity=".9"/>
    <path d="M8 -40 q 10 -6 16 2 q 2 10 -10 8 Z" fill="#6d4a2b" opacity=".85"/>
    <circle cx="14" cy="-18" r="5" fill="#5a3b20"/>
    <circle cx="-6" cy="-48" r="3.5" fill="#5a3b20"/>
  </g>`;

export const PROP_ART: Record<string, Record<string, string>> = {
  apple: {
    red: appleBody("url(#ap-red)"),
    green: appleBody("url(#ap-green)"),
    yellow: appleBody("url(#ap-yellow)"),
    muddy: appleBody("url(#ap-red)") + mud,
  },
  basket: {
    plain: `
      <path d="M-120 -96 C -120 -190, 120 -190, 120 -96" fill="none" stroke="${OUT}" stroke-width="16" stroke-linecap="round"/>
      <path d="M-120 -96 C -120 -190, 120 -190, 120 -96" fill="none" stroke="#c88b47" stroke-width="9" stroke-linecap="round"/>
      <path d="M-136 -96 L -110 -6 Q -106 0 -96 0 L 96 0 Q 106 0 110 -6 L 136 -96 Z" fill="url(#bk-weave)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <g stroke="#8a5424" stroke-width="3" opacity=".7" fill="none">
        <path d="M-130 -74 H130 M-124 -50 H124 M-118 -26 H118"/>
        <path d="M-90 -96 l 8 92 M-45 -96 l 4 94 M0 -96 v96 M45 -96 l -4 94 M90 -96 l -8 92"/>
      </g>
      <rect x="-142" y="-108" width="284" height="18" rx="9" fill="#c88b47" stroke="${OUT}" stroke-width="5"/>`,
  },
  mat: {
    plain: `
      <path d="M-330 -10 L -290 -70 L 290 -70 L 330 -10 Z" fill="#fff4e0" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <g fill="#f26d6d" opacity=".85">
        ${[-250, -150, -50, 50, 150, 250].map((x, i) => `<path d="M${x - 40 - (i - 2.5) * 2} -10 L ${x - 34 - (i - 2.5) * 1.4} -40 L ${x + 6 - (i - 2.5) * 1.4} -40 L ${x - (i - 2.5) * 2} -10 Z"/>`).join("")}
        ${[-200, -100, 0, 100, 200].map((x, i) => `<path d="M${x - 34 - (i - 2) * 1.4} -40 L ${x - 30 - (i - 2) * 0.8} -70 L ${x + 6 - (i - 2) * 0.8} -70 L ${x + 2 - (i - 2) * 1.4} -40 Z"/>`).join("")}
      </g>
      <path d="M-330 -10 L 330 -10" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>`,
  },
  puddle: {
    plain: `<ellipse cx="0" cy="0" rx="90" ry="20" fill="#7b5534" opacity=".85"/><ellipse cx="-14" cy="-4" rx="54" ry="9" fill="#9a7048" opacity=".7"/>`,
  },
};

/** The first variant of each asset is its default look. */
export const PROP_VARIANTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(PROP_ART).map(([asset, variants]) => [asset, Object.keys(variants)]),
);
