/** Supported concept coaching: apply to the writer's own draft, never a substitute paragraph. */
import type {Lesson} from '../content.ts';
export const RESPONSE_LESSONS:Lesson[]=[
 {
  id:'EN.WRT.TSK.task_response#workspace-argument-task-fit',capability:'EN.WRT.TSK.task_response',step:'workspace-argument-task-fit',
  title:'Turn the brief into a set of writing decisions',
  rule:'Separate the subject from the requested operation. A response can discuss the right subject yet fail to compare, explain, recommend or evaluate as requested. Check the intended reader, required parts and constraints. This mini-lesson supports task-fit decisions; completing it does not establish independent writing proficiency.',
  examples:[
   {text:'Brief fragment: “Recommend one festival activity and explain how it includes visitors with limited mobility.” Planning labels: proposed activity; accessibility reasoning.',note:'Naming an activity alone leaves the accessibility requirement unanswered. The writer must develop that connection, not simply repeat the word inclusive.'},
   {text:'Brief fragment: “Contrast the characters’ reactions to the discovery.” Draft-plan fragment: retell the entire adventure.',note:'Both concern the story, but they perform different operations. Contrast requires relevant differences in reactions; a complete retelling may use space without answering that request.'},
  ],
  tip:'Own-text drill: copy the action words from your actual prompt, then mark the passages in your draft that perform each action. For an unmarked requirement, write your own missing explanation. Remove material that does not serve the brief. Do not infer success merely from having matching topic words.',
  check:{prompt:'A brief requires an explanation of a rejected design and a reasoned choice of another. A draft discusses only why the first design failed. Which planning move repairs the task-fit gap?',options:['Add more unrelated facts about the designer.','Develop the alternative choice and justify it.','Repeat the existing rejection using longer words.'],answer:1,explain:'The second required operation is still missing. Develop the alternative and its justification rather than expanding only the rejection.'},
 },
 {
  id:'EN.WRT.GEN.persuasive#workspace-argument-support',capability:'EN.WRT.GEN.persuasive',step:'workspace-argument-support',
  title:'Connect a position to support a reader can examine',
  rule:'Make the position identifiable, explain why each reason bears on it, and distinguish actual evidence from an invented illustration. Consider the reader’s relevant concerns without attacking them. Recognising these components in supplied text is not the same as producing persuasive prose. Objection work here is provisional concept practice, not a claim to the framework’s advanced counterargument descriptor.',
  examples:[
   {text:'Position fragment: “Reserve a quiet zone in the shared studio.” Support note: several users need concentration for detailed repairs.',note:'The support has to explain how reduced noise helps that work. Saying that quiet zones are excellent would only repeat the preference. The writer supplies the explanation in their own words.'},
   {text:'Concern fragment: “A quiet zone would leave less room for collaborative work.” Planning note: consider how space could be shared across activities.',note:'This is a relevant trade-off, not an attack on the proposer. A useful response examines the space constraint rather than dismissing the people who raised it. No supplied sentence settles that trade-off for the writer.'},
  ],
  tip:'Own-text drill: label one claim, one supporting reason and the evidence you actually have. Write the missing link yourself. Name a fair concern a reader might raise, then explain whether it changes the scope of your position. Do not invent statistics to fill an evidence gap; qualify the claim or describe the information still needed.',
  check:{prompt:'An appeal requests a shared charging station. Its only support is “Everyone sensible agrees with me.” Which next step would improve the reasoning?',options:['Give a relevant need and check what evidence supports it.','Describe anyone who disagrees as foolish.','Repeat the claim more emphatically.'],answer:0,explain:'A relevant need and inspectable support can give the reader a reason to consider the proposal. Social pressure and repetition do not supply that support.'},
 },
];
