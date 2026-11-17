/** Short, uncalibrated exam-oriented preview. It writes no school mastery ledger. */
export const PASSAGE = `A city library began judging branches by the number of books borrowed. Within a year, loans increased, and the council called the policy a success. Yet some branches had shortened their research-help sessions to make room for displays of popular novels. Readers who needed help finding specialist material now waited longer.

This does not show that lending popular books is unimportant. A library should respond to what people want to read. The difficulty is treating one useful measure as a complete description of its work. When staff are rewarded mainly for loans, activities that do not produce loans can become less attractive, even when they serve readers well.

The council proposes adding attendance at workshops to its score. That may recognise another service, but simply adding a second number does not settle which needs matter or how well those needs are met. A crowded workshop could be useful, or merely easy to advertise. A better review would combine counts with evidence about the purposes of different services and whether readers received the help they sought.`;
export type Question = { id: string; skill: string; prompt: string; options: string[]; answer: number; explanation: string; quote: string };
export const QUESTIONS: Question[] = [
 {id:'main',skill:'main_argument',prompt:'Which statement best captures the central argument?',options:['Popular books should no longer be counted.','Library performance should be judged using evidence of its different purposes, not counts alone.','Workshop attendance is the only reliable measure.','Higher loans prove that all readers received better service.'],answer:1,explanation:'The author accepts the value of loans but questions whether counts capture the whole purpose of the service.',quote:'The difficulty is treating one useful measure as a complete description of its work.'},
 {id:'inference',skill:'supported_inference',prompt:'What can reasonably be inferred about rewarding staff mainly for loans?',options:['It can shift attention away from services that the measure does not capture.','It makes every librarian deliberately refuse research questions.','It always reduces the total number of library visitors.','It proves popular novels have no educational value.'],answer:0,explanation:'The passage describes a possible incentive, not universal misconduct or inevitable effects.',quote:'activities that do not produce loans can become less attractive'},
 {id:'example',skill:'example_function',prompt:'Why does the author mention crowded workshops?',options:['To prove that all workshops are ineffective.','To show that workshop attendance has fallen.','To illustrate why another count can still leave quality and purpose uncertain.','To recommend advertising as the main library service.'],answer:2,explanation:'This example tests the proposed second measure; attendance does not by itself reveal usefulness.',quote:'A crowded workshop could be useful, or merely easy to advertise.'},
 {id:'evidence',skill:'evidence_limits',prompt:'Which additional evidence would best address the author’s concern?',options:['A second count of the same loans.','The colour of each branch’s display boards.','The number of other cities adopting the same score.','Whether readers with different needs received the information or support they sought.'],answer:3,explanation:'This connects activity to the service’s purpose rather than adding another popularity count.',quote:'whether readers received the help they sought'}
];
export const WRITING_PROMPT = 'In 100–180 words, explain why a rise in book loans does not by itself establish that the library improved. Propose one useful additional check and explain what it would tell us. This is an English/reasoning sample, not an official CAT writing task.';
export const LESSONS: Record<string,string> = {
 main_argument:'Separate the position from the examples. Ask: what conclusion connects the whole passage? A main-argument answer should retain qualifications, not turn “not sufficient” into “worthless”.',
 supported_inference:'Choose the smallest claim supported by the text. “Can” does not mean “always”, and a possible incentive is not proof of everyone’s intention.',
 example_function:'Ask what the example does for the surrounding claim. An illustration of uncertainty is not a claim that every case fails.',
 evidence_limits:'Distinguish a measurement from the outcome it is meant to represent. A useful follow-up checks the missing link, not merely the same measurement again.'
};
export const CHECKS: (Question & {passage:string})[] = [
 {id:'transfer-main',skill:'main_argument',passage:'A school counts the hours pupils spend revising. Time matters, but repeating familiar material for hours may achieve less than a short session that addresses a misconception. The school should examine what pupils can explain as well as how long they study.',prompt:'Which summary preserves the argument?',options:['Study time is irrelevant.','Use both time and evidence of understanding to judge revision.','Short revision always beats long revision.'],answer:1,quote:'examine what pupils can explain as well as how long they study',explanation:'It combines the useful measure with evidence of the intended outcome.'},
 {id:'transfer-inference',skill:'supported_inference',passage:'A museum’s free late opening attracted visitors who said they could not attend during working hours. The museum has not yet surveyed people who stayed away.',prompt:'Which inference is supported?',options:['At least some visitors benefited from access outside working hours.','Everyone who stayed away disliked the exhibitions.','Free opening will always double attendance.'],answer:0,quote:'visitors who said they could not attend during working hours',explanation:'The observed visitors support this limited conclusion; non-visitors remain unstudied.'},
 {id:'transfer-example',skill:'example_function',passage:'A route-planning app gives the shortest distance, but distance is not the only cost. A three-kilometre route with steep stairs may be harder for a traveller with luggage than a four-kilometre level route.',prompt:'What does the comparison illustrate?',options:['Every short route has stairs.','Distance alone may miss a traveller’s practical needs.','Apps should never calculate distance.'],answer:1,quote:'distance is not the only cost',explanation:'The comparison supports the qualified claim, not a universal rejection of distance.'},
 {id:'transfer-evidence',skill:'evidence_limits',passage:'A clinic introduced appointment reminders and observed fewer missed appointments. During the same month, it also extended opening hours.',prompt:'Which comparison would help distinguish the reminder effect?',options:['Compare similar groups with the same opening hours, one receiving reminders and one not.','Count the reminders again.','Ask only staff who designed the reminders whether they like them.'],answer:0,quote:'it also extended opening hours',explanation:'Holding hours comparable helps test the alternative explanation; it does not guarantee a perfect experiment.'}
];
export interface Session {version:'exam-diagnostic@1';answers:Record<string,number>;writing:string;phase:'reading'|'writing'|'report';revision:string}
export const initialSession = ():Session => ({version:'exam-diagnostic@1',answers:{},writing:'',phase:'reading',revision:''});
export const words = (s:string) => s.trim() ? s.trim().split(/\s+/u).length : 0;
export function validSession(v:unknown):v is Session {
 if (!v || typeof v!=='object' || Array.isArray(v)) return false;
 const s=v as Session;
 if (Object.keys(s).sort().join()!==['version','answers','writing','phase','revision'].sort().join() || s.version!=='exam-diagnostic@1' || !['reading','writing','report'].includes(s.phase) || typeof s.writing!=='string' || typeof s.revision!=='string' || s.writing.length>10000 || s.revision.length>10000 || words(s.writing)>250 || words(s.revision)>250 || !s.answers || typeof s.answers!=='object' || Array.isArray(s.answers)) return false;
 const ids=Object.keys(s.answers);
 if (ids.some(id=>!QUESTIONS.some(q=>q.id===id && Number.isInteger(s.answers[id]) && s.answers[id]>=0 && s.answers[id]<q.options.length))) return false;
 if (s.phase==='reading') return ids.length<QUESTIONS.length && !s.writing && !s.revision;
 if (ids.length!==QUESTIONS.length) return false;
 if (s.phase==='writing') return !s.writing && !s.revision;
 return s.writing ? words(s.writing)>=50 : !s.revision;
}
export function answer(s:Session,id:string,index:number):Session {
 if(!validSession(s)||s.phase!=='reading'||Object.hasOwn(s.answers,id)) throw Error('This question is no longer open.');
 const q=QUESTIONS.find(q=>q.id===id); if(!q||!Number.isInteger(index)||index<0||index>=q.options.length) throw Error('Choose one of the listed answers.');
 const answers={...s.answers,[id]:index}; return {...s,answers,phase:Object.keys(answers).length===QUESTIONS.length?'writing':'reading'};
}
export function submitWriting(s:Session,text:string):Session {
 if(!validSession(s)||s.phase!=='writing') throw Error('The writing step is not open.');
 if(text.length>10000 || (words(text)!==0 && (words(text)<50||words(text)>250))) throw Error('Write 50–250 words, or skip this sample.');
 return {...s,writing:text.trim(),phase:'report'};
}
export function revise(s:Session,text:string):Session {
 if(!validSession(s)||s.phase!=='report'||!s.writing||text.length>10000||words(text)>250) throw Error('Revision cannot be saved.');
 return {...s,revision:text};
}
export function report(s:Session) {
 if(!validSession(s)||s.phase!=='report') return [];
 return QUESTIONS.map(q=>({skill:q.skill,status:s.answers[q.id]===q.answer?'supported' as const:'possible_gap' as const,detail:q.explanation,quote:q.quote}));
}
