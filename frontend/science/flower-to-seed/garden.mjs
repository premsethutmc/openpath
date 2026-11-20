import {seeds,stages,pollenPath,cycle,disperse,crops,startBed,tend} from './model.mjs';
import {garden,microscope,travel,bedArt} from './art.mjs';
import {gardenSound} from './sound.mjs';
import {wireBeeStory} from './story.mjs';
const $=id=>document.getElementById(id);
const soundtrack=gardenSound();
const openStory=wireBeeStory($('bee-story'),name=>soundtrack.effect(name),()=>{
 cancelFlight();move('garden');draw();
 $('scene').querySelector('.bee-touch')?.focus({preventScroll:true});
},()=>requestedSound);
let requestedSound=false,soundRevision=0;
const soundButton=$('garden-sound');
if(!soundtrack.supported)soundButton.hidden=true;
soundButton.addEventListener('click',async()=>{
 const request=++soundRevision;
 requestedSound=!requestedSound;
 const actual=await soundtrack.set(requestedSound);
 if(request!==soundRevision)return;
 requestedSound=actual;
 soundButton.setAttribute('aria-pressed',String(actual));
 $('sound-state').textContent=actual?'Sound on':'Sound off';
});
const points=[[166,174],[470,205]];
const order=['garden','cutaway','travel','check'];
const labels={
 garden:['THE GARDEN','Move the bee','Drag the bee or tap a flower.'],
 cutaway:['FLOWER CUTAWAY','Grow a pod','Slide time forward.'],
 travel:['SEED TRAVELS','Give seeds a ride','Try wind, water or a passing animal.'],
 check:['GROWING BED','Start a new plant','Plant, rain, then let time pass.'],
};
let stop='garden',source=null,landed=null,target=null,stage=0,opened=false;
let bx=320,by=98,seed='dandelion',tool=null,success=null,bed=startBed();
let obs='',drag=null,suppressUntil=0,timer=0,frame=0,demoSerial=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const button=(id,label,attr='')=>`<button type="button" data-action="${id}" ${attr}>${label}</button>`;
const marker=(id,label,x,y,style='',attr='')=>button(id,label,`class="target ${style}" style="left:${x/6.4}%;top:${y/4.6}%" ${attr}`);
const primary=(id,label)=>button(id,label,'class="primary"');
const status=()=>{$('observation').textContent=obs;};
const timeNote=()=>cycle(landed===null?null:'cross',stage)?.detail??'';
const travelNote=()=>tool?(success?seeds[seed].feature:'It didn’t travel far this way. Try another ride.'):'';
function showScene(){
 const stageEl=$('stage');
 const [,heading]=labels[stop];
 $('scene-index').textContent=`0${order.indexOf(stop)+1}`;
 $('scene-name').textContent=stop==='cutaway'&&landed!==null?'MUSTARD '+(landed===0?'A':'B'):labels[stop][0];
 stageEl.dataset.stop=stop;
 let scene='';
 if(stop==='garden'){
   scene=garden(bx,by,source!==null,target);
   for(const [i,[x,y]] of points.entries()){
     scene+=marker('flower-'+i,'',x,y,'flower-touch',`aria-label="${i===0?'Left':'Right'} flower"`);
   }
   scene+=marker('bee','',bx,by,'bee-touch','aria-label="Move the bee" title="Drag the bee or tap to watch"');
 }else if(stop==='cutaway'){
   scene=microscope(landed===null?-1:stage,opened);
   if(stage===3&&!opened)scene+=marker('crack','⚡ Split the pod',320,345,'pod-touch');
 }else if(stop==='travel'){
   scene=travel(seed,tool,success);
 }else{
   scene=bedArt(bed)+(!bed.planted?marker('plant','↓ Plant here',320,290,'plant-touch'):'');
 }
 $('scene').innerHTML=scene;
 $('heading').textContent=heading;
}
function showControls(){
 let controls='';
 if(stop==='garden'){
   controls=(landed===null?'':primary('advance','Look inside →')+' ')+button('story','▶ Watch the 20-second story');
 }else if(stop==='cutaway'){
   controls=landed===null?primary('go-garden','Take the bee to a flower →'):
   `<input class="range" type="range" id="time" min="0" max="3" step="1" value="${stage}" aria-label="Flower growth" aria-valuetext="${stages[stage].title}">
   <div class="range-ends"><span>Flower</span><strong id="phase-name">${stages[stage].title}</strong><span>Ripe pod</span></div>
   <div class="action-block" id="cutaway-actions">${cutawayActions()}</div>`;
 }else if(stop==='travel'){
   controls=`<div class="controls-row tools" role="group" aria-label="Choose a specimen">${Object.entries(seeds).map(([id,obj])=>button('seed-'+id,obj.name,`aria-pressed="${id===seed}"`)).join('')}</div>
   <div class="controls-row tools" role="group" aria-label="Choose a ride">${[['wind','≋ Wind'],['water','◈ Water'],['animal','🐾 Animal']].map(([i,n])=>button('tool-'+i,n,`aria-pressed="${i===tool}"`)).join('')}</div>
   ${success?primary('go-check','Grow again →'):''}`;
 }else{
   controls=`<div class="controls-row tools" role="group" aria-label="Choose what to plant">${Object.entries(crops).map(([i,c])=>button('crop-'+i,c.name,`aria-pressed="${bed.crop===i}"`)).join('')}</div>
   <div class="controls-row tools">${bed.planted?bed.day===2?button('reset-bed','↻ Start over'):(!bed.moist?primary('water','☂ Make it rain'):primary('elapse','☀ Let time pass')):primary('plant','↓ Plant')}</div>`;
 }
 $('controls').innerHTML=controls;
}
function cutawayActions(){
 return opened?primary('go-travel','Send seeds travelling →'):
 stage===3?primary('crack','Split pod'):'';
}
function draw(focusAction=null){
 // Repainting the scene replaces its buttons. Keep the current keyboard
 // action across automatic and manual landings without moving outside focus.
 const active=document.activeElement;
 const current=active?.closest('#scene,#controls')?active.dataset.action:null;
 const keepFocus=focusAction??current;
 document.querySelectorAll('.stops [data-stop]').forEach(e=>e.dataset.stop===stop?e.setAttribute('aria-current','step'):e.removeAttribute('aria-current'));
 $('chapter').textContent=labels[stop][0];
 $('description').textContent=labels[stop][2];
 showScene();showControls();status();
 if(keepFocus)Array.from(document.querySelectorAll('[data-action]')).find(e=>e.dataset.action===keepFocus)?.focus({preventScroll:true});
}
function move(next){
 stop=next;
 obs=next==='garden'?'':next==='cutaway'?(landed===null?'Visit both mustard plants first.':opened?'The pod splits and scatters its seeds.':timeNote()):
 next==='travel'?travelNote():bed.day===2?crops[bed.crop].shoot:bed.day===1?crops[bed.crop].root:bed.moist?'The soil is damp.':bed.planted?'It’s in the soil.':'';
}
function landOn(i){
 soundtrack.effect('pollen');
 if(source===null){
   source=i;target=null;obs='Pollen sticks to the bee.';return;
 }
 target=i;
 if(pollenPath(source,i,'stigma')==='self'){
   obs='Still on the same plant. Try the other flower.';return;
 }
 landed=i;source=null;stage=0;opened=false;
 obs='Pollen reaches the other flower. That’s pollination.';
}
const flowerAction=/^flower-([01])$/;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function putBee(x,y){
 bx=clamp(x,30,610);by=clamp(y,28,424);
 const insect=$('scene').querySelector('.bee'), hit=$('scene').querySelector('.bee-touch');
 if(insect)insect.style.transform=`translate(${bx}px,${by}px)`;
 if(hit){hit.style.left=`${bx/6.4}%`;hit.style.top=`${by/4.6}%`;}
}
function cancelFlight(){
 clearTimeout(timer);cancelAnimationFrame(frame);demoSerial++;
}
function flyTo(i,ms,after){
 soundtrack.effect('fly');
 const [x,y]=points[i],fx=x+24,fy=y-56;
 if(reduced.matches){putBee(fx,fy);landOn(i);draw();after?.();return;}
 const start=performance.now(),ox=bx,oy=by;
 const moveFrame=now=>{
   const t=Math.min(1,(now-start)/ms), k=t*t*(3-2*t);
   putBee(ox+(fx-ox)*k,oy+(fy-oy)*k-Math.sin(Math.PI*t)*28);
   if(t<1)frame=requestAnimationFrame(moveFrame);
   else{landOn(i);draw();after?.();}
 };
 frame=requestAnimationFrame(moveFrame);
}
function showFlight(){
 cancelFlight();
 const go=demoSerial;
 source=null;target=null;obs='';draw();
 flyTo(0,850,()=>{
   timer=setTimeout(()=>{if(go===demoSerial&&stop==='garden')flyTo(1,1100);},850);
 });
}
document.addEventListener('click',e=>{
 if(performance.now()<suppressUntil&&e.detail!==0)return;
 const raw=e.target.closest('[data-action],[data-stop]');
 if(!raw)return;
 if(raw.dataset.stop&&raw.tagName==='BUTTON'){cancelFlight();move(raw.dataset.stop);draw();return;}
 const id=raw.dataset.action;if(!id)return;
 const f=flowerAction.exec(id);
 cancelFlight();
 if(f){flyTo(Number(f[1]),390);return;}
 if(id==='bee'){showFlight();return;}
 if(id==='story'){openStory();return;}
 if(id==='advance'){move('cutaway');}
 else if(id==='crack'&&stage===3){soundtrack.effect('pod');opened=true;obs='The pod splits and scatters its seeds.';}
 else if(id.startsWith('go-'))move(id.slice(3));
 else if(id.startsWith('seed-')){seed=id.slice(5);tool=null;success=null;obs='';}
 else if(id.startsWith('tool-')){tool=id.slice(5);success=disperse(seed,tool);obs=travelNote();}
 else if(id.startsWith('crop-')){const crop=id.slice(5);if(crop!==bed.crop){bed=startBed(crop);obs='';}}
 else if(id==='reset-bed'){bed=startBed(bed.crop);obs='';}
 else if(id==='plant'||id==='water'||id==='elapse'){
   if(id==='water')soundtrack.effect('rain');
   bed=tend(bed,id==='elapse'?'time':id);
   obs=bed.day===2?crops[bed.crop].shoot:bed.day===1?crops[bed.crop].root:bed.moist?'Rain dampens the soil.':'It’s in the soil.';
 }
 draw(e.detail===0?id:null);
});
$('controls').addEventListener('input',e=>{
 if(e.target.id!=='time')return;
 const next=Number(e.target.value);
 if(next!==stage){stage=next;opened=false;}
 e.target.setAttribute('aria-valuetext',stages[stage].title);
 $('phase-name').textContent=stages[stage].title;
 $('cutaway-actions').innerHTML=cutawayActions();
 obs=timeNote();showScene();status();
});
$('scene').addEventListener('pointerdown',e=>{
 const node=e.target.closest('[data-action]');
 if(!node||!e.isPrimary||e.button!==0||stop!=='garden')return;
 cancelFlight();
 if(node.dataset.action!=='bee')return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY};
 soundtrack.effect('fly');
 node.setPointerCapture(e.pointerId);
});
const realDrag=e=>Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>=5;
function gardenPoint(e){
 const r=$('scene').getBoundingClientRect();
 return [(e.clientX-r.left)*640/r.width,(e.clientY-r.top)*460/r.height];
}
document.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId||!realDrag(e))return;
 putBee(...gardenPoint(e));
});
document.addEventListener('pointerup',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 const moved=realDrag(e);drag=null;
 if(!moved)return;
 suppressUntil=performance.now()+140;
 const [x,y]=gardenPoint(e);
 const i=points.findIndex(([fx,fy])=>Math.hypot(x-fx,y-fy)<85);
 if(i!==-1){putBee(points[i][0]+24,points[i][1]-56);landOn(i);}
 else{putBee(x,y);}
 draw();
});
document.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){drag=null;draw();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelFlight();void soundtrack.visibility();});
draw();
if(!reduced.matches)timer=setTimeout(showFlight,1400);
