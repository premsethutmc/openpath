import {seeds,days,pollenPath,cycle,disperse,checkTransfer} from './model.mjs';
import {garden,microscope,travel,transferArt} from './art.mjs';
const $=id=>document.getElementById(id);
const targetX=[166,470], targetY=[174,205];
const stages=['garden','cutaway','travel','check'];
const labels={
 garden:['The garden','Choose where the bee lands','Collect pollen from the anthers on one plant. Then try a stigma or a petal. Tap the targets, or drag from anthers to a target.'],
 cutaway:['The flower cutaway','Turn time forward','Pollination is only the first step. Look at the same flower again as the seed develops.'],
 travel:['Beyond the garden','How will it travel?','Choose a specimen. Predict what will move it away from the parent plant, then try a carrier.'],
 check:['A new case','Use what you noticed','A cocklebur is a hooked fruit from a different plant. Use its shape to predict how it travels. Then look at the sprouting potato.'],
};
let windowPath=null, fertilisedFlower=null;
let stop='garden',source=null,to=null,stage=0,seed='dandelion',tool=null,success=null;
let obs='',drag=null,suppressClick=false,answers={};
const btn=(id,label,opts='')=>`<button type="button" data-action="${id}" ${opts}>${label}</button>`;
const overlay=(action,label,x,y,pressed=false)=>btn(action,label,`class="target" style="left:${x/6.4}%;top:${y/4.6}%" aria-pressed="${pressed}"`);
const select=(id,title,options)=>`<label for="${id}">${title}<select id="${id}" data-answer="${id}"><option value="">Choose one</option>${options.map(([k,v])=>`<option value="${k}" ${answers[id]===k?'selected':''}>${v}</option>`).join('')}</select></label>`;
function draw(restore=false){
 const focus=restore?document.activeElement?.dataset?.action:null;
 const [place,heading,description]=labels[stop];
 $('scene-index').textContent=`STATION 0${stages.indexOf(stop)+1}`;
 $('scene-name').textContent=place.toUpperCase();
 $('chapter').textContent=place;
 $('heading').textContent=heading;
 $('description').textContent=description;
 document.querySelectorAll('[data-stop]').forEach(e=>e.dataset.stop===stop?e.setAttribute('aria-current','step'):e.removeAttribute('aria-current'));
 let scene='',controls='';
 if(stop==='garden'){
   const dest=to??source;
   scene=garden(dest===null?320:targetX[dest]+37,dest===null?95:targetY[dest]-32,source!==null);
   for(const i of [0,1]){
     const x=targetX[i],y=targetY[i],letter=i===0?'A':'B';
     scene+=overlay('source-'+i,'Anthers '+letter,x-37,y+35,source===i);
     scene+=overlay('stigma-'+i,'Stigma '+letter,x+52,y-6);
     if(source!==null)scene+=overlay('petal-'+i,'Petal '+letter,x+32,y+89);
   }
   controls=`<p class="minor">Anthers on the stamens make pollen. The stigma at the top of the pistil receives it. These two mustard plants can make seeds together.</p>
   ${btn('advance','Open flower cutaway →',`class="primary" ${cycle(windowPath,0)?'':'disabled'}`)}`;
 }else if(stop==='cutaway'){
   const lesson=cycle(windowPath,stage);
   if(lesson)$('scene-name').textContent='MUSTARD '+(fertilisedFlower===0?'A':'B');
   scene=microscope(lesson?stage:-1);
   controls=lesson?`<div class="controls-row">${['Pollen','Fertilisation','Young pod','Ripe pod'].map((name,i)=>btn('time-'+i,name,`aria-pressed="${i===stage}"`)).join('')}</div>
   <p class="minor"><strong>${lesson.title}</strong> · Step ${stage+1} of ${days.length}</p>${stage<3?btn('next-time','See what changes next →','class="primary"'):btn('go-travel','Follow the seeds →','class="primary"')}`:
   btn('go-garden','Go back to the garden','class="primary"');
 }else if(stop==='travel'){
   scene=travel(seed,tool,success);
   controls=`<div class="controls-row" role="group" aria-label="Choose a specimen">${Object.entries(seeds).map(([id,obj])=>btn('seed-'+id,obj.name,`aria-pressed="${id===seed}"`)).join('')}</div>
   <div class="controls-row" role="group" aria-label="Try a carrier">${[['wind','Wind'],['water','Water'],['animal','Passing animal']].map(([id,name])=>btn('tool-'+id,name,`aria-pressed="${id===tool}"`)).join('')}</div>
   ${btn('go-check','Try a new case →','class="primary"')}`;
 }else{
   scene=transferArt();
   controls=select('carrier','What carries a hooked burr?', [['wind','Wind'],['water','Water'],['animal','Passing animal']])
     +select('reason','What feature supports that prediction?', [['plume','A feathery tuft'],['float','A floating husk'],['hook','Hooks that catch on fur']])
     +select('propagation','Which part can grow into another potato plant?', [['potato-eye','An eye on the tuber'],['plain-peel','A piece of peel with no eye'],['pollen','A pollen grain by itself']])
     +btn('judge','Check my explanation','class="primary"');
 }
 $('scene').innerHTML=scene;
 $('controls').innerHTML=controls;
 $('observation').textContent=obs;
 if(focus)Array.from(document.querySelectorAll('[data-action]')).find(e=>e.dataset.action===focus)?.focus({preventScroll:true});
}
function move(where){
 stop=where;
 obs=where==='cutaway'?(cycle(windowPath,stage)?.detail??'Pollinate across the two plants first. Here the unpollinated flower has no seed developing.'):
  where==='travel'&&tool?(success?seeds[seed].feature:'That carrier did not move this specimen far in the model. Try another.'):
  '';
}
function land(i,part){
 if(source===null){obs='Collect pollen from an anther first.';return;}
 to=i;
 const outcome=pollenPath(source,i,part);
 if(outcome==='miss'){obs='Pollen on a petal does not pollinate the flower. Try the stigma.';return;}
 if(outcome==='self'){obs='This is self-pollination. Some plants make seeds this way. This kind of mustard needs compatible pollen from another plant; try its stigma.';return;}
 stage=0;
 windowPath=outcome;
 fertilisedFlower=i;
 obs='Cross-pollination! Pollen from one plant landed on the stigma of another. A seed has not formed yet. Open the cutaway to find out what happens next.';
}
document.addEventListener('click',e=>{
 if(suppressClick&&e.detail!==0)return;
 const raw=e.target.closest('[data-action],[data-stop]');
 if(!raw)return;
 if(raw.dataset.stop){move(raw.dataset.stop);draw();return;}
 const id=raw.dataset.action;
 const [kind,value]=id.split('-');
 if(kind==='source'){source=Number(value);to=null;obs='The bee has pollen. Try the stigma on this flower or on the other plant.';}
 if(kind==='stigma'||kind==='petal')land(Number(value),kind);
 if(id==='advance')move('cutaway');
 if(kind==='go')move(value);
 if(kind==='time'||id==='next-time'){
   stage=kind==='time'?Number(value):Math.min(3,stage+1);
   obs=cycle(windowPath,stage)?.detail??'';
 }
 if(kind==='seed'){seed=value;tool=null;success=null;obs='';}
 if(kind==='tool'){
   tool=value;success=disperse(seed,tool);
   obs=success?seeds[seed].feature:'That carrier did not move this specimen far in the model. Try another.';
 }
 if(id==='judge'){
   const result=checkTransfer(answers), list=Object.values(result);
   if(list.includes('unanswered'))obs='Make all three choices before checking your explanation.';
   else if(list.every(e=>e==='correct'))obs='Yes. The hooks catch on fur, and a potato eye is a bud on the tuber. The bud can sprout without pollination or a seed.';
   else if(result.carrier!=='correct'||result.reason!=='correct')obs='Look at the burr’s hooks. What could they hold onto as it moves? Revisit the seed station if you want to test it.';
   else obs='You matched the burr to its carrier. Now look closely at where the potato shoot starts.';
 }
 draw(true);
});
$('controls').addEventListener('change',e=>{if(e.target.dataset.answer)answers[e.target.dataset.answer]=e.target.value;});
$('scene').addEventListener('pointerdown',e=>{
 const node=e.target.closest('[data-action^="source-"]');
 if(!node || e.button!==0 || !e.isPrimary)return;
 drag={id:e.pointerId,source:Number(node.dataset.action.at(-1)),x:e.clientX,y:e.clientY};
 node.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10)return;
 const svg=$('scene').querySelector('svg'),bee=svg.querySelector('.bee'),r=svg.getBoundingClientRect();
 bee.style.transition='none';
 bee.style.transform=`translate(${(e.clientX-r.left)*640/r.width}px,${(e.clientY-r.top)*460/r.height}px)`;
});
document.addEventListener('pointerup',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 const before=drag;drag=null;
 if(Math.hypot(e.clientX-before.x,e.clientY-before.y)<10)return;
 suppressClick=true;setTimeout(()=>suppressClick=false,100);
 source=before.source;to=null;
 const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-action^="stigma-"],[data-action^="petal-"]');
 if(el){const [part,index]=el.dataset.action.split('-');land(Number(index),part);}
 else obs='The bee picked up pollen. Now try landing on a stigma.';
 draw();
});
document.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){drag=null;draw();}});
draw();
