export const storyLength=20;
export const hiveDialogue=[
 {start:0,end:2.1,speaker:'film-bee',name:'Pip',line:'Morning! Let’s find nectar.'},
 {start:2.1,end:4.1,speaker:'film-companion',name:'Mina',line:'I’ll try the orchard.'},
 {start:4.1,end:6,speaker:'film-neighbour',name:'Dot',line:'I’m off to the meadow!'},
];
export const shots=[
 {id:'dawn',start:0,end:6,title:'Dawn at the hive',line:''},
 {id:'out',start:6,end:10,title:'Into the meadow',line:'The bees split up. We follow Pip.',sound:'fly'},
 {id:'gather',start:10,end:13,title:'The first flower',line:'Pip sips nectar. Pollen catches on her hairs.',sound:'pollen'},
 {id:'transfer',start:13,end:17,title:'The next flower',line:'A few grains brush onto its stigma. That’s pollination.',sound:'pollen'},
 {id:'home',start:17,end:20,title:'Back at the hive',line:'At the hive, bees turn nectar into honey and store it.'},
];
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{const n=clamp(t);return n*n*(3-2*n);};
export function flightPaths(t){
 const fan=ease((t-.14)/.86), follow=ease((t-.38)/.62);
 return {
   pip:[306+46*fan,255-85*fan-13*Math.sin(Math.PI*fan)],
   mina:[440+331*fan,231-203*fan],
   dot:[186-319*fan,291-149*fan],
   camera:[-107*follow,-59*follow,1+.33*follow],
 };
}
export function storyFrame(sec){
 const time=Number.isFinite(sec)?Math.max(0,Math.min(sec,storyLength)):0;
 const index=shots.findIndex(s=>time<s.end);
 const shot=shots[index<0?shots.length-1:index];
 return {shot,dialogue:hiveDialogue.find(d=>time>=d.start&&time<d.end)??null,t:(time-shot.start)/(shot.end-shot.start),finished:time===storyLength};
}
