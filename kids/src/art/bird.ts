/**
 * Mina the myna: a small brown myna with a black head, yellow eye patch and
 * yellow beak. A layered rig like Chintoo (wings, head, beak, tail, legs).
 *
 * Local coordinates: (0, 0) is between the feet; she faces right.
 */

export const BIRD_PIVOTS: Record<string, [number, number]> = {
  bob: [0, 0],
  head: [22, -62],
  "wing-near": [-4, -58],
  "wing-far": [-2, -62],
  tail: [-36, -40],
  "beak-low": [50, -80],
  body: [0, -10],
};

export const BIRD_HOLD: [number, number] = [76, -74];

const OUT = "#3a2416";

export const birdDefs = `
<radialGradient id="bd-body" cx="40%" cy="30%" r="75%">
  <stop offset="0" stop-color="#a87346"/><stop offset=".6" stop-color="#7d5030"/><stop offset="1" stop-color="#5c3820"/>
</radialGradient>
<radialGradient id="bd-head" cx="40%" cy="30%" r="70%">
  <stop offset="0" stop-color="#4a403b"/><stop offset="1" stop-color="#1f1a17"/>
</radialGradient>`;

export const birdSvg = `
<g class="bob">
  <g class="part legs" stroke="#e5a91c" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M-8 -16 L-10 0 M-18 0 h16 M8 -16 L10 0 M2 0 h16"/>
  </g>
  <g class="part wing-far">
    <path d="M-2 -62 C -40 -90, -78 -80, -84 -58 C -60 -60, -30 -50, -2 -50 Z" fill="#4e3019" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
  </g>
  <g class="part tail">
    <path d="M-36 -40 L-86 -30 Q -92 -20 -84 -14 L-34 -24 Z" fill="#3e2a1d" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-80 -28 l -4 12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="part body">
    <ellipse cx="0" cy="-42" rx="44" ry="32" fill="url(#bd-body)" stroke="${OUT}" stroke-width="4"/>
    <path d="M14 -24 q 18 -6 26 -22" fill="none" stroke="#c99a70" stroke-width="6" stroke-linecap="round" opacity=".7"/>
  </g>
  <g class="part head">
    <circle cx="30" cy="-80" r="26" fill="url(#bd-head)" stroke="${OUT}" stroke-width="4"/>
    <path d="M30 -104 q 4 -14 -6 -18 q 14 0 14 16" fill="#2a221e" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="40" cy="-84" rx="13" ry="11" fill="#f4c21c"/>
    <g class="eye eye-b">
      <circle cx="41" cy="-85" r="7.5" fill="#fff"/>
      <circle cx="42.5" cy="-85" r="5" fill="#16120f"/>
      <circle cx="44.5" cy="-87.5" r="2" fill="#fff"/>
    </g>
    <path class="eye-closed" d="M34 -84 q 7 -6 14 0" fill="none" stroke="#16120f" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 -84 L76 -76 L50 -72 Z" fill="#f7b416" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <g class="part beak-low"><path d="M50 -74 L70 -73 L50 -68 Z" fill="#e3990c" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/></g>
    <ellipse class="cheek" cx="28" cy="-70" rx="7" ry="4" fill="#ff8a8a" opacity=".45"/>
  </g>
  <g class="part wing-near">
    <path d="M-4 -58 C -40 -78, -70 -64, -72 -42 C -50 -46, -26 -36, 4 -40 Z" fill="#6a4226" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-50 -56 q -10 6 -14 14" stroke="#f3eee6" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>
  <g class="hold"></g>
</g>`;
