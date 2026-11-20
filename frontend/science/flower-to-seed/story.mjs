import {storyLength,storyFrame,flightPaths} from './story-model.mjs';
const colors=`<defs>
<linearGradient id="film-dawn" x2="0" y2="1"><stop stop-color="#183e46"/><stop offset=".58" stop-color="#6f9393"/><stop offset="1" stop-color="#f7c98b"/></linearGradient>
<linearGradient id="film-comb" x2="1" y2="1"><stop stop-color="#edbb65"/><stop offset=".48" stop-color="#9d592f"/><stop offset="1" stop-color="#442b26"/></linearGradient>
<linearGradient id="film-petal" x2="0" y2="1"><stop stop-color="#fff2b5"/><stop offset=".47" stop-color="#e9be56"/><stop offset="1" stop-color="#b87738"/></linearGradient>
<radialGradient id="film-halo"><stop stop-color="#ffe1a7" stop-opacity=".96"/><stop offset="1" stop-color="#ffcf86" stop-opacity="0"/></radialGradient>
<radialGradient id="film-honey"><stop stop-color="#ffcf76"/><stop offset=".75" stop-color="#e9a044"/><stop offset="1" stop-color="#a75c31"/></radialGradient>
<linearGradient id="film-wing" x2="0" y2="1"><stop stop-color="#f8fcdf" stop-opacity=".94"/><stop offset="1" stop-color="#aac6b0" stop-opacity=".40"/></linearGradient>
<radialGradient id="film-macro"><stop stop-color="#667f6a"/><stop offset="1" stop-color="#213834"/></radialGradient>
</defs>`;
const frame=(image,label)=>`<svg class="art" viewBox="0 0 640 460" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${colors}${image}</svg>`;
const cells=Array.from({length:65},(_,i)=>{
 const c=i%10,r=Math.floor(i/10),x=c*68-27+(r%2)*34,y=r*59+19;
 return `<path d="M-33 0l16-28h34L33 0 17 28h-34Z" transform="translate(${x} ${y})" fill="${i%7===0?'url(#film-honey)':'#4d2c24'}" fill-opacity="${i%7===0?.85:.57+(i%5)*.069}" stroke="#e5ad63" stroke-opacity=".62" stroke-width="3"/>`;
}).join('');
const staticDots=Array.from({length:34},(_,i)=>`<circle cx="${i*163%640}" cy="${i*59%460}" r="${i%4+1}" fill="#fff4c1" opacity="${.075+(i%6)*.043}"/>`).join('');
const pollen=(loaded)=>Array.from({length:19},(_,i)=>`<circle cx="${-28+i*11%47}" cy="${6+i*7%17}" r="${.8+(i%5)*.39}" fill="#ffe47b" opacity="${loaded?.82:0}"/>`).join('');
function insect(id,x,y,scale=1,loaded=false,mirror=1){
 const hair=Array.from({length:24},(_,i)=>{const a=i*.26;return `<path d="M${(-26+25*Math.cos(a)).toFixed(1)} ${(16*Math.sin(a)).toFixed(1)}l${(6*Math.cos(a)).toFixed(1)} ${(7*Math.sin(a)).toFixed(1)}"/>`;}).join('');
 return `<g id="${id}" transform="translate(${x} ${y}) scale(${scale*mirror} ${scale})">
 <g fill="none" stroke="#291f1c" stroke-linecap="round" stroke-width="2.6"><path d="M-20 6l-7 18-12 5m26-22 4 22-9 5M7 5l4 16 15 7M20-8q10-16 19-13m-17 13q14-7 21-3"/></g>
 <g class="film-wings" fill="url(#film-wing)" stroke="#efecc9" stroke-opacity=".75"><path d="M-11 0Q-78-40-65-57Q-42-65-9-19Z"/><path d="M-5-4Q-17-62 10-68Q34-57 12-16Z"/></g>
 <path d="M-14-12Q-48-32-60-3Q-50 27-14 17Z" fill="#c88a43" stroke="#2b2520" stroke-width="1.7"/>
 <path d="M-48-15q-2 13 5 27m4-29q-1 16 8 32m2-33q1 18 9 31" stroke="#332822" stroke-width="6" fill="none"/>
 <ellipse cx="-12" cy="1" rx="24" ry="18" fill="#ae742f"/><g stroke="#d3a557" stroke-linecap="round" stroke-width="1.8">${hair}</g>
 <ellipse cx="14" cy="-3" rx="13" ry="14" fill="#3b2d25"/><ellipse cx="20" cy="-6" rx="7" ry="9" fill="#181e1a"/><ellipse cx="22" cy="-9" rx="2.7" ry="2" fill="#fff2c9" opacity=".65"/>
 <g class="film-body-pollen">${pollen(loaded)}</g></g>`;
}
const hive=`<rect width="640" height="460" fill="#34221f"/><path d="M0-10h610q43 78 30 212l-45 204L0 395Z" fill="url(#film-comb)"/>${cells}<circle cx="572" cy="135" r="210" fill="url(#film-halo)" opacity=".66"/>${staticDots}`;
const meadow=`<rect width="640" height="460" fill="url(#film-dawn)"/><circle cx="480" cy="142" r="154" fill="url(#film-halo)"/><circle cx="480" cy="142" r="34" fill="#ffdb93"/><path d="M0 300q105-102 248-36t392-26v222H0" fill="#597b64"/><path d="M0 350q155-76 314-27t326-9v146H0" fill="#315546"/><path d="M0 422q175-80 322-29q186 33 318-31v98H0" fill="#244c3b"/>${staticDots}`;
const macroFlower=`<g id="film-bloom" transform="translate(435 272)">
 ${[0,90,180,270].map(a=>`<g transform="rotate(${a})"><path d="M0 32Q-101 0-97-90Q-88-169 3-163Q98-157 99-83Q94 0 0 32Z" fill="url(#film-petal)" stroke="#fff0be" stroke-width="2.1"/><path d="M0 4q-28-62 2-136m2 130q46-54 41-113m-50 100q-54-43-48-100" stroke="#a26d39" stroke-opacity=".47" fill="none" stroke-width="2"/></g>`).join('')}
 <circle r="53" fill="#b17737"/><circle r="43" fill="#e2ae52"/>
 <g fill="#ffe18e">${Array.from({length:6},(_,i)=>`<ellipse cx="${31*Math.cos(i*Math.PI/3)}" cy="${31*Math.sin(i*Math.PI/3)}" rx="8" ry="5" transform="rotate(${i*60})"/>`).join('')}</g>
 <ellipse cy="-1" rx="11" ry="16" fill="#8aa467"/><path d="M-6-4q5-7 11-3" fill="none" stroke="#d7e7a1" stroke-width="3" stroke-linecap="round"/></g>`;
