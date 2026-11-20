export const storyLength=20;
export const shots=[
 {id:'dawn',start:0,end:4,title:'Dawn at the hive',line:'“Come on, let’s find nectar.”'},
 {id:'out',start:4,end:7,title:'Into the meadow',line:'The foragers head out together.',sound:'fly'},
 {id:'gather',start:7,end:11,title:'The first flower',line:'She sips nectar. Pollen catches on her hairs.',sound:'pollen'},
 {id:'transfer',start:11,end:16,title:'The next flower',line:'A few grains brush onto its stigma. That’s pollination.',sound:'pollen'},
 {id:'home',start:16,end:20,title:'Back at the hive',line:'At the hive, bees turn nectar into honey and store it.'},
];
export function storyFrame(sec){
 const time=Number.isFinite(sec)?Math.max(0,Math.min(sec,storyLength)):0;
 const index=shots.findIndex(s=>time<s.end);
 const shot=shots[index<0?shots.length-1:index];
 return {shot,t:(time-shot.start)/(shot.end-shot.start),finished:time===storyLength};
}
