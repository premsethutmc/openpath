/* count-with-me@1: the game logic for /count/ (kept out of the page for the site's script-src 'self' policy). */
{
const $=id=>document.getElementById(id);
const PAGES=[
 {bg:'tiles',area:[0,100],name:['Tiles','ஓடுகள்'],kinds:['t-o','t-b','t-g'],max:3,key:0},
 {bg:'meadow',area:[26,100],name:['Meadow','புல்வெளி'],kinds:['sheep','cow'],max:4,key:2},
 {bg:'pond',area:[12,94],name:['Pond','குளம்'],kinds:['duck','frog'],max:5,key:4},
 {bg:'garden',area:[2,100],name:['Garden','தோட்டம்'],kinds:['flower','butterfly'],max:5,key:5},
 {bg:'tree',area:[0,74],air:1,name:['Mango tree','மாமரம்'],kinds:['mango','parrot'],max:6,key:7},
 {bg:'sea',area:[4,86],air:1,name:['Sea','கடல்'],kinds:['fish','crab'],max:7,key:-3},
 {bg:'sky',area:[2,80],air:1,name:['Night sky','இரவு வானம்'],kinds:['star','planet'],max:8,key:-5},
 {bg:'coop',area:[22,100],name:['Hen house','கோழிக்கூடு'],kinds:['egg','chick'],max:8,key:-1},
 {bg:'market',area:[16,100],name:['Market','சந்தை'],kinds:['banana','apple'],max:9,key:3},
 {bg:'road',area:[12,88],name:['Road','சாலை'],kinds:['car','bus'],max:10,key:-2}];
const NAMES={'t-o':['orange tile','orange tiles','ஆரஞ்சு'],'t-b':['blue tile','blue tiles','நீலம்'],'t-g':['green tile','green tiles','பச்சை'],
 sheep:['sheep','sheep','ஆடு'],cow:['cow','cows','பசு'],duck:['duck','ducks','வாத்து'],frog:['frog','frogs','தவளை'],
 flower:['flower','flowers','பூ'],butterfly:['butterfly','butterflies','பட்டாம்பூச்சி'],mango:['mango','mangoes','மாம்பழம்'],parrot:['parrot','parrots','கிளி'],
 fish:['fish','fish','மீன்'],crab:['crab','crabs','நண்டு'],star:['star','stars','நட்சத்திரம்'],planet:['planet','planets','கோள்'],
 egg:['egg','eggs','முட்டை'],chick:['chick','chicks','கோழிக்குஞ்சு'],banana:['banana','bananas','வாழைப்பழம்'],apple:['apple','apples','ஆப்பிள்'],
 car:['car','cars','கார்'],bus:['bus','buses','பேருந்து']};
const WORDS={en:['zero','one','two','three','four','five','six','seven','eight','nine','ten'],
 ta:['பூஜ்ஜியம்','ஒன்று','இரண்டு','மூன்று','நான்கு','ஐந்து','ஆறு','ஏழு','எட்டு','ஒன்பது','பத்து']};
/* illustrated backgrounds, 400x400 */
const SEED=s=>()=>(s=(s*9301+49297)%233280)/233280;
function tufts(n,y0,y1,col,seed){const r=SEED(seed);let o='';for(let i=0;i<n;i++){const x=r()*390,y=y0+r()*(y1-y0);
 o+=`<path d="M${x} ${y}l3-9 3 9 3-12 3 12 3-8 3 8" stroke="${col}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`}return o}
function blooms(n,y0,y1,seed){const r=SEED(seed),c=['#fff','#ffe14d','#ff9ec0'];let o='';for(let i=0;i<n;i++){const x=r()*390,y=y0+r()*(y1-y0),k=c[i%3];
 o+=`<g transform="translate(${x} ${y})"><circle r="3.2" cx="-3" fill="${k}"/><circle r="3.2" cx="3" fill="${k}"/><circle r="3.2" cy="-3" fill="${k}"/><circle r="3.2" cy="3" fill="${k}"/><circle r="2.2" fill="#f5a623"/></g>`}return o}
function cloud(x,y,s,d){return `<g class="drift" style="animation-duration:${d}s"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff"><ellipse rx="34" ry="14"/><circle cx="-12" cy="-8" r="15"/><circle cx="10" cy="-13" r="18"/><circle cx="26" cy="-4" r="11"/></g></g>`}
function sun(x,y){return `<g class="spin" style="transform-origin:${x}px ${y}px"><path d="${[...Array(12)].map((_,i)=>{const a=i*Math.PI/6;return `M${x+Math.cos(a)*36} ${y+Math.sin(a)*36}L${x+Math.cos(a)*48} ${y+Math.sin(a)*48}`}).join('')}" stroke="#ffd94a" stroke-width="5" stroke-linecap="round"/></g><circle cx="${x}" cy="${y}" r="28" fill="#ffd94a" stroke="#f5b400" stroke-width="3"/>`}
function pad(x,y,r){return `<path d="M${x} ${y}L${x+r} ${y-r*.35}A${r} ${r} 0 1 0 ${x+r} ${y+r*.35}Z" fill="#3e9b4a" stroke="#2a7a33" stroke-width="3"/><path d="M${x} ${y}l${-r*.7} ${-r*.3}M${x} ${y}l${-r*.6} ${r*.45}" stroke="#2a7a33" stroke-width="2"/>`}
function lotus(x,y){return `<g transform="translate(${x} ${y})" stroke="#b83b6b" stroke-width="2"><ellipse rx="7" ry="15" cy="-10" fill="#ff8fb8" transform="rotate(-35)"/><ellipse rx="7" ry="15" cy="-10" fill="#ff8fb8" transform="rotate(35)"/><ellipse rx="7" ry="17" cy="-12" fill="#ffb3cf"/></g>`}
const SCENES={
 tiles(){let o='<rect width="400" height="400" fill="#b67c52"/>';
  for(let i=0;i<16;i++){const x=(i%4)*100,y=(i>>2)*100,alt=((i%4)+(i>>2))%2;
   o+=`<rect x="${x+3}" y="${y+3}" width="94" height="94" rx="4" fill="${alt?'#d9a77f':'#e4b98f'}"/><path d="M${x+50} ${y+14}l36 36-36 36-36-36z" fill="none" stroke="${alt?'#a8442f':'#3f7f73'}" stroke-width="5" opacity=".35"/><circle cx="${x+50}" cy="${y+50}" r="11" fill="${alt?'#a8442f':'#3f7f73'}" opacity=".25"/>`}
  for(let i=1;i<4;i++)for(let j=1;j<4;j++)o+=`<circle cx="${i*100}" cy="${j*100}" r="9" fill="#8a3b2a" opacity=".45"/>`;
  return o+'<path d="M0 0h200L0 300z" fill="#fff" opacity=".1"/>'},
 meadow(){return `<rect width="400" height="400" fill="url(#skyDay)"/>${sun(335,58)}${cloud(70,55,1,40)}${cloud(210,38,.75,55)}
  <path d="M0 108Q90 62 190 100T400 88V400H0Z" fill="#acdf86"/><path d="M0 130Q60 110 120 124" stroke="#8a6a4a" stroke-width="0" fill="none"/>
  <g stroke="#9a7650" stroke-width="4" stroke-linecap="round">${[...Array(9)].map((_,i)=>`<path d="M${230+i*20} ${96+i*0.5}v-20"/>`).join('')}<path d="M226 84h170M226 92h170" stroke-width="3"/></g>
  <path d="M0 140Q140 92 270 128T400 118V400H0Z" fill="url(#grass)"/>${tufts(26,150,395,'#4b9630',3)}${blooms(14,160,390,7)}`},
 pond(){return `<rect width="400" height="400" fill="url(#grass)"/>${tufts(20,0,400,'#4b9630',5)}
  <path d="M44 66Q200 4 358 66Q424 220 342 358Q200 414 58 358Q-22 220 44 66Z" fill="url(#water)" stroke="#e9d9a8" stroke-width="10"/>
  <g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5"><ellipse class="ripple" cx="150" cy="150" rx="30" ry="9"/><ellipse class="ripple" cx="270" cy="260" rx="38" ry="11" style="animation-delay:-2s"/><ellipse cx="220" cy="120" rx="18" ry="5"/></g>
  ${pad(70,110,22)}${pad(330,300,26)}${pad(90,320,18)}${lotus(330,298)}${pad(310,95,16)}
  <g stroke="#5e3b1f" stroke-width="3">${[[18,380],[30,372],[44,384]].map(([x,y])=>`<path d="M${x} ${y}v-70"/><rect x="${x-4}" y="${y-86}" width="8" height="24" rx="4" fill="#7a4b2a"/>`).join('')}</g>`},
 garden(){let o=`<rect width="400" height="400" fill="url(#grass)"/>${tufts(16,0,400,'#4b9630',9)}`;
  for(const y of [22,118,214,310]){o+=`<rect x="-10" y="${y}" width="420" height="62" rx="31" fill="url(#soil)" stroke="#5c3720" stroke-width="3"/><path d="M10 ${y+31}H390" stroke="#5c3720" stroke-width="3" stroke-dasharray="14 10" opacity=".5"/>`;
   for(let x=30;x<400;x+=60)o+=`<path d="M${x} ${y+20}q-6-10-12-8q4 8 12 8q6-10 12-8q-4 8-12 8" fill="#5ec24d" stroke="#2e7d32" stroke-width="1.5"/>`}
  return o+blooms(10,0,400,4)},
 tree(){const C=[[80,140,96],[195,96,116],[322,140,96],[128,232,92],[272,232,92],[200,205,92],[30,230,60],[372,230,60]];
  return `<rect width="400" height="400" fill="url(#skyDay)"/>${cloud(330,40,.7,60)}
  <rect y="326" width="400" height="74" fill="url(#grass)"/>${tufts(14,340,395,'#4b9630',2)}
  <path d="M168 400L180 260Q150 226 112 236L116 224Q162 206 186 236L190 150H214L218 236Q242 204 286 216L282 228Q244 224 226 262L236 400Z" fill="#8a5a33" stroke="#5e3b1f" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#2a6e2d" stroke="#2a6e2d" stroke-width="10">${C.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <g fill="url(#leaf)">${C.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <g fill="#8fe07a" opacity=".55">${C.map(([x,y,r])=>`<ellipse cx="${x-r*.35}" cy="${y-r*.45}" rx="${r*.3}" ry="${r*.16}" transform="rotate(-25 ${x-r*.35} ${y-r*.45})"/>`).join('')}</g>`},
 sea(){return `<rect width="400" height="400" fill="url(#sea)"/>
  <g fill="#fff" opacity=".09"><path d="M60 0h50L40 340H0z"/><path d="M200 0h40L180 360h-50z"/><path d="M330 0h40L330 360h-40z"/></g>
  <g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2">${[[40,330,6],[60,300,4],[350,320,7],[330,280,4],[200,350,5]].map(([x,y,r],i)=>`<circle class="rise" style="animation-delay:${-i*1.3}s" cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <g fill="none" stroke-linecap="round"><path class="sway" d="M30 400q-16-40 0-80q16-40 0-90" stroke="#1f7a46" stroke-width="12"/><path class="sway" style="animation-delay:-1.5s" d="M372 400q14-40 0-70q-14-30 0-70" stroke="#2e9e5a" stroke-width="10"/><path class="sway" style="animation-delay:-.7s" d="M52 400q10-30 0-56" stroke="#3fbf6a" stroke-width="8"/></g>
  <path d="M0 352Q100 330 200 350T400 344V400H0Z" fill="#f2d49b" stroke="#d9b36e" stroke-width="3"/>
  <ellipse cx="300" cy="372" rx="26" ry="14" fill="#8d9aa5" stroke="#5f6b75" stroke-width="3"/><ellipse cx="330" cy="378" rx="16" ry="10" fill="#a4b0ba" stroke="#5f6b75" stroke-width="3"/>
  <path d="M110 380l5-11 5 11 12 1-9 7 3 11-11-6-11 6 3-11-9-7z" fill="#ff8a65" stroke="#c75b39" stroke-width="2" stroke-linejoin="round"/>`},
 sky(){const r=SEED(11);let st='';for(let i=0;i<46;i++){const x=r()*400,y=r()*320,s=.8+r()*1.6;st+=`<circle class="tw" style="animation-delay:${-r()*3}s" cx="${x}" cy="${y}" r="${s}" fill="#fff"/>`}
  return `<rect width="400" height="400" fill="url(#skyNight)"/>${st}<circle cx="330" cy="66" r="52" fill="#fff6c8" opacity=".12"/>
  <path d="M322 34a32 32 0 1 0 26 54a26 26 0 1 1-26-54z" fill="#fff3b0" stroke="#e8d27a" stroke-width="2"/>
  <path d="M0 338Q80 296 170 326T330 316T400 326V400H0Z" fill="#1d1848"/><path d="M0 360Q120 330 240 356T400 350V400H0Z" fill="#141038"/>
  <g transform="translate(272 300)"><rect y="10" width="44" height="30" fill="#2a2360"/><path d="M-6 12L22-10L50 12z" fill="#3a2f78"/><rect x="8" y="18" width="10" height="10" fill="#ffd94a"/><rect x="26" y="18" width="10" height="10" fill="#ffd94a"/></g>`},
 coop(){let o='<rect width="400" height="400" fill="url(#wood)"/>';
  for(let i=0;i<8;i++)o+=`<rect x="${i*50}" y="0" width="50" height="400" fill="${i%2?'#b7783f':'#c48650'}"/><path d="M${i*50+16} 20q8 60 0 120M${i*50+32} 60q-6 50 0 110" stroke="#8a5428" stroke-width="2" fill="none" opacity=".35"/><path d="M${i*50} 0V400" stroke="#7a4a22" stroke-width="3"/>`;
  return o+`<g transform="translate(286 24)"><rect width="88" height="70" rx="6" fill="#bfe6ff" stroke="#6b4423" stroke-width="7"/><circle cx="66" cy="22" r="9" fill="#ffd94a"/><path d="M44 0V70M0 35H88" stroke="#6b4423" stroke-width="5"/></g>
  <path d="M0 196Q100 176 200 198T400 190V400H0Z" fill="url(#straw)" stroke="#c99124" stroke-width="3"/>${(()=>{const r=SEED(21);let s='';for(let i=0;i<60;i++){const x=r()*400,y=210+r()*185,a=r()*40-20;s+=`<path d="M${x} ${y}l${14*Math.cos(a/57)} ${-6*Math.sin(a/57)-4}" stroke="${i%2?'#d9a12f':'#fbe08a'}" stroke-width="3" stroke-linecap="round"/>`}return s})()}`},
 market(){let o='<rect width="400" height="400" fill="#f7dcae"/><rect y="70" width="400" height="330" fill="url(#wood)"/>';
  for(let y=130;y<400;y+=64)o+=`<path d="M0 ${y}H400" stroke="#7a4a22" stroke-width="3" opacity=".55"/><circle cx="20" cy="${y-10}" r="3" fill="#7a4a22"/><circle cx="380" cy="${y-10}" r="3" fill="#7a4a22"/>`;
  o+='<rect y="58" width="400" height="12" fill="#000" opacity=".1"/>';
  for(let i=0;i<10;i++){const c=i%2?'#fff':'#e84b4b';o+=`<rect x="${i*40}" y="0" width="40" height="44" fill="${c}"/><circle cx="${i*40+20}" cy="44" r="20" fill="${c}"/>`}
  return o+'<path d="M0 0H400" stroke="#a52a2a" stroke-width="10"/>'},
 road(){let o=`<rect width="400" height="400" fill="url(#grass)"/><rect y="48" width="400" height="304" fill="url(#road)"/>`;
  for(let x=0;x<400;x+=40)o+=`<rect x="${x}" y="42" width="40" height="9" fill="${x%80?'#fff':'#e84b4b'}"/><rect x="${x}" y="349" width="40" height="9" fill="${x%80?'#e84b4b':'#fff'}"/>`;
  for(let x=10;x<400;x+=80)o+=`<rect x="${x}" y="196" width="44" height="8" rx="3" fill="#fff"/>`;
  for(let x=24;x<400;x+=72)o+=`<rect x="${x-3}" y="22" width="6" height="18" fill="#7a4b2a"/><circle cx="${x}" cy="18" r="15" fill="url(#leaf)" stroke="#2a6e2d" stroke-width="3"/>`;
  return o+tufts(14,362,396,'#4b9630',6)+blooms(6,364,394,8)}
};
const sceneSVG=bg=>`<svg class="bgsvg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[bg]()}</svg>`;

const PLAN=['count','find','more','make','quick'];
const SKILLS={count:'Count',find:'Find',more:'Compare',make:'Make',quick:'Quick look'};
let winTok=0,lang='en',P=0,pg=PAGES[0],round=0,mode='count',items=[],count=0,target=null,goal=0,phase='play',musicOn=true;
let lvl=2,misses=0,pair=[],per={},lastTap=0;
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'')||d}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let stars=load('cwm-stars',{}),stats=load('cwm-stats',{});
const W=k=>WORDS[lang][k];
const nm=(k,n)=>lang==='ta'?NAMES[k][2]:NAMES[k][n===1?0:1];
const use=k=>`<svg viewBox="0 0 100 100"><use href="#${k}"/></svg>`;
const mini=k=>`<svg class="mini" viewBox="0 0 100 100"><use href="#${k}"/></svg>`;
const rnd=(a,b)=>a+(Math.random()*(b-a+1)|0);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}

