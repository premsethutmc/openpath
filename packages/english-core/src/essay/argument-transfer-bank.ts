/**
 * Finite authored candidate topics for a new writing attempt, not exam papers or calibrated forms.
 * A task keeps its identity across goals and all self-selected difficulty references. Goal eligibility
 * is context suitability only: changing preferences must never reset exposure to a topic/family.
 * These are propositions, not verified factual claims. No answer, model argument or coaching is supplied.
 */
import type {ArgumentTransferTask,WorkspaceGoal} from './argument.ts';
const shared:readonly WorkspaceGoal[]=Object.freeze(['grade7','general','cat','gre','gmat']);
const adult:readonly WorkspaceGoal[]=Object.freeze(['general','cat','gre','gmat']);
const instructions='Write your own argument taking a position on this question. Write 30–800 words. This is candidate practice, not an official exam task.';
function task(id:string,family:string,topic:string,allowedGoals:readonly WorkspaceGoal[]):ArgumentTransferTask{
 return Object.freeze({id:`argument-transfer.${id}`,version:1,family:`argument-transfer-family.${family}`,topic,prompt:`${topic}\n${instructions}`,allowedGoals});
}
/**
 * Ten everyday/school/community decisions and four adult organisational/public decisions.
 * Four adult-only topics assume familiarity with recruitment, subscriptions, news publishing or
 * purchasing. They are not made into new "easier" topics by substituting school-related nouns.
 */
export const ARGUMENT_TRANSFER_TASKS:readonly ArgumentTransferTask[]=Object.freeze([
 task('museum-handling','museum-originals-and-replicas','Should a museum let visitors handle replicas while keeping its original objects behind glass?',shared),
 task('club-allocation','oversubscribed-club-allocation','When more people want to join a club than it can accommodate, should places be allocated by lottery rather than by who applies first?',shared),
 task('anonymous-art','anonymous-competition-judging','Should an art competition hide the creators’ names from its judges until judging is complete?',shared),
 task('festival-entry','community-event-admission','Should a community festival charge a small entry fee rather than make entry free?',shared),
 task('lunch-orders','advance-school-meal-orders','Should a school require students to choose their lunch a day in advance rather than when they arrive at the canteen?',shared),
 task('team-awards','collective-and-individual-awards','Should a club give awards only to whole teams rather than to individual members?',shared),
 task('unsigned-notices','anonymous-public-notices','Should a neighbourhood notice board allow unsigned contributions?',shared),
 task('reference-quiz','reference-access-during-quiz','Should a community quiz allow teams to consult reference books during the competition?',shared),
 task('rule-votes','club-rule-change-authority','Should changes to a club’s rules require a vote by its members rather than a decision by its organiser alone?',shared),
 task('work-display','permission-for-schoolwork-display','Should schools ask each student’s permission before displaying that student’s work in a public exhibition?',shared),
 task('salary-ranges','recruitment-pay-transparency','Should employers publish a salary range in every job advertisement?',adult),
 task('renewal-choice','subscription-renewal-consent','Should paid subscriptions end unless customers actively choose to renew them, rather than renew automatically?',adult),
 task('correction-history','public-news-correction-record','Should a news publisher keep a visible correction history when it changes a published report?',adult),
 task('bid-criteria','advance-purchasing-criteria','Should an organisation publish its supplier-selection criteria before receiving bids?',adult),
]);
