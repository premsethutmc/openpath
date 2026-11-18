import test from 'node:test';import assert from 'node:assert/strict';
import {exposureStore} from './exposure.ts';
function storage(initial:string|null=null){let value=initial;return {getItem:()=>value,setItem:(_k:string,v:string)=>{value=v;}};}
test('exposure claims retain baseline and own IDs without leaking mutable arrays',()=>{
 const disk=storage('["old"]'),s=exposureStore(disk);s.read().push('tampered');s.claim(['new']);s.claim(['new','next']);
 assert.deepEqual(s.read(),['old','new','next']);assert.deepEqual(exposureStore(disk).read(),s.read());
});
test('two sitting ledgers cannot silently merge competing exposure claims',()=>{
 const disk=storage(),a=exposureStore(disk),b=exposureStore(disk);a.claim(['q']);
 assert.throws(()=>b.claim(['q']),/another tab/);assert.throws(()=>b.read(),/another tab/);
 assert.deepEqual(a.read(),['q']);
});
test('cleared, corrupt and unavailable storage fail closed',()=>{
 assert.throws(()=>exposureStore(storage('{')));assert.throws(()=>exposureStore(storage('[3]')));
 const disk=storage(),s=exposureStore(disk);s.claim(['q']);disk.setItem('', '[]');assert.throws(()=>s.claim(['next']));
 const broken=exposureStore({getItem:()=>null,setItem:()=>{throw Error('quota');}});assert.throws(()=>broken.claim(['q']));assert.deepEqual(broken.read(),[]);
});