/* sound */
let ac=null,loopT=null,beat=0;
const SCALE=[261.63,293.66,329.63,392,440,523.25,587.33,659.25,783.99,880,1046.5];
const LOOP=[130.81,196,164.81,196,146.83,220,174.61,220];
function initAudio(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function tone(f,d,v,type){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type||'triangle';o.frequency.value=f;
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d+.05)}
function startLoop(){stopLoop();if(!musicOn||!ac)return;const m=2**(pg.key/12);
 loopT=setInterval(()=>{tone(LOOP[beat%8]*m,.45,.05,'sine');if(beat%4===0)tone(65.41*m,.3,.05,'sine');beat++},500)}
function stopLoop(){if(loopT)clearInterval(loopT);loopT=null}
const chime=()=>[0,2,4,7].forEach((i,k)=>setTimeout(()=>tone(SCALE[i+3],.5,.14),k*110));
const bonk=()=>tone(110,.25,.08,'sine');
function say(t){try{const s=new SpeechSynthesisUtterance(t);s.lang=lang==='ta'?'ta-IN':'en-IN';s.rate=.85;s.pitch=1.15;speechSynthesis.cancel();speechSynthesis.speak(s)}catch(e){}}

/* home */
function drawHome(){
 $('cards').innerHTML=PAGES.map((p,i)=>`<button class="card" data-p="${i}"><div class="scene">${sceneSVG(p.bg)}<svg class="spr" viewBox="0 0 100 100" style="--t:${p.area[0]?Math.min(40,p.area[0]+8)+'%':'26%'}"><use href="#${p.kinds[i===0?1:0]}"/></svg></div>
  <p><span>${i+1}. ${p.name[lang==='ta'?1:0]}</span><small>${stars[i]?'⭐':'1–'+p.max}</small></p></button>`).join('');
}
$('cards').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)location.hash='p'+(+c.dataset.p+1)});
function route(){
 const m=/^#p(\d+)$/.exec(location.hash),i=m?+m[1]-1:-1;
 if(i>=0&&i<10){P=i;pg=PAGES[i];round=0;lvl=Math.max(2,pg.max-1);$('home').hidden=true;$('game').hidden=false;$('ptitle').textContent=(i+1)+'. '+pg.name[lang==='ta'?1:0];startLoop();newRound()}
 else{$('game').hidden=true;$('home').hidden=false;stopLoop();drawHome();drawGrown()}
}
window.addEventListener('hashchange',route);
$('back').onclick=()=>{location.hash='home'};

