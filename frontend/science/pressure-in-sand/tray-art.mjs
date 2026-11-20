// Only authored SVG is inserted. Nothing from user inputs enters this markup.
const definitions = `<svg class="art-defs" aria-hidden="true" width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="air" x2="0" y2="1" gradientUnits="objectBoundingBox">
    <stop stop-color="#c8ddd5"/><stop offset="1" stop-color="#edf1df"/>
  </linearGradient>
  <linearGradient id="top-sand" x2=".1" y2="1">
    <stop stop-color="#edd2a3"/><stop offset="1" stop-color="#d3a374"/>
  </linearGradient>
  <linearGradient id="cut-sand" x2="0" y2="1">
    <stop stop-color="#be8555"/><stop offset="1" stop-color="#855735"/>
  </linearGradient>
  <linearGradient id="clay-face" x2=".15" y2="1">
    <stop stop-color="#c66c50"/><stop offset=".48" stop-color="#a95239"/><stop offset="1" stop-color="#90472f"/>
  </linearGradient>
  <linearGradient id="clay-top" x2=".2" y2="1">
    <stop stop-color="#e4a181"/><stop offset="1" stop-color="#bb6548"/>
  </linearGradient>
  <linearGradient id="feather-gold" x2=".2" y2="1">
    <stop stop-color="#fff7d9"/><stop offset="1" stop-color="#cba76d"/>
  </linearGradient>
  <radialGradient id="surface-shadow">
    <stop stop-color="#31201b" stop-opacity=".43"/><stop offset="1" stop-color="#31201b" stop-opacity="0"/>
  </radialGradient>
  <pattern id="sand-fine" width="23" height="19" patternUnits="userSpaceOnUse">
    <path d="M2 2h2m7 3h1m8 2h2M5 10h1m9 4h2M2 17h3m15-1h1" stroke="#6f4b32" stroke-width="1" stroke-linecap="round" opacity=".53"/>
    <path d="M8 1h2M2 7h1m8 3h3m7 2h2M6 16h2m11 2h2" stroke="#fff0c8" stroke-width="1.3" stroke-linecap="round" opacity=".86"/>
    <circle cx="18" cy="5" r=".7" fill="#fff7d9"/><circle cx="10" cy="13" r=".65" fill="#8c5a3b"/>
  </pattern>
  <pattern id="sand-cut" width="39" height="31" patternUnits="userSpaceOnUse">
    <path d="m2 1 3 2m7 0 3 1m15 2h3M2 17l3-2m6-4 2-1m6 6 3 1m11-3 3-1M6 26h2m10 3 3 1m10-6 1-2" stroke="#422b22" opacity=".64" stroke-width=".9" stroke-linecap="round"/>
    <path d="m6 6 3 1m11-4 4 1m11 4h2M3 12h1m12 1 3-1m7 7 4 1M9 22h3m0 5h2m21 2 2-1" stroke="#f1c18a" opacity=".94" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="6" cy="19" r="1" fill="#ebb272"/><circle cx="25" cy="8" r="1" fill="#d99c60"/><circle cx="19" cy="21" r="1" fill="#624226"/>
  </pattern>
  <pattern id="clay-grit" width="27" height="17" patternUnits="userSpaceOnUse">
    <path d="M1 2h2m11 2h1m9 1h2M7 8h3m13 5h1M2 13h2m11 2h3" stroke="#ffd4ad" stroke-width="1.2" stroke-linecap="round" opacity=".57"/>
    <path d="M8 2h1m13 1h2M3 7h2m11 3h2m7 1h1M8 15h2" stroke="#652f23" stroke-width="1" stroke-linecap="round" opacity=".64"/>
  </pattern>
  <g id="tray-deck">
    <path d="M13 161 51 91 302 91 348 161 329 183H31Z" fill="#7e9283" opacity=".32"/>
    <path d="M14 156 51 88H303L348 156 338 169H23Z" fill="#435d52" stroke="#244438" stroke-width="2" stroke-linejoin="round"/>
    <path d="M29 150 59 96H298L333 150 321 159H37Z" fill="url(#top-sand)"/>
    <path d="M29 150 59 96H298L333 150 321 159H37Z" fill="url(#sand-fine)" opacity=".75"/>
    <path d="M30 154H332L322 200Q321 205 313 206H48Q41 205 39 198Z" fill="url(#cut-sand)" stroke="#603f30" stroke-width="1.7"/>
    <path d="M31 155H331L322 199Q320 203 313 204H49Q42 203 40 197Z" fill="url(#sand-cut)"/>
    <path d="M36 175Q56 169 77 176T119 176 161 177 204 179 248 176 288 177 326 174M40 188Q64 184 88 189T128 189 173 192 219 189 260 190 299 189 324 186" fill="none" stroke="#f3ba83" stroke-width=".9" opacity=".47"/>
    <path d="M20 153H341L337 159H24Z" fill="#a0aa82" stroke="#4a5545" stroke-width="1.2"/>
    <path d="M41 197Q48 202 57 201H308Q316 201 322 198L321 206Q319 210 313 210H47Q41 209 40 205Z" fill="#41594d" stroke="#2d483d" stroke-width="1.4"/>
    <path d="M76 111q40-6 76-2m49 2q35-4 67 1M70 127q26-3 46-3m148 0 20 4" stroke="#fff1c6" stroke-opacity=".46" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  </g>
  <g id="brick-wide">
    <path d="M126 132V99l18-13h75v35l-18 13Z" fill="#803c2b" stroke="#5d3229" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="m126 99 18-13h75l-18 13Z" fill="url(#clay-top)" stroke="#914a37" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="m201 99 18-13v35l-18 13Z" fill="#83442e" stroke="#5d3229" stroke-width="1.1"/>
    <path d="M126 99h75v35h-75Z" fill="url(#clay-face)" stroke="#6b392e" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M127 101h73v31h-73Z" fill="url(#clay-grit)"/>
    <path d="m138 96 9-7h61l-9 7Z" fill="#a8583e" opacity=".61"/>
    <path d="M129 101h67m-55-10 5-3h64" stroke="#f8be94" stroke-width="1.1" opacity=".76" stroke-linecap="round"/>
    <path d="m204 109 11-8m-10 19 10-8" stroke="#d1825d" stroke-width="1" opacity=".48"/>
  </g>
  <g id="brick-narrow">
    <path d="M155 133V68l19-13h42v66l-19 13Z" fill="#803c2b" stroke="#5d3229" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="m155 68 19-13h42l-19 13Z" fill="url(#clay-top)" stroke="#914a37" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="m197 68 19-13v66l-19 13Z" fill="#83442e" stroke="#5d3229" stroke-width="1.1"/>
    <path d="M155 68h42v66h-42Z" fill="url(#clay-face)" stroke="#6b392e" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M156 69h40v63h-40Z" fill="url(#clay-grit)"/>
    <path d="M158 70h36m-24-11 5-2h35" stroke="#f8be94" stroke-width="1.1" opacity=".76" stroke-linecap="round"/>
    <path d="M165 73h19v54h-19Z" fill="#8b422f" opacity=".29"/>
    <path d="m201 77 10-8m-10 22 10-8m-10 25 10-8m-10 23 11-8" stroke="#d1825d" stroke-width="1" opacity=".48"/>
  </g>
  <g id="soft-feather">
    <path d="M133 138q20-12 24-25t20-20q15-8 52-2-11 19-27 26l-15 5-13 5-14 1q-12 3-27 10Z" fill="url(#feather-gold)" stroke="#715332" stroke-width="1.35" stroke-linejoin="round"/>
    <path d="M126 140q24-11 43-20t58-28" fill="none" stroke="#805e43" stroke-width="1.7" stroke-linecap="round"/>
    <path d="m221 95-17 5 7-9m-6 11-19 10 6-16m6 10 13-2m-17 7 7 3m-18-1-4-11m0 14 9 2m-15-2-1-9m-6 14 8 2m-14 0 1-10" fill="none" stroke="#a37e52" stroke-width="1" stroke-linecap="round"/>
  </g>
  <g id="imprint-wide"><path d="m121 130 22-15h79l-18 18h-80Z" fill="#895535" stroke="#784e35" stroke-width="1.4"/><path d="m120 133 10 5h70l7-6-9 1h-64Z" fill="#b38255"/><path d="m122 130 22-14h77m-14 16 18-17" fill="none" stroke="#f0c67d" stroke-width="1" opacity=".77"/></g>
  <g id="imprint-narrow"><path d="m149 132 24-17h46l-21 20h-48Z" fill="#775034" stroke="#704931" stroke-width="1.4"/><path d="m149 134 11 9h34l6-9-5 2h-39Z" fill="#ac7549"/><path d="m150 131 24-15h43m-19 18 20-18" fill="none" stroke="#f0c67d" stroke-width="1" opacity=".77"/></g>
  <g id="imprint-feather"><path d="m141 137 20-8 20-8" fill="none" stroke="#9b6948" stroke-width="1" stroke-linecap="round" opacity=".57"/></g>
</defs></svg>`;

