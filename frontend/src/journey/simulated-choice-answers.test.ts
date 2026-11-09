import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { question } from '../../../packages/learning/src/content';
import { phasePool } from '../../../packages/learning/src/families';
import { gradeRequest } from '../../../packages/learning/src/server-grader';
import { answerOf, wrongOf } from './subskill-scenarios';
import { wrongShaped } from './wrong-answers';
import { wrong } from './learners';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const ids = ['pow','subst','aqfp','ahtri','expand','disc','lin','atval'].flatMap(f => phasePool(f,'check').filter(id => !id.endsWith(':mc') && !id.endsWith(':w')).slice(0,3).map(id => `${id}:mc`)).concat(['aspar','asoct','avdfact'].flatMap(f => phasePool(f,'check').slice(0,3)));
test('simulated choice responses preserve letters, and every intended wrong is incorrect in both backend modes', {timeout: 120000}, () => {
  const requests: {id:string;response:string}[] = [];
  for(const id of ids) {
    const q=question(id); assert.ok(q.options?.length); assert.equal(answerOf(id),q.answer);
    for(const helper of [wrongOf,wrongShaped,wrong]) {
      const response=helper(id); assert.match(response,/^[A-D]$/); assert.ok('ABCD'.indexOf(response) < q.options!.length, 'the chosen letter must name a displayed option'); assert.notEqual(response,q.answer);
      assert.equal(gradeRequest({id,response}).verdict,'incorrect'); requests.push({id,response});
    }
  }
  assert.equal(ids.length,33);
  const python=process.env.PYTHON ?? (existsSync(`${root}.venv/bin/python`) ? `${root}.venv/bin/python` : 'python3');
  const r=spawnSync(python,[`${root}research/deep-recovery/results/phase6-sim/server_verdicts.py`],{cwd:`${root}backend`,input:JSON.stringify(requests),encoding:'utf8',timeout:100000,maxBuffer:1<<22});
  assert.equal(r.status,0,`${python}: ${r.error?.message ?? r.stderr}`);
  const verdicts=JSON.parse(r.stdout);
  assert.equal(verdicts.length,requests.length);
  assert.deepEqual(verdicts.filter((v:any)=>v.shadow!=='incorrect'||v.unified!=='incorrect'),[]);
});