function drawing(id){
 if(id==='dawn')return frame(hive+insect('film-companion',431,220,1.28,false,-1)+insect('film-neighbour',410,345,1.10,false,-1)+insect('film-bee',189,264,1.45),'Pip, Mina and Dot talk inside their honeycomb before foraging.');
 if(id==='home')return frame(hive+`<path d="M338 184l29-49h58l29 49-29 49h-58Z" fill="#71402b" stroke="#efba69" stroke-width="5"/><ellipse id="film-store" cx="397" cy="188" rx="43" ry="38" fill="url(#film-honey)"/><path id="film-nectar" d="M0-11Q-13 4 0 8Q13 4 0-11Z" fill="#fff1ac" stroke="#e9b757" stroke-width="1.5"/><path d="M376 179q12-14 28-15" stroke="#ffe8af" stroke-width="4" stroke-linecap="round" fill="none" opacity=".78"/>`+insect('film-bee',240,251,1.35)+insect('film-companion',528,274,1.2,false,-1),'Worker bees return to their honeycomb; honey is shown in a cell.');
 if(id==='out')return frame(`<g id="film-camera">${meadow}${insect('film-companion',440,231,.74)}${insect('film-neighbour',186,291,.7,false,-1)}${insect('film-bee',306,255,1)}</g>`,'The three bees fly apart. The camera follows Pip into the meadow.');
 return frame(`<rect width="640" height="460" fill="url(#film-macro)"/><circle cx="402" cy="196" r="225" fill="url(#film-halo)" opacity=".48"/>${staticDots}${macroFlower}${insect('film-bee',228,172,1.65,true)}${Array.from({length:11},(_,i)=>`<circle class="film-grain" r="${2+i%3}" fill="#fbed85" opacity="0"/>`).join('')}`,id==='gather'?'Close view of a bee brushing pollen from a flower onto its body.':'Close view of pollen brushing from a bee onto the next flower’s stigma.');
}
const clamp=(v)=>Math.max(0,Math.min(v,1));
const eased=v=>{const a=clamp(v);return a*a*(3-2*a);};
function motion(panel,id,t,speaker){
 const bee=panel.querySelector('#film-bee'),wing=bee.querySelector('.film-wings');
 let x,y,scale,angle=0,flutter=true;
 if(id==='dawn'){
  x=189;y=264;scale=1.45;flutter=false;
  const names={'film-bee':[189,264,1.45,1],'film-companion':[431,220,1.28,-1],'film-neighbour':[410,345,1.10,-1]};
  for(const [n,[cx,cy,k,m]] of Object.entries(names)){
   const node=panel.querySelector('#'+n),talk=n===speaker,bob=talk?Math.sin(t*54)*5:0;
   node.classList.toggle('film-speaking',talk);
   node.setAttribute('transform',`translate(${cx} ${cy+bob}) rotate(${talk?Math.sin(t*54)*4:0}) scale(${k*m} ${k})`);
  }
  return;
 }
 else if(id==='out'){
  const {pip,mina,dot,camera}=flightPaths(t);
  [x,y]=pip;scale=1;angle=-9;
  panel.querySelector('#film-companion').setAttribute('transform',`translate(${mina.join(' ')}) rotate(-22) scale(.74)`);
  panel.querySelector('#film-neighbour').setAttribute('transform',`translate(${dot.join(' ')}) rotate(17) scale(-.7 .7)`);
  panel.querySelector('#film-camera').setAttribute('transform',`translate(${camera[0]} ${camera[1]}) scale(${camera[2]})`);
 }
 else if(id==='home'){x=195+123*eased(t*2);y=223+26*t;scale=1.3;flutter=t<.31;panel.querySelector('#film-store').style.opacity=String(.18+.82*eased((t-.46)*1.8));
 const drop=panel.querySelector('#film-nectar'),u=eased((t-.17)*2.7);
 drop.setAttribute('transform',`translate(${x+23+(375-x-23)*u} ${y+(186-y)*u})`);
 drop.style.opacity=String(t<.6?Math.min(1,t*9)*(1-eased((t-.46)*6)):0);}
 else{
  const crawl=eased((t-.48)*2),approach=eased(t*1.8);x=184+191*approach+25*crawl;y=141+73*approach+12*crawl;scale=1.55;angle=-9+16*approach;flutter=t<.48;
  const bend=Math.sin(clamp((t-.36)*1.55)*Math.PI);
  panel.querySelector('#film-bloom').setAttribute('transform',`translate(435 ${272+6*bend}) rotate(${4*bend})`);
  const transfer=id==='transfer';
  bee.querySelector('.film-body-pollen').style.opacity=String(transfer?1:eased((t-.5)*2.8));
  // Art always has the same grains; their paths connect the body/contact area to the flower center.
  panel.querySelectorAll('.film-grain').forEach((g,i)=>{
   const u=clamp((t-.51-i*.013)*3.8),a=transfer?x-23+i%4*6:408+i%4*5,b=transfer?433+i%3*5:x-26+i%4*6;
   const start=transfer?y+11+i%3*3:259+i%3*4,end=transfer?268+i%3*4:y+13+i%3*4;
   g.setAttribute('cx',a+(b-a)*u);
   g.setAttribute('cy',start+(end-start)*u-12*Math.sin(Math.PI*u));
   g.style.opacity=u===0?'0':String(Math.min(1,u*6));
  });
 }
 bee.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
 wing.setAttribute('transform',`scale(1 ${flutter?.70+.30*Math.sin(t*108):.75})`);
}
export function wireBeeStory(dialog,effect,onClose,isSoundOn=()=>false){
 const panel=dialog.querySelector('.film-image'),caption=dialog.querySelector('.film-caption'),title=dialog.querySelector('.film-shot'),progress=dialog.querySelector('progress');
 const action=dialog.querySelector('[data-film-action="pause"]');
 const bubble=dialog.querySelector('.film-bubble');
 const voicePlayer=window.speechSynthesis;
 voicePlayer?.getVoices();
 let voiceLine=null,spoken=null;
 function stopVoice(){if(voiceLine)voicePlayer?.cancel();voiceLine=null;}
 function voice(dialogue){
  if(!dialogue||dialogue===spoken)return;
  spoken=dialogue;
  if(!isSoundOn()||!voicePlayer||!window.SpeechSynthesisUtterance)return;
  const voices=voicePlayer.getVoices().filter(v=>v.localService&&/^en(?:-|$)/i.test(v.lang));
  if(!voices.length)return;
  stopVoice();
  const msg=new SpeechSynthesisUtterance(dialogue.line);
  const i=['Pip','Mina','Dot'].indexOf(dialogue.name);
  msg.voice=voices[i%voices.length];msg.pitch=[1.16,1.36,.99][i];msg.rate=1.19;msg.volume=.72;
  voiceLine=msg;msg.onend=()=>{if(voiceLine===msg)voiceLine=null;};
  voicePlayer.speak(msg);
 }
 let id='',position=0,stamp=0,token=0,paused=false,complete=false;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 function draw(){
  const f=storyFrame(position);
  if(id!==f.shot.id){id=f.shot.id;panel.innerHTML=drawing(id);title.textContent=f.shot.title;caption.textContent=f.shot.line;if(f.shot.sound)effect(f.shot.sound);}
  const line=f.dialogue;
  if(bubble.hidden===Boolean(line)){bubble.hidden=!line;dialog.dataset.dialogue=String(Boolean(line));}
  if(line){
   if(bubble.dataset.speaker!==line.speaker){
    bubble.dataset.speaker=line.speaker;bubble.querySelector('strong').textContent=line.name;bubble.querySelector('span').textContent=line.line;
    caption.textContent=line.name+': '+line.line;
   }
   voice(line);
  }
  motion(panel,id,reduce.matches?.78:f.t,line?.speaker);
  progress.value=position;
  if(f.finished){complete=true;paused=true;action.textContent='↻ Replay';}
 }
 function tick(now){
  if(paused||!dialog.open)return;
  position=Math.min(storyLength,position+(now-stamp)/1000);
  stamp=now;draw();
  if(!complete)token=requestAnimationFrame(tick);
 }
 function play(){paused=false;action.textContent='Ⅱ Pause';stamp=performance.now();token=requestAnimationFrame(tick);}
 function start(){cancelAnimationFrame(token);stopVoice();spoken=null;delete bubble.dataset.speaker;id='';position=0;complete=false;draw();play();}
 dialog.addEventListener('click',event=>{
  const which=event.target.closest('[data-film-action]')?.dataset.filmAction;
  if(which==='exit')dialog.close();
  if(which==='pause'){
   if(complete)start();
   else if(paused)play();
   else{paused=true;cancelAnimationFrame(token);stopVoice();action.textContent='▶ Resume';}
  }
 });
 dialog.addEventListener('close',()=>{cancelAnimationFrame(token);stopVoice();onClose();});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&dialog.open&&!paused){paused=true;cancelAnimationFrame(token);stopVoice();action.textContent='▶ Resume';}
 });
 return {open(){if(!dialog.open)dialog.showModal();start();},stopVoice};
}
