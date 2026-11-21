const sin = Math.sin;
function disc(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();}
function poly(c,color,...points){c.fillStyle=color;c.beginPath();for(let i=0;i<points.length;i+=2)i?c.lineTo(points[i],points[i+1]):c.moveTo(points[i],points[i+1]);c.closePath();c.fill();}
function line(c,color,width,...points){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();for(let i=0;i<points.length;i+=2)i?c.lineTo(points[i],points[i+1]):c.moveTo(points[i],points[i+1]);c.stroke();}
function slope(c,w,y,wave,base,color){c.fillStyle=color;c.beginPath();c.moveTo(0,y);for(let x=0;x<=w+10;x+=10)c.lineTo(x,y+wave*(sin(x/89+base)+.3*sin(x/24)));c.lineTo(w,c.canvas.height);c.lineTo(0,c.canvas.height);c.fill();}
function tree(c,x,y,s,variant){
  c.save();c.translate(x,y);c.scale(s,s);
  line(c,'#624c38',7,0,3,5,-45,1,-103);
  line(c,'#624c38',4,5,-49,-23,-82);line(c,'#624c38',4,5,-53,36,-87);
  for(let i=0;i<8;i++){const a=i*2.4;disc(c,sin(a)*39,-103+sin(a*1.3)*22,25+i%3*3,16+i%2*7,['#777451','#5f6548','#827a51'][i%3]);}
  if(variant)for(let i=0;i<5;i++)disc(c,-32+i*13,-113+sin(i*2)*11,13,8,'#8e8153');
  c.restore();
}
function house(c,x,y,s){
  c.save();c.translate(x,y);c.scale(s,s);
  poly(c,'#d0a16a',0,0,110,0,110,-50,0,-50);
  poly(c,'#9d704e',110,0,146,-12,146,-57,110,-50);
  poly(c,'#72513c',-10,-45,42,-83,105,-82,122,-45);
  poly(c,'#543f33',42,-83,87,-72,152,-52,111,-45);
  for(let i=0;i<9;i++)line(c,'#925d42',1,-4+i*13,-47,45+i*6,-75);
  c.fillStyle='#503f31';c.fillRect(62,-34,23,34);c.fillRect(15,-34,15,14);c.restore();
}
const fabrics=['#e9d9b7','#b3a48e','#d4c4a7','#ddc299','#b6ab8f'];
function marcher(c,x,y,s,opts={}){
  const {gandhi=false,phase=0,bow=false,salt=false,tone=0}=opts;
  c.save();c.translate(x,y);c.scale(s,s);
  disc(c,1,2,22,5,'#463d3439');
  const step=sin(phase)*12, lean=bow?29:0;
  line(c,'#854e38',6,-7,-41,-11,-21,-9+step,0);
  line(c,'#724331',6,8,-41,14,-21,10-step,0);
  line(c,'#543e31',3,-9+step,0,-4+step,1);line(c,'#543e31',3,10-step,0,14-step,1);
  poly(c,gandhi?'#e3d5b5':fabrics[tone%5],-17,-74,15+lean,-77,23,-38,13,-31,-9,-35,-20,-37);
  poly(c,'#a78b6f',3,-73,13+lean,-72,11,-38,2,-39);
  poly(c,gandhi?'#fff1d5':'#efe0bf',-14,-76,14+lean,-74,15+lean,-87,-11+lean,-88,-20,-78);
  const hand=salt?54:bow?44:25, handY=salt?-100:bow?-16:-47-sin(phase)*4;
  line(c,'#8a5941',6,14+lean,-77,21+lean,-59,hand,handY);
  line(c,'#a27150',5,-13+lean,-78,-23,-61,-18-sin(phase)*4,-46);
  disc(c,3+lean,-96+(bow?8:0),10,12,gandhi?'#aa7450':'#805039');
  if(gandhi){
    line(c,'#4d4234',1,10+lean,-97+(bow?8:0),14+lean,-97+(bow?8:0));
    if(!salt)line(c,'#5c462f',2,26,-58,34,3);
    if(salt)disc(c,55,-102,4.5,3,'#f6eacf');
  }else{
    poly(c,tone%2?'#b7af96':'#e9dcc0',-8,-96,-7,-105,10,-106,15,-98,9,-95);
  }
  c.restore();
}
// The nearer companion turns toward the child when they speak.
function portrait(c,x,y,s,who,talk){
  c.save();c.translate(x,y);c.scale(s,s);
  const other=who==='dev', skin=other?'#ab7752':'#97603f', light=other?'#c58e65':'#bc8159', cloth=other?'#bd9873':'#dcd1b0';
  poly(c,'#514d3f',-82,150,-66,55,-33,34,34,33,68,56,83,150);
  poly(c,cloth,-86,150,-65,54,-31,36,-7,39,9,42,37,34,70,54,83,150);
  poly(c,other?'#91694f':'#a49a79',-70,150,-62,59,-27,40,-19,53,-34,131,-56,150);
  poly(c,'#ece1be',-18,39,-3,48,12,43,38,38,58,62,46,144,34,126,34,62,2,69);
  poly(c,skin,-20,12,19,10,21,37,8,53,-9,53,-22,36);
  disc(c,-29,-3,7,11,skin);disc(c,29,-3,7,10,skin);
  disc(c,0,-11,31,41,skin);
  poly(c,light,-26,-25,-4,-42,19,-26,20,-8,13,17,3,29,-12,23,-26,5);
  if(other)poly(c,'#3c322a',-33,-17,-32,-41,-18,-56,11,-56,28,-45,33,-18,24,-28,9,-39,-7,-33,-24,-37);
  else {
    poly(c,'#e0cba6',-36,-21,-32,-46,-15,-61,16,-64,33,-48,35,-31,13,-37,-11,-32);
    line(c,'#9b8564',2,-30,-33,-10,-44,17,-46,32,-41);
    line(c,'#f3dfb4',2,-25,-46,-5,-54,16,-56,28,-50);
  }
  line(c,'#483328',2,-22,-18,-13,-21,-6,-18);
  line(c,'#483328',2,7,-18,17,-20,24,-16);
  disc(c,-13,-12,5,2.4,'#ead2ac');disc(c,16,-12,5,2.4,'#ead2ac');
  disc(c,-12,-12,2.2,2.4,'#2e2823');disc(c,16,-12,2.2,2.4,'#2e2823');
  line(c,'#885638',1.5,1,-12,-3,2,3,5,8,3);
  if(!other){poly(c,'#543a2d',-17,12,-8,7,-3,8,3,9,9,7,17,13,7,13,0,11,-8,12);}
  disc(c,0,16,8,1.7+talk*3.8,'#573b31');
  if(talk>.5)line(c,'#e2bd94',1,-4,15,4,15);
  line(c,'#bd8b64',2,-8,26,0,29,6,26);
  c.restore();
}
export function paint(c,w,h,view){
  const {stage,position,time,moving,talker,speaking,reduce}=view;
  const y=h*.39, coast=stage>=2,t=position*95;
  c.save();c.clearRect(0,0,w,h);
  const g=c.createLinearGradient(0,0,0,y*1.3);
  g.addColorStop(0,coast?'#7f9b91':'#a68e78');g.addColorStop(.88,coast?'#f1d7ac':'#f3d1a1');g.addColorStop(1,'#e3bb8e');
  c.fillStyle=g;c.fillRect(0,0,w,h);
  disc(c,w*(coast?.75:.77),h*.21,h*.064,h*.064,'#f9daa5');
  for(let i=0;i<8;i++)line(c,'#f8dcb44d',1+i%2,w*.14+i*11,h*.20+i*6,w*.7+i*7,h*.20+i*6);
  if(coast){
    c.fillStyle='#69908a';c.fillRect(0,y,w,h);
    slope(c,w,y+h*.16,-h*.022,1.3,'#91a69a');
    slope(c,w,y+h*.22,-h*.04,1.55,'#d9d3b4');
    slope(c,w,y+h*.245,-h*.04,1.6,'#caaf88');
    for(let i=0;i<7;i++){const shift=reduce?0:sin(time*1.4+i)*6;
      line(c,i%2?'#e7dfc37d':'#405f5c55',1.2,w*.1+i*28,y+13+i*5+shift,w*.65+i*22,y+12+i*5+shift);}
  }else{
    slope(c,w,y+12,9,.8,'#b09670');slope(c,w,y+27,8,2.4,'#948864');
    slope(c,w,y+44,7,4,'#b0a075');
    poly(c,'#c39364',w*.445,y+26,w*.56,y+26,w*.97,h,w*.02,h);
    poly(c,'#d2a278',w*.47,y+26,w*.53,y+26,w*.86,h,w*.11,h);
    poly(c,'#a28b5b',0,y+30,w*.44,y+37,w*.045,h,0,h);
    poly(c,'#a09362',w*.55,y+37,w,y+29,w,h,w*.94,h);
    if(stage===0){house(c,w*.12,h*.61,h*.0047);house(c,w*.68,h*.47,h*.0028);}
    else{house(c,w*.69,h*.57,h*.0045);}
    tree(c,w*.06,h*.66,h*.007,true);
    tree(c,w*.91,h*.66,h*.006,false);
    tree(c,w*.22,h*.48,h*.003,false);
  }
  for(let i=0;i<34;i++){
    const zz=((i*.079+t*.018)%1)**2;
    const x=w*(.5+sin(i*3.9)*(.07+zz*.79)),py=y+(h-y)*zz;
    if(py<y+29)continue;
    if(coast)disc(c,x,py,w*.007*zz,1+zz*2,'#ddc8a0aa');
    else line(c,i%3?'#6d653b91':'#c4b57ca9',1+zz,x,py,x-3*zz,py-9*zz);
  }
  const phase=reduce?0:position*42+(moving?time*.7:0);
  for(let i=0;i<9;i++){
    if(i===4)continue;
    const distance=1+(i%4)*.27;
    marcher(c,w*(.38+i*.032)+sin(i*12)*6,y+h*(.20+(i%4)*.045),h*.0036*distance,{phase:phase+i,tone:i});
  }
  const done=stage===3;
  const rev=done?time:0;
  marcher(c,w*.505+(coast?w*.03:0),y+h*(coast?.365:.225),h*(coast?.0078:.00445),{gandhi:true,phase,bow:done&&!reduce&&rev<1.35,salt:done&&(reduce||rev>=1.35)});
  if(!coast){
    if(!talker){
      marcher(c,w*.2,h*.91,h*.0109,{phase:phase+1,tone:0});
      marcher(c,w*.84,h*.86,h*.00975,{phase:phase+2,tone:3});
    }else{
      const ratio=Math.min(h*.00345,w*.006);
      portrait(c,w*.50,h*.63+(reduce?0:sin(time*1.6)*1.1),ratio,talker,speaking?(sin(time*23)+1)/2:0);
    }
  }else if(done&&(reduce||rev>1.35)){
    for(let i=0;i<7;i++)disc(c,w*.68+i*5,h*.825+sin(i*2)*6,2.5,1.2,'#ede3ccaa');
  }
  c.restore();
}
