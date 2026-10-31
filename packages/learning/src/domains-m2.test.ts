import{describe,expect,test}from"bun:test";import{readFileSync}from"node:fs";import{assessMathematicalWorking,type MathematicalProblem,type StudentWorking}from"./unified-math-engine.ts";
const cases=JSON.parse(readFileSync("tools/mathematics/m2/independent-cases.v1.json","utf8")).cases as {id:string;area:string;problem:MathematicalProblem;working:StudentWorking;expected:{classification:string;firstInvalidStep:number|null}}[];
describe("M2 exact domains through unified API",()=>{test("480 independently labelled native cases",async()=>{expect(cases.length).toBe(480);const counts:Record<string,number>={};let fa=0,fr=0,first=0;for(const c of cases){const got=await assessMathematicalWorking(c.problem,c.working);counts[c.area]=(counts[c.area]??0)+1;fa+=Number(got.classification==="verified"&&c.expected.classification!=="verified");fr+=Number(got.classification!=="verified"&&c.expected.classification==="verified");first+=Number(got.firstInvalidStep===c.expected.firstInvalidStep);expect([c.id,got.classification,got.firstInvalidStep]).toEqual([c.id,c.expected.classification,c.expected.firstInvalidStep]);expect(got.reasoners[0].id).toBe("math-domains-m2");}expect(counts).toEqual({trigonometry:120,"exponential-log":120,"sequence-series":120,radical:120});expect({fa,fr,first}).toEqual({fa:0,fr:0,first:480});},30_000);});
test("quadrants, decreasing exponentials, principal roots, and safety bounds",async()=>{const checks:[any,any,string][]=[
 [{domain:"trigonometry",task:"value",fn:"sin",degrees:210},[claim({kind:"exact",value:{rational:"-1/2"}})],"verified"],
 [{domain:"trigonometry",task:"value",fn:"cos",degrees:300},[claim({kind:"exact",value:{rational:"1/2"}})],"verified"],
 [{domain:"trigonometry",task:"value",fn:"tan",degrees:135},[claim({kind:"exact",value:{rational:"-1"}})],"verified"],
 [{domain:"exponential-log",task:"exponential-inequality",base:"2",left:{a:"-1",b:"0"},rightExponent:"-3",relation:"<"},[claim({kind:"domain",restrictions:["x > 3"]})],"verified"],
 [{domain:"radical",task:"sqrt",radicand:-1},[claim({kind:"exact",value:{rational:"0"}})],"unsupported"],
 [{domain:"sequence-series",task:"ap-term",first:"1",difference:"1",n:10001},[],"resource-exhausted"]];
 for(const[p,want,status]of checks)expect((await assessMathematicalWorking(p,want)).classification).toBe(status)
});
function claim(result:any){return{kind:"claim",result}}
