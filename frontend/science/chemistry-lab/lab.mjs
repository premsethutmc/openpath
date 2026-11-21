import {materials,stations,reactions} from './catalog.mjs';
import {start,use,tick,view} from './lab-model.mjs';
const $=id=>document.getElementById(id);
let mode='beaker', pour=null;
const states={beaker:start(),crucible:start('crucible')};
function safeText(node,t){if(node.textContent!==t)node.textContent=t;}
function render(){
  const s=states[mode],d=view(s),scene=document.querySelector('.scene');
  scene.classList.toggle('metal',mode==='crucible');
  scene.classList.toggle('hot',s.heat);
  scene.classList.toggle('fizz',d.fizz);
  scene.style.setProperty('--fill',Math.min(92,d.water*2)+'%');
  const solids=mode==='beaker'?d.solidSalt+(s.amounts.baking??0):d.cu+d.zn;
  scene.style.setProperty('--solid',solids?Math.min(70,8+solids*7)+'%':'0%');
  const hue=d.cu&&d.zn&&!s.mixed?'linear-gradient(90deg,#b36248,#a7aeac)':d.cu?'#b36248':'#a7aeac';
  const brass=`hsl(${27+(100-d.copperShare)*.53} 55% 52%)`;
  scene.style.setProperty('--grain',mode==='beaker'?'#f5e7ad':s.mixed?brass:hue);
  safeText($('observation'),d.message);
  const reaction=reactions.find(r=>r.id===s.reaction);
  const info=mode==='beaker'?(reaction?reaction.equation+' · ':'')+
    (d.dissolved>0?'Table salt is dissolved in the liquid. ':'')+
    ((s.gas.water??0)>0?'Water vapour has left the beaker.':''):
    (d.cu+d.zn?`${d.copperShare}% copper and ${100-d.copperShare}% zinc by model parts. ${s.mixed?'Brass is a family of alloys, not one fixed recipe.':''}`:'No metals added.');
  safeText($('evidence'),info||'No additional observations yet.');
  safeText($('heat'),s.heat?'Turn off heater':'Turn on heater');
  $('heat').setAttribute('aria-pressed',String(s.heat));
}
function action(kind,id){states[mode]=use(states[mode],kind,id);safeText($('status'),states[mode].change);render();}
const amount=(n)=>n.toFixed(1)+' units';
function meter(n){$('meter').value=n;safeText($('dose-value'),amount(n));}
function stopPour(){
  if(!pour)return;
  clearInterval(pour.timer);
  pour.button.classList.remove('pouring');
  document.querySelector('.scene').classList.remove('pouring');
  if(pour.count>0)safeText($('status'),materials[pour.id].name+': '+amount(pour.count)+' added.');
  pour=null;
}
function pourStep(id){
  const old=states[mode];
  const n=use(old,'add',id,.2);
  states[mode]=n;
  if(n.doses>old.doses && pour){
    pour.count+=.2;
    meter(pour.count);
    if(pour.count>=4.99)stopPour();
  }else if(n.doses===old.doses){
    stopPour();
    safeText($('status'),n.change);
  }
  render();
}
function select(station){
  stopPour();meter(0);
  mode=station;
  for(const id of Object.keys(stations))$(id).setAttribute('aria-pressed',String(id===mode));
  safeText($('question'),stations[mode].question);
  const shelf=stations[mode].tools.map(id=>{
    const button=document.createElement('button');
    button.className='jar';
    const icon=document.createElement('span');
    icon.className='bottle';icon.dataset.material=id;
    icon.setAttribute('aria-hidden','true');
    button.append(icon,document.createTextNode(materials[id].name));
    button.title=materials[id].formula;
    button.addEventListener('pointerdown',event=>{
      if(!event.isPrimary || event.button!==0)return;
      stopPour();meter(0);
      button.setPointerCapture(event.pointerId);
      button.classList.add('pouring');
      document.querySelector('.scene').classList.add('pouring');
      pour={id,button,count:0,timer:setInterval(()=>pourStep(id),90)};
      pourStep(id);
    });
    for(const key of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(key,stopPour);
    button.addEventListener('click',event=>{
      if(event.detail!==0)return;
      stopPour();meter(0);
      const before=states[mode].doses;
      states[mode]=use(states[mode],'add',id,.2);
      if(states[mode].doses>before)meter(.2);
      safeText($('status'),states[mode].change);render();
    });
    return button;
  });
  $('shelf').replaceChildren(...shelf);safeText($('status'),'');render();
}
for(const id of Object.keys(stations))$(id).addEventListener('click',()=>select(id));
$('heat').addEventListener('click',()=>action('heat'));
$('reset').addEventListener('click',()=>{stopPour();meter(0);states[mode]=start(mode);safeText($('status'),'Clean vessel ready.');render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPour();});
window.addEventListener('blur',stopPour);
setInterval(()=>{if(document.hidden)return;states[mode]=tick(states[mode],.2);render();},200);
select(mode);
