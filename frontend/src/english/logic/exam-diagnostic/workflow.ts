/** Invented, local fixture demonstration. Never analyses a learner's own writing or calls a provider. */
import { analyseSyntheticWriting, EXAM_WRITING_RUBRIC, type ModelWritingObservation, type SyntheticWritingPost } from './model.ts';
import { planWritingChecks, verifyWritingSkill, type WritingCheck } from './verification.ts';

export const FIXTURE_LABEL = 'Invented example • simulated model response • no AI/network call';
export const SYNTHETIC_WRITING_SAMPLE = 'The researcher write a report about the library each month. Last week, a visitor waited for a hour to receive research help. More books were borrowed, but that alone does not show that every service improved. The council should also measure waiting times and ask readers whether they found the information they needed.';
const INFO = {available:true,id:'local-exam-fixture',version:'fixture@1',model:'simulated-not-a-model',rubric:EXAM_WRITING_RUBRIC,protocols:{observe:'essay-observe.v2' as const,rewrite:'essay-rewrite.v2' as const}};
const fixturePost: SyntheticWritingPost = async body => {
  const request = body.request as {essay:{id:string;text:string}};
  if (body.task !== 'observe' || body.data_use !== 'synthetic_test' || request.essay.text !== SYNTHETIC_WRITING_SAMPLE) throw new Error('Only the fixed invented fixture is supported');
  return {evaluator:{...INFO,protocol:INFO.protocols.observe},output:{essay_id:request.essay.id,rubric:INFO.rubric,not_observable:[],observations:[
    {competency:'EN.GRM.VERB.sva',kind:'error',quote:'researcher write',correction:'researcher writes',explanation:'This invented response proposes checking singular subject–verb agreement; it is not a confirmed learner gap.',confidence:'medium',verification:'required'},
    {competency:'EN.GRM.NOUN.articles',kind:'error',quote:'a hour',correction:'an hour',explanation:'Hour begins with a vowel sound, so an is used here.',confidence:'high',verification:'required'},
  ]}};
};
export type WritingWorkflowResult = ReturnType<typeof verifyWritingSkill>;
export interface WritingWorkflowState {
  phase:'idle'|'analysing'|'checks'|'results'|'error';
  observations:ModelWritingObservation[];
  checks:WritingCheck[];
  answers:Record<string,number>;
  results:WritingWorkflowResult[];
  error:string|null;
  seenIds:string[];
}
const fresh = (seenIds:string[]):WritingWorkflowState => ({phase:'idle',observations:[],checks:[],answers:{},results:[],error:null,seenIds:[...seenIds]});

/** In-memory only. Refresh starts a new demonstration, never a durable learner assessment. */
export class SyntheticWritingWorkflow {
  private state:WritingWorkflowState;
  private generation=0;
  private priorSeen:string[]=[];
  private readonly post:SyntheticWritingPost;
  /** Injectable transport is for contract/failure tests; the UI uses the local fixture default. */
  constructor(post:SyntheticWritingPost=fixturePost, previouslySeen:readonly string[]=[]) { this.post=post; this.state=fresh([...new Set(previouslySeen)]); }
  snapshot():WritingWorkflowState { return structuredClone(this.state); }
  async analyse():Promise<void> {
    if (this.state.phase !== 'idle' && this.state.phase !== 'error') return;
    const generation=++this.generation;
    this.priorSeen=[...this.state.seenIds];
    this.state={...fresh(this.state.seenIds),phase:'analysing'};
    try {
      const result=await analyseSyntheticWriting(SYNTHETIC_WRITING_SAMPLE,INFO,this.post);
      if (generation!==this.generation) return;
      const checks=planWritingChecks(result.observations,this.priorSeen);
      // Mark exposure when checks are made available, before answers or completion.
      this.state={...this.state,phase:checks.length?'checks':'results',observations:result.observations,checks,
        seenIds:[...new Set([...this.state.seenIds,...checks.map(q=>q.id)])],
        results:checks.length?[]:[...new Set(result.observations.filter(o=>o.requiresCheck).map(o=>o.skill))].map(skill=>verifyWritingSkill(skill,{},this.priorSeen))};
    } catch {
      if (generation!==this.generation) return;
      this.state={...fresh(this.state.seenIds),phase:'error',error:'The synthetic analysis failed. No diagnosis or teaching was inferred. Retry the invented example.'};
    }
  }
  answer(id:string,index:number):void {
    if(this.state.phase!=='checks') return;
    const q=this.state.checks.find(q=>q.id===id);
    if(!q || !Number.isInteger(index) || index<0 || index>=q.options.length) return;
    this.state={...this.state,answers:{...this.state.answers,[id]:index}};
  }
  finishChecks():void {
    if(this.state.phase!=='checks' || !this.state.checks.every(q=>Object.hasOwn(this.state.answers,q.id))) return;
    const skills=[...new Set(this.state.checks.map(q=>q.skill))];
    this.state={...this.state,phase:'results',results:skills.map(skill=>verifyWritingSkill(skill,this.state.answers,this.priorSeen))};
  }
  reset():void { ++this.generation; this.state=fresh(this.state.seenIds); }
}
