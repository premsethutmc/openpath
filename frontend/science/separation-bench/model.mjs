// Classroom model: grams, simulated seconds, fixed solubility. Not a real apparatus guide.
export const levels = Object.freeze({ mix:[0,0,12,10], brine:[28,10,0,0], salty:[12,4,12,6] });
export const capacity = .36;
export const vessels = ['pot','cup'];
export const total = s => ({
  water:s.pot.water+s.cup.water+s.receiver+s.air,
  salt:s.pot.ions+s.pot.salt+s.cup.ions+s.cup.salt,
  sand:s.pot.sand+s.cup.sand,
});
const room = 22;
const batch = (water=0,ions=0,salt=0,sand=0)=>({water,ions,salt,sand,temp:room});
export function start(level='mix'){
  if(!Object.hasOwn(levels,level)) throw new RangeError('Unknown mixture');
  return {level,pot:batch(...levels[level]),cup:batch(),air:0,receiver:0,seconds:0,added:0,heat:0,on:'cup',stir:false,trap:false};
}
function copy(s){return {...s,pot:{...s.pot},cup:{...s.cup}};}
export function act(s,type,value){
  const n=copy(s);
  switch(type){
    case 'water':
      if(![5,15,40].includes(value)) throw new RangeError('Unknown dose');
      if(n.added+value>120) return s;
      n.added+=value; n.pot.water+=value; break;
    case 'stir': n.stir=!s.stir; break;
    case 'trap': n.trap=!s.trap; break;
    case 'heat':
      if(![0,1,2,3].includes(value)) throw new RangeError('Unknown power');
      n.heat=value; break;
    case 'target':
      if(!vessels.includes(value)) throw new RangeError('Unknown vessel');
      n.on=value; break;
    case 'filter': {
      // Ideal filtration pours liquid and dissolved salt through; residue stays in the mixing vessel.
      const amount=n.cup.water+n.pot.water;
      if(amount) n.cup.temp=(n.cup.temp*n.cup.water+n.pot.temp*n.pot.water)/amount;
      n.cup.water+=n.pot.water; n.pot.water=0;
      n.cup.ions+=n.pot.ions; n.pot.ions=0;
      break;
    }
    case 'return': {
      const amount=n.cup.water+n.pot.water;
      if(amount) n.pot.temp=(n.cup.temp*n.cup.water+n.pot.temp*n.pot.water)/amount;
      for(const key of ['water','ions','salt','sand']) n.pot[key]+=n.cup[key];
      n.cup=batch(); break;
    }
    default: throw new RangeError('Unknown action');
  }
  return n;
}
export function tick(s,dt){
  if(!Number.isFinite(dt)||dt<0||dt>1) throw new RangeError('Invalid clock step');
  const n=copy(s); n.seconds+=dt;
  for (const v of vessels){
    const b=n[v];
    const active=v===n.on && n.heat>0;
    const aim=active?100:room;
    const pace=active?.16*n.heat/(1+b.water/55):.15;
    b.temp+=(aim-b.temp)*(1-Math.exp(-pace*dt));
    const available=Math.max(0,capacity*b.water-b.ions);
    const dissolved=Math.min(b.salt, available, (v==='pot'&&n.stir?4:.24)*dt);
    b.ions+=dissolved; b.salt-=dissolved;
    if(active && b.temp>44){
      const evap=Math.min(b.water,n.heat*.94*(b.temp-44)/56*dt);
      b.water-=evap;
      if(n.trap) n.receiver+=evap; else n.air+=evap;
    }
    const crystal=Math.max(0,b.ions-capacity*b.water);
    b.salt+=crystal; b.ions-=crystal;
  }
  return n;
}
