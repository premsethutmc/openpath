const { assessMathematicalWorking } = await import("/home/claude/e7/packages/learning/src/unified-math-engine.ts");
const P = JSON.parse(process.argv[2]); 
for (const t of process.argv.slice(3)) { const a:any = await assessMathematicalWorking(P,{format:"natural",text:t.replace(/\\n/g,"\n")}); console.log(a.classification.padEnd(18), "|", t.replace(/\\n/g," ⏎ "), "|", String(a.justification).slice(0,70)); }
