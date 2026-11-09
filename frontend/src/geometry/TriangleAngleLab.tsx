import { useEffect, useId, useRef, useState } from 'react';
import { A, B, INITIAL_C, clampC, triangleAngles, type Point } from './triangle';
import './triangle.css';
declare const OPENPATH_GEOMETRY_LAB: boolean;
const INTERACTIVE = typeof OPENPATH_GEOMETRY_LAB !== 'undefined' && OPENPATH_GEOMETRY_LAB === true;
const COLORS = ['#215bbb', '#a84d08', '#713cc6'];
const xy = ([x,y]: Point) => [40+x*45, 280-y*45];

const wedge = (cx: number, cy: number, from: number[], to: number[], radius = 28) => {
  const start = Math.atan2(from[1]-cy, from[0]-cx), end = Math.atan2(to[1]-cy, to[0]-cx);
  const delta = Math.atan2(Math.sin(end-start), Math.cos(end-start));
  return `M ${cx} ${cy} L ${cx+radius*Math.cos(start)} ${cy+radius*Math.sin(start)} A ${radius} ${radius} 0 0 ${delta>0?1:0} ${cx+radius*Math.cos(end)} ${cy+radius*Math.sin(end)} Z`;
};
/** Same geometry as the interactive board, usable in print and without the library. */
export function TriangleAngleStatic({ c = INITIAL_C, proof = true }: { c?: Point; proof?: boolean }) {
  const [cx,cy] = xy(c), angles = triangleAngles(c);
  return <svg viewBox="0 0 350 310" role="img" aria-label={angles ? `Triangle ABC: A ${angles[0].toFixed(1)} degrees, B ${angles[1].toFixed(1)} degrees, C ${angles[2].toFixed(1)} degrees.${proof ? ' A line through C is parallel to AB.' : ''}` : 'A, B and C are too close to a straight line to measure a triangle reliably.'}>
    {proof && angles && <g>{[[[cx-100,cy],[40,280],COLORS[0]],[[40,280],[310,280],COLORS[2]],[[310,280],[cx+100,cy],COLORS[1]]].map(([from,to,color],i)=><path key={i} d={wedge(cx,cy,from as number[],to as number[])} fill={String(color)} fillOpacity="0.22" stroke={String(color)} />)}</g>}
    <polygon points={`40,280 310,280 ${cx},${cy}`} fill="#eee8ff" fillOpacity="0.45" stroke="#34415a" strokeWidth="2.5" />
    {proof && angles && <><path d={`M 12 ${cy} H 338`} stroke="#6b7280" strokeDasharray="6 5" strokeWidth="2" /><text x="15" y={Math.max(14,cy-12)} fontSize="12">parallel to AB</text><text x={cx-34} y={cy+15} fontSize="13">A</text><text x={cx+20} y={cy+24} fontSize="13">B</text><text x="48" y="303" fontSize="12">A + C + B make a straight angle at C</text></>}
    {[[40,280,'A',COLORS[0]],[310,280,'B',COLORS[1]],[cx,cy,'C',COLORS[2]]].map(([x,y,label,color])=><g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="5" fill={String(color)} /><text x={Number(x)+(label==='C'?-14:8)} y={Number(y)+(label==='C'?-8:-8)} fill={String(color)} fontSize="17" fontWeight="bold">{label}</text></g>)}
  </svg>;
}
export function TriangleAngleLab({ proof = true }: { proof?: boolean }) {
  const id = `triangle-${useId().replace(/:/g,'')}`, boardEl = useRef<HTMLDivElement>(null);
  const point = useRef<{ X(): number; Y(): number; moveTo(p: number[]): unknown } | null>(null);
  const currentC = useRef<Point>(INITIAL_C);
  const [c,setC] = useState<Point>(INITIAL_C), [ready,setReady] = useState(false), [failed,setFailed] = useState(false);
  const [showProof,setShowProof] = useState(proof), proofRef = useRef(proof);
  const boardRef = useRef<{update(): unknown} | null>(null);
  const angles = triangleAngles(c);
  useEffect(()=>{
    if (!INTERACTIVE || !boardEl.current) return;
    let disposed = false, cleanup: (()=>void) | undefined;
    import('jsxgraph').then(({ default: JXG })=>{
      if(disposed || !boardEl.current) return;
      const board = JXG.JSXGraph.initBoard(boardEl.current, {boundingbox:[-0.8,6.2,6.8,-0.8], axis:false, showNavigation:false, showCopyright:false, keepaspectratio:true, pan:{enabled:false}, zoom:{wheel:false,needShift:true,min:1,max:1,pinchHorizontal:false,pinchVertical:false,pinchSensitivity:0}, resize:{enabled:true,throttle:100}});
      boardRef.current=board;
      const a=board.create('point',A.slice(),{name:'A',fixed:true,size:4,strokeColor:COLORS[0],fillColor:COLORS[0]}), b=board.create('point',B.slice(),{name:'B',fixed:true,size:4,strokeColor:COLORS[1],fillColor:COLORS[1]});
      const p=board.create('point',currentC.current.slice(),{name:'C',size:7,strokeColor:COLORS[2],fillColor:COLORS[2],highlightFillColor:'#a98ce4'});
      point.current=p;
      p.rendNode?.setAttribute("data-vertex", "C");
      board.create('polygon',[a,b,p],{fillColor:'#eee8ff',fillOpacity:0.65,borders:{strokeColor:'#34415a',strokeWidth:2}});
      board.create('segment',[[-0.7,()=>p.Y()],[6.7,()=>p.Y()]],{strokeColor:'#6b7280',dash:2,strokeWidth:2,visible:()=>proofRef.current && !!triangleAngles([p.X(),p.Y()])});
      const left=board.create('point',[()=>p.X()-1,()=>p.Y()],{visible:false,fixed:true}), right=board.create('point',[()=>p.X()+1,()=>p.Y()],{visible:false,fixed:true});
      [[left,p,a],[b,p,right]].forEach((points,i)=>board.create('angle',points,{radius:0.65,name:'',withLabel:false,fillColor:COLORS[i],strokeColor:COLORS[i],fillOpacity:0.2,visible:()=>proofRef.current && !!triangleAngles([p.X(),p.Y()])}));
      board.create('text',[()=>p.X()-0.65,()=>p.Y()-0.16,'A'],{fixed:true,fontSize:14,visible:()=>proofRef.current && !!triangleAngles([p.X(),p.Y()])});
      board.create('text',[()=>p.X()+0.35,()=>p.Y()-0.35,'B'],{fixed:true,fontSize:14,visible:()=>proofRef.current && !!triangleAngles([p.X(),p.Y()])});
      [[b,a,p],[p,b,a],[a,p,b]].forEach((points,i)=>board.create('angle',points,{radius:0.5,name:'',withLabel:false,fillColor:COLORS[i],strokeColor:COLORS[i],fillOpacity:0.2,visible:()=>!!triangleAngles([p.X(),p.Y()])}));
      p.on('drag',()=>{ const next=clampC(p.X(),p.Y()); if(next[0]!==p.X()||next[1]!==p.Y())p.moveTo([...next]); currentC.current=next; setC(next); });
      board.containerObj.tabIndex=-1;
      board.containerObj.querySelectorAll('[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
      cleanup=()=>JXG.JSXGraph.freeBoard(board);setReady(true);
    }).catch(()=>{if(!disposed)setFailed(true)});
    return ()=>{disposed=true;point.current=null;boardRef.current=null;cleanup?.()};
  },[]);
  useEffect(()=>{proofRef.current=showProof;boardRef.current?.update()},[showProof]);
  const move=(next: Point)=>{const q=clampC(...next);currentC.current=q;setC(q);point.current?.moveTo([...q]);boardRef.current?.update()};
  return <figure className="triangle-lab" data-c-x={c[0]} data-c-y={c[1]} data-triangle-lab={INTERACTIVE?'interactive':'static'}>
    <figcaption><strong>Three corners, one straight angle</strong><p>{INTERACTIVE?'Drag C, or use the labelled controls. Compare what changes with what stays the same.':`Static example: A = 30°, B = 90°, C = 60°.${showProof ? ' The line through C is parallel to AB.' : ''}`}</p></figcaption>
    {INTERACTIVE && <div ref={boardEl} id={id} className="triangle-board" aria-hidden="true" data-board-ready={ready} />}
    {(!INTERACTIVE || !ready) && <TriangleAngleStatic c={c} proof={showProof} />}
    {failed && <p role="status">The draggable diagram could not load. The picture and labelled controls still work.</p>}
    {angles ? <><dl className="angle-readout" aria-label="Measured interior angles">{angles.map((v,i)=><div key={i}><dt>Angle {'ABC'[i]}</dt><dd>{v.toFixed(1)}°</dd></div>)}</dl><p role="status" aria-live="polite" data-angle-sum>Measured total ≈ {angles.reduce((a,b)=>a+b,0).toFixed(1)}°. Rounded labels may not add exactly. Moving a picture is evidence to explore, not a proof.</p></> : <p role="status" data-degenerate>Too flat to measure reliably. Raise C to make a triangle; three collinear points do not form one.</p>}
    {INTERACTIVE && <div className="triangle-controls"><label htmlFor={`${id}-x`}>Move C left or right<input id={`${id}-x`} type="range" min="0" max="6" step="0.05" value={c[0]} onChange={e=>move([Number(e.target.value),c[1]])}/></label><label htmlFor={`${id}-y`}>Raise or lower C<input id={`${id}-y`} type="range" min="0" max="5.5" step="0.05" value={c[1]} onChange={e=>move([c[0],Number(e.target.value)])}/></label><div className="triangle-buttons"><button type="button" className="secondary" onClick={()=>move(INITIAL_C)}>Reset triangle</button><button type="button" className="secondary" aria-pressed={showProof} onClick={()=>setShowProof(v=>!v)}>{showProof?'Hide':'Show'} parallel line</button></div></div>}
    {showProof && angles && <p className="triangle-proof">At C, the left sector copies A, the middle sector is C, and the right sector copies B. Through C, draw a line parallel to AB. AC and BC cross those parallel lines: their alternate interior angles equal A and B. Those two angles and C sit next to each other on the straight line. So A + C + B = 180°.</p>}
    {INTERACTIVE && <div className="triangle-print"><TriangleAngleStatic c={c} proof={showProof}/></div>}
  </figure>;
}
