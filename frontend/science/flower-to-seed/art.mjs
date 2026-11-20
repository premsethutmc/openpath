const defs = `<defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#193c39"/><stop offset=".72" stop-color="#7caa78"/><stop offset="1" stop-color="#ecc57e"/></linearGradient>
<linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#a3bc63"/><stop offset="1" stop-color="#234c39"/></linearGradient>
<linearGradient id="rose" x2="1" y2="1"><stop stop-color="#fff3b7"/><stop offset=".58" stop-color="#efc45c"/><stop offset="1" stop-color="#c18037"/></linearGradient>
<linearGradient id="lilac" x2="1" y2="1"><stop stop-color="#fff2c0"/><stop offset=".59" stop-color="#efcf70"/><stop offset="1" stop-color="#c58a3e"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#ffe7a0" stop-opacity=".84"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient>
<linearGradient id="lagoon" x2="0" y2="1"><stop stop-color="#9cc4ad"/><stop offset="1" stop-color="#376a6c"/></linearGradient>
<linearGradient id="pod" x2="1" y2="1"><stop stop-color="#a9bc60"/><stop offset="1" stop-color="#44704a"/></linearGradient>
</defs>`;
export function wrap(content, label) {
  return `<svg class="art" viewBox="0 0 640 460" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg>`;
}
const leaves = (x,y,scale=1) => `<g transform="translate(${x} ${y}) scale(${scale})">
<path d="M0 0C-9-31 -42-47 -83-40C-70-10 -32 5 0 0M0 0C17-32 54-48 88-41C84-14 48 5 0 0" fill="url(#leaf)" stroke="#20483a" stroke-width="2"/>
<path d="M-68-35Q-28-22 0 0Q36-24 73-37" fill="none" stroke="#b1c47a" stroke-width="1.6"/></g>`;
const dots = Array.from({length:57},(_,i)=> {
 const x=(i*163)%637, y=(i*i*17)%420+23, r=i%3+1;
 return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i%2?'#fff5bf':'#83a56e'}" opacity="${.17+(i%5)*.07}"/>`;
}).join('');
const sprigs=Array.from({length:33},(_,i)=>{
 const x=i*20, y=415+(i*7)%43, h=18+(i*19)%100, color=i%3?'#366849':'#6f9354';
 return `<path d="M${x} ${y}q-6-${h*.46} ${(i%2?1:-1)*23}-${h}" stroke="${color}" opacity=".84" stroke-width="${i%3+2}" fill="none"/>`;
}).join('');
const landscape=`<rect width="640" height="460" fill="url(#sky)"/><circle cx="495" cy="123" r="157" fill="url(#glow)"/><circle cx="495" cy="124" r="33" fill="#f9df9b" opacity=".88"/>
<path d="M0 245Q99 153 225 234T450 229T640 206V460H0" fill="#668a63"/>
<path d="M0 288Q145 218 260 274T490 265T640 249V460H0" fill="#527955"/>
<path d="M0 317Q142 288 294 321T640 299V460H0" fill="#426b51"/>
<path d="M0 408Q132 330 303 397T640 361V460H0" fill="#305541"/>${dots}${sprigs}`;
const petals = (x,y,color) => `<g transform="translate(${x} ${y})">
${[0,90,180,270].map(a=>`<g transform="rotate(${a})"><path d="M0 5C-47-19 -37-82 0-77C39-83 51-25 0 5" fill="url(#${color})" stroke="#fce7e3" stroke-opacity=".65" stroke-width="1.4"/><path d="M0-10Q-14-42 0-67M0-13Q17-40 12-64" stroke="#6f355d" stroke-opacity=".28" stroke-width="1.2" fill="none"/></g>`).join('')}
<circle r="23" fill="#b66563"/><circle r="19" fill="#e5b75d"/><g fill="#f7d777">${Array.from({length:6},(_,i)=>`<circle cx="${14*Math.cos(i*Math.PI/3)}" cy="${14*Math.sin(i*Math.PI/3)}" r="3.6"/>`).join('')}</g><circle r="5" fill="#a9bd72"/><circle cy="-3" r="2" fill="#dbe6a4"/></g>`;
const bee=(x,y,loaded)=>`<g class="bee" style="transform:translate(${x}px,${y}px)">
<path d="M-6-8C-31-48 -51-10 -12-2M7-8C5-52 50-33 22-4" fill="#e8f3df" fill-opacity=".82" stroke="#e9f2dc" stroke-width="2"/>
<ellipse rx="28" ry="17" fill="#e8b557" stroke="#2e322c" stroke-width="2"/><path d="M-16-13Q-11 0-16 13M-2-16Q4 0-2 16M13-13Q17 0 12 13" stroke="#34352a" stroke-width="6" fill="none"/>
<circle cx="24" cy="-3" r="9" fill="#3a372c"/><circle cx="27" cy="-5" r="2" fill="#f6e3bb"/><path d="M24-12q1-11 7-11M29-10q5-10 11-8" stroke="#373826" stroke-width="2" fill="none"/>
${loaded?'<g fill="#ffe483"><circle class="pollen-dot" cx="-24" cy="19" r="4"/><circle class="pollen-dot" cx="-9" cy="23" r="5"/><circle class="pollen-dot" cx="5" cy="22" r="3"/></g>':''}</g>`;
export function garden(x,y,loaded,landed=null) {
 return wrap(`${landscape}<path d="M160 458Q221 343 166 178M478 458Q435 333 470 202" stroke="#285640" stroke-width="11" fill="none"/>${leaves(180,335,.91)}${leaves(465,364,1.06)}${leaves(179,264,.58)}${leaves(457,290,.65)}${petals(166,174,'rose')}${petals(470,205,'lilac')}${landed===null?'':`<g fill="#ffed92" transform="translate(${landed===0?166:470} ${landed===0?174:205})"><circle class="pollen-dot" cy="-9" r="4"/><circle class="pollen-dot" cx="8" cy="3" r="3"/><circle class="pollen-dot" cx="-5" cy="5" r="2.5"/></g>`}${bee(x,y,loaded)}
 <text class="scene-label" x="104" y="118">MUSTARD A</text><text class="scene-label" x="496" y="149">MUSTARD B</text>`, 'Two illustrated mustard flowers in a garden, with a bee that can carry pollen between them.');
}
export function microscope(stage,opened=false) {
 const ovules=Array.from({length:4},(_,i)=>`<ellipse cx="${293+i*20}" cy="${287+5*Math.sin(i)}" rx="${stage>=2?8:5}" ry="${stage>=2?10:7}" fill="${stage>=2?'#e1d885':'#adcb8a'}"/>`).join('');
 return wrap(`<rect width="640" height="460" fill="#193933"/>
 <circle cx="323" cy="227" r="179" fill="#2c5145" stroke="#66836b" stroke-width="2"/>
 <circle cx="323" cy="227" r="159" fill="#27483d" stroke="#66836b" stroke-dasharray="2 8"/>
 ${stage>=2?`<path d="M205 301Q224 243 271 253Q357 229 414 267Q442 277 457 259Q440 322 368 333Q264 350 205 301Z" fill="url(#pod)" stroke="#dce69d" stroke-width="3"/>
  <path d="M212 301Q302 318 407 279" stroke="#c1d784" stroke-width="2" fill="none"/>${ovules}
  ${opened?'<path d="M205 300Q319 226 453 250Q373 212 282 231Q230 246 205 300Z" fill="#abc76b" stroke="#dce69d" stroke-width="3"/><g class="pod-burst" fill="#e9d37c" stroke="#f0e1a3"><ellipse cx="452" cy="326" rx="11" ry="8"/><ellipse cx="483" cy="344" rx="10" ry="8"/><ellipse cx="428" cy="351" rx="10" ry="8"/></g>':''}
  <path d="M372 267L443 186h68" stroke="#f3e2a6" fill="none"/><text class="diagram-name" x="444" y="177">Seeds</text>
  <path d="M243 307l-58 50h-75" stroke="#f3e2a6" fill="none"/><text class="diagram-name" x="105" y="380">Seed pod</text>`
  :`<g fill="url(#rose)" opacity=".82"><path d="M317 256Q199 230 201 143Q199 100 247 122Q282 146 317 256"/><path d="M326 254Q438 207 429 137Q420 98 389 118Q352 148 326 254"/></g>
  <path d="M275 287Q276 261 307 253L314 159Q302 125 326 125Q351 124 336 159L343 253Q372 257 374 285Q371 315 325 317Q280 313 275 287Z" fill="#80a969" stroke="#d7e397" stroke-width="3"/>
  <path d="M280 256Q251 195 267 157M366 255Q397 208 381 160" stroke="#f1c68a" stroke-width="6" fill="none"/><ellipse cx="266" cy="155" rx="13" ry="7" fill="#eabc63"/><ellipse cx="381" cy="155" rx="13" ry="7" fill="#eabc63"/>
  ${ovules}${stage>=0?'<g fill="#fee181"><circle cx="324" cy="119" r="4"/><circle cx="334" cy="118" r="3"/><circle cx="318" cy="114" r="2.4"/></g>':''}
  ${stage===1?'<path d="M324 121Q324 144 326 175L329 258Q328 278 316 285" stroke="#ffe080" stroke-width="4" class="pollen-tube" pathLength="1" fill="none"/><circle class="root-reveal" cx="316" cy="285" r="6" fill="#ffe080"/>':''}
  <g stroke="#f3e2a6" fill="none"><path d="M334 129l74-22h54"/><path d="M269 155l-61-25h-66"/><path d="M347 305l77 39h62"/><path d="M303 288l-99 23h-67"/></g>
  <text class="diagram-name" x="420" y="99">Stigma</text><text class="diagram-name" x="143" y="121">Anther</text><text class="diagram-name" x="430" y="366">Ovary</text><text class="diagram-name" x="135" y="333">Ovule</text>`}`, stage>=2?'Cutaway of a mustard seed pod with developed seeds.':'Flower cutaway showing the anther, stigma, ovary and ovules.');
}
const specimens={
 dandelion:'<path d="M0 20L0-17M0-17L-22-34M0-17L-14-42M0-17L0-45M0-17L14-40M0-17L23-33" fill="none" stroke="#fff6ce" stroke-width="3" stroke-linecap="round"/><ellipse cy="21" rx="5" ry="11" fill="#dab976"/>',
 coconut:'<path d="M-34 5Q-38-23 -6-32Q19-36 34-10Q40 13 19 26Q-17 39-34 5Z" fill="#a27647" stroke="#f0c383" stroke-width="3"/><path d="M-30 7Q-5 1 20-26M-22 22Q6 13 32-9" fill="none" stroke="#d5a468" stroke-width="2"/>',
 burdock:`<circle r="24" fill="#8b9d58" stroke="#dfd78d" stroke-width="2"/>${Array.from({length:11},(_,i)=>`<path d="M0-14l0-22q6-3 8 2" transform="rotate(${i*33})" stroke="#ebd78a" stroke-width="2" fill="none"/>`).join('')}`
};
export function travel(seed, tool, success) {
 const backdrop = tool==='water' ? `<path d="M0 318Q155 281 332 315T640 310V460H0" fill="url(#lagoon)"/>
  <path d="M80 360q45-16 86 0m75 23q48-17 94 0m97-33q58-18 114 0" fill="none" stroke="#c7d9ba" stroke-opacity=".6" stroke-width="3"/>`
  :tool==='wind' ? '<path d="M219 248q75-48 203-35m-65 30q87-31 191-6m-283 43q88-36 153-34" fill="none" stroke="#fff9cf" stroke-width="3" opacity=".59"/>'
  :tool==='animal' ? '<path d="M311 311Q382 234 452 254Q489 260 508 306L550 328L522 349H491L489 406H470L456 351L393 353L382 406H365L360 351Q334 355 313 346Q281 341 270 310L283 304Q301 321 311 311Z" fill="#8d604a" stroke="#f0c897" stroke-width="3"/><circle cx="511" cy="320" r="4" fill="#192e25"/>':'';
 const motion=success ? {wind:'fly',water:'float',animal:'ride'}[tool] :tool?'wait':'';
 return wrap(`${landscape}${backdrop}<circle cx="173" cy="267" r="63" fill="#17362e" opacity=".84" stroke="#e7ce91" stroke-width="1.5"/><g transform="translate(173 267)"><g class="travelling ${motion}">${specimens[seed]}</g></g>`, 'The chosen seed or fruit in a landscape with the selected carrier.');
}
export function bedArt(bed) {
 const seed = bed.crop==='mustard';
 let cutaway='';
 if(bed.planted) cutaway = `<g transform="translate(320 346)">${seed?
   '<ellipse rx="11" ry="8" fill="#d3a04c" stroke="#f4c568" stroke-width="2"/>':
   '<path d="M-36 0Q-29-22 7-14Q40-3 30 12Q6 27-33 14Z" fill="#c39666" stroke="#e2b785" stroke-width="2"/><circle cx="13" cy="-12" r="4" fill="#6a613f"/>'}
   ${bed.day>=1?(seed?'<path class="root-reveal" d="M2 6q-6 20 14 27q17 9 12 22m-11-20-8 7m18-1 10 6" fill="none" stroke="#f4dfad" stroke-width="3" stroke-linecap="round"/>':'<path class="root-reveal" d="M13-12q0-21 15-29m-7 20q21-8 17-16" fill="none" stroke="#c2db80" stroke-width="4" stroke-linecap="round"/>'):''}
   ${bed.day>=2?`<path class="root-reveal" d="M${seed?0:15} -4q9-34 5-69q-7-43 4-72" fill="none" stroke="#91bb67" stroke-width="6"/>${leaves(12,-114,.51)}${leaves(18,-64,.29)}
   ${seed?'':'<path d="M16-7q10 31 22 35m-22-35q-1 33-16 51" stroke="#f4dfad" stroke-width="3" fill="none"/>'}`:''}</g>`;
 return wrap(`${landscape}<path d="M0 305q164-43 320-19q173 20 320-19V460H0" fill="#724f39"/>
  <path d="M0 305q164-43 320-19q173 20 320-19" fill="none" stroke="#ab8453" stroke-width="8"/>
  <path d="M0 390q166-27 285-14q188 19 355 0v84H0" fill="#594233" opacity=".78"/>
  ${Array.from({length:37},(_,i)=>`<circle cx="${i*83%640}" cy="${324+(i*23)%130}" r="${i%4+1}" fill="#ba9868" opacity=".42"/>`).join('')}
  ${bed.moist?'<g class="rain" stroke="#c6ecdf" stroke-width="3" stroke-linecap="round"><path d="M236 189l-8 16m35 19-10 20m55-65-9 21m45 5-7 15m42-30-7 17m28 26-12 24m-58-13-7 15"/></g>':''}
  ${cutaway}`, bed.day>1?'A plant grows above ground in the soil window.':bed.day===1?'Early growth is visible in the soil cutaway.':'A garden bed with an underground viewing window.');
}
