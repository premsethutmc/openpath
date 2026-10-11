// Amma: every layer of the character, drawn in "sheet" space.
// Sheet space: origin between her feet, y is negative upward, she is 1000 units tall.
// Each part is baked to its own raster layer; `pivot` is where the rig holds it.
import { C } from "./defs.mjs";

const FACE = "M0,-966 C54,-966 91,-931 92,-877 C93,-840 84,-803 60,-778 C42,-760 20,-751 0,-751 C-20,-751 -42,-760 -60,-778 C-84,-803 -93,-840 -92,-877 C-91,-931 -54,-966 0,-966Z";

const parts = [];
const part = (id, o) => parts.push({ id, z: parts.length, place: "", scale: 2, ...o });

/* ------------------------------------------------------------------ head */

part("hair-back", {
  group: "head", pivot: [0, -770],
  body: `<g filter="url(#f-hair)">
<path d="M0,-1000 C66,-1002 110,-956 107,-884 C108,-842 100,-806 82,-780 C56,-762 -56,-762 -82,-780 C-100,-806 -108,-842 -107,-884 C-110,-956 -66,-1002 0,-1000Z" fill="${C.hair}"/>
</g>`,
});

part("ear", {
  group: "head", pivot: [96, -858],
  body: `<g filter="url(#f-skin)"><ellipse cx="97" cy="-858" rx="13" ry="22" fill="${C.skin}"/></g>
<path d="M96,-870 C103,-866 103,-852 97,-846" fill="none" stroke="${C.skinDeep}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,
});

part("jhumka", {
  group: "head", pivot: [100, -842],
  body: `<g filter="url(#f-metal)">
<circle cx="100" cy="-840" r="6.5" fill="${C.gold}"/>
<path d="M100,-834 v6" stroke="${C.goldDeep}" stroke-width="2.5"/>
<path d="M88,-812 C88,-826 112,-826 112,-812Z" fill="${C.gold}"/>
<rect x="87" y="-813" width="26" height="4.5" rx="2" fill="${C.goldDeep}"/>
<circle cx="91" cy="-804" r="3.2" fill="${C.gold}"/><circle cx="100" cy="-802" r="3.6" fill="${C.maroon}"/><circle cx="109" cy="-804" r="3.2" fill="${C.gold}"/>
</g>
<circle cx="98" cy="-842" r="2" fill="${C.goldLight}"/>`,
});

part("face", {
  group: "head", pivot: [0, -770],
  body: `<defs><clipPath id="cp-face"><path d="${FACE}"/></clipPath></defs>
<g filter="url(#f-skin)"><path d="${FACE}" fill="${C.skin}"/></g>
<g clip-path="url(#cp-face)">
<path d="M-110,-985 H110 V-925 C70,-952 34,-934 0,-938 C-34,-934 -70,-952 -110,-925Z" fill="#5A2440" opacity=".2" filter="url(#s10)"/>
<ellipse cx="-34" cy="-900" rx="46" ry="30" fill="${C.skinLight}" opacity=".35" filter="url(#s16)"/>
<ellipse cx="-63" cy="-820" rx="25" ry="17" fill="${C.blush}" opacity=".5" filter="url(#s10)"/>
<ellipse cx="63" cy="-820" rx="25" ry="17" fill="${C.blush}" opacity=".5" filter="url(#s10)"/>
<path d="M-70,-770 C-30,-748 30,-748 70,-770 C40,-764 -40,-764 -70,-770Z" fill="#5A2440" opacity=".25" filter="url(#s6)"/>
</g>`,
});

part("facemid", {
  group: "head", pivot: [0, -830],
  body: `<ellipse cx="6" cy="-827" rx="9" ry="7" fill="#5A2440" opacity=".14" filter="url(#s4)"/>
<path d="M-6,-829 C-6,-823 1,-820 7,-823" fill="none" stroke="${C.skinDeep}" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="-2" cy="-831" rx="5" ry="3.6" fill="${C.skinLight}" opacity=".75" filter="url(#s2)"/>
<circle cx="9.5" cy="-826.5" r="2.4" fill="${C.gold}"/><circle cx="8.8" cy="-827.2" r="0.9" fill="${C.goldLight}"/>
<circle cx="0" cy="-913" r="6.5" fill="#C22B33"/><circle cx="-1.6" cy="-914.6" r="2" fill="#E8626A" opacity=".8"/>`,
});

// Eyes are drawn for her left eye (viewer's right); the rig mirrors them.
const eyeLocal = (id, o) => part(id, { group: "eye", pivot: [0, 0], place: "translate(41 -866)", scale: 3, ...o });
const WHITE = "M-24,0 C-24,-14 -14,-23 0,-23 C14,-23 25,-13 25,0 C25,12 14,21 0,21 C-14,21 -24,12 -24,0Z";
eyeLocal("eye-white", {
  body: `<defs><clipPath id="cp-eye"><path d="${WHITE}"/></clipPath></defs>
<path d="${WHITE}" fill="#FFFDF7"/>
<g clip-path="url(#cp-eye)"><path d="M-30,-30 H30 V-12 C14,-20 -12,-20 -30,-10Z" fill="#6B4A78" opacity=".32" filter="url(#s4)"/>
<path d="M-30,22 C-12,14 14,14 30,20 V30 H-30Z" fill="#C98B5D" opacity=".25" filter="url(#s4)"/></g>`,
});
eyeLocal("eye-white-half", {
  body: `<path d="M-24,2 C-14,-6 14,-6 25,2 C24,13 14,21 0,21 C-14,21 -23,13 -24,2Z" fill="#FFFDF7"/>`,
});
eyeLocal("iris", {
  body: `<defs><clipPath id="cp-iris"><circle r="16.5"/></clipPath></defs>
<circle r="16.5" fill="#33201A"/>
<g clip-path="url(#cp-iris)"><ellipse cx="0" cy="8" rx="13.5" ry="10" fill="#8A5630" opacity=".95" filter="url(#s2)"/></g>
<circle r="16.5" fill="none" stroke="#1B1014" stroke-width="2.4"/>
<circle r="7.4" fill="#0E090C"/>
<circle cx="-6" cy="-6.5" r="5" fill="#FFFFFF"/>
<circle cx="6" cy="7" r="2.3" fill="#FFFFFF" opacity=".75"/>`,
});
const LASH_OPEN = "M-26,-1 C-24,-20 -10,-28 2,-27 C15,-26 24,-17 28,-7 C31,-9 34,-12 37,-13 C35,-8 33,-2 30,3 C26,-9 16,-20 2,-21 C-9,-22 -20,-15 -22,-2Z";
eyeLocal("lash-open", {
  body: `<path d="M-15,-31 C-6,-35 12,-34 21,-29" fill="none" stroke="${C.skinDeep}" stroke-width="2" stroke-linecap="round" opacity=".4"/>
<path d="${LASH_OPEN}" fill="${C.hair}"/>
<path d="M13,20 C18,18 22,14 24,10" fill="none" stroke="${C.hair}" stroke-width="2" stroke-linecap="round" opacity=".3"/>`,
});
eyeLocal("lash-half", {
  body: `<path d="M-26,3 C-16,-9 14,-10 27,1 L35,-4 L30,8 C20,-1 -12,-2 -22,6Z" fill="${C.hair}"/>`,
});
eyeLocal("lash-closed", {
  body: `<path d="M-25,3 C-14,13 14,13 26,2 L34,3 L28,9 C14,20 -15,19 -26,8Z" fill="${C.hair}"/>
<path d="M12,13 l4,7 M20,9 l6,6" stroke="${C.hair}" stroke-width="2.4" stroke-linecap="round"/>`,
});
eyeLocal("lash-happy", {
  body: `<path d="M-25,8 C-16,-9 14,-10 26,6 L32,2 L29,12 C16,-1 -14,0 -21,12Z" fill="${C.hair}"/>
<path d="M-18,16 C-8,20 10,20 20,15" fill="none" stroke="${C.blush}" stroke-width="5" stroke-linecap="round" opacity=".35" filter="url(#s2)"/>`,
});
part("brow", {
  group: "eye", pivot: [0, 0], place: "translate(42 -906)", scale: 3,
  body: `<path d="M-25,5 C-23,-4 -7,-11 9,-9 C19,-8 26,-3 29,3 C19,-2 7,-3 -3,-1 C-12,1 -18,7 -25,5Z" fill="${C.hair}"/>`,
});

// Mouth shapes: a resting smile, a laugh, and the shapes used for speech.
const mouth = (id, body) => part(id, { group: "mouth", pivot: [0, 0], place: "translate(0 -793)", scale: 3, body });
mouth("m-smile", `<path d="M-25,-3 C-15,-8 -6,-9 0,-6 C6,-9 15,-8 25,-3 C13,3 -13,3 -25,-3Z" fill="${C.lip}"/>
<path d="M-25,-3 C-13,3 13,3 25,-3 C19,9 9,14 0,14 C-9,14 -19,9 -25,-3Z" fill="#C4605A"/>
<path d="M-27,-4 C-13,4 13,4 27,-4" fill="none" stroke="${C.lipDeep}" stroke-width="2.6" stroke-linecap="round"/>
<ellipse cx="0" cy="8.5" rx="8" ry="2.4" fill="#FFFFFF" opacity=".28"/>
<path d="M-31,-7 q-3,3 -1,7 M31,-7 q3,3 1,7" fill="none" stroke="${C.skinDeep}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`);
mouth("m-m", `<path d="M-22,-2 C-13,-7 -5,-8 0,-5 C5,-8 13,-7 22,-2 C12,1 -12,1 -22,-2Z" fill="${C.lip}"/>
<path d="M-22,-2 C-12,1 12,1 22,-2 C17,7 8,10 0,10 C-8,10 -17,7 -22,-2Z" fill="#C4605A"/>
<path d="M-23,-2 C-12,1.5 12,1.5 23,-2" fill="none" stroke="${C.lipDeep}" stroke-width="2.6" stroke-linecap="round"/>`);
mouth("m-grin", `<defs><clipPath id="cp-grin"><path d="M-30,-6 C-16,-1 16,-1 30,-6 C27,14 13,25 0,25 C-13,25 -27,14 -30,-6Z"/></clipPath></defs>
<path d="M-30,-6 C-16,-1 16,-1 30,-6 C27,14 13,25 0,25 C-13,25 -27,14 -30,-6Z" fill="#5A1A26"/>
<g clip-path="url(#cp-grin)"><ellipse cx="0" cy="22" rx="15" ry="9" fill="#E26F6C"/>
<path d="M-30,-8 H30 V2 C16,7 -16,7 -30,2Z" fill="#FFFDF7"/></g>
<path d="M-30,-6 C-27,15 -13,27 0,27 C13,27 27,15 30,-6" fill="none" stroke="#C4605A" stroke-width="6" stroke-linecap="round"/>
<path d="M-32,-6 C-19,-13 -6,-13 0,-10 C6,-13 19,-13 32,-6 C16,-2 -16,-2 -32,-6Z" fill="${C.lip}"/>
<path d="M-36,-10 q-3,4 -1,8 M36,-10 q3,4 1,8" fill="none" stroke="${C.skinDeep}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`);
mouth("m-e", `<defs><clipPath id="cp-e"><path d="M-27,-5 C-14,-1 14,-1 27,-5 C24,8 12,14 0,14 C-12,14 -24,8 -27,-5Z"/></clipPath></defs>
<path d="M-27,-5 C-14,-1 14,-1 27,-5 C24,8 12,14 0,14 C-12,14 -24,8 -27,-5Z" fill="#5A1A26"/>
<g clip-path="url(#cp-e)"><path d="M-30,-8 H30 V2 C14,6 -14,6 -30,2Z" fill="#FFFDF7"/><ellipse cx="0" cy="14" rx="13" ry="5" fill="#E26F6C"/></g>
<path d="M-27,-5 C-24,9 -12,16 0,16 C12,16 24,9 27,-5" fill="none" stroke="#C4605A" stroke-width="5.5" stroke-linecap="round"/>
<path d="M-29,-5 C-17,-11 -6,-11 0,-8 C6,-11 17,-11 29,-5 C14,-2 -14,-2 -29,-5Z" fill="${C.lip}"/>`);
mouth("m-a", `<defs><clipPath id="cp-a"><path d="M-20,-6 C-10,-10 10,-10 20,-6 C22,10 12,22 0,22 C-12,22 -22,10 -20,-6Z"/></clipPath></defs>
<path d="M-20,-6 C-10,-10 10,-10 20,-6 C22,10 12,22 0,22 C-12,22 -22,10 -20,-6Z" fill="#5A1A26"/>
<g clip-path="url(#cp-a)"><ellipse cx="0" cy="19" rx="13" ry="9" fill="#E26F6C"/><path d="M-22,-12 H22 V-3 C10,1 -10,1 -22,-3Z" fill="#FFFDF7"/></g>
<path d="M-21,-5 C-23,11 -12,24 0,24 C12,24 23,11 21,-5" fill="none" stroke="#C4605A" stroke-width="5.5" stroke-linecap="round"/>
<path d="M-23,-5 C-13,-13 -5,-13 0,-10 C5,-13 13,-13 23,-5 C12,-6 -12,-6 -23,-5Z" fill="${C.lip}"/>`);
mouth("m-o", `<ellipse cx="0" cy="4" rx="10" ry="11" fill="#5A1A26"/>
<ellipse cx="0" cy="4" rx="11.5" ry="12.5" fill="none" stroke="#C4605A" stroke-width="6"/>
<path d="M-13,-2 C-8,-11 -3,-11 0,-9 C3,-11 8,-11 13,-2 C6,-5 -6,-5 -13,-2Z" fill="${C.lip}"/>`);

part("hair-front", {
  group: "head", pivot: [0, -770],
  body: `<g filter="url(#f-hair)">
<path d="M0,-978 C-42,-984 -94,-954 -103,-892 C-107,-862 -104,-838 -97,-824 C-96,-864 -84,-904 -50,-929 C-29,-944 -8,-948 0,-950Z" fill="${C.hair}"/>
<path d="M0,-978 C42,-984 94,-954 103,-892 C107,-862 104,-838 97,-824 C96,-864 84,-904 50,-929 C29,-944 8,-948 0,-950Z" fill="${C.hair}"/>
</g>
<g fill="none" stroke-linecap="round">
<path d="M-10,-969 C-46,-964 -80,-938 -93,-892" stroke="${C.hairSheen}" stroke-width="7" opacity=".55" filter="url(#s2)"/>
<path d="M-8,-960 C-38,-956 -66,-938 -82,-906" stroke="#6E66A0" stroke-width="2.4" opacity=".45"/>
<path d="M-30,-975 C-62,-966 -88,-944 -98,-908" stroke="#0E0B16" stroke-width="1.6" opacity=".5"/>
<path d="M12,-969 C42,-965 68,-948 84,-920" stroke="${C.hairSheen}" stroke-width="5" opacity=".38" filter="url(#s2)"/>
<path d="M30,-975 C62,-966 88,-944 98,-908 M10,-958 C36,-954 60,-940 76,-914" stroke="#0E0B16" stroke-width="1.6" opacity=".5"/>
<path d="M-96,-846 C-98,-836 -96,-826 -92,-818 M96,-846 C98,-836 96,-826 92,-818" stroke="${C.hair}" stroke-width="3"/>
</g>
<path d="M0,-978 V-950" stroke="${C.skinDeep}" stroke-width="2.2" opacity=".8"/>`,
});

const flower = (x, y, r, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><g fill="${C.white}"><ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.62}"/><ellipse cx="${r * 0.52}" cy="${-r * 0.17}" rx="${r * 0.42}" ry="${r * 0.62}" transform="rotate(72 ${r * 0.52} ${-r * 0.17})"/><ellipse cx="${r * 0.32}" cy="${r * 0.45}" rx="${r * 0.42}" ry="${r * 0.62}" transform="rotate(144 ${r * 0.32} ${r * 0.45})"/><ellipse cx="${-r * 0.32}" cy="${r * 0.45}" rx="${r * 0.42}" ry="${r * 0.62}" transform="rotate(216 ${-r * 0.32} ${r * 0.45})"/><ellipse cx="${-r * 0.52}" cy="${-r * 0.17}" rx="${r * 0.42}" ry="${r * 0.62}" transform="rotate(288 ${-r * 0.52} ${-r * 0.17})"/></g><circle r="${r * 0.2}" fill="#F3D27A"/></g>`;
part("jasmine", {
  group: "head", pivot: [96, -900],
  body: `<g filter="url(#f-small)">${[[84, -958, 8, 10], [97, -944, 9, 40], [106, -927, 9, 80], [112, -908, 9.5, 20], [114, -888, 9, 60], [113, -868, 8.5, 0], [109, -850, 8, 30], [101, -953, 6, 0], [116, -899, 6, 50]].map((f) => flower(...f)).join("")}</g>
<g fill="${C.leaf}"><ellipse cx="92" cy="-966" rx="5" ry="2.6" transform="rotate(-30 92 -966)"/><ellipse cx="119" cy="-878" rx="5" ry="2.6" transform="rotate(70 119 -878)"/></g>`,
});

/* ------------------------------------------------------------------ body */
// Her feet rest on y = GROUND; everything above was drawn first, so the ground is not at zero.
export const GROUND = -118;

const butti = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${C.marigold}"><circle r="2.2"/><ellipse cx="0" cy="-5" rx="1.8" ry="3"/><ellipse cx="0" cy="5" rx="1.8" ry="3"/><ellipse cx="-5" cy="0" rx="3" ry="1.8"/><ellipse cx="5" cy="0" rx="3" ry="1.8"/></g>`;

const TORSO_BLOUSE = "M-44,-737 C-62,-734 -80,-729 -92,-714 C-98,-702 -92,-682 -82,-668 C-80,-650 -78,-636 -76,-622 L76,-622 C78,-636 80,-650 82,-668 C92,-682 98,-702 92,-714 C80,-729 62,-734 44,-737 C35,-705 16,-693 0,-693 C-16,-693 -35,-705 -44,-737Z";
const PALLU_FRONT = "M32,-741 C54,-744 84,-733 94,-714 C100,-702 94,-682 84,-668 C82,-630 82,-580 86,-530 L-86,-530 C-84,-560 -82,-600 -80,-624 C-48,-652 -2,-700 32,-741Z";
part("torso", {
  group: "body", pivot: [0, -590],
  body: `<defs><clipPath id="cp-pallu"><path d="${PALLU_FRONT}"/></clipPath><clipPath id="cp-neck"><path d="M-27,-800 C-27,-764 -30,-746 -46,-735 C-35,-703 -16,-691 0,-691 C16,-691 35,-703 46,-735 C30,-746 27,-764 27,-800Z"/></clipPath></defs>
<g filter="url(#f-skin)">
<path d="M-27,-800 C-27,-764 -30,-746 -46,-735 C-35,-703 -16,-691 0,-691 C16,-691 35,-703 46,-735 C30,-746 27,-764 27,-800Z" fill="${C.skin}"/>
<path d="M-76,-630 C-74,-612 -74,-580 -80,-540 L80,-540 C74,-580 74,-612 76,-630Z" fill="${C.skin}"/>
</g>
<g clip-path="url(#cp-neck)"><path d="M-40,-792 C-20,-768 20,-768 40,-792 V-760 C20,-746 -20,-746 -40,-760Z" fill="#5A2440" opacity=".36" filter="url(#s6)"/></g>
<g filter="url(#f-cloth)">
<path d="${TORSO_BLOUSE}" fill="${C.magenta}"/>
<path d="M-44,-737 C-35,-705 -16,-693 0,-693 C16,-693 35,-705 44,-737" fill="none" stroke="${C.marigold}" stroke-width="6" stroke-linecap="round"/>
<path d="M-77,-627 H77" stroke="${C.marigold}" stroke-width="7"/>
</g>
<g filter="url(#f-metal)"><path d="M-32,-748 C-24,-712 24,-712 32,-748" fill="none" stroke="${C.gold}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M0,-720 l6,8 l-6,9 l-6,-9Z" fill="${C.gold}"/></g>
<g filter="url(#f-cloth)">
<path d="${PALLU_FRONT}" fill="${C.teal}"/>
<g clip-path="url(#cp-pallu)">
<path d="M32,-741 C-2,-700 -48,-652 -80,-624 L-80,-600 C-44,-632 8,-686 50,-741Z" fill="${C.marigold}"/>
<path d="M56,-741 C14,-686 -38,-632 -82,-594" fill="none" stroke="${C.maroon}" stroke-width="4"/>
</g></g>
<g clip-path="url(#cp-pallu)" fill="none" stroke-linecap="round">
<path d="M78,-736 C38,-680 -8,-626 -56,-586" stroke="#063E44" stroke-width="12" opacity=".4" filter="url(#s4)"/>
<path d="M92,-712 C62,-664 24,-620 -14,-584" stroke="#063E44" stroke-width="12" opacity=".34" filter="url(#s4)"/>
<path d="M90,-680 C76,-650 54,-616 28,-584" stroke="#063E44" stroke-width="10" opacity=".28" filter="url(#s4)"/>
<path d="M66,-738 C26,-682 -22,-630 -68,-592 M86,-726 C52,-672 12,-626 -30,-588" stroke="${C.tealLight}" stroke-width="4" opacity=".5" filter="url(#s2)"/>
${[[54, -690], [74, -650], [28, -640], [52, -606], [-8, -612], [20, -566], [-40, -572], [62, -560]].map(([x, y]) => butti(x, y, 0.9)).join("")}
</g>`,
});

const SKIRT = "M-78,-598 C-40,-590 40,-590 78,-598 C94,-566 106,-534 110,-500 C118,-400 130,-270 140,-172 C108,-154 56,-146 0,-148 C-56,-146 -108,-154 -140,-172 C-130,-270 -118,-400 -110,-500 C-106,-534 -94,-566 -78,-598Z";
const pleat = (x0, x1) => `M${x0},-592 C${x0 + (x1 - x0) * 0.18},-470 ${x0 + (x1 - x0) * 0.62},-320 ${x1},-196`;
part("skirt", {
  group: "body", pivot: [0, -596],
  body: `<defs><clipPath id="cp-skirt"><path d="${SKIRT}"/></clipPath></defs>
<g filter="url(#f-cloth)"><path d="${SKIRT}" fill="${C.teal}"/></g>
<g clip-path="url(#cp-skirt)">
${[[-110, -440], [-118, -350], [-124, -260], [-96, -240], [-90, -500], [92, -470], [76, -400], [108, -360], [90, -290], [118, -240], [70, -230], [-98, -330], [-72, -410]].map(([x, y], i) => butti(x, y, i % 2 ? 1 : 1.2)).join("")}
<g fill="none" stroke-linecap="round">
${[[-10, -84], [-4, -50], [2, -16], [8, 18], [14, 52]].map(([a, b]) => `<path d="${pleat(a, b)}" stroke="#063E44" stroke-width="15" opacity=".45" filter="url(#s6)"/>`).join("")}
${[[-15, -98], [-7, -66], [-1, -32], [5, 2], [11, 36]].map(([a, b]) => `<path d="${pleat(a, b)}" stroke="${C.tealLight}" stroke-width="5" opacity=".5" filter="url(#s2)"/>`).join("")}
${[[-12, -91], [-5, -58], [1, -24], [7, 10], [13, 44]].map(([a, b]) => `<path d="${pleat(a, b)}" stroke="#063E44" stroke-width="1.6" opacity=".55"/>`).join("")}
<path d="M90,-560 C102,-450 104,-330 96,-200" stroke="#063E44" stroke-width="22" opacity=".2" filter="url(#s10)"/>
<path d="M-92,-540 C-104,-440 -112,-320 -120,-210" stroke="${C.tealLight}" stroke-width="18" opacity=".25" filter="url(#s10)"/>
</g>
<path d="M-140,-172 C-108,-154 -56,-146 0,-148 C56,-146 108,-154 140,-172 L136,-214 C106,-196 56,-188 0,-190 C-56,-188 -106,-196 -136,-214Z" fill="${C.marigold}"/>
<path d="M-135,-222 C-106,-204 -56,-196 0,-198 C56,-196 106,-204 135,-222" fill="none" stroke="${C.maroon}" stroke-width="5"/>
<path d="M-137,-190 C-108,-172 -56,-164 0,-166 C56,-164 108,-172 137,-190" fill="none" stroke="${C.maroon}" stroke-width="2.6" stroke-dasharray="2 9" stroke-linecap="round"/>
<g fill="none" stroke="#B9741A" stroke-linecap="round" opacity=".35">${[[-86, 0], [-52, 0], [-18, 0], [16, 0], [50, 0]].map(([x]) => `<path d="M${x},-188 l${x * 0.02},38" stroke-width="5" filter="url(#s2)"/>`).join("")}</g>
<path d="M-140,-172 C-108,-154 -56,-146 0,-148 C56,-146 108,-154 140,-172 V-140 H-140Z" fill="#7A3A10" opacity=".35" filter="url(#s4)"/>
<path d="M-82,-602 H82 V-566 C40,-580 -40,-580 -82,-566Z" fill="#063E44" opacity=".3" filter="url(#s6)"/>
<path d="M-140,-200 C-134,-300 -122,-420 -112,-500" fill="none" stroke="#FFF2C0" stroke-width="6" opacity=".18" filter="url(#s4)"/>
</g>`,
});

part("foot", {
  group: "body", pivot: [46, -160],
  body: `<g filter="url(#f-skin)">
<path d="M24,-178 C22,-150 20,-134 26,-124 C32,-116 60,-116 66,-124 C72,-134 70,-150 68,-178Z" fill="${C.skin}"/>
</g>
<path d="M31,-124 q0,-8 4,-9 M40,-121 q0,-9 4,-10 M49,-121 q0,-9 4,-10 M58,-124 q0,-8 3,-9" fill="none" stroke="${C.skinDeep}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
<g filter="url(#f-metal)"><path d="M23,-166 C36,-158 56,-158 69,-166" fill="none" stroke="#E4EAEE" stroke-width="5" stroke-linecap="round"/>
<circle cx="34" cy="-157" r="2.8" fill="#E4EAEE"/><circle cx="46" cy="-155" r="2.8" fill="#E4EAEE"/><circle cx="58" cy="-157" r="2.8" fill="#E4EAEE"/></g>`,
});

part("pallu-shoulder", {
  group: "body", pivot: [88, -716],
  body: `<g filter="url(#f-cloth)"><path d="M36,-744 C64,-750 96,-738 104,-710 C108,-694 102,-674 90,-660 C84,-674 76,-690 64,-702 C52,-714 42,-728 36,-744Z" fill="${C.teal}"/></g>
<path d="M56,-740 C76,-730 92,-708 94,-678 M74,-744 C90,-734 100,-716 102,-696" fill="none" stroke="#063E44" stroke-width="5" stroke-linecap="round" opacity=".32" filter="url(#s2)"/>`,
});

// Strips: drawn hanging straight down from (0,0); the rig bends them along a spine.
part("arm", {
  group: "strip", pivot: [0, 0], strip: true,
  body: `<g filter="url(#f-skin)"><path d="M-18,60 C-19,110 -18,132 -17,150 C-16,200 -15,232 -14,262 L14,262 C15,232 16,200 17,150 C18,132 19,110 18,60Z" fill="${C.skin}"/></g>
<g filter="url(#f-cloth)"><path d="M-23,4 C-24,-16 -12,-24 0,-24 C12,-24 24,-16 23,4 L21,74 C8,78 -8,78 -21,74Z" fill="${C.magenta}"/>
<path d="M-21,64 C-8,68 8,68 21,64 L21,76 C8,80 -8,80 -21,76Z" fill="${C.marigold}"/></g>
<g filter="url(#f-metal)"><rect x="-16.5" y="224" width="33" height="6.5" rx="3" fill="${C.gold}"/><rect x="-16" y="233" width="32" height="6.5" rx="3" fill="#2F9E66"/><rect x="-15.5" y="242" width="31" height="6.5" rx="3" fill="${C.gold}"/></g>`,
});

part("braid", {
  group: "strip", pivot: [0, 0], strip: true, place: "translate(70 -772) rotate(-5)",
  body: `<g filter="url(#f-hair)">
${Array.from({ length: 11 }, (_, i) => { const y = i * 20, r = 15 - i * 0.35; return `<ellipse cx="-7" cy="${y + 12}" rx="${r * 0.82}" ry="${r}" transform="rotate(30 -7 ${y + 12})" fill="${C.hair}"/><ellipse cx="7" cy="${y + 22}" rx="${r * 0.82}" ry="${r}" transform="rotate(-30 7 ${y + 22})" fill="${C.hair}"/>`; }).join("")}
<path d="M-11,244 C-13,270 -6,290 0,298 C6,290 13,270 11,244Z" fill="${C.hair}"/>
</g>
${Array.from({ length: 11 }, (_, i) => { const y = i * 20; return `<path d="M-13,${y + 8} C-11,${y + 15} -7,${y + 20} -2,${y + 22}" fill="none" stroke="${C.hairSheen}" stroke-width="3.2" stroke-linecap="round" opacity=".7"/><path d="M12,${y + 17} C11,${y + 24} 8,${y + 28} 4,${y + 31}" fill="none" stroke="${C.hairSheen}" stroke-width="2.4" stroke-linecap="round" opacity=".4"/>`; }).join("")}
<g filter="url(#f-small)"><rect x="-13" y="236" width="26" height="12" rx="5" fill="${C.maroon}"/></g>`,
});

part("pallu-back", {
  group: "strip", pivot: [0, 0], strip: true, place: "translate(90 -712) rotate(-4)",
  body: `<defs><clipPath id="cp-pb"><path d="M-26,0 C-34,90 -50,190 -58,280 L58,280 C52,190 38,90 30,0Z"/></clipPath></defs>
<g filter="url(#f-cloth)"><path d="M-26,0 C-34,90 -50,190 -58,280 L58,280 C52,190 38,90 30,0Z" fill="${C.tealDeep}"/>
<g clip-path="url(#cp-pb)"><rect x="-70" y="218" width="140" height="70" fill="${C.marigold}"/><rect x="-70" y="208" width="140" height="6" fill="${C.maroon}"/><rect x="-70" y="240" width="140" height="5" fill="${C.maroon}"/><rect x="-70" y="258" width="140" height="5" fill="${C.maroon}"/></g></g>
<g clip-path="url(#cp-pb)" fill="none" stroke-linecap="round"><path d="M-12,0 C-16,100 -24,200 -28,280 M10,0 C12,100 16,200 18,280" stroke="#042E33" stroke-width="12" opacity=".4" filter="url(#s4)"/>
<path d="M-2,0 C-4,100 -6,200 -6,280 M20,0 C26,100 34,200 40,280" stroke="${C.tealLight}" stroke-width="5" opacity=".35" filter="url(#s2)"/></g>
<g stroke="${C.marigold}" stroke-width="3" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M${-53 + i * 9.6},280 v${10 + (i % 3) * 3}"/>`).join("")}</g>`,
});

/* ----------------------------------------------------------------- hands */
// Drawn for her right hand (viewer's left) hanging from the wrist at (0,0), fingers toward +y.
const hand = (id, body) => part(id, { group: "hand", pivot: [0, 0], scale: 2.5, body });
const finger = (x, y, len, rot, w = 12) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-w / 2}" y="0" width="${w}" height="${len}" rx="${w / 2}" fill="${C.skin}"/></g>`;
hand("hand-relaxed", `<g filter="url(#f-skin)">
<path d="M-15,-8 C-20,10 -22,30 -19,48 C-17,63 -8,73 2,71 C12,69 18,57 18,41 C18,24 16,6 14,-8Z" fill="${C.skin}"/>
<path d="M9,4 C22,10 29,27 25,42 C22,50 13,48 13,39 C14,28 12,18 7,10Z" fill="${C.skin}"/></g>
<path d="M-10,52 C-10,60 -8,66 -5,69 M-1,54 C-1,62 1,67 4,70 M8,52 C9,59 11,63 13,65" fill="none" stroke="${C.skinDeep}" stroke-width="1.9" stroke-linecap="round" opacity=".55"/>
<path d="M12,12 C20,19 22,31 20,40" fill="none" stroke="${C.skinDeep}" stroke-width="1.8" stroke-linecap="round" opacity=".4"/>`);
hand("hand-open", `<g filter="url(#f-skin)">
<path d="M-20,-8 C-23,8 -24,24 -21,36 L21,38 C23,26 21,8 18,-8Z" fill="${C.skin}"/>
${finger(-16, 30, 36, 10)}${finger(-5.5, 33, 44, 3)}${finger(6, 33, 41, -3)}${finger(17, 30, 31, -11, 11)}
<g transform="translate(-19 8) rotate(54)"><rect x="-7" y="0" width="14" height="32" rx="7" fill="${C.skin}"/></g>
</g>
<path d="M-12,10 C-4,19 6,21 15,14 M-11,23 C-2,28 8,28 15,24" fill="none" stroke="${C.skinDeep}" stroke-width="1.8" stroke-linecap="round" opacity=".4"/>
<ellipse cx="0" cy="16" rx="13" ry="12" fill="${C.skinLight}" opacity=".4" filter="url(#s4)"/>`);
hand("hand-grip", `<g filter="url(#f-skin)">
<path d="M-17,-8 C-21,8 -23,24 -19,38 C-15,50 13,52 19,40 C23,28 21,10 17,-8Z" fill="${C.skin}"/>
<path d="M12,6 C24,10 26,26 19,34 C13,38 6,34 8,27 C10,20 10,14 8,10Z" fill="${C.skin}"/></g>
<path d="M-12,30 C-10,38 -8,43 -6,46 M-3,32 C-2,40 0,45 2,48 M6,32 C7,39 9,43 11,46" fill="none" stroke="${C.skinDeep}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`);
hand("hand-point", `<g filter="url(#f-skin)">
<path d="M-17,-8 C-21,8 -23,24 -19,36 C-15,46 13,48 19,38 C23,26 21,10 17,-8Z" fill="${C.skin}"/>
${finger(-12, 28, 46, 4, 12.5)}
<path d="M12,6 C24,10 26,26 19,34 C13,38 6,34 8,27 C10,20 10,14 8,10Z" fill="${C.skin}"/></g>
<path d="M-2,32 C-1,39 1,43 3,45 M7,31 C8,38 10,42 12,44" fill="none" stroke="${C.skinDeep}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`);


/* ----------------------------------------------------------------- props */

// The yellow cloth shopping bag. Held at (0,0) by its handles; it swings from there.
part("bag", {
  group: "prop", pivot: [0, 0],
  body: `<defs><clipPath id="cp-bag"><path d="M-74,66 L74,66 C82,140 86,214 78,268 C40,280 -40,280 -78,268 C-86,214 -82,140 -74,66Z"/></clipPath></defs>
<g filter="url(#f-cloth)"><path d="M-36,74 C-38,22 -14,2 2,2 C18,2 40,22 38,74" fill="none" stroke="${C.bagDeep}" stroke-width="13" stroke-linecap="round"/></g>
<g filter="url(#f-cloth)">
<path d="M-74,66 L74,66 C82,140 86,214 78,268 C40,280 -40,280 -78,268 C-86,214 -82,140 -74,66Z" fill="${C.bag}"/>
<path d="M-42,78 C-44,26 -18,6 -2,6 C14,6 36,26 34,78" fill="none" stroke="${C.bag}" stroke-width="13" stroke-linecap="round"/>
</g>
<g clip-path="url(#cp-bag)">
<rect x="-90" y="66" width="180" height="16" fill="${C.bagDeep}" opacity=".6"/>
<g fill="none" stroke="${C.bagRed}" stroke-linecap="round" stroke-linejoin="round">
<circle cx="0" cy="170" r="46" stroke-width="5"/>
<circle cx="0" cy="170" r="37" stroke-width="2" stroke-dasharray="1 6"/>
<path d="M-70,104 H70 M-74,240 H74" stroke-width="4"/>
</g>
<g fill="${C.bagRed}"><path d="M0,144 C16,150 22,170 12,186 C6,196 -8,198 -14,188 C-20,178 -10,168 0,172 C8,176 4,186 -2,184 C8,190 14,178 8,168 C2,158 -8,152 0,144Z"/>
<circle cx="-58" cy="122" r="4"/><circle cx="58" cy="122" r="4"/><circle cx="-60" cy="222" r="4"/><circle cx="60" cy="222" r="4"/></g>
<path d="M-50,90 C-56,150 -54,220 -44,270 M44,90 C54,150 56,220 50,270" fill="none" stroke="#B9801A" stroke-width="12" opacity=".28" filter="url(#s6)" stroke-linecap="round"/>
<path d="M-20,82 C-24,150 -22,220 -16,272" fill="none" stroke="#FFF2B0" stroke-width="10" opacity=".3" filter="url(#s6)" stroke-linecap="round"/>
</g>`,
});

// The shopping list: a numeral and an apple, nothing else. Three layers, so the rig can
// make the apple bounce and the numeral pulse on their own.
const APPLE = "M0,-22 C-10,-34 -36,-28 -36,0 C-36,22 -18,36 -6,36 C-2,36 -2,33 0,33 C2,33 2,36 6,36 C18,36 36,22 36,0 C36,-28 10,-34 0,-22Z";
part("list-paper", {
  group: "prop", pivot: [0, 0], scale: 3,
  body: `<g filter="url(#f-paper)"><rect x="-92" y="-66" width="184" height="152" rx="9" fill="#FFFCF2"/></g>
<path d="M-92,-57 a9,9 0 0 1 9,-9 H83 a9,9 0 0 1 9,9 V-44 H-92Z" fill="#E77A93"/>
<g fill="#FFFCF2">${[-66, -44, -22, 0, 22, 44, 66].map((x) => `<circle cx="${x}" cy="-55" r="4.2"/>`).join("")}</g>`,
});
part("list-five", {
  group: "prop", pivot: [-40, 12], scale: 3,
  body: `<path d="M-22,-24 H-52 L-58,8 C-46,-2 -18,0 -18,24 C-18,46 -44,52 -62,38" fill="none" stroke="${C.ink}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`,
});
part("list-apple", {
  group: "prop", pivot: [42, 48], scale: 3,
  body: `<g transform="translate(42 14) scale(.98)">
<g filter="url(#f-small)"><path d="${APPLE}" fill="${C.apple}"/></g>
<path d="M32,4 C28,22 16,32 6,35 C20,28 28,16 32,4Z" fill="${C.appleDeep}" opacity=".7"/>
<path d="M-24,-6 C-24,-16 -16,-22 -10,-22" fill="none" stroke="#F6A898" stroke-width="5" stroke-linecap="round"/>
<path d="M0,-22 C0,-30 3,-36 8,-40" fill="none" stroke="#7A4B2E" stroke-width="5" stroke-linecap="round"/>
<path d="M6,-32 C14,-44 28,-42 30,-34 C22,-28 12,-28 6,-32Z" fill="${C.leafDeep}"/>
</g>`,
});

// Soft pools of shadow and light the rig places under and around things.
part("shadow", { group: "fx", pivot: [0, 0], scale: 0.5, body: `<ellipse rx="200" ry="34" fill="#2B0A12" filter="url(#s28)"/>` });
part("mote", { group: "fx", pivot: [0, 0], scale: 2, body: `<circle r="7" fill="#FFF6D0" filter="url(#s2)"/>` });
part("spark", { group: "fx", pivot: [0, 0], scale: 2, body: `<path d="M0,-16 L4,-4 L16,0 L4,4 L0,16 L-4,4 L-16,0 L-4,-4Z" fill="#FFF3C4"/>` });

export const mom = { parts, FACE };

// Rest-pose assembly, used only by the drawing aid (tools/sheet.mjs).
mom.assemble = ({ draw, mirror, P }) => {
  const eye = (side) => {
    const sx = side === "L" ? -1 : 1;
    return `<g transform="translate(${41 * sx} -866) scale(${sx} 1)">${P["eye-white"].body}</g>
<g transform="translate(${41 * sx + (mom.gaze?.[0] || 0)} ${-864 + (mom.gaze?.[1] || 0)})"><g clip-path="url(#cp-eye)">${P["iris"].body}</g></g>
<g transform="translate(${41 * sx} -866) scale(${sx} 1)">${P["lash-open"].body}</g>
<g transform="translate(${42 * sx} -906) scale(${sx} 1)">${P["brow"].body}</g>`;
  };
  const head = [draw("hair-back"), mirror("ear"), draw("ear"), mirror("jhumka"), draw("jhumka"), draw("face"), draw("facemid"), eye("L"), eye("R"), draw(mom.mouth || "m-smile"), draw("hair-front"), draw("jasmine")].join("\n");
  const armAt = (x, rot, flip) => `<g transform="translate(${x} -712) rotate(${rot}) ${flip ? "scale(-1 1)" : ""}">${P["arm"].body}<g transform="translate(0 262) scale(1.18)">${P["hand-relaxed"].body}</g></g>`;
  return [
    draw("pallu-back"), draw("foot"), mirror("foot"), draw("torso"), draw("skirt"),
    armAt(-88, 5, false), armAt(88, -5, true),
    draw("pallu-shoulder"), draw("braid"),
    `<g transform="translate(0 -770) scale(1.1) translate(0 770)">${head}</g>`,
  ].join("\n");
};
