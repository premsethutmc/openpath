import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HANDWRITING_ENABLED} from './features';
import {createWork,addStroke,manual,confirm,packet,divisionLayout} from './model';
test('handwriting policy is disabled independently of role, URL and saved work',()=>{
 assert.equal(HANDWRITING_ENABLED,false);
});
test('keyboard confirmation preserves archived ink coordinates, metadata and correction history',()=>{
 const layout=divisionLayout('379','3'),r=layout.regions[0];
 let w=createWork('archive',{id:'division:379:3',statement:'379 ÷ 3'},layout);
 const stroke={id:'historic-pen',pointerType:'pen' as const,startedAt:'2026-10-19T10:00:00Z',regionId:r.id,width:3,tool:'ink' as const,points:[{x:r.x+2,y:r.y+2,t:10,pressure:0.4,tiltX:0,tiltY:0,twist:0},{x:r.x+8,y:r.y+8,t:20,pressure:0.7,tiltX:0,tiltY:0,twist:0}]};
 w=addStroke(w,stroke);
 const prior=structuredClone(w);
 w=manual(w,r.id,'126','keyboard');
 w=confirm(w,w.tokens[0].id,'127','keyboard');
 assert.deepEqual(w.strokes,prior.strokes);assert.deepEqual(w.erased,prior.erased);
 assert.equal(w.corrections.at(-1)!.method,'keyboard');
 assert.equal(w.corrections.at(-1)!.from,'126');
 assert.equal(packet(w).steps[0].text,'127');assert.deepEqual(packet(w).strokes,prior.strokes);
 assert.ok(w.history.length>prior.history.length);
});
