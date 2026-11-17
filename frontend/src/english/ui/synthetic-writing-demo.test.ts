import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SyntheticWritingWorkflow,SYNTHETIC_WRITING_SAMPLE} from '../logic/exam-diagnostic/workflow';
(globalThis as {React?:unknown}).React=React;
const {SyntheticWritingDemo,SyntheticWritingDemoView}=await import('./SyntheticWritingDemo');
const render=(flow:SyntheticWritingWorkflow)=>renderToStaticMarkup(React.createElement(SyntheticWritingDemoView,{state:flow.snapshot(),onAnalyse(){},onAnswer(){},onFinish(){},onReset(){}}));
test('example has fixed invented sample, no learner input and explicit limits',()=>{
 const html=renderToStaticMarkup(React.createElement(SyntheticWritingDemo));
 assert.ok(html.includes(SYNTHETIC_WRITING_SAMPLE));
 assert.match(html,/never your writing/);assert.match(html,/No real model runs/);
 assert.match(html,/Your saved writing remains unassessed/);
 assert.ok(!html.includes('<textarea'));assert.ok(!html.includes('<input'));
});
test('fixture suggestions and answer explanations stay hidden until all checks finish',async()=>{
 const flow=new SyntheticWritingWorkflow();await flow.analyse();
 let html=render(flow);assert.match(html,/Simulated observations, not confirmed gaps/);
 assert.ok(!html.includes('Fixture suggestion:'));
 for(const q of flow.snapshot().checks){assert.ok(!html.includes(q.explanation));flow.answer(q.id,(q.answer+1)%q.options.length);}
 flow.finishChecks();html=render(flow);
 assert.match(html,/Practice suggested on these checks/);assert.match(html,/Targeted lesson/);
 assert.match(html,/Fixture suggestion:/);assert.match(html,/Not mastery or an exam score/);
});
test('reset does not offer already exposed questions as new evidence',async()=>{
 const flow=new SyntheticWritingWorkflow();await flow.analyse();flow.reset();await flow.analyse();
 const html=render(flow);assert.ok(!html.includes('<fieldset'));
 assert.match(html,/No fresh pair is available/);
 assert.match(html,/Inconclusive evidence/);assert.ok(!html.includes('Targeted lesson'));
});
