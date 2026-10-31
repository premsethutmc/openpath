const U = await import("/home/claude/e7/packages/learning/src/_audit-trace.ts");
const P = JSON.parse(process.argv[2]);
const s=(a:any)=>a? `${a.classification}`.padEnd(18)+String(a.justification).slice(0,60):"null";
for (const t of process.argv.slice(3)) { const w={format:"natural",text:t.replace(/\\n/g,"\n")};
 const base=await U.assessCandidateBase(P,w,{}); const e5=(P.domain==="calculus"||P.domain==="geometry")?await U.assessE5Route(P,w,{}):null; const e6=await U.assessE6Route(P,w,{}); const m=await U.assessCandidate(P,w,{});
 console.log(t.replace(/\\n/g," ⏎ ")); console.log("   base:",s(base)); console.log("   e5  :",s(e5)); console.log("   e6  :",s(e6)); console.log("   merge:",s(m),"["+(m.reasoners??[]).map((r:any)=>r.id).join(",")+"]"); }
