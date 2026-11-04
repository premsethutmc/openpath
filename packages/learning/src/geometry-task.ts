/** Typed givens for existing generators; no facts are inferred from their pictures or answers. */
import { FAMILIES, problemOf } from './families';
import { isQuestion, question } from './content';
export const GEOMETRY_AUTHORITY = 'geometry-reasoner@foundation-1';
export interface GeometryFact { predicate: string; args: string[]; value?: number | string }
export interface GeometryTask { domain: 'geometry'; problem: { id: string; objects: {id:string;kind:string;data:Record<string,unknown>}[]; facts: GeometryFact[]; conditions:string[]; goal:GeometryFact }; labels:string }
export function geometryTask(qid:string): GeometryTask | null {
  if (!isQuestion(qid) || /:(mc|w)$/.test(qid)) return null;
  const p=problemOf(qid); if(!p) return null;
  const f=FAMILIES.get(p.family); if(!f || f.reject(p.params)) return null;
  const [a,b,c]=p.params; const measure=(name:string,value:number):GeometryFact=>({predicate:'angle_measure',args:[name],value});
  const pair=(predicate:string,...args:string[]):GeometryFact=>({predicate,args});
  const triangle={id:'T',kind:'triangle',data:{angles:['A','B','C'],sides:['AB','BC','CA']}};
  let facts:GeometryFact[],goal:GeometryFact,labels:string,tri=false;
  if(p.family==='ahtri') {tri=true;facts=[measure('A',a),measure('B',b)];goal=measure('C',180-a-b);labels=`A = ${a}°, B = ${b}°; C is the missing interior angle.`;}
  else if(p.family==='ahext') {tri=true;facts=[measure('A',a),measure(c===0?'B':'D',c===0?b:a+b),pair('linear_pair','C','D')];goal=measure(c===0?'D':'B',c===0?a+b:b);labels=`A = ${a}°, ${c===0?`B = ${b}°`:`D = ${a+b}°`}. C is the adjacent interior angle; D is the exterior angle.`;}
  else if(p.family==='afcross' && b!==2) {facts=[measure('A',a),pair(b===0?'vertical_pair':'linear_pair','A','B')];goal=measure('B',b===0?a:180-a);labels=`A = ${a}°; B is the ${b===0?'vertically opposite':'adjacent'} angle.`;}
  else if(p.family==='afpair') {facts=[measure('A',b),pair(a===0?'complementary_pair':'supplementary_pair','A','B')];goal=measure('B',(a===0?90:180)-b);labels=`A = ${b}°; B is the other ${a===0?'complementary':'supplementary'} angle.`;}
  else return null;
  return {domain:'geometry',problem:{id:qid,objects:[...(tri?[triangle]:[]),...['A','B','C','D'].map(id=>({id,kind:'angle',data:{}}))],facts,conditions:tri?['nondegenerate:T']:[],goal},labels:`${labels} You can also use x for ${goal.args[0]}. State a reason in parentheses, such as (triangle sum) or (straight line). Other notation is kept for review.`};
}
