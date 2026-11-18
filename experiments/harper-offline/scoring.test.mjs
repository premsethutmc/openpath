import test from 'node:test';
import assert from 'node:assert/strict';
import {overlapCandidates,requiredAnnotations} from './scoring.mjs';
test('style is not a required grammar error',()=>assert.equal(requiredAnnotations({kind:'language',annotations:[{kind:'error'},{kind:'style'}]}).length,1));
test('repeated reference spans fail closed',()=>assert.deepEqual(overlapCandidates('go go','go',[{start:0,end:2}]),[]));
test('unicode spans use scalar offsets, not UTF16 offsets',()=>assert.equal(overlapCandidates('😀 say','say',[{start:2,end:5}]).length,1));
test('adjacent spans and absent text do not match',()=>{assert.deepEqual(overlapCandidates('say now','say',[{start:3,end:7}]),[]);assert.deepEqual(overlapCandidates('say','go',[{start:0,end:3}]),[]);});

test('optional grammar and argument references do not count',()=>{for(const kind of ['language','argument'])assert.equal(requiredAnnotations({kind,annotations:[{kind:'error',optional:true}]}).length,0);});
