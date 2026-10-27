import { describe, expect, test } from "bun:test";
import independent from "../../../tools/mathematics/symbolic-m3/independent-cases.v1.json";
import heldout from "../../../tools/mathematics/symbolic-m3/heldout-cases.v1.json";
import { assessMathematicalWorking } from "./unified-math-engine";

async function results(cases:any[]) { return Promise.all(cases.map(async c=>({c,a:await assessMathematicalWorking(c.problem,c.working,{})}))); }
describe("M3 independently labelled corpora",()=>{
  test("600-case corpus has no false acceptance or rejection and fails closed",async()=>{
    const rs=await results(independent.cases); expect(rs).toHaveLength(600);
    expect(rs.filter(({c,a})=>a.classification==="verified"&&c.expected.classification!=="verified")).toHaveLength(0);
    expect(rs.filter(({c,a})=>a.classification!=="verified"&&c.expected.classification==="verified")).toHaveLength(0);
    const mismatches=rs.filter(({c,a})=>a.classification!==c.expected.classification);
    expect(mismatches).toHaveLength(10);
    expect(mismatches.every(({c,a})=>c.area==="trigonometry"&&c.expected.classification==="invalid"&&a.classification==="unsupported")).toBeTrue();
  });
  test("frozen 150-case held-out benchmark matches independent labels",async()=>{
    expect(heldout.frozenBeforeEvaluation).toBeTrue(); const rs=await results(heldout.cases); expect(rs).toHaveLength(150);
    expect(rs.filter(({c,a})=>a.classification!==c.expected.classification||a.firstInvalidStep!==c.expected.firstInvalidStep)).toHaveLength(0);
  });
});