/* rounds */
function place(list){
 const cells=shuffle([...Array(16).keys()]).slice(0,list.length),tile=pg.bg==='tiles';
 items=list.map((k,i)=>{const c=cells[i];return{id:i,k,on:false,num:0,
  x:(c%4)*25+(tile?2.5:rnd(0,5)),y:tile?(c>>2)*25+2.5:pg.area[0]+(c>>2)*(pg.area[1]-pg.area[0]-20)/3+rnd(0,2),d:-(Math.random()*3).toFixed(2)}});
}
const size=()=>rnd(Math.max(2,lvl-2),lvl);
const any=()=>pg.kinds[Math.random()*pg.kinds.length|0];
function newRound(){
 winTok++;phase='play';count=0;target=null;misses=0;per={};lastTap=Date.now();mode=PLAN[round];$('act').innerHTML='';drawBg();
 $('pips').innerHTML=PLAN.map((m,i)=>`<i class="${i<round?'on':''}" title="${SKILLS[m]}"></i>`).join('');
 const main=pg.kinds[0],tiles=pg.bg==='tiles';
 if(mode==='count'){const k=size();target=tiles?null:main;
  place(Array.from({length:k},()=>tiles?any():main));
  setMsg('',`Tap every ${tiles?'tile':nm(main,1)}. Count with me!`)}
 if(mode==='find'){target=tiles?any():(Math.random()<.7?main:pg.kinds[1]);
  const want=size(),others=pg.kinds.filter(k=>k!==target),extra=rnd(2,4);
  place(shuffle([...Array(want).fill(target),...Array.from({length:extra},()=>others[Math.random()*others.length|0])]));
  setMsg('',`Count only the ${mini(target)} ${nm(target,2)}`);
  say(lang==='ta'?nm(target):'Count the '+nm(target,2))}
 if(mode==='more'){pair=tiles?shuffle(pg.kinds.slice()).slice(0,2):pg.kinds.slice();
  let a=rnd(1,lvl),b=rnd(1,lvl);while(a===b)b=rnd(1,Math.max(2,lvl));
  place(shuffle([...Array(a).fill(pair[0]),...Array(b).fill(pair[1])]));
  setMsg('',`More ${mini(pair[0])} or more ${mini(pair[1])}? Tap to count.`);
  say(lang==='ta'?'எது அதிகம்?':'Are there more '+nm(pair[0],2)+' or more '+nm(pair[1],2)+'?');
  $('act').innerHTML=pair.map(k=>`<button class="pick" data-k="${k}">${use(k)}<span>More ${nm(k,2)}</span></button>`).join('')}
 if(mode==='make'){goal=size();target=tiles?null:main;
  place(Array.from({length:Math.min(goal+rnd(2,3),16)},()=>tiles?any():main));
  setMsg(goal,`Tap ${goal} ${tiles?'tiles':nm(main,goal)}, then press Done`);
  $('act').innerHTML='<button class="go" id="done">Done ✓</button>';say(lang==='ta'?W(goal):'Tap '+goal)}
 if(mode==='quick'){goal=rnd(1,Math.min(5,lvl));target=tiles?null:main;
  place(Array.from({length:goal},()=>tiles?any():main));phase='look';
  setMsg('👀',`Quick look! How many ${tiles?'tiles':nm(main,2)}?`);say(lang==='ta'?'பார்!':'Quick look!');
  draw();flash();return}
 draw();
}
function setMsg(b,m){$('big').innerHTML=b===''||b==null?'':b+(Number.isInteger(+b)&&+b<=10&&b!==''?`<small>${W(+b)}</small>`:'');$('msg').innerHTML=m}
function drawBg(){$('scene').className='scene'+(pg.air?' air':'');$('scene').innerHTML=sceneSVG(pg.bg)+'<div class="layer" id="items"></div><div class="cover" id="cover" hidden>?</div>'}
function draw(){
 $('items').innerHTML=items.map(t=>`<button class="it${t.on?' on':''}${mode==='more'&&t.k===pair[1]?' b2':''}" data-id="${t.id}" style="left:${t.x}%;top:${t.y}%;--d:${t.d}s" aria-label="${NAMES[t.k][0]}${t.on?', '+t.num:''}">${use(t.k)}<span class="n">${t.on?t.num:''}</span></button>`).join('');
}
function flash(){
 const tok=winTok;$('cover').hidden=true;$('items').classList.remove('gone');$('act').innerHTML='';
 setTimeout(()=>{if(tok!==winTok)return;$('items').classList.add('gone');$('cover').hidden=false;phase='ask';
  const r=goal,opts=shuffle([r,r>1?r-1:r+2,r+1]);
  $('act').innerHTML=opts.map(v=>`<button class="ans" data-v="${v}">${v}</button>`).join('');
  say(lang==='ta'?'எத்தனை?':'How many?')},Math.max(1200,2200-P*100));
}
function shake(el){el.classList.remove('no');void el.offsetWidth;el.classList.add('no')}
function miss(){misses++;bonk()}
function countIt(t){count++;t.on=true;t.num=count;tone(SCALE[Math.min(count-1,10)],.6,.16);say(W(count));setMsg(count,$('msg').innerHTML)}
$('scene').addEventListener('click',e=>{
 const el=e.target.closest('.it');if(!el||phase!=='play')return;lastTap=Date.now();
 const t=items.find(x=>x.id==el.dataset.id);
 if(mode==='make'){
  if(t.on){t.on=false;let k=0;items.filter(x=>x.on).sort((a,b)=>a.num-b.num).forEach(x=>x.num=++k);count=k;bonk()}else countIt(t);
  setMsg(count||goal,count?`You have ${count}. Need ${goal}.`:`Tap ${goal}, then press Done`);draw();return}
 if(t.on){miss();shake(el);return}
 if(mode==='more'){per[t.k]=(per[t.k]||0)+1;t.on=true;t.num=per[t.k];tone(SCALE[Math.min(t.num-1,10)]*(t.k===pair[1]?1.5:1),.5,.15);say(W(t.num));draw();return}
 if(mode==='find'&&t.k!==target){miss();shake(el);say(lang==='ta'?'இல்லை':'That is a '+NAMES[t.k][0]);return}
 countIt(t);draw();
 const need=mode==='find'?items.filter(x=>x.k===target).length:items.length;
 if(count===need)setTimeout(mode==='find'?ask:()=>win(count),700);
});
function ask(){
 phase='ask';const r=count,opts=shuffle([r,r-1>0?r-1:r+2,r+1]);
 setMsg('?',`How many ${nm(target,2)}?`);say(lang==='ta'?'எத்தனை '+nm(target)+'?':'How many '+nm(target,2)+'?');
 $('act').innerHTML=opts.map(v=>`<button class="ans" data-v="${v}">${v}</button>`).join('');
}
/* gentle hint after 7 s without a tap */
setInterval(()=>{
 if($('game').hidden||phase!=='play'||mode==='quick'||Date.now()-lastTap<7000)return;
 if(document.querySelector('.it.hint'))return;
 const t=items.find(x=>!x.on&&(mode!=='find'||x.k===target)&&!(mode==='make'&&count>=goal));
 const el=t&&document.querySelector(`.it[data-id="${t.id}"]`);if(el)el.classList.add('hint');
},1000);
$('act').addEventListener('click',e=>{
 const a=e.target.closest('.ans'),pk=e.target.closest('.pick');
 if(a&&phase==='ask'){const v=+a.dataset.v;
  if(mode==='quick'){if(v===goal){$('items').classList.remove('gone');$('cover').hidden=true;items.forEach((t,i)=>{t.on=true;t.num=i+1});draw();win(goal)}
   else{miss();a.classList.add('no');say(lang==='ta'?'மீண்டும் பார்':'Look again');setTimeout(()=>{phase='look';flash()},700)}return}
  if(v===count)win(count);else{miss();a.classList.add('no');say(lang==='ta'?'மீண்டும் எண்ணு':'Count the shining ones again')}return}
 if(pk&&phase==='play'){const k=pk.dataset.k,o=pair.find(x=>x!==k),nk=items.filter(t=>t.k===k).length,no=items.filter(t=>t.k===o).length;
  if(nk>no){items.forEach(t=>{if(!t.on){per[t.k]=(per[t.k]||0)+1;t.on=true;t.num=per[t.k]}});draw();
   win(nk,lang==='ta'?`${nm(k)} அதிகம்! ${nk} > ${no}`:`More ${nm(k,2)}! ${nk} is more than ${no}.`)}
  else{miss();shake(pk);say(lang==='ta'?'எண்ணிப் பார்':'Count them and see')}return}
 if(e.target.id==='done'&&phase==='play'){
  if(count===goal)win(goal);
  else{miss();setMsg(count,count<goal?`${count} is too few. Tap more!`:`${count} is too many. Tap one to take it back.`);
   say(lang==='ta'?W(goal)+' வேண்டும்':(count<goal?'Too few':'Too many')+'. We need '+goal)}}
 if(e.target.id==='next'){round++;newRound()}
 if(e.target.id==='nextPage')location.hash=P<9?'p'+(P+2):'home';
 if(e.target.id==='again'){round=0;newRound()}
});
function win(k,text){
 phase='won';chime();
 const s=stats[mode]||(stats[mode]={n:0,first:0});s.n++;if(!misses)s.first++;save('cwm-stats',stats);
 lvl=misses?(misses>1?Math.max(2,lvl-1):lvl):Math.min(pg.max,lvl+1);
 const label=target?nm(target,k):(lang==='ta'?'':'tiles');
 say(W(k)+' '+(target?nm(target,k):''));setMsg(k,text||`${k} ${label}!`);
 const ch=document.createElement('div');ch.className='cheer';const cc=['#f28a1e','#2f7de1','#2fae5a','#ffd23f','#ec3f78'];
 ch.innerHTML=[...Array(22)].map((_,i)=>{const a=i/22*6.283,r=90+Math.random()*90;return `<i class="cf" style="background:${cc[i%5]};--x:${(Math.cos(a)*r).toFixed(0)}px;--y:${(Math.sin(a)*r).toFixed(0)}px"></i>`}).join('')+`<span>${k}</span>`;$('scene').appendChild(ch);
 const dots=`<div class="dots" aria-hidden="true">${items.filter(t=>t.on&&(mode!=='more'||t.k===items.find(x=>x.on&&x.num===k)?.k)).slice(0,10).map(t=>use(t.k)).join('')}</div>`;
 if(round<PLAN.length-1){$('act').innerHTML=dots+'<button class="go" id="next">Next ▶</button>';return}
 stars[P]=1;save('cwm-stars',stars);
 $('pips').innerHTML=PLAN.map(()=>'<i class="on"></i>').join('');
 const tok=++winTok;setTimeout(()=>{if(tok!==winTok)return;setMsg('⭐',`Page done! ${P<9?'On to '+PAGES[P+1].name[lang==='ta'?1:0]+'?':'All 10 pages done!'}`);say(lang==='ta'?'சூப்பர்!':'Super!')},1400);
 $('act').innerHTML=`<button class="go" id="again" style="background:var(--b)">↺ Again</button><button class="go" id="nextPage">${P<9?'Next page ▶':'All pages'}</button>`;
}
function drawGrown(){
 $('stats').innerHTML=Object.keys(SKILLS).map(m=>{const s=stats[m]||{n:0,first:0},p=s.n?Math.round(s.first/s.n*100):0;
  return `<tr><td>${SKILLS[m]}</td><td class="r">${s.n}</td><td><div class="bar"><i style="width:${p}%"></i></div></td><td class="r">${s.n?p+'%':'–'}</td></tr>`}).join('');
 $('starsN').textContent=Object.keys(stars).length;
}
$('reset').onclick=()=>{stats={};stars={};save('cwm-stats',stats);save('cwm-stars',stars);drawGrown();drawHome()};
for(const b of document.querySelectorAll('.lang'))b.onclick=()=>{lang=lang==='en'?'ta':'en';
 document.querySelectorAll('.lang').forEach(x=>x.textContent=lang==='en'?'EN':'தமிழ்');
 if($('game').hidden)drawHome();else{$('ptitle').textContent=(P+1)+'. '+pg.name[lang==='ta'?1:0];newRound()}};
$('mus').onclick=()=>{musicOn=!musicOn;$('mus').setAttribute('aria-pressed',musicOn);initAudio();musicOn?startLoop():stopLoop()};
$('startBtn').onclick=()=>{initAudio();try{ac&&ac.resume()}catch(e){}$('start').remove();if(!$('game').hidden)startLoop();say(lang==='ta'?'எண்ணலாம்!':"Let's count!")};
route();
}
