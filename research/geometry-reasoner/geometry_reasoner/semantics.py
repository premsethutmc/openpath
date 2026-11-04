"""Exact orientation and order semantics. Nothing is inferred from a diagram."""
from __future__ import annotations
from dataclasses import dataclass
from fractions import Fraction
from functools import cmp_to_key
from typing import Literal
from .model import GeometryProblem

Point = tuple[Fraction, Fraction]
def point(problem: GeometryProblem, name: str) -> Point | None:
    o=problem.objects.get(name)
    if not o or o.kind!="point" or o.get("x") is None or o.get("y") is None: return None
    return Fraction(o.get("x")),Fraction(o.get("y"))
def sub(a:Point,b:Point)->Point: return a[0]-b[0],a[1]-b[1]
def cross(a:Point,b:Point): return a[0]*b[1]-a[1]*b[0]
def dot(a:Point,b:Point): return a[0]*b[0]+a[1]*b[1]
def norm2(a:Point): return dot(a,a)

@dataclass(frozen=True)
class SemanticResult:
    verdict: Literal["verified","invalid","missing_assumption","unsupported"]
    relation: str
    explanation: str

def orientation(problem:GeometryProblem,a:str,b:str,c:str)->SemanticResult:
    pts=(point(problem,x) for x in (a,b,c)); A,B,C=pts
    if None in (A,B,C): return SemanticResult("unsupported","orientation","exact coordinates are required")
    v=cross(sub(B,A),sub(C,A)); rel="counterclockwise" if v>0 else "clockwise" if v<0 else "collinear"
    return SemanticResult("verified",rel,"exact signed cross product")

def between(problem:GeometryProblem,a:str,b:str,c:str,strict:bool=True)->SemanticResult:
    A,B,C=(point(problem,x) for x in (a,b,c))
    if None in (A,B,C): return SemanticResult("unsupported","between","exact coordinates are required")
    if A==C: return SemanticResult("missing_assumption","between","endpoints must be distinct")
    col=cross(sub(B,A),sub(C,A))==0; product=dot(sub(B,A),sub(B,C))
    ok=col and (product<0 if strict else product<=0)
    return SemanticResult("verified" if ok else "invalid","between","collinearity and exact dot-product interval test")

def opposite_rays(problem:GeometryProblem,origin:str,a:str,b:str)->SemanticResult:
    O,A,B=(point(problem,x) for x in (origin,a,b))
    if None in (O,A,B): return SemanticResult("unsupported","opposite_rays","exact coordinates are required")
    u,v=sub(A,O),sub(B,O)
    if norm2(u)==0 or norm2(v)==0: return SemanticResult("missing_assumption","opposite_rays","each ray needs a distinct defining point")
    ok=cross(u,v)==0 and dot(u,v)<0
    return SemanticResult("verified" if ok else "invalid","opposite_rays","collinear direction vectors with negative dot product")

def segment_contains(problem:GeometryProblem,segment:str,p:str)->SemanticResult:
    s=problem.objects.get(segment)
    ends=tuple(s.get("points",())) if s and s.kind=="segment" else ()
    if len(ends)!=2: return SemanticResult("unsupported","segment_contains","a segment with two endpoints is required")
    return between(problem,ends[0],p,ends[1],strict=False)

def directed_angle_equal(problem:GeometryProblem,a:str,v:str,b:str,c:str,w:str,d:str)->SemanticResult:
    A,V,B,C,W,D=(point(problem,x) for x in (a,v,b,c,w,d))
    if None in (A,V,B,C,W,D): return SemanticResult("unsupported","directed_angle_equal","exact coordinates are required")
    u,x,y,z=sub(A,V),sub(B,V),sub(C,W),sub(D,W)
    if 0 in (norm2(u),norm2(x),norm2(y),norm2(z)): return SemanticResult("missing_assumption","directed_angle_equal","all rays require distinct defining points")
    p,q=(dot(u,x),cross(u,x)),(dot(y,z),cross(y,z))
    ok=cross(p,q)==0 and dot(p,q)>0
    return SemanticResult("verified" if ok else "invalid","directed_angle_equal","exact oriented dot/cross pairs agree modulo 360 degrees")

def interior_ray(problem:GeometryProblem,a:str,v:str,b:str,p:str)->SemanticResult:
    A,V,B,P=(point(problem,x) for x in (a,v,b,p))
    if None in (A,V,B,P): return SemanticResult("unsupported","interior_ray","exact coordinates are required")
    u,w,r=sub(A,V),sub(B,V),sub(P,V); turn=cross(u,w)
    if turn==0 or norm2(r)==0: return SemanticResult("missing_assumption","interior_ray","a non-straight angle and nonzero candidate ray are required")
    ok=(cross(u,r)>0 and cross(r,w)>0) if turn>0 else (cross(u,r)<0 and cross(r,w)<0)
    return SemanticResult("verified" if ok else "invalid","interior_ray" if ok else "exterior_ray","exact directed half-plane tests")

def cyclic_order(problem:GeometryProblem,circle:str,names:tuple[str,...],direction:Literal["clockwise","counterclockwise"])->SemanticResult:
    c=problem.objects.get(circle); centre=point(problem,c.get("center")) if c and c.kind=="circle" else None
    pts=[point(problem,x) for x in names]
    if centre is None or any(x is None for x in pts) or len(pts)<3: return SemanticResult("unsupported","cyclic_order","a circle centre and at least three exact points are required")
    radii=[sub(x,centre) for x in pts]; squares={norm2(x) for x in radii}
    if len(squares)!=1 or 0 in squares: return SemanticResult("invalid","cyclic_order","points must be distinct points on one nondegenerate circle")
    if len(set(radii))!=len(radii): return SemanticResult("invalid","cyclic_order","cyclic order requires distinct points")
    def half(v): return 0 if v[1]>0 or (v[1]==0 and v[0]>=0) else 1
    def cmp(a,b):
        if half(a)!=half(b): return -1 if half(a)<half(b) else 1
        z=cross(a,b); return -1 if z>0 else 1 if z<0 else 0
    canonical=sorted(radii,key=cmp_to_key(cmp)); expected=canonical if direction=="counterclockwise" else list(reversed(canonical))
    doubled=expected+expected; desired=any(doubled[i:i+len(radii)]==radii for i in range(len(radii)))
    return SemanticResult("verified" if desired else "invalid","cyclic_order",f"exact consecutive radius orientation is {direction}")
