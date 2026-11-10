// Dependency-free, offline reviewer preview. No learner registration or persistence.
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(readFileSync(new URL('../../packages/learning/src/primary/tally.ts', import.meta.url), 'utf8'));
const output = process.argv[2] || '/tmp/openpath-tally-review.html';
writeFileSync(output, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tally draft review</title><style>body{font:18px system-ui;max-width:850px;margin:32px auto;padding:16px;color:#163a59;background:#f4f8fb}section{background:white;padding:24px;margin:20px 0;border-radius:12px}svg{max-width:330px;width:100%}button,input{font:inherit;padding:10px;margin:5px}button{cursor:pointer}label{display:block}td,th{text-align:left;padding:8px}#feedback{min-height:2em}</style><h1>Keep a count with tally marks</h1><p>Draft reviewer preview · original examples · not educator reviewed · not in learner releases.</p><section><h2>Learn</h2><ol id="steps"></ol><div id="worked"></div><p id="example"></p></section><section><h2>Try it</h2><label>Activity <select id="mode"><option value="read">Read marks</option><option value="record">Record a count</option><option value="compare">Complete and compare rows</option></select></label><p id="prompt"></p><div id="figure"></div><div id="record"><button id="add">Add one mark</button><button id="undo">Undo one mark</button><button id="clear">Clear marks</button></div><div id="fields"><label>Answer <input id="answer" inputmode="numeric" autocomplete="off"></label></div><button id="check">Check</button><button id="next">Next example</button><p id="feedback" role="status" aria-live="polite"></p></section><script type="module">
${source}
const $=id=>document.getElementById(id);
$('steps').innerHTML=tallyLesson.steps.map(s=>'<li>'+s+'</li>').join('');
$('worked').innerHTML=tallySVG(13);$('example').textContent=tallyLesson.worked.text;
let index=0,state={count:0};const samples=[4,5,6,0,9,10,14,20,7,15,19];const pairs=[[13,8],[5,5],[0,6],[19,14],[8,13],[20,0]];
function render(){const mode=$('mode').value,n=samples[index%samples.length],[a,b]=pairs[index%pairs.length];$('record').hidden=mode!=='record';$('fields').hidden=mode==='record';$('feedback').textContent='';$('answer').value='';
$('prompt').textContent=mode==='read'?'How many tally marks?':mode==='record'?'Record '+n+' observations.':'Enter both row counts, then how many more are in the larger row (0 for a tie).';
$('figure').innerHTML=mode==='compare'?'<table><tr><th>Category</th><th>Tallies</th><th>Frequency</th></tr><tr><th>Books</th><td>'+tallySVG(a,'Books')+'</td><td><input id="rowA" aria-label="Books frequency" inputmode="numeric" size="3"></td></tr><tr><th>Games</th><td>'+tallySVG(b,'Games')+'</td><td><input id="rowB" aria-label="Games frequency" inputmode="numeric" size="3"></td></tr></table>':tallySVG(mode==='record'?state.count:n);
$('add').disabled=state.count===MAX_TALLY;$('undo').disabled=state.count===0;}
for(const action of ['add','undo','clear'])$(action).onclick=()=>{state=recordAction(state,action);render()};
$('mode').onchange=()=>{index=0;state={count:0};render()};$('next').onclick=()=>{index++;state={count:0};render()};
$('check').onclick=()=>{const mode=$('mode').value,n=samples[index%samples.length],[a,b]=pairs[index%pairs.length];const ok=mode==='record'?gradeRecord(n,state):mode==='read'?gradeNumber(n,$('answer').value):gradeNumber(a,$('rowA').value)&&gradeNumber(b,$('rowB').value)&&gradeNumber(Math.abs(a-b),$('answer').value);$('feedback').textContent=ok?'Correct. Try the next example.':mode==='compare'?'Read each row in fives and singles. Check both frequencies, then subtract the smaller from the larger.':tallyLesson.misconception;};render();
</script></html>`);
console.log(output);
