/** Finding-linked concept checks share the learner ledger and evidence engine, never score an argument. */
import type {ArgumentArea} from './argument.ts';
export const ARGUMENT_CONCEPTS={
 'EN.WRT.TSK.task_response':'Recognising what a writing task asks for',
 'EN.WRT.TSK.idea_development':'Recognising relevant reasons and supporting details',
 'EN.WRT.ORG.paragraphing':'Recognising paragraph purposes and boundaries',
 'EN.WRT.GEN.persuasive':'Recognising a position and relevant reasons',
} as const;
export type ArgumentConcept=keyof typeof ARGUMENT_CONCEPTS;
export const ARGUMENT_CONCEPT_MAP:Record<ArgumentArea,readonly ArgumentConcept[]>={
 claim:['EN.WRT.TSK.task_response','EN.WRT.GEN.persuasive'],
 reasons:['EN.WRT.TSK.idea_development'],evidence:['EN.WRT.TSK.idea_development'],
 warrant:['EN.WRT.TSK.idea_development'],counterargument:['EN.WRT.GEN.persuasive'],
 organization:['EN.WRT.TSK.task_response','EN.WRT.ORG.paragraphing'],clarity:[],
};
export interface ArgumentConceptProbe {
 version:'argument-concept-probe@1';id:string;at:string;sourceLearnerId:string;artifactId?:string;feedbackEventId?:string;findingIndex?:number;sourceKind:'finding'|'self_selected';
 capability:ArgumentConcept;items:{id:string;version:number}[];guided:{id:string;version:number}[];
 /** Scope is recognition/application on authored concept tasks, not the quality of the source argument. */
 scope:'concept_only';
}

export const ARGUMENT_CONCEPT_LIMITATIONS:Record<ArgumentArea,string>={
 claim:'Recognising a task or position does not establish the precision of your own claim.',reasons:'Relevant-support checks do not prove that your own reasons are sound.',evidence:'Recognising supporting details does not establish evidence reliability or sufficiency.',warrant:'This is a related support concept, not a test of whether your own warrant is valid.',counterargument:'This checks related position and supporting-reason concepts, not advanced counterargument skill or the quality of your own rebuttal.',organization:'Paragraph-boundary checks do not prove the coherence of your complete argument.',clarity:'Clarity remains own-writing coaching; no concept score is inferred.'};
export interface ArgumentConceptSupport {probeId:string;afterCheck:string;at:string;items:{id:string;version:number}[]}
