import assert from 'node:assert/strict';
import {test} from 'node:test';
import {trace,origin,screen} from './model.mjs';

test('No prism: a single beam reaches the screen directly for both sources',()=>{
  for (const beam of ['white','red']) {
    assert.deepEqual(trace(0,false,beam)[0].points,[origin,[screen,origin[1]]]);
    assert.equal(trace(8,false,beam).length,1);
  }
});
test('Across the full aim range all samples reach the screen, with violet bending more than red',()=>{
  for(let a=-8;a<=12;a+=.125){
    const rays = trace(a,true,'white');
    assert.equal(rays.length,6);
    let prev = trace(a,false,'white')[0].points.at(-1)[1];
    for(const r of rays){
      assert.ok(r.points.flat().every(Number.isFinite));
      assert.equal(r.points.at(-1)[0],screen);
      assert.ok(r.points.at(-1)[1]>prev && r.points.at(-1)[1]<259);
      assert.ok(r.points[2][0]>r.points[1][0]);
      prev = r.points.at(-1)[1];
    }
    assert.deepEqual(trace(a,true,'red'),[rays[0]]);
  }
});
test('Changing aim moves the trace; invalid inputs fail explicitly',()=>{
  assert.notDeepEqual(trace(-8,true,'white'),trace(12,true,'white'));
  assert.throws(()=>trace(13,true,'red'),RangeError);
  assert.throws(()=>trace(0,true,'blue'),RangeError);
});
