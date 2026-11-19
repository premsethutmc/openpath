import test from 'node:test';import assert from 'node:assert/strict';
import {suite,manifest,requestDigest,referenceDigest,promptDigest,fixture,score,mockReport} from '../../../../../experiments/rewrite-semantics/check.mts';
import {wordCount} from '../../../../../packages/english-core/src/index.ts';
const base={suite:suite.id,referenceDigest,promptDigest,requestDigest,mode:'mock-contract' as const};
test('paired synthetic cases are original bounded inputs; manifests contain requests not reference answers',()=>{
 assert.equal(suite.cases.length,8);assert.equal(new Set(suite.cases.map(c=>c.id)).size,8);for(const c of suite.cases){assert.ok(wordCount(c.rewrite)>=20&&wordCount(c.rewrite)<=50);assert.ok(c.original.includes(c.idea));if(c.match)assert.ok(c.rewrite.includes(c.match));}
 for(const row of manifest().requests){assert.equal(row.body.task,'rewrite');assert.equal(row.body.data_use,'synthetic_test');assert.equal('expected' in row.body.request,false);}
});
test('reference fixtures test wiring and coaching, never measured model performance',()=>{
 const report=mockReport().reference;assert.equal(report.releaseReady,false);assert.equal(report.semanticAccuracyEstablished,false);assert.equal(report.coverage.recorded,8);for(const c of report.cases){assert.equal(c.ratingAgreement,true,c.id);assert.equal(c.mappingAgreement,true,c.id);assert.equal(c.questionAgreement,true,c.id);}
});
test('semantically wrong quoted mappings pass contract but fail reference checks',()=>{
 const report=mockReport().adversarialFalsePreservation;assert.equal(report.coverage.missing,4);for(const c of report.cases.filter(c=>c.status==='scored')){assert.equal(c.meaningStatus,'accepted');assert.equal(c.ratingAgreement,false);assert.equal(c.mappingAgreement,false);assert.equal(c.questionAgreement,false);}
});
test('false omissions on faithful rewrites produce unnecessary questions despite valid contracts',()=>{
 const report=mockReport().adversarialFalseOmission;for(const c of report.cases.filter(c=>c.status==='scored')){assert.equal(c.meaningStatus,'accepted');assert.equal(c.ratingAgreement,false);assert.equal(c.questionAgreement,false);}
});
test('missing denominator and stale/duplicate/unknown records cannot be silently accepted',()=>{
 assert.equal(score({...base,results:[]}).coverage.missing,8);assert.throws(()=>score({...base,promptDigest:'stale',results:[]}));const c=suite.cases[0],row={id:c.id,output:fixture(c)};assert.throws(()=>score({...base,results:[row,row]}));assert.throws(()=>score({...base,results:[{...row,id:'unknown'}]}));
});
test('contradictory duplicate focal mappings and missing provider provenance are explicit',()=>{
 const c=suite.cases[0],raw=fixture(c);raw.key_ideas.push({original_quote:c.idea,rewrite_quote:null});const out=score({...base,results:[{id:c.id,output:raw}]}).cases[0];assert.equal(out.mappingAgreement,false);assert.equal(out.duplicateFocalMappings,true);
 assert.throws(()=>score({...base,mode:'provider-recording',results:[]}),/provenance/);
});
