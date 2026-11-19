/** Fresh local language checks: strategy application, not proficiency or proof of a causal bottleneck. */
import type {CausalItem} from './causal.ts';
export type AuthoredLanguageChecks={word:{immediate:CausalItem;delayed:CausalItem};literal:{immediate:CausalItem;delayed:CausalItem}};
function check(key:string,dimension:'word'|'literal',passage:string[],prompt:string,options:string[],answer:number,explanation:string):CausalItem{
 return {id:`causal.language.${key}`,family:`causal.language.family.${key}`,dimension,passage,prompt,options,answer,sets:[],explanation};
}
export const AUTHORED_LANGUAGE_CHECKS:Record<string,AuthoredLanguageChecks>={
 'causal-everyday-short-clauses':{
  word:{
   immediate:check('tracing-sheet','word',['The tracing sheet was translucent: light passed through it, but objects on the other side looked blurred.'],'What does “translucent” mean here?',['Letting some light through without a clear view','Blocking all light from passing through','Giving a clear view of every detail behind it'],0,'The local description combines passing light with a blurred view. Neither complete darkness nor a completely clear view matches both details.'),
   delayed:check('brittle-twig','word',['The dry twig was brittle: it snapped under a small bend instead of curving.'],'What does “brittle” mean here?',['Able to curve a long way without breaking','Likely to break rather than bend','Able to return to its shape after stretching'],1,'Snapping under a small bend explains the word. Brittleness concerns breaking, not simply keeping a fixed shape or stretching and springing back.'),
  },
  literal:{
   immediate:check('urgent-envelope','literal',['Although the blue envelope was marked urgent, the courier did not collect it until the next day.'],'Which statement matches the sentence?',['Marking the envelope urgent made the courier collect it immediately.','The courier removed the urgent label before collecting the envelope.','The urgent label did not result in collection that same day.'],2,'Although contrasts the urgent label with the delay, and not until places collection on the next day. The sentence gives no account of a label being removed.'),
   delayed:check('puzzle-whistle','literal',['Keep the puzzle face down until the whistle sounds.','The whistle has not sounded yet.'],'What does the instruction require now?',['Keep the puzzle face down.','Turn it over because the instruction was read.','Turn it over if the other players are ready.'],0,'Until sets the whistle as the endpoint of keeping the puzzle face down. Neither reading the instruction nor the other players being ready replaces that stated condition.'),
  },
 },
 'causal-public-projects':{
  word:{
   immediate:check('reversible-display','word',['The exhibition’s new layout was reversible: each movable partition could be returned to its former position without altering the hall permanently.'],'What does “reversible” mean in this description?',['Certain to remain in place indefinitely','Possible to undo and restore to the earlier arrangement','Required to be changed before visitors arrive'],1,'The description explains that the earlier arrangement can be restored. It establishes a possibility, not a duty to undo the layout or a promise that it will remain.'),
   delayed:check('contiguous-plots','word',['The survey identified two contiguous plots: they share a boundary, with no road or other property between them.'],'Which meaning of “contiguous” fits the survey?',['Having identical owners','Equal in area and shape','Directly adjoining one another'],2,'The shared boundary and absence of intervening property establish adjacency. They supply no evidence that the owners, sizes or shapes match.'),
  },
  literal:{
   immediate:check('north-gate-notice','literal',['Unless the traffic officer closes the footpath, the north gate remains open, even while the south gate is shut for inspection.','The south gate is shut, but the officer has not closed the footpath.'],'According to the notice, what is the north gate’s status now?',['It is closed because the south gate is shut.','It is open because the stated exception has not occurred.','Its opening must wait until the south-gate inspection ends.'],1,'Unless introduces the footpath closure as the exception. The contrast with the south gate makes clear that its inspection does not itself close the north gate.'),
   delayed:check('former-report','literal',['Engineers reviewed the embankment report and the drainage plan; the former requires revised measurements, whereas the latter can proceed without revision.'],'Which document requires revised measurements?',['Both documents','The drainage plan','The embankment report'],2,'Former refers to the first document named, the embankment report; latter refers to the drainage plan. The contrasting clauses assign different requirements to them.'),
  },
 },
};
