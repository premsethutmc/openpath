import {materials,stations,reactions,alloys} from './catalog.mjs';
const valid=(map,id)=>Object.hasOwn(map,id);
const get=(bag,id)=>bag[id]??0;
const add=(bag,id,n)=>{bag[id]=get(bag,id)+n;};
function copy(s){return {...s,amounts:{...s.amounts},gas:{...s.gas},fed:{...s.fed}};}
export function start(station='beaker'){
  if(!valid(stations,station))throw new RangeError('Unknown station');
  return {station,amounts:{},gas:{},fed:{},heat:false,warm:0,mixed:false,doses:0,change:'',reaction:null,extent:0};
}
export function use(s,action,id,fraction=1){
  const n=copy(s);n.change='';
  if(action==='add'){
    if(!stations[s.station].tools.includes(id)){n.change='That material is not supported in this vessel.';return n;}
    if(!Number.isFinite(fraction)||fraction<=0||fraction>1)throw new RangeError('Invalid measured dose');
    if(s.doses+fraction>30.000001){n.change='The vessel is full. Start with a clean one.';return n;}
    if(s.station==='beaker'&&s.heat&&['vinegar','baking'].includes(id)){
      n.change='Turn off the heater first. Heating this mixture is not modelled.';return n;
    }
    const dose=materials[id].dose;
    for(const [key,count] of Object.entries(dose)){add(n.amounts,key,count*fraction);add(n.fed,key,count*fraction);}
    n.doses+=fraction;n.change=materials[id].name+' added.';
    if(s.station==='crucible')n.mixed=false;
  }else if(action==='heat'){
    if(!s.heat&&s.station==='beaker'&&['acid','baking','acetate'].some(k=>get(s.amounts,k)>1e-8)){
      n.change='Heating this mixture is not modelled in the lab yet.';return n;
    }
    n.heat=!n.heat;n.change=n.heat?'Heater on.':'Heater off.';
  }else throw new RangeError('Unknown action');
  return n;
}
export function tick(s,dt){
  if(!Number.isFinite(dt)||dt<0||dt>1)throw new RangeError('Invalid step');
  const n=copy(s);
  n.warm=Math.max(0,Math.min(1,s.warm+(s.heat?.46:-.6)*dt));
  for(const rule of reactions){
    if(rule.station!==s.station||get(n.amounts,'water')<=0)continue;
    const limit=Math.min(...Object.entries(rule.in).map(([key,coeff])=>get(n.amounts,key)/coeff),1.5*dt);
    if(limit<=0)continue;
    for(const [key,k] of Object.entries(rule.in))add(n.amounts,key,-limit*k);
    for(const [key,k] of Object.entries(rule.out))add(n.amounts,key,limit*k);
    for(const [key,k] of Object.entries(rule.gas))add(n.gas,key,limit*k);
    n.reaction=rule.id;n.extent=limit;
  }
  if(n.station==='beaker'&&n.heat&&n.warm>.55){
    const evap=Math.min(get(n.amounts,'water'),28*dt);
    if(evap>0){add(n.amounts,'water',-evap);add(n.gas,'water',evap);}
  }
  if(n.station==='crucible'&&n.heat&&n.warm>=1){
    n.mixed=alloys.some(rule=>rule.station===n.station&&rule.ingredients.every(key=>get(n.amounts,key)>0));
  }
  return n;
}
export function view(s){
  const w=get(s.amounts,'water'),salt=get(s.amounts,'salt'),dissolved=Math.min(salt,.1*w);
  const cu=get(s.amounts,'copper'),zn=get(s.amounts,'zinc');
  let message='Pick a material to put in the '+stations[s.station].name.toLowerCase()+'.';
  if(s.station==='beaker'&&s.doses){
    message=w>0?'There is liquid in the beaker.':'There is no liquid left.';
    if(salt>0)message=dissolved>0?(salt-dissolved>1e-8?'Some salt has dissolved. Some is still solid.':'The salt has dissolved, but it is still here.'):'Solid salt stays behind.';
    if(s.reaction) message=get(s.amounts,'acid')>1e-8&&get(s.amounts,'baking')>1e-8?'Bubbles of carbon dioxide escape.':'The fizz stops when one reactant runs out. Some carbon dioxide has escaped.';
  }else if(s.station==='crucible'&&s.doses){
    message=s.mixed?'The metals are blended. This is an alloy, not a compound with one fixed formula.':cu&&zn?'Both metals are in the crucible but are not yet blended.':'Only one metal is present. It cannot form a copper–zinc alloy alone.';
  }
  return {water:w,solidSalt:salt-dissolved,dissolved,cu,zn,copperShare:cu+zn?Math.round(cu/(cu+zn)*100):0,
    fizz:s.station==='beaker'&&get(s.amounts,'acid')>1e-8&&get(s.amounts,'baking')>1e-8&&w>0,
    message};
}
export function atoms(bag){
  const out={};
  for(const [id,n] of Object.entries(bag)){
    if(!valid(materials,id)||!materials[id].atoms)throw new RangeError('Unknown species');
    for(const [a,count] of Object.entries(materials[id].atoms))add(out,a,n*count);
  }
  return out;
}
