"""Design artifacts only. No production UI, scoring, keyboard or engine implementation."""
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parent
C={'bg':'#FAF9F6','paper':'#FFFEFB','ink':'#292C30','muted':'#62656C','line':'#E6E3DD','violet':'#6853AD','focus':'#F2EDF9','amber':'#936039','error':'#FBF0E5','green':'#276B53','mint':'#ECF4EF'}

def svg_screen(width,state, initial=False):
    height=800 if width==360 else 852
    keyboard=state!='completed'; kb=height-248
    chunks=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Design mockup: {state}, {width} pixels">',f'<rect width="{width}" height="{height}" fill="{C["bg"]}"/>']
    def add(s): chunks.append(s)
    def line(x1,y1,x2,y2,color=None,sw=1):add(f'<path d="M{x1},{y1}H{x2}" fill="none" stroke="{color or C["line"]}" stroke-width="{sw}"/>' if y1==y2 else f'<path d="M{x1},{y1}L{x2},{y2}" fill="none" stroke="{color or C["line"]}" stroke-width="{sw}"/>')
    def rect(x,y,w,h,fill,stroke='none',r=0):add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
    def text(x,y,t,size=15,color=None,weight=400,anchor='start',font='Open Sans'):
        add(f'<text x="{x}" y="{y}" fill="{color or C["ink"]}" font-family="{font}, sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{escape(t)}</text>')
    def path(d,color=None,sw=1.6):add(f'<path d="{d}" fill="none" stroke="{color or C["ink"]}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>')
    # One shared compact header. Progress is completed working entries, never mastery.
    path('M30 22l-7 7 7 7M23 29h15')
    text(56,35,'Long division',17,weight=600)
    count=9 if state=='completed' else 3 if state=='mistake' or (state=='working' and not initial) else 0
    text(width-76,27,f'{count} / 9',11,C['muted'],anchor='end')
    rect(width-110,34,34,3,C['line'],r=1.5)
    if count:rect(width-110,34,34*count/9,3,C['violet'],r=1.5)
    for dy in (-5,0,5):add(f'<circle cx="{width-28}" cy="{29+dy}" r="1.35" fill="{C["muted"]}"/>')
    line(16,56,width-16,56)
    text(24,101,'379 ÷ 3',26,weight=600)
    text(24,125,'Find the quotient and remainder.',13,C['muted'])
    # Full-width paper: no card shadow or nested panels.
    rect(0,146,width,(kb if keyboard else height)-146,C['paper'])
    line(16,146,width-16,146)
    cx=width/2-26; step=44
    xs=[cx+i*step for i in range(3)]
    ys=[202+44*i for i in range(8)]
    def digit(col,row,d,color=None):text(xs[col],ys[row],str(d),30,color,anchor='middle',font='DejaVu Sans')
    def active(col,row,wrong=False):
        x=xs[col]-18; y=ys[row]-32
        rect(x,y,36,44,C['error'] if wrong else C['focus'],C['amber'] if wrong else C['violet'],4)
        if not wrong:line(xs[col],y+10,xs[col],y+33,C['violet'],1.5)
    # Bracket and printed dividend share the identical column grid.
    path(f'M{xs[0]-20} 263V226Q{xs[0]-20} 218 {xs[0]-12} 218H{xs[2]+21}',C['ink'],1.6)
    text(xs[0]-51,246,'3',30,anchor='middle',font='DejaVu Sans')
    for i,d in enumerate('379'):digit(i,1,d)
    def subtraction(row,first,last):
        text(xs[first]-step,ys[row],'−',27,anchor='middle',font='DejaVu Sans')
        line(xs[first]-17,ys[row]+14,xs[last]+17,ys[row]+14,C['ink'],1.25)
    if state=='working' and initial:
        active(0,0)
        text(width/2,310,'Start in the highlighted space.',13,C['muted'],anchor='middle')
    else:
        digit(0,0,1);digit(0,2,3);subtraction(2,0,0)
        digit(0,3,0);digit(1,3,7,C['muted'])
        if state=='working':active(1,0)
        elif state=='mistake':
            active(1,0,True);digit(1,0,3,C['amber'])
        else:
            digit(1,0,2);digit(2,0,6)
            digit(1,4,6);subtraction(4,1,1)
            digit(1,5,1);digit(2,5,9,C['muted'])
            digit(1,6,1);digit(2,6,8);subtraction(6,1,2)
            digit(2,7,1)
    if state=='mistake':
        # Quiet assistance, not an alert card. Everything remains in flow.
        line(32,371,width-32,371)
        text(32,397,'Want a little help?',15,weight=600)
        rect(32,410,105,44,C['paper'],C['line'],6)
        text(84.5,438,'Try again',14,C['ink'],600,anchor='middle')
        text(157,438,'Need a hint?',14,C['violet'],600)
    if keyboard:
        # Persistent toolbar is inside the visual viewport, just above the OS keyboard.
        line(16,kb-57,width-16,kb-57)
        path(f'M33 {kb-36}a7 7 0 1 0 0 14a7 7 0 1 0 0-14',C['muted'],1.3)
        text(33,kb-25,'?',11,C['muted'],600,anchor='middle')
        text(49,kb-25,'Help',14,C['muted'])
        path(f'M{width-91} {kb-23}l2-7 9-9 5 5-9 9-7 2M{width-80} {kb-37}l5 5',C['muted'],1.3)
        text(width-63,kb-25,'Write',14,C['muted'])
        # EXPLICIT illustrative OS keyboard: never a proposed in-app custom keypad.
        rect(0,kb,width,248,'#E9EAED');line(0,kb,width,kb,'#D9DBDF')
        keygap=6; outer=8; keyw=(width-2*outer-2*keygap)/3; keyh=45
        for row,keys in enumerate([['1','2','3'],['4','5','6'],['7','8','9'],['·','0','⌫']]):
            for col,key in enumerate(keys):
                x=outer+col*(keyw+keygap);y=kb+12+row*51
                rect(x,y,keyw,keyh,'#FDFDFE',r=5)
                if key=='⌫':
                    xx=x+keyw/2;yy=y+22
                    path(f'M{xx-10} {yy}l6-7h14v14h-14z','#4E5158',1.4)
                    path(f'M{xx+1} {yy-3}l6 6M{xx+7} {yy-3}l-6 6','#4E5158',1.3)
                elif key=='·':
                    text(x+keyw/2,y+29,'?123',13,'#656870',anchor='middle')
                else:text(x+keyw/2,y+31,key,24,'#34373D',anchor='middle')
        # Done and hide controls vary by Android IME; annotate in spec rather than invent one.
        rect(width/2-44,height-12,88,3,'#777A80',r=1.5)
    else:
        line(24,546,width-24,546)
        add(f'<circle cx="36" cy="576" r="10" fill="{C["mint"]}"/>')
        path('M32 576l3 3 5-6',C['green'],1.7)
        text(56,581,'Correct. Nicely done.',16,C['green'],600)
        text(24,612,'126 remainder 1',22,weight=600)
        rect(24,642,width-48,48,C['violet'],r=7)
        text(width/2-9,672,'Next question',15,'#FFFFFF',600,anchor='middle')
        path(f'M{width/2+66} 661l5 5-5 5M{width/2+62} 666h9','#FFFFFF',1.5)
        text(width/2,720,'Your working is saved.',12,C['muted'],anchor='middle')
    chunks.append('</svg>')
    return ''.join(chunks)

for width in (360,393):
    for state in ('working','mistake','completed'):
        # The first working artifact is the true opening state; bonus in-progress state shows expansion.
        (ROOT/f'{state}-{width}.svg').write_text(svg_screen(width,state,initial=state=='working'))
    (ROOT/f'working-in-progress-{width}.svg').write_text(svg_screen(width,'working'))
