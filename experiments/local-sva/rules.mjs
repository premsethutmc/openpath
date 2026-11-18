/** Isolated candidate detector, not diagnosis. No network, model, rewriting or mastery. */
const pairs = {worry:'worries',walk:'walks',play:'plays',live:'lives',want:'wants',need:'needs',work:'works',like:'likes',go:'goes',come:'comes',have:'has',say:'says'};
const inverse=Object.fromEntries(Object.entries(pairs).map(([a,b])=>[b,a]));
export function inspect(text) {
 const abstain=reason=>({status:'abstained',reason,findings:[],unassessed:['other grammar','tense intent','argument quality','articulation'],trusted:false});
 if(typeof text!=='string'||!text.trim()||text.length>12000)return abstain('unsupported input');
 // Avoid quotation/metalinguistic content, questions, reported wishes and complex clause contexts.
 if(/["“”‘’`?;:()\[\]\n]/u.test(text)||/\b(if|unless|whether|wish|suggest|suggests|suggested|insist|insists|insisted|demand|demands|demanded|recommend|recommended|recommendation|that|lest|may|might|could|would|should|shall|must|can|not|never|nor|either|neither|and|or|but)\b/i.test(text))return abstain('ambiguous or unsupported context');
 const sentences=text.match(/[^.!?]+[.!]?/g)??[];
 const findings=[];
 let offset=0;
 for(const sentence of sentences){
  const index=text.indexOf(sentence,offset);offset=index+sentence.length;
  const s=sentence.trim();
  const m=s.match(/^(?:(Every morning|Every day) )?((?:[Mm]y|[Oo]ur|[Tt]he) (?:sister|brother|mother|father|teacher|parents|students|teachers)) ([a-z]+) (.+)\.$/);
  if(!m)continue;
  const plural=/ (parents|students|teachers)$/.test(m[2]);
  const correction=(plural?inverse:pairs)[m[3]];
  if(!correction)continue;
  // Deliberately reject comma continuations and anything not a plain lexical complement.
  if(/[,']/u.test(s)||! /^[A-Za-z][A-Za-z -]*$/.test(m[4]))continue;
  const quote=`${m[2]} ${m[3]}`;
  const start=index+sentence.indexOf(quote);
  findings.push({rule:plural?'simple-plural-sva@0':'simple-singular-sva@0',competency:'EN.GRM.VERB.sva',quote,start,end:start+quote.length,question:`Check the verb after “${m[2]}”. Does it agree with this subject?`,candidateVerb:correction,provenance:'unvalidated local rule; evidence only; not a confirmed gap'});
 }
 return findings.length?{status:'candidate_findings',findings,unassessed:['all unmatched text','tense intent','argument quality','articulation'],trusted:false}:abstain('no supported pattern; this does not mean correct');
}
