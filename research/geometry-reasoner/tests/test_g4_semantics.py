from __future__ import annotations
import unittest
from geometry_reasoner import ConstructionRequest,ConstructionVerifier,GeometryObject,GeometryProblem
from geometry_reasoner.semantics import between,cyclic_order,directed_angle_equal,interior_ray,opposite_rays,orientation,segment_contains

def P(name,x,y):return GeometryObject.make(name,"point",x=x,y=y)
class DirectedOrderTests(unittest.TestCase):
    def setUp(self):
        pts={"O":P("O",0,0),"E":P("E",2,0),"W":P("W",-2,0),"N":P("N",0,2),"S":P("S",0,-2),"M":P("M",1,0),"Q":P("Q",1,1)}
        self.p=GeometryProblem("sem",{**pts,"EW":GeometryObject.make("EW","segment",points=("W","E")),"c":GeometryObject.make("c","circle",center="O",radius_squared=4)},[])
    def test_orientation_and_betweenness_are_exact(self):
        self.assertEqual(orientation(self.p,"O","E","N").relation,"counterclockwise")
        self.assertEqual(between(self.p,"W","O","E").verdict,"verified")
        self.assertEqual(between(self.p,"W","N","E").verdict,"invalid")
        self.assertEqual(segment_contains(self.p,"EW","M").verdict,"verified")
    def test_opposite_rays_and_interior_exterior(self):
        self.assertEqual(opposite_rays(self.p,"O","E","W").verdict,"verified")
        self.assertEqual(opposite_rays(self.p,"O","E","N").verdict,"invalid")
        self.assertEqual(interior_ray(self.p,"E","O","N","Q").relation,"interior_ray")
        self.assertEqual(interior_ray(self.p,"E","O","N","S").relation,"exterior_ray")
    def test_directed_angle_rejects_equal_magnitude_opposite_orientation(self):
        self.assertEqual(directed_angle_equal(self.p,"E","O","N","E","O","N").verdict,"verified")
        self.assertEqual(directed_angle_equal(self.p,"E","O","N","E","O","S").verdict,"invalid")
    def test_cyclic_order_is_explicit(self):
        self.assertEqual(cyclic_order(self.p,"c",("E","N","W","S"),"counterclockwise").verdict,"verified")
        self.assertEqual(cyclic_order(self.p,"c",("E","W","N","S"),"counterclockwise").verdict,"invalid")
        # A valid cyclic order can contain an arc larger than 180 degrees; polar ordering still accepts it.
        p=GeometryProblem("uneven",{"O":P("O",0,0),"E":P("E",5,0),"Q":P("Q",3,4),"W":P("W",-5,0),"c":GeometryObject.make("c","circle",center="O",radius_squared=25)},[])
        self.assertEqual(cyclic_order(p,"c",("E","Q","W"),"counterclockwise").verdict,"verified")

class ConstructionTests(unittest.TestCase):
    def setUp(self):
        points={"O":P("O",0,0),"A":P("A",-2,0),"B":P("B",2,0),"N":P("N",0,2),"S":P("S",0,-2),"M":P("M",0,0),"Q":P("Q",1,1),"R":P("R",1,-1)}
        objs={**points,"h":GeometryObject.make("h","line",points=("A","B")),"v":GeometryObject.make("v","line",points=("N","S")),"diag":GeometryObject.make("diag","line",points=("O","Q")),"c1":GeometryObject.make("c1","circle",center="O",radius_squared=4),"C":P("C",2,0),"c2":GeometryObject.make("c2","circle",center="C",radius_squared=4)}
        # exact two intersections of c1,c2 are (1,±sqrt(3)); use rational twin-circle case separately below
        objs.update({"U":P("U",0,1),"D":P("D",0,-1),"big1":GeometryObject.make("big1","circle",center="A",radius_squared=8),"big2":GeometryObject.make("big2","circle",center="B",radius_squared=8),"h2":GeometryObject.make("h2","line",points=("O","B"))})
        self.p=GeometryProblem("construct",objs,[]); self.v=ConstructionVerifier()
    def test_line_and_midpoint_constructions(self):
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("line_line_intersection",("h","v"),("O","Q"))).alternatives,("O",))
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("midpoint",("A","B"),("O","Q"))).alternatives,("O",))
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("perpendicular_through_point",("h","O"),("v","diag"))).alternatives,("v",))
    def test_multiple_candidates_are_preserved(self):
        r=self.v.verify(self.p,ConstructionRequest("line_circle_intersection",("v","c1"),("N","S","O")))
        self.assertEqual(r.alternatives,("N","S"))
        circles=self.v.verify(self.p,ConstructionRequest("circle_circle_intersection",("big1","big2"),("N","S","O")))
        self.assertEqual(circles.alternatives,("N","S"))
        incomplete=self.v.verify(self.p,ConstructionRequest("line_circle_intersection",("v","c1"),("N",)))
        self.assertEqual(incomplete.verdict,"missing_assumption")
    def test_incidence_and_parallel_constructions(self):
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("point_on_line",("h",),("O","N"))).alternatives,("O",))
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("point_on_circle",("c1",),("N","O"))).alternatives,("N",))
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("parallel_through_point",("h","O"),("h2","v"))).alternatives,("h2",))
    def test_parallel_and_coincident_lines_are_ambiguous(self):
        r=self.v.verify(self.p,ConstructionRequest("line_line_intersection",("h","h"),("O",)))
        self.assertEqual(r.verdict,"missing_assumption")
    def test_angle_bisector_and_unsupported(self):
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("angle_bisector",("B","O","N"),("Q","R"))).alternatives,("Q",))
        self.assertEqual(self.v.verify(self.p,ConstructionRequest("regular_17_gon",(),())).verdict,"unsupported")
    def test_candidate_budget(self):
        self.assertEqual(ConstructionVerifier(1).verify(self.p,ConstructionRequest("point_on_line",("h",),("O","A"))).verdict,"unsupported")

if __name__=="__main__":unittest.main()
