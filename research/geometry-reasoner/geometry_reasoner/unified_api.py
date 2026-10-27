"""JSON-safe geometry dispatch through the inspected math-core assessment envelope."""
from __future__ import annotations
from dataclasses import asdict
import json
from typing import Any
from .integration_adapter import adapt_geometry_assessment
from .model import Fact,GeometryObject,GeometryProblem,ProofAssessment,SubmittedProofStep
from .synthetic import SyntheticReasoner
from .verify import verify_geometry_step,verify_submitted_proof

def _fact(x:dict,status="given"):return Fact(x["predicate"],tuple(x.get("args",())),x.get("value"),status)
def assess_unified(request:dict[str,Any])->dict[str,Any]:
    if not isinstance(request,dict) or request.get("domain")!="geometry":
        return {"outcome":"unsupported","correct":None,"advisory":True,"firstInvalidStep":None,"steps":[],"causes":[],"summary":"domain is not available through the geometry integration adapter","resourceLimit":False,"geometry":{"schema_version":"openpath-geometry-extension@1","native_verdicts":[],"proof_dependencies":[],"mathematical_dependencies":[],"unresolved_obligations":["supported domain: geometry"],"verification_scopes":[],"skill_ids":[],"resource_limit_reached":False}}
    try:
        raw=request["problem"]
        objects={x["id"]:GeometryObject.make(x["id"],x["kind"],**x.get("data",{})) for x in raw.get("objects",[])}
        problem=GeometryProblem(raw["id"],objects,[_fact(x) for x in raw.get("facts",[])],set(raw.get("conditions",[])),_fact(raw["goal"]) if raw.get("goal") else None,raw.get("skill","geometry.reasoning"))
        steps=[SubmittedProofStep(x["id"],_fact(x["statement"],"assumed"),tuple(x.get("cited_step_ids",())),x.get("cited_theorem")) for x in request.get("steps",[])]
        budget=request.get("resource_budget",{}); max_apps=int(budget.get("max_rule_applications",10000))
        if max_apps<1:
            goal=problem.goal or Fact("unsupported_goal",())
            result=verify_geometry_step(problem,[],goal,synthetic=SyntheticReasoner(max_rule_applications=0))
            assessment=ProofAssessment((result,),False,False,result,0,(0,),result.unsupported_conditions)
        else: assessment=verify_submitted_proof(problem,steps)
        return json.loads(json.dumps(asdict(adapt_geometry_assessment(assessment,(problem.skill,))),default=str))
    except (KeyError,TypeError,ValueError,OverflowError):
        return {"outcome":"unsupported","correct":None,"advisory":True,"firstInvalidStep":None,"steps":[],"causes":[],"summary":"malformed structured geometry request","resourceLimit":False,"geometry":{"schema_version":"openpath-geometry-extension@1","native_verdicts":[],"proof_dependencies":[],"mathematical_dependencies":[],"unresolved_obligations":["well-formed geometry request"],"verification_scopes":[],"skill_ids":[],"resource_limit_reached":False}}
