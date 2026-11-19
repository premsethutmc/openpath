import type {Course,Question} from "./course.ts";
export function sentenceChoices(text:string):string[]{return text.match(/[^.!?]+[.!?]+(?:[”"']?)(?:\s+|$)|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)??[];}
export function evidenceKey(course:Course,q:Question):number[]{
 const text=course.passages.get(q.passage)!.text,at=text.indexOf(q.evidence);
 if(at<0)throw Error('Missing authored evidence.');
 let cursor=0;const hits:number[]=[];
 for(const [i,s] of sentenceChoices(text).entries()){const start=text.indexOf(s,cursor),end=start+s.length;if(start<at+q.evidence.length&&end>at)hits.push(i);cursor=end;}
 if(!hits.length)throw Error('No evidence sentence.');return hits;
}
