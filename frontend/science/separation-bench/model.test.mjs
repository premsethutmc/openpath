import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,start,tick,total,levels} from './model.mjs';
const advance=(s,sec)=>{for(let t=0;t<sec*2;t++)s=tick(s,.5);return s;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('dose and stirring influence solid vs dissolved salt, not total salt',()=>{
  const low=advance(act(act(start(),'water',5),'stir'),5);
  const high=advance(act(act(start(),'water',40),'stir'),5);
  const still=advance(act(start(),'water',40),5);
  near(low.pot.ions,1.8);
  near(high.pot.ions,12);
  assert.ok(still.pot.ions<high.pot.ions);
  near(total(low).salt,total(high).salt);
});
test('a premature filter transports less dissolved salt and leaves crystals with the sand',()=>{
  let s=act(start(),'water',40);
  const early=act(s,'filter');
  s=act(advance(act(s,'stir'),4),'filter');
  near(early.pot.salt,12);
  near(s.cup.ions,12);
  near(s.pot.sand,10);
  near(act(s,'return').pot.ions,12);
});
test('you can recover water and salt, or let water escape and still recover salt',()=>{
  const low=act(start('brine'),'filter');
  let s=act(low,'heat',3);
  s=advance(s,7);
  assert.ok(s.air>0&&s.cup.water>0);
  s=advance(act(s,'trap'),70);
  near(s.cup.salt,10);
  assert.ok(s.receiver>0 && s.air>0);
  near(s.cup.water,0);
  near(total(s).water,28);
  const all=advance(act(act(low,'heat',3),'trap'),75);
  near(all.receiver,28);
  near(all.air,0);
  assert.ok(advance(act(low,'heat',1),7).cup.water>advance(act(low,'heat',3),7).cup.water);
});
test('mass and nonnegative quantities survive arbitrary orders and doses',()=>{
  const tools=[['water',5],['water',15],['water',40],['filter'],['return'],['stir'],['trap'],['heat',0],['heat',1],['heat',3],['target','pot'],['target','cup']];
  for(const level of Object.keys(levels)){
    let s=start(level), base=total(s), seed=11;
    for(let i=0;i<300;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      s=advance(act(s,...tools[seed%tools.length]),2);
      const t=total(s);
      near(t.water,base.water+s.added);
      near(t.salt,base.salt);
      near(t.sand,base.sand);
      assert.ok([...Object.values(s.pot),...Object.values(s.cup),s.air,s.receiver].every(x=>Number.isFinite(x)&&x>=-1e-9));
    }
  }
});
