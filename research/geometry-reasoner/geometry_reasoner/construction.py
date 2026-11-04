"""Bounded verification of explicit construction candidates using exact coordinates."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
from .model import GeometryProblem
from .semantics import cross,dot,norm2,point,sub

Kind=Literal["point_on_line","point_on_circle","line_line_intersection","line_circle_intersection","circle_circle_intersection","parallel_through_point","perpendicular_through_point","midpoint","angle_bisector"]
@dataclass(frozen=True)
class ConstructionRequest:
    kind:str
    references:tuple[str,...]
    candidates:tuple[str,...]
@dataclass(frozen=True)
class ConstructionResult:
    verdict:Literal["verified","invalid","missing_assumption","unsupported"]
    alternatives:tuple[str,...]
    conditions:tuple[str,...]
    explanation:str

def _ends(p:GeometryProblem,name:str):
    o=p.objects.get(name); ids=tuple(o.get("points",())) if o and o.kind in {"line","ray","segment"} else ()
    return (point(p,ids[0]),point(p,ids[1])) if len(ids)==2 else None
def _on_line(p:GeometryProblem,q:str,line:str):
    Q=point(p,q); e=_ends(p,line)
    return Q is not None and e and None not in e and e[0]!=e[1] and cross(sub(Q,e[0]),sub(e[1],e[0]))==0
def _on_circle(p:GeometryProblem,q:str,circle:str):
    c=p.objects.get(circle); Q=point(p,q); O=point(p,c.get("center")) if c and c.kind=="circle" else None; r=c.get("radius_squared") if c else None
    return Q is not None and O is not None and r is not None and r>0 and norm2(sub(Q,O))==r
def _finish(matches,conditions,what):
    if not matches:return ConstructionResult("invalid",(),tuple(conditions),f"no supplied candidate satisfies {what}")
    return ConstructionResult("verified",tuple(matches),tuple(conditions),f"{len(matches)} exact construction alternative(s) preserved")
def _complete(matches,expected,what):
    if expected==0:return ConstructionResult("invalid",(),(),f"exact invariants show that {what} does not exist")
    if len(matches)<expected:return ConstructionResult("missing_assumption",tuple(matches),(f"all {expected} alternatives supplied",),f"{what} has {expected} solution(s); supplied candidates are incomplete")
    return ConstructionResult("verified",tuple(matches),(),f"all {expected} exact construction alternative(s) preserved")

class ConstructionVerifier:
    supported={"point_on_line","point_on_circle","line_line_intersection","line_circle_intersection","circle_circle_intersection","parallel_through_point","perpendicular_through_point","midpoint","angle_bisector"}
    def __init__(self,max_candidates:int=64): self.max_candidates=max_candidates
    def verify(self,p:GeometryProblem,r:ConstructionRequest)->ConstructionResult:
        if r.kind not in self.supported:return ConstructionResult("unsupported",(),(),"construction is outside the supported language")
        if len(r.candidates)>self.max_candidates:return ConstructionResult("unsupported",(),("candidate limit",),"construction candidate budget exceeded")
        try:return self._verify(p,r)
        except (IndexError,KeyError,TypeError,ValueError,ZeroDivisionError):return ConstructionResult("unsupported",(),("well-formed construction",),"malformed construction request")
    def _verify(self,p,r):
        k,refs=r.kind,r.references
        if k=="point_on_line": return _finish([q for q in r.candidates if _on_line(p,q,refs[0])],(),"point-on-line incidence")
        if k=="point_on_circle": return _finish([q for q in r.candidates if _on_circle(p,q,refs[0])],(),"point-on-circle incidence")
        if k=="line_line_intersection":
            e1,e2=_ends(p,refs[0]),_ends(p,refs[1])
            if not e1 or not e2 or None in (*e1,*e2) or e1[0]==e1[1] or e2[0]==e2[1]: return ConstructionResult("missing_assumption",(),("two nondegenerate lines",),"intersection is undefined")
            det=cross(sub(e1[1],e1[0]),sub(e2[1],e2[0]))
            if det==0:return ConstructionResult("missing_assumption",(),("unique nonparallel intersection",),"parallel or coincident lines have no unique intersection")
            return _finish([q for q in r.candidates if _on_line(p,q,refs[0]) and _on_line(p,q,refs[1])],(),"both line incidences")
        if k=="line_circle_intersection":
            e=_ends(p,refs[0]); c=p.objects.get(refs[1]); O=point(p,c.get("center")) if c and c.kind=="circle" else None; radius=c.get("radius_squared") if c else None
            if not e or None in e or e[0]==e[1] or O is None or radius is None or radius<=0:return ConstructionResult("missing_assumption",(),("nondegenerate line and circle",),"intersection existence cannot be determined")
            d=sub(e[1],e[0]); w=sub(e[0],O); disc=dot(d,w)**2-norm2(d)*(norm2(w)-radius); expected=2 if disc>0 else 1 if disc==0 else 0
            return _complete([q for q in r.candidates if _on_line(p,q,refs[0]) and _on_circle(p,q,refs[1])],expected,"line-circle intersection")
        if k=="circle_circle_intersection":
            c1,c2=(p.objects.get(x) for x in refs); O1=point(p,c1.get("center")) if c1 and c1.kind=="circle" else None; O2=point(p,c2.get("center")) if c2 and c2.kind=="circle" else None; r1=c1.get("radius_squared") if c1 else None; r2=c2.get("radius_squared") if c2 else None
            if O1 is None or O2 is None or r1 is None or r2 is None or r1<=0 or r2<=0:return ConstructionResult("missing_assumption",(),("two nondegenerate circles",),"intersection existence cannot be determined")
            d2=norm2(sub(O2,O1))
            if d2==0:return ConstructionResult("missing_assumption",(),("distinct circle centres",),"concentric circles have zero or infinitely many intersections")
            height=4*r1*d2-(r1-r2+d2)**2; expected=2 if height>0 else 1 if height==0 else 0
            return _complete([q for q in r.candidates if _on_circle(p,q,refs[0]) and _on_circle(p,q,refs[1])],expected,"circle-circle intersection")
        if k in {"parallel_through_point","perpendicular_through_point"}:
            base,through=refs; be=_ends(p,base)
            def good(line):
                e=_ends(p,line)
                if not e or not be or None in (*e,*be) or e[0]==e[1] or be[0]==be[1] or not _on_line(p,through,line):return False
                u,v=sub(e[1],e[0]),sub(be[1],be[0]); return cross(u,v)==0 if k.startswith("parallel") else dot(u,v)==0
            return _finish([x for x in r.candidates if good(x)],(),k)
        if k=="midpoint":
            A,B=point(p,refs[0]),point(p,refs[1])
            if A is None or B is None or A==B:return ConstructionResult("missing_assumption",(),("distinct endpoints",),"midpoint needs a nonzero segment")
            return _finish([q for q in r.candidates if (Q:=point(p,q)) is not None and 2*Q[0]==A[0]+B[0] and 2*Q[1]==A[1]+B[1]],(),"midpoint equations")
        if k=="angle_bisector":
            a,v,b=refs; A,V,B=point(p,a),point(p,v),point(p,b)
            if None in (A,V,B) or A==V or B==V:return ConstructionResult("missing_assumption",(),("nonzero angle rays",),"angle bisector needs two rays")
            u,w=sub(A,V),sub(B,V)
            if cross(u,w)==0:return ConstructionResult("missing_assumption",(),("non-straight angle",),"straight/zero angles have ambiguous interior bisectors")
            def bisects(q):
                Q=point(p,q)
                if Q is None or Q==V:return False
                z=sub(Q,V); return cross(u,z)*dot(z,w)==cross(z,w)*dot(u,z) and cross(u,z)*cross(z,w)>0
            return _finish([q for q in r.candidates if bisects(q)],(),"interior angle-bisector invariant")
        return ConstructionResult("unsupported",(),(),"construction is outside the supported language")
