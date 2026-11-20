import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start,use,tick,view,atoms} from './lab-model.mjs';
import {reactions,stations,materials} from './catalog.mjs';
const step=(s,n=10)=>{for(let i=0;i<n;i++)s=tick(s,.2);return s;};
test('reaction rules conserve atoms and their station and inputs exist',()=>{
  for(const r of reactions){
    assert.ok(stations[r.station]);
    assert.deepEqual(atoms(r.in),atoms({...r.out,...r.gas}));
  }
  for(const {tools} of Object.values(stations))for(const id of tools)assert.ok(materials[id].dose);
});
test('a measured pour adds in small units and common salt survives solvent evaporation',()=>{
  let s=use(use(start(),'add','water',.4),'add','salt',.2);
  assert.ok(Math.abs(s.doses-.6)<1e-9);
  assert.ok(view(s).dissolved>.3);
  s=step(use(s,'heat'),35);
  assert.equal(view(s).water,0);
  assert.equal(view(s).solidSalt,.4);
  assert.ok(Math.abs(s.gas.water-8)<1e-9);
  assert.throws(()=>use(s,'add','water',NaN));
});
test('changing order works and limiting reactant controls the fizz',()=>{
  for(const [first,second] of [['baking','vinegar'],['vinegar','baking']]){
    let s=use(use(start(),'add',first,.4),'add',second,.2);
    assert.equal(view(s).fizz,true);
    s=step(s);
    assert.ok(Math.abs(s.gas.carbon-.2)<1e-9);
    assert.equal(view(s).fizz,false);
    assert.equal(use(s,'heat').heat,false);
    for(const [id,n] of Object.entries(atoms(s.fed))){
      const a=atoms(s.amounts)[id]??0,b=atoms(s.gas)[id]??0;
      assert.ok(Math.abs(n-a-b)<1e-8);
    }
  }
});
test('metals stay separate until virtual blending, keep their amounts, and change ratio',()=>{
  let s=use(start('crucible'),'add','copper',.6);
  s=step(use(s,'heat'),20);
  assert.equal(s.mixed,false);
  s=use(s,'add','zinc',.4);
  assert.equal(s.mixed,false);
  s=step(s,2);
  assert.equal(s.mixed,true);
  assert.equal(view(s).copperShare,60);
  assert.equal(s.amounts.copper,.6);assert.equal(s.amounts.zinc,.4);
  assert.match(use(s,'add','water').change,/not supported/);
});
