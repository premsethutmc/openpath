import{describe,expect,test}from"bun:test";
import corpus from"../../../tools/mathematics/unified-u3/independent-audit-cases.v1.json";
import{assessMathematicalWorking}from"./unified-math-engine";
import{replaySymbolicCertificate,type SymbolicCertificate}from"./symbolic-equivalence";

describe("U3 frozen independent integration audit",()=>{
 test("400 cross-domain, certificate, domain, and boundary cases preserve the independent labels",async()=>{
  expect(corpus.frozenBeforeEvaluation).toBeTrue();expect(corpus.cases).toHaveLength(400);let fa=0,fr=0,first=0;
  const areas:Record<string,number>={};
  let failClosed=0;for(const c of corpus.cases){const got=await assessMathematicalWorking(c.problem as any,c.working as any,{geometryWorkerCount:2});areas[c.area]=(areas[c.area]??0)+1;fa+=Number(got.classification==="verified"&&c.expected.classification!=="verified");fr+=Number(got.classification!=="verified"&&c.expected.classification==="verified");first+=Number(got.firstInvalidStep===c.expected.firstInvalidStep);failClosed+=Number(c.expected.classification==="invalid"&&got.classification==="unsupported");}
  expect(areas).toEqual({"cross-domain":150,"certificate-adversarial":100,"domain-assumption":100,"resource-unsupported":50});expect({fa,fr,first,failClosed}).toEqual({fa:0,fr:0,first:380,failClosed:0});
 },30_000);
 test("certificate integrity replay rejects missing and modified evidence",async()=>{
  const c=corpus.cases.find(x=>x.area==="certificate-adversarial"&&x.expected.classification==="verified")!;
  const got=await assessMathematicalWorking(c.problem as any,c.working as any);const cert=(got.domainPayload as any).payload.certificates[0] as SymbolicCertificate;
  expect(replaySymbolicCertificate(cert)).toBeTrue();expect(replaySymbolicCertificate({...cert,replayDigest:"0".repeat(64)})).toBeFalse();expect(replaySymbolicCertificate({...cert,rules:[...cert.rules,"invented-rule"]})).toBeFalse();
 });
});