function drawing(kind) {
  const narrow = kind === 'narrow';
  return `<svg class="art" viewBox="0 0 362 220" xmlns="http://www.w3.org/2000/svg">
    <path fill="url(#air)" d="M0 0h362v220H0Z"/>
    <path d="M0 95Q84 63 146 92T266 86q55-19 96 4V220H0Z" fill="#b4c9b8" opacity=".33"/>
    <path d="M23 29h29m-29 6h19m-19 6h10M327 29h12m-12 6h12m-12 6h12" stroke="#53786a" stroke-width="1" opacity=".45" stroke-linecap="round"/>
    <use href="#tray-deck"/>
    <ellipse class="scene-shadow" cx="179" cy="132" rx="${narrow ? 46 : 61}" ry="15" fill="url(#surface-shadow)"/>
    <g class="scene-imprint">
      <use class="wide-imprint" href="#imprint-wide"/>
      <use class="narrow-imprint" href="#imprint-narrow"/>
      <use class="feather-imprint" href="#imprint-feather"/>
    </g>
    <path class="contact-mark contact-wide" d="M113 136h100m-100-3v7m100-7v7M209 132l20-17" fill="none"/>
    <path class="contact-mark contact-narrow" d="M143 136h60m-60-3v7m60-7v7M200 131l20-16" fill="none"/>
    <g class="scene-grains" fill="#b88458" stroke="#704e36" stroke-width=".38">
      <circle cx="120" cy="133" r="1.8" style="--grain-x:-23px;--grain-y:-12px"/>
      <circle cx="134" cy="130" r="2" style="--grain-x:-18px;--grain-y:-20px"/>
      <circle cx="144" cy="135" r="1.5" style="--grain-x:-8px;--grain-y:-14px"/>
      <circle cx="204" cy="135" r="2" style="--grain-x:13px;--grain-y:-17px"/>
      <circle cx="214" cy="131" r="1.6" style="--grain-x:19px;--grain-y:-14px"/>
      <circle cx="226" cy="136" r="1.8" style="--grain-x:26px;--grain-y:-9px"/>
    </g>
    <g class="scene-object">
      <use class="wide-object" href="#brick-wide"/>
      <use class="narrow-object" href="#brick-narrow"/>
      <use class="feather-object" href="#soft-feather"/>
    </g>
  </svg>`;
}

export function mountTrayArt() {
  document.body.insertAdjacentHTML('afterbegin', definitions);
  for (const scene of document.querySelectorAll('.scene')) scene.innerHTML = drawing(scene.dataset.shape);
}
