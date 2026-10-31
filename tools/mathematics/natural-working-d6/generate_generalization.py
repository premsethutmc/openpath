#!/usr/bin/env python3
"""Independently author and freeze D6 development and sealed holdout corpora."""
import json,hashlib
from pathlib import Path
HERE=Path(__file__).parent
def C(v):return{"kind":"constant","value":str(v)}
def V(n):return{"kind":"variable","name":n}
def add(*x):return{"kind":"add","terms":list(x)}
def mul(*x):return{"kind":"multiply","factors":list(x)}
def power(x,n):return{"kind":"power","base":x,"exponent":n}
def case(id,category,problem,raw,verdict="verified",first=None):return{"id":id,"category":category,"provenance":{"kind":"independently-authored","note":"Frozen before D6 adapter implementation"},"problem":problem,"raw":raw,"expectedClassification":verdict,"expectedFirstInvalidStep":first}
dev=[]
segments=["AB","PQ","RS","UV","MN"]
for i in range(30):
 s=segments[i%5];v=i%9+2;dev.append(case(f"d6-dev-geometry-{i:03d}","geometry-measurement",{"domain":"geometry","problem":{"objects":[{"id":s,"kind":"segment","data":{}}],"facts":[{"predicate":"segment_length","args":[s],"value":v}],"conditions":[f"nonzero:{s}"],"goal":{"predicate":"length_squared","args":[s],"value":v*v}}},f"{s} = {v}\n{s}^2 = {v*v}"))
for i in range(30):
 name=["x","t","q"][i%3];out=["y","A","F"][i%3];v=i%7+1;k=i%4+1;c=i%5;formula=add(mul(C(k),power(V(name),2)),C(c));value=k*v*v+c;dev.append(case(f"d6-dev-substitution-{i:03d}","symbolic-substitution",{"domain":"symbolic","start":formula,"goal":C(value)},f"{name} = {v}\n{out} = {k}{name}^2 + {c}\n{out} = {value}"))
for i in range(20):
 var=["u","z","w"][i%3];bound=["t","a","p"][i%3];fn=["g","h","F"][i%3];v=i%6+1;k=i%4+1;c=i%3;value=k*v+c;dev.append(case(f"d6-dev-function-{i:03d}","function-bound-argument",{"domain":"function","task":"evaluate","f":{"kind":"polynomial","coefficients":[str(c),str(k)]},"input":str(v)},f"{bound} = {v}\n{fn}({var}) = {k}{var} + {c}\n{fn}({bound}) = {value}"))
for i in range(20):
 dim=2+i%3;a=list(range(i%4+1,i%4+1+dim));b=list(range(i%3+2,i%3+2+dim));task="add" if i%2==0 else "subtract";z=[x+y for x,y in zip(a,b)] if task=="add" else [x-y for x,y in zip(a,b)];op="+" if task=="add" else "-";dev.append(case(f"d6-dev-vector-{i:03d}","vector-arithmetic",{"domain":"linear-algebra","area":"vector","task":task,"data":{"a":list(map(str,a)),"b":list(map(str,b))}},f"u = {a}\nv = {b}\nu {op} v = {z}"))
for i in range(20):
 a=i+1;M=[[a,a+1],[a+2,a+4]];det=a*(a+4)-(a+1)*(a+2);dev.append(case(f"d6-dev-det-{i:03d}","determinant",{"domain":"linear-algebra","area":"determinant","task":"determinant","data":{"a":[list(map(str,r)) for r in M]}},f"M = {M}\ndet(M) = {det}"))
for i in range(15):
 n=i%6+2;dev.append(case(f"d6-dev-derivative-{i:03d}","derivative",{"domain":"calculus","task":"derivative","expression":power(V("x"),n),"variable":"x"},f"f'(x) = {n}x^{n-1}"))
for i in range(15):
 p=f"{i%5+1}/{i%5+3}";num,den=map(int,p.split('/'));comp=f"{den-num}/{den}";dev.append(case(f"d6-dev-probability-{i:03d}","probability-complement",{"domain":"probability-statistics","area":"probability","task":"complement","data":{"pa":p}},f"P(E) = {p}\nP(not E) = {comp}"))
assert len(dev)==150
hold=[]
for i in range(10):
 s=["CD","WX","JK","GH","EF"][i%5];v=11+i;hold.append(case(f"d6-hold-geometry-{i:03d}","geometry-measurement",{"domain":"geometry","problem":{"objects":[{"id":s,"kind":"segment","data":{}}],"facts":[{"predicate":"segment_length","args":[s],"value":v}],"conditions":[f"nonzero:{s}"],"goal":{"predicate":"length_squared","args":[s],"value":v*v}}},f"{s}={v}\n{s}²={v*v}"))
for i in range(15):
 name=["m","n","s"][i%3];out=["R","B","Q"][i%3];v=i%5+2;shift=i%3+1;formula=power(add(V(name),C(shift)),2);value=(v+shift)**2;hold.append(case(f"d6-hold-substitution-{i:03d}","nested-substitution",{"domain":"symbolic","start":formula,"goal":C(value)},f"{name}={v}\n{out}=({name}+{shift})^2\n{out}={value}"))
for i in range(10):
 var=["r","s"][i%2];bound=["b","c"][i%2];fn=["p","q"][i%2];v=i+2;k=i%3+2;c=i%4;value=k*v+c;hold.append(case(f"d6-hold-function-{i:03d}","function-bound-argument",{"domain":"function","task":"evaluate","f":{"kind":"polynomial","coefficients":[str(c),str(k)]},"input":str(v)},f"{bound}={v}\n{fn}({var})={k}{var}+{c}\n{fn}({bound})={value}"))
for i in range(5):
 a=[i+1,i+3,i+5];b=[2,4,6];z=[x+y for x,y in zip(a,b)];hold.append(case(f"d6-hold-vector-{i:03d}","vector-arithmetic",{"domain":"linear-algebra","area":"vector","task":"add","data":{"a":list(map(str,a)),"b":list(map(str,b))}},f"a={a}\nb={b}\na+b={z}"))
for i in range(5):
 a=i+2;M=[[a,1],[2,a+1]];det=a*(a+1)-2;hold.append(case(f"d6-hold-det-{i:03d}","determinant",{"domain":"linear-algebra","area":"determinant","task":"determinant","data":{"a":[list(map(str,r)) for r in M]}},f"N={M}\n|N|={det}"))
for i in range(5):
 n=i+3;hold.append(case(f"d6-hold-derivative-{i:03d}","derivative",{"domain":"calculus","task":"derivative","expression":power(V("t"),n),"variable":"t"},f"g'(t)={n}t^{n-1}"))
assert len(hold)==50
def write(name,cases,sealed=False):
 body={"schema":"openpath-natural-working-generalization@1","frozenBeforeImplementation":True,"sealedUntilFinalEvaluation":sealed,"cases":cases};text=json.dumps(body,indent=2)+"\n";(HERE/name).write_text(text);return hashlib.sha256(text.encode()).hexdigest()
d=write("development-cases.v1.json",dev);h=write("sealed-holdout-cases.v1.json",hold,True);(HERE/"FROZEN_SHA256").write_text(f"{d}  development-cases.v1.json\n{h}  sealed-holdout-cases.v1.json\n");print(150,50,d,h)
