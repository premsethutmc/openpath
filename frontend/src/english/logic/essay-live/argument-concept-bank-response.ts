/** Candidate task-fit and persuasion-concept recognition, not scored prose or validated levels. */
import type {WorkspaceBankDraft} from './workspace-bank-types.ts';
export const RESPONSE_DRAFTS:WorkspaceBankDraft[] = [
  {
    "key": "argument-tf-lost-glove",
    "prompt": "Task: Tell the caretaker where you found a lost glove. Which detail directly answers that request?",
    "options": [
      "Its owner probably enjoys winter.",
      "It was beside the drinking fountain.",
      "Gloves come in many materials."
    ],
    "answer": 1,
    "explanation": "A location answers where the glove was found; preferences and general facts do not.",
    "family": "argument-response.tf-lost-glove",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: A location answers where the glove was found; preferences and general facts do not. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-rain-explanation",
    "prompt": "A worksheet asks WHY the outdoor game stopped. Which response performs the requested action?",
    "options": [
      "The game stopped at noon.",
      "The game took place on grass.",
      "Lightning made it unsafe to continue."
    ],
    "answer": 2,
    "explanation": "The question asks for a cause, not the time or location.",
    "family": "argument-response.tf-rain-explanation",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The question asks for a cause, not the time or location. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-sign-reader",
    "prompt": "Write a notice telling visitors not to enter a wet floor area. Which information is most necessary?",
    "options": [
      "Keep out until the floor is dry.",
      "Our building opened in 1982.",
      "The cleaner prefers blue buckets."
    ],
    "answer": 0,
    "explanation": "The notice needs to guide visitors away from the hazard.",
    "family": "argument-response.tf-sign-reader",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The notice needs to guide visitors away from the hazard. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-two-part-message",
    "prompt": "Task: Name a club activity and say when it happens. Draft: “Our club builds models.” What is missing?",
    "options": [
      "The names of every member.",
      "When the activity happens.",
      "A history of model building."
    ],
    "answer": 1,
    "explanation": "The activity is present, but the requested time is absent.",
    "family": "argument-response.tf-two-part-message",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: The activity is present, but the requested time is absent. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-word-cap",
    "prompt": "An invitation task allows at most 40 words. A relevant draft contains 55 words. Which change best respects the task?",
    "options": [
      "Add a heading and ignore the limit.",
      "Replace every word with a longer word.",
      "Remove repetition while keeping essential invitation details."
    ],
    "answer": 2,
    "explanation": "The response must satisfy both content requirements and the stated length limit.",
    "family": "argument-response.tf-word-cap",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: The response must satisfy both content requirements and the stated length limit. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-list-format",
    "prompt": "The organiser asks for a list of three items to bring, not a story. Which response fits?",
    "options": [
      "Bottle; towel; spare shirt.",
      "Once I travelled to a very distant town.",
      "I enjoy trips because they are exciting."
    ],
    "answer": 0,
    "explanation": "The list supplies the requested items in the required form.",
    "family": "argument-response.tf-list-format",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: The list supplies the requested items in the required form. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-action-word",
    "prompt": "The task specifies shape first, colour second, and use last. Put these badge details in that order.",
    "options": [
      "Its surface is silver.",
      "It clips onto a jacket.",
      "It is triangular."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The sequence follows the three explicitly requested parts rather than a guessed general writing preference.",
    "family": "argument-response.tf-action-word",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The sequence follows the three explicitly requested parts rather than a guessed general writing preference. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-reading-before-writing",
    "prompt": "Order the three planning actions so that writing responds to the assignment.",
    "options": [
      "Read what the assignment requests.",
      "Select details that answer that request.",
      "Write a response using the relevant details."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "First establish the request, then choose fitting content, then write it.",
    "family": "argument-response.tf-reading-before-writing",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: First establish the request, then choose fitting content, then write it. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-audience-word",
    "prompt": "Instructions for newcomers must introduce the containers before telling them what goes inside, then explain collection. Order these units.",
    "options": [
      "The caretaker empties both at the end of the day.",
      "Place paper in the blue one and empty cans in the grey one.",
      "There are two labelled containers beside the classroom entrance."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "New readers need the containers identified before interpreting blue one and grey one.",
    "family": "argument-response.tf-audience-word",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: New readers need the containers identified before interpreting blue one and grey one. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-comparison-request",
    "prompt": "The task says compare travelling by bicycle and by bus. Which plan matches it?",
    "options": [
      "Describe only the paint on one bicycle.",
      "Explain a relevant similarity and difference between the two ways.",
      "Write a story that never mentions either way."
    ],
    "answer": 1,
    "explanation": "A comparison relates both subjects rather than describing only one.",
    "family": "argument-response.tf-comparison-request",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: A comparison relates both subjects rather than describing only one. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-required-number",
    "prompt": "The task asks for an opening statement followed by a first and a second water-saving suggestion. Order the supplied units.",
    "options": [
      "Two simple habits can reduce wasted water.",
      "First, turn off the tap while brushing.",
      "Second, collect leftover drinking water for plants."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "This supplies the requested two suggestions after identifying the purpose.",
    "family": "argument-response.tf-required-number",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: This supplies the requested two suggestions after identifying the purpose. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-personal-event",
    "prompt": "Task: Recount something that happened during your visit. Which sentence begins a response to that task?",
    "options": [
      "Visits are defined as occasions of attendance.",
      "All visits should last exactly three hours.",
      "During the visit, I discovered a locked courtyard."
    ],
    "answer": 2,
    "explanation": "A recount describes events from the visit rather than defining visits or prescribing rules.",
    "family": "argument-response.tf-personal-event",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: A recount describes events from the visit rather than defining visits or prescribing rules. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-requested-location",
    "prompt": "A delivery note must identify the building, then the entrance, then the safe place inside. Order its details.",
    "options": [
      "Use its side entrance facing the lane.",
      "Leave the parcel on the shelf just inside that entrance.",
      "The address is the stone building beside the post office."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The directions move from identifying the building to locating the entrance and then the drop-off place.",
    "family": "argument-response.tf-requested-location",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The directions move from identifying the building to locating the entrance and then the drop-off place. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-task-versus-topic",
    "prompt": "Task: Invite your neighbour to a shared meal. Which response does more than merely mention the topic?",
    "options": [
      "Food is an important subject.",
      "Please join us for a meal at six on Friday.",
      "A meal can contain several courses."
    ],
    "answer": 1,
    "explanation": "An invitation asks the intended reader to attend and gives usable details.",
    "family": "argument-response.tf-task-versus-topic",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: An invitation asks the intended reader to attend and gives usable details. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-permission-note",
    "prompt": "Follow this requested outline: introduce the activity first, explain its value second, and ask for approval last.",
    "options": [
      "Give the reason the activity is worthwhile.",
      "Ask the reader to approve your attendance.",
      "Explain which activity you want to attend."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "Identify the activity before referring to its value and requesting approval. This tests planning, not the quality of a finished note.",
    "family": "argument-response.tf-permission-note",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "retention",
    "independenceNote": "Ordering focus: Identify the activity before referring to its value and requesting approval. This tests planning, not the quality of a finished note. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-tf-summary-not-copy",
    "prompt": "A task asks for one sentence summarising a short story. What should the response prioritise?",
    "options": [
      "Every conversation copied in full.",
      "Only the page number.",
      "The main event or change in the story."
    ],
    "answer": 2,
    "explanation": "A short summary captures the central development instead of reproducing every detail.",
    "family": "argument-response.tf-summary-not-copy",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "foundation",
    "pool": "retention",
    "independenceNote": "Choice distinction: A short summary captures the central development instead of reproducing every detail. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-balanced-options",
    "prompt": "The prompt asks for one benefit and one drawback of replacing printed leaflets with messages. A draft gives two benefits. What repair is needed?",
    "options": [
      "Develop a drawback as well as the benefit.",
      "Add another benefit to make three.",
      "Delete all reference to the proposed change."
    ],
    "answer": 0,
    "explanation": "More positive detail does not satisfy the explicitly requested drawback.",
    "family": "argument-response.td-balanced-options",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: More positive detail does not satisfy the explicitly requested drawback. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-recommendation-criteria",
    "prompt": "Task: Recommend a venue using both cost and wheelchair access. Which plan is complete?",
    "options": [
      "Select the cheapest venue without mentioning access.",
      "Compare the venues on both criteria, then justify a choice.",
      "List room colours and choose a favourite."
    ],
    "answer": 1,
    "explanation": "The recommendation must use both named criteria, not substitute an unrelated preference.",
    "family": "argument-response.td-recommendation-criteria",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The recommendation must use both named criteria, not substitute an unrelated preference. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-procedure-audience",
    "prompt": "You must explain an unfamiliar online form to first-time users. Which addition most serves that reader?",
    "options": [
      "A claim that everyone already knows the form.",
      "A list of the developer’s hobbies.",
      "Where to begin and what information to have ready."
    ],
    "answer": 2,
    "explanation": "First-time users need starting information rather than assumed familiarity.",
    "family": "argument-response.td-procedure-audience",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: First-time users need starting information rather than assumed familiarity. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-source-boundary",
    "prompt": "A response must use only the supplied diary entry. Which material is within that boundary?",
    "options": [
      "An event explicitly described in the diary.",
      "An invented quotation attributed to its writer.",
      "An unsupported rumour from outside the entry."
    ],
    "answer": 0,
    "explanation": "The task restricts evidence to the supplied source.",
    "family": "argument-response.td-source-boundary",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: The task restricts evidence to the supplied source. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-explain-not-judge",
    "prompt": "Task: Explain how a pump moves water. Which paragraph plan stays on task?",
    "options": [
      "Rank several brands by popularity.",
      "Describe the sequence and function of its moving parts.",
      "Argue that all pumps should be banned."
    ],
    "answer": 1,
    "explanation": "How asks for a mechanism; evaluation and policy are different tasks.",
    "family": "argument-response.td-explain-not-judge",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: How asks for a mechanism; evaluation and policy are different tasks. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-register-complaint",
    "prompt": "A formal complaint should explain a delivery problem and request a remedy. Which addition is relevant?",
    "options": [
      "Insults about the driver’s appearance.",
      "A biography of the company founder.",
      "The missing item and the replacement requested."
    ],
    "answer": 2,
    "explanation": "Concrete problem and remedy information advances the purpose without irrelevant attacks.",
    "family": "argument-response.td-register-complaint",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: Concrete problem and remedy information advances the purpose without irrelevant attacks. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-contrast-directive",
    "prompt": "A comparison task requests a shared attitude before the contrasting attitudes of narrator A and narrator B, in that order.",
    "options": [
      "Narrator A regards the delay as wasted time.",
      "Narrator B sees the delay as an opportunity to explore.",
      "Both narrators initially expect a short journey."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The order follows the requested shared point and named contrast, not an arbitrary preference.",
    "family": "argument-response.td-contrast-directive",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The order follows the requested shared point and named contrast, not an arbitrary preference. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-comparison-plan",
    "prompt": "Arrange these planning steps for a recommendation based on two stated requirements.",
    "options": [
      "Identify both requirements in the brief.",
      "Collect relevant facts about each option.",
      "Judge which option meets the requirements better."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The criteria determine which facts matter; the judgment should follow the comparison.",
    "family": "argument-response.td-comparison-plan",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The criteria determine which facts matter; the judgment should follow the comparison. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-source-count",
    "prompt": "A response must state the two extracts’ common topic, then extract 1’s position, then extract 2’s position.",
    "options": [
      "Extract 2 argues that access matters more than speed.",
      "Extract 1 favours the change because it saves time.",
      "Both extracts discuss changes to ticket booking."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "Both sources are included in the specified comparative structure.",
    "family": "argument-response.td-source-count",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: Both sources are included in the specified comparative structure. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-relevance-filter",
    "prompt": "Task: Explain why the night bus is useful to late-shift workers. Which detail best develops the answer?",
    "options": [
      "The timetable lets them travel after their shifts finish.",
      "The bus manufacturer changed its logo ten years ago.",
      "The driver’s cousin plays chess."
    ],
    "answer": 0,
    "explanation": "The timetable connects the service directly to the workers’ stated need.",
    "family": "argument-response.td-relevance-filter",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The timetable connects the service directly to the workers’ stated need. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-audience-budget",
    "prompt": "For residents voting on a proposal, the brief requests the decision first, its cost second and voting instructions last.",
    "options": [
      "Residents must decide whether to add a shared workshop.",
      "The proposal would use the stated maintenance fund.",
      "Cast your vote at the community desk by Saturday."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The sequence makes the choice and its implication clear before the required action.",
    "family": "argument-response.td-audience-budget",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The sequence makes the choice and its implication clear before the required action. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-length-and-parts",
    "prompt": "A 100-word report must describe damage and suggest action. Ninety words describe damage; no action appears. Which revision is best?",
    "options": [
      "Add a title and call the report complete.",
      "Condense the description to leave room for a specific action.",
      "Replace the report with a list of unrelated facts."
    ],
    "answer": 1,
    "explanation": "Space should be allocated to both requirements within the limit.",
    "family": "argument-response.td-length-and-parts",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: Space should be allocated to both requirements within the limit. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-task-condition",
    "prompt": "The task says reject the plan, explain why, and propose an alternative. Order these three functions.",
    "options": [
      "The current budget cannot cover its full operating cost.",
      "Instead, test a small service in one district.",
      "I do not recommend immediate citywide adoption."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "Each required part is supplied in the stated order.",
    "family": "argument-response.td-task-condition",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: Each required part is supplied in the stated order. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-report-versus-letter",
    "prompt": "A task requests a neutral incident report, not a message to a friend. Which approach fits?",
    "options": [
      "Use private jokes instead of identifying events.",
      "Focus entirely on persuading a friend to meet tomorrow.",
      "State what happened, when, and what is known or uncertain."
    ],
    "answer": 2,
    "explanation": "The report’s function calls for a factual account with clear limits.",
    "family": "argument-response.td-report-versus-letter",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The report’s function calls for a factual account with clear limits. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-repair-plan",
    "prompt": "A draft does not answer the final part of its prompt. Order the revision actions.",
    "options": [
      "Check the completed draft against every requirement.",
      "Add relevant content for that missing part.",
      "Identify exactly which requested part is missing."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "Locate the omission before filling it, then check the whole response for remaining omissions.",
    "family": "argument-response.requirement-mapping-repair",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "retention",
    "independenceNote": "Ordering focus: Locate the omission before filling it, then check the whole response for remaining omissions. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-td-requested-position",
    "prompt": "The assignment asks you to defend an assigned position even if you disagree. Which response fulfils it?",
    "options": [
      "Present the strongest defensible reasons for that position.",
      "Refuse to mention the position and discuss a hobby.",
      "Claim that disagreement makes the assignment impossible."
    ],
    "answer": 0,
    "explanation": "The task assesses constructing the assigned case, not whether it matches the writer’s private belief.",
    "family": "argument-response.td-requested-position",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "developing",
    "pool": "retention",
    "independenceNote": "Choice distinction: The task assesses constructing the assigned case, not whether it matches the writer’s private belief. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-priority-constraints",
    "prompt": "The mandatory conditions are affordability and continued wheelchair access. Which proposal fails a non-negotiable requirement despite saving money?",
    "options": [
      "A cheaper supplier that keeps the accessible entrance.",
      "Closing the only step-free entrance to cut maintenance.",
      "Reducing decorative printing while keeping access unchanged."
    ],
    "answer": 1,
    "explanation": "Savings cannot compensate for violating the explicitly required access condition.",
    "family": "argument-response.ts-priority-constraints",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Savings cannot compensate for violating the explicitly required access condition. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-evaluate-not-summarise",
    "prompt": "Task: Evaluate whether a study supports a policy. A draft accurately summarises the study but never assesses its relevance or limits. What is missing?",
    "options": [
      "More biographical details about the researchers.",
      "A longer copy of the same summary.",
      "A judgment about how strongly the study supports the policy."
    ],
    "answer": 2,
    "explanation": "Evaluation requires a reasoned appraisal beyond an accurate summary.",
    "family": "argument-response.ts-evaluate-not-summarise",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Evaluation requires a reasoned appraisal beyond an accurate summary. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-qualified-recommendation",
    "prompt": "The task asks for a recommendation under uncertain costs. Which response best fulfils that purpose?",
    "options": [
      "Recommend a limited trial and explain what cost evidence would change the decision.",
      "Pretend the costs are known precisely when they are not.",
      "Discuss unrelated projects without making any recommendation."
    ],
    "answer": 0,
    "explanation": "A conditional recommendation can answer the task while honestly handling uncertainty.",
    "family": "argument-response.ts-qualified-recommendation",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: A conditional recommendation can answer the task while honestly handling uncertainty. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-integrate-sources",
    "prompt": "A synthesis must explain where two reports agree and disagree. Which plan performs synthesis?",
    "options": [
      "Summarise one report and ignore the other.",
      "Organise the shared finding and the disagreement, relating both sources under each.",
      "Copy both reports end to end without explaining relationships."
    ],
    "answer": 1,
    "explanation": "Synthesis makes connections between sources rather than placing disconnected summaries beside each other.",
    "family": "argument-response.ts-integrate-sources",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: Synthesis makes connections between sources rather than placing disconnected summaries beside each other. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-counter-role",
    "prompt": "The brief asks for an objection and a response to it. Which draft component is still missing after the objection is fairly stated?",
    "options": [
      "A personal insult directed at the objector.",
      "A second unrelated objection replacing the first.",
      "A reasoned reply that engages with that objection."
    ],
    "answer": 2,
    "explanation": "The two-part requirement needs both the objection and a relevant response.",
    "family": "argument-response.ts-counter-role",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: The two-part requirement needs both the objection and a relevant response. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-transfer-boundary",
    "prompt": "Task: Apply a principle to a new case and explain one limit of the application. Which plan is complete?",
    "options": [
      "Show the relevant similarity, apply the principle, then identify a difference that limits it.",
      "Repeat the original example without discussing the new case.",
      "Declare the principle universal without examining either case."
    ],
    "answer": 0,
    "explanation": "Application requires relating the principle to the new case and respecting the requested limit.",
    "family": "argument-response.ts-transfer-boundary",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: Application requires relating the principle to the new case and respecting the requested limit. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-directive-assessment",
    "prompt": "Arrange a response as proposed conclusion, reason the figures do not establish it, then evidence needed.",
    "options": [
      "Its figures omit the simultaneous reduction in traffic.",
      "A comparison with similar untreated groups would help test the claim.",
      "The report concludes that the new timetable caused the improvement."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The response identifies and evaluates the conclusion before naming a relevant further check.",
    "family": "argument-response.ts-directive-assessment",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The response identifies and evaluates the conclusion before naming a relevant further check. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-synthesis-workflow",
    "prompt": "Order a defensible process for a response comparing conflicting accounts.",
    "options": [
      "Separate each account’s claims from its supporting evidence.",
      "Compare the claims and evidence on the same disputed issue.",
      "Write a qualified conclusion reflecting the comparison."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "Identify what each source claims and supports before comparing them and drawing a bounded conclusion.",
    "family": "argument-response.ts-synthesis-workflow",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: Identify what each source claims and supports before comparing them and drawing a bounded conclusion. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-exclusive-evidence",
    "prompt": "A source-limited response must first identify what was measured, then state the finding, then bound its conclusion.",
    "options": [
      "The result applies to surveyed households, not automatically to all residents.",
      "Thirty preferred an evening collection.",
      "The survey asked fifty households about collection times."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "The answer remains grounded in the supplied survey and makes its limits visible.",
    "family": "argument-response.ts-exclusive-evidence",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The answer remains grounded in the supplied survey and makes its limits visible. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-reader-action",
    "prompt": "A policy memo must enable a manager to decide this week. Which otherwise relevant omission most obstructs that purpose?",
    "options": [
      "Failure to name feasible options and the consequences of choosing them now.",
      "Failure to list the manager’s favourite sports.",
      "Failure to recount the entire history of writing memos."
    ],
    "answer": 0,
    "explanation": "The decision-maker needs actionable alternatives and implications, not every possible background detail.",
    "family": "argument-response.ts-reader-action",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The decision-maker needs actionable alternatives and implications, not every possible background detail. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-two-conditions",
    "prompt": "A brief requires cost to be checked first, safety second, and a recommendation only after both. Order these units.",
    "options": [
      "The cost estimate remains below the stated ceiling.",
      "The safety review found the required safeguards included.",
      "Recommend a trial because both conditions are met in this proposal."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The requested decision follows, rather than substitutes for, checking both conditions.",
    "family": "argument-response.ts-two-conditions",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The requested decision follows, rather than substitutes for, checking both conditions. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-conflicting-instructions",
    "prompt": "A brief asks for a 50-word overview followed by a separate detailed appendix. How should you interpret the length instruction?",
    "options": [
      "Restrict the entire submission, including appendix, to 50 words despite the separate request.",
      "Keep the overview to 50 words and put supporting detail in the requested appendix.",
      "Ignore the overview and submit only raw notes."
    ],
    "answer": 1,
    "explanation": "The explicit separation assigns different functions to the overview and appendix.",
    "family": "argument-response.ts-conflicting-instructions",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The explicit separation assigns different functions to the overview and appendix. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-limits-requirement",
    "prompt": "The task explicitly requests benefit, limitation, then implication for the recommendation.",
    "options": [
      "However, some users may need assistance to access it.",
      "Therefore introduce it gradually while monitoring those users.",
      "The proposed booking system could reduce queues."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The implication responds to the limitation while retaining the stated benefit.",
    "family": "argument-response.ts-limits-requirement",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The implication responds to the limitation while retaining the stated benefit. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-avoid-scope-creep",
    "prompt": "You must compare the reliability of two measurements. Which attractive addition is least relevant to that purpose?",
    "options": [
      "How the measuring instruments were calibrated.",
      "Whether repeated readings agreed.",
      "Which instrument has the more fashionable casing."
    ],
    "answer": 2,
    "explanation": "Appearance does not by itself bear on reliability; calibration and repeatability do.",
    "family": "argument-response.ts-avoid-scope-creep",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: Appearance does not by itself bear on reliability; calibration and repeatability do. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-brief-audit",
    "prompt": "Order a final task-fit audit before submitting a multi-part response.",
    "options": [
      "Revise the parts that lack relevant development.",
      "Map each requirement to evidence of fulfilment in the draft.",
      "List the brief’s required purposes and constraints."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "An explicit checklist supports checking the draft and then repairing actual gaps.",
    "family": "argument-response.requirement-mapping-repair",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "retention",
    "independenceNote": "Ordering focus: An explicit checklist supports checking the draft and then repairing actual gaps. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ts-no-data-task",
    "prompt": "A task requests analysis of a chart, but the chart is missing. Which response respects the evidence boundary?",
    "options": [
      "Identify the missing chart and request it rather than inventing its values.",
      "Invent plausible numbers and present them as supplied data.",
      "Claim a precise conclusion without any values."
    ],
    "answer": 0,
    "explanation": "An absent required source cannot be replaced by fabricated evidence.",
    "family": "argument-response.ts-no-data-task",
    "capability": "EN.WRT.TSK.task_response",
    "difficulty": "stretch",
    "pool": "retention",
    "independenceNote": "Choice distinction: An absent required source cannot be replaced by fabricated evidence. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-position",
    "prompt": "Which sentence states a position that a writer could support with reasons?",
    "options": [
      "The meeting begins at four.",
      "I favour keeping the playground open longer.",
      "A playground contains several pieces of equipment."
    ],
    "answer": 1,
    "explanation": "The sentence expresses a recommendation; the others simply give information.",
    "family": "argument-response.pf-position",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The sentence expresses a recommendation; the others simply give information. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-reason-for-shelter",
    "prompt": "Claim: Put a shelter beside the outdoor waiting area. Which reason directly supports it?",
    "options": [
      "The organiser likes green stationery.",
      "Waiting areas have names.",
      "It would protect waiting passengers from heavy rain."
    ],
    "answer": 2,
    "explanation": "Protection from rain explains a benefit of the proposed shelter.",
    "family": "argument-response.pf-reason-for-shelter",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Protection from rain explains a benefit of the proposed shelter. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-opinion-repeat",
    "prompt": "Claim: The reading corner should stay open. Which sentence merely repeats that opinion rather than giving a reason?",
    "options": [
      "Keeping it open is what I think we should do.",
      "Children without quiet rooms use it after school.",
      "It provides access to books not available at home."
    ],
    "answer": 0,
    "explanation": "Restating the preference adds no explanation of why it should be accepted.",
    "family": "argument-response.pf-opinion-repeat",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Restating the preference adds no explanation of why it should be accepted. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-ask-reader",
    "prompt": "A poster aims to persuade neighbours to join a clean-up. Which detail most helps turn support into action?",
    "options": [
      "A list of unrelated historical dates.",
      "Where and when volunteers should meet.",
      "An unexplained reference to a private joke."
    ],
    "answer": 1,
    "explanation": "Interested readers need usable participation details.",
    "family": "argument-response.pf-ask-reader",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: Interested readers need usable participation details. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-support-example",
    "prompt": "Claim: A repair group could reduce waste. Which example supports that claim?",
    "options": [
      "A member bought a new notebook.",
      "The group’s name has six letters.",
      "Last month volunteers repaired ten broken lamps instead of discarding them."
    ],
    "answer": 2,
    "explanation": "Repairing items that would otherwise be discarded illustrates the proposed waste reduction.",
    "family": "argument-response.pf-support-example",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: Repairing items that would otherwise be discarded illustrates the proposed waste reduction. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-reader-benefit",
    "prompt": "You want shopkeepers to support a clear loading schedule. Which reason speaks directly to their work?",
    "options": [
      "Deliveries would be less likely to block their entrances at busy times.",
      "The timetable uses a fashionable font.",
      "Someone once owned a similar calendar."
    ],
    "answer": 0,
    "explanation": "The reason connects the proposal to a practical concern of the intended readers.",
    "family": "argument-response.pf-reader-benefit",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "practice",
    "independenceNote": "Choice distinction: The reason connects the proposal to a practical concern of the intended readers. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-claim-reason-example",
    "prompt": "Arrange the supplied material in the requested order: position, reason, concrete illustration.",
    "options": [
      "Regular checks would catch missed watering sooner.",
      "For instance, last week two seedlings dried out before anyone checked them.",
      "We should appoint a garden monitor."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The proposal comes first, followed by why it could help and an illustrative event.",
    "family": "argument-response.pf-claim-reason-example",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The proposal comes first, followed by why it could help and an illustrative event. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-request-chain",
    "prompt": "Put this short appeal in an order that introduces the request before its reason and ends with a way to respond.",
    "options": [
      "We need helpers to label the donation boxes.",
      "Clear labels will let families find the supplies they need.",
      "Please add your name to the volunteer list by Thursday."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The final action follows an explained request; this does not measure independent persuasive writing.",
    "family": "argument-response.pf-request-chain",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The final action follows an explained request; this does not measure independent persuasive writing. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-quote-context",
    "prompt": "Order the passage so the evidence is introduced before the conclusion drawn from it.",
    "options": [
      "This result supports offering the session again.",
      "Eighteen of the twenty respondents said that it did.",
      "We asked yesterday’s participants whether the practice session helped."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "The reader needs to know who was asked before interpreting the response count and the limited recommendation.",
    "family": "argument-response.pf-quote-context",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The reader needs to know who was asked before interpreting the response count and the limited recommendation. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-no-invented-evidence",
    "prompt": "You have no survey results for a proposal. Which approach is honest?",
    "options": [
      "Say that 95 percent agree, without asking anyone.",
      "Explain a plausible reason and say that support should be checked.",
      "Attribute an invented quotation to a neighbour."
    ],
    "answer": 1,
    "explanation": "Reasons can be offered without pretending that evidence has been collected.",
    "family": "argument-response.pf-no-invented-evidence",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: Reasons can be offered without pretending that evidence has been collected. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-observation-link",
    "prompt": "Arrange observation, explanation of its relevance, then recommendation.",
    "options": [
      "Several borrowers could not find where to leave returned games.",
      "An obvious return point would address that confusion.",
      "Add a clearly marked return shelf."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The explanation connects the observed difficulty to the recommended change.",
    "family": "argument-response.pf-observation-link",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The explanation connects the observed difficulty to the recommended change. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-topic-not-support",
    "prompt": "Claim: A footpath needs lighting for safer evening use. Which sentence is on the topic but supplies no supporting reason?",
    "options": [
      "The unlit bend is difficult to see after sunset.",
      "Residents using the path cannot easily spot obstacles.",
      "The path is a path used by people."
    ],
    "answer": 2,
    "explanation": "The circular statement adds no information linking lighting to safety.",
    "family": "argument-response.pf-topic-not-support",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The circular statement adds no information linking lighting to safety. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-petition-parts",
    "prompt": "Arrange the parts of a petition as concern, requested change, invitation to support.",
    "options": [
      "We ask for a refill tap near the entrance.",
      "Sign below if you support this request.",
      "The courtyard has no drinking-water point."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The reader first learns the concern, then the proposal, then the requested action.",
    "family": "argument-response.pf-petition-parts",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The reader first learns the concern, then the proposal, then the requested action. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-respectful-reason",
    "prompt": "Which response supports a proposal without attacking people who disagree?",
    "options": [
      "Anyone who objects must be stupid.",
      "The change could shorten queues because it adds another service point.",
      "Opponents have no right to ask questions."
    ],
    "answer": 1,
    "explanation": "A reason addresses the proposal; personal attacks do not establish its value.",
    "family": "argument-response.pf-respectful-reason",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: A reason addresses the proposal; personal attacks do not establish its value. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-evidence-labels",
    "prompt": "Order the three statements as recommendation, supporting observation, limitation of that observation.",
    "options": [
      "This was only one morning, so other times should be checked.",
      "Try opening a second desk during busy periods.",
      "On Monday, a second desk reduced the longest queue."
    ],
    "answer": 0,
    "order": [
      1,
      2,
      0
    ],
    "explanation": "The passage presents a recommendation with evidence and an explicit limit rather than claiming certainty.",
    "family": "argument-response.pf-evidence-labels",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "retention",
    "independenceNote": "Ordering focus: The passage presents a recommendation with evidence and an explicit limit rather than claiming certainty. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pf-relevant-example",
    "prompt": "A writer argues for captions on school videos. Which example is relevant?",
    "options": [
      "A captioned video helped a viewer follow the lesson when sound was unavailable.",
      "The video editor drinks tea.",
      "The classroom has four walls."
    ],
    "answer": 0,
    "explanation": "The example shows a practical access benefit of captions.",
    "family": "argument-response.pf-relevant-example",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "foundation",
    "pool": "retention",
    "independenceNote": "Choice distinction: The example shows a practical access benefit of captions. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-distinct-reasons",
    "prompt": "Which pair gives two distinct reasons for sharing tools rather than repeating one?",
    "options": [
      "Sharing saves money; sharing reduces the cost.",
      "Sharing lowers purchase costs; it also reduces storage space needed in homes.",
      "Sharing is good; sharing is very good."
    ],
    "answer": 1,
    "explanation": "The pair develops financial and storage benefits instead of restating a single benefit.",
    "family": "argument-response.pd-distinct-reasons",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The pair develops financial and storage benefits instead of restating a single benefit. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-warrant",
    "prompt": "Evidence: A trial sign reduced wrong turns at a junction. Claim: Install clearer signs there. Which link makes the reasoning explicit?",
    "options": [
      "Signs are objects made from materials.",
      "Junctions exist in many cities.",
      "If navigation errors are the problem, clearer directions address that problem."
    ],
    "answer": 2,
    "explanation": "The link explains why the observation supports this particular recommendation.",
    "family": "argument-response.pd-warrant",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The link explains why the observation supports this particular recommendation. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-unreliable-support",
    "prompt": "Which support for a recycling proposal is weakest as evidence?",
    "options": [
      "An invented statistic presented as a measured result.",
      "A recorded count of waste before and after a documented trial.",
      "A clearly labelled example explaining how the process could work."
    ],
    "answer": 0,
    "explanation": "Fabricated data cannot support the claim. An illustration must not be misrepresented as measured evidence.",
    "family": "argument-response.pd-unreliable-support",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Fabricated data cannot support the claim. An illustration must not be misrepresented as measured evidence. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-reader-concern",
    "prompt": "A manager worries that flexible start times will leave the desk uncovered. Which reply engages that concern?",
    "options": [
      "Flexible hours are fashionable, so coverage does not matter.",
      "Propose an overlapping rota and explain how coverage would be maintained.",
      "Discuss the manager’s taste in furniture."
    ],
    "answer": 1,
    "explanation": "The response addresses the practical concern instead of changing the subject. This is provisional objection-recognition practice, not band-8 achievement.",
    "family": "argument-response.pd-reader-concern",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: The response addresses the practical concern instead of changing the subject. This is provisional objection-recognition practice, not band-8 achievement. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-concede-without-collapse",
    "prompt": "Which statement acknowledges a drawback while retaining a qualified recommendation?",
    "options": [
      "The proposal has no possible drawbacks.",
      "Every objection proves the proposal is worthless.",
      "The new system costs more initially, but a small trial could test whether later savings justify it."
    ],
    "answer": 2,
    "explanation": "The statement accepts the initial cost and proposes testing the balance rather than denying or exaggerating it.",
    "family": "argument-response.pd-concede-without-collapse",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: The statement accepts the initial cost and proposes testing the balance rather than denying or exaggerating it. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-evidence-match",
    "prompt": "Claim: A training session improved participants’ ability to use a spreadsheet. Which evidence most directly bears on it?",
    "options": [
      "Their performance on comparable unfamiliar spreadsheet tasks before and after.",
      "The colour of the attendance forms.",
      "The number of chairs in the venue."
    ],
    "answer": 0,
    "explanation": "The evidence needs to concern the claimed ability, not merely the setting.",
    "family": "argument-response.pd-evidence-match",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "practice",
    "independenceNote": "Choice distinction: The evidence needs to concern the claimed ability, not merely the setting. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-cost-tradeoff",
    "prompt": "Arrange a proposal, the practical objection to it, then a response addressing that objection.",
    "options": [
      "Buy one projector for several community groups to share.",
      "A shared booking rota could allocate access when requests conflict.",
      "Different groups may want the projector at the same time."
    ],
    "answer": 0,
    "order": [
      0,
      2,
      1
    ],
    "explanation": "The response addresses the conflict created by sharing. This recognises a dialogue structure, not persuasive mastery.",
    "family": "argument-response.pd-cost-tradeoff",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The response addresses the conflict created by sharing. This recognises a dialogue structure, not persuasive mastery. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-source-inference",
    "prompt": "Order these units so a source is identified, its result stated, and the recommendation bounded.",
    "options": [
      "The report describes a two-week trial in one branch.",
      "During that trial, waiting times fell.",
      "A limited trial of the arrangement is reasonable, but this does not establish long-term success."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The source and scope come before the result and the limited recommendation.",
    "family": "argument-response.pd-source-inference",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The source and scope come before the result and the limited recommendation. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-assumption-test",
    "prompt": "Arrange the argument so its implicit condition is made visible before suggesting how to check it.",
    "options": [
      "Check whether residents can actually reach the proposed site.",
      "A shared workspace could help residents who lack a quiet place at home.",
      "This assumes that the intended users can travel there."
    ],
    "answer": 0,
    "order": [
      1,
      2,
      0
    ],
    "explanation": "The recommendation relies on accessibility; making that assumption visible identifies a relevant next check.",
    "family": "argument-response.pd-assumption-test",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The recommendation relies on accessibility; making that assumption visible identifies a relevant next check. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-qualified-scope",
    "prompt": "A pilot improved delivery times on one route. Which claim stays within that evidence?",
    "options": [
      "Every route will always improve.",
      "The pilot suggests the change may help on the tested route.",
      "All delivery problems have been solved permanently."
    ],
    "answer": 1,
    "explanation": "The qualified claim preserves the limited setting instead of turning a pilot into a universal result.",
    "family": "argument-response.pd-qualified-scope",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The qualified claim preserves the limited setting instead of turning a pilot into a universal result. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-fair-opponent",
    "prompt": "Order the passage as an opposing concern, a concession, then a relevant reply.",
    "options": [
      "Some staff worry that checking each entry will slow the work.",
      "The check does add time to each entry.",
      "A longer trial could measure whether reduced errors offset those minutes."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The response represents and acknowledges the concern before proposing a way to evaluate the trade-off; it does not prove the trade-off favourable.",
    "family": "argument-response.pd-fair-opponent",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The response represents and acknowledges the concern before proposing a way to evaluate the trade-off; it does not prove the trade-off favourable. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-correlation",
    "prompt": "Sales increased after a new sign appeared, during a local festival. Which conclusion is defensible?",
    "options": [
      "The sign must be the sole cause.",
      "The festival cannot matter because signs are visible.",
      "Both changes are possible explanations; the sign’s separate effect is uncertain."
    ],
    "answer": 2,
    "explanation": "The simultaneous festival prevents attributing the entire increase to the sign alone.",
    "family": "argument-response.concurrent-change-causal-attribution",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The simultaneous festival prevents attributing the entire increase to the sign alone. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-support-to-action",
    "prompt": "Arrange problem, evidence about that problem, then a proportionate recommendation.",
    "options": [
      "Records show many unsuccessful collections just after closing time.",
      "Test a longer collection window on two evenings.",
      "Some households cannot collect parcels before the office closes."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The recommendation responds to the stated problem and evidence rather than introducing an unrelated solution.",
    "family": "argument-response.pd-support-to-action",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The recommendation responds to the stated problem and evidence rather than introducing an unrelated solution. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-nuanced-language",
    "prompt": "Which wording is justified when a sample contains mixed responses?",
    "options": [
      "Everyone enthusiastically supports the plan.",
      "Most sampled respondents supported the plan, but some raised concerns.",
      "No person has any concern about the plan."
    ],
    "answer": 1,
    "explanation": "The wording preserves both the majority pattern and the presence of disagreement.",
    "family": "argument-response.pd-nuanced-language",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The wording preserves both the majority pattern and the presence of disagreement. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-analogy-limit",
    "prompt": "Order an analogy, the relevant difference, then a cautious conclusion.",
    "options": [
      "Therefore the comparison suggests a possibility, not a guaranteed result here.",
      "Our town has steeper roads and fewer protected cycle lanes.",
      "A neighbouring town’s bike scheme reduced short car trips."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "The difference limits what can be inferred from the neighbouring town’s experience.",
    "family": "argument-response.pd-analogy-limit",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "retention",
    "independenceNote": "Ordering focus: The difference limits what can be inferred from the neighbouring town’s experience. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-pd-vote-not-truth",
    "prompt": "Many people favour a policy. What does that establish by itself?",
    "options": [
      "The policy has supporters, not that every claim made for it is true.",
      "The policy cannot have any costs.",
      "No evidence about its effects is needed."
    ],
    "answer": 0,
    "explanation": "Popularity is evidence of preferences, not automatic proof of effectiveness or absence of costs.",
    "family": "argument-response.pd-vote-not-truth",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "developing",
    "pool": "retention",
    "independenceNote": "Choice distinction: Popularity is evidence of preferences, not automatic proof of effectiveness or absence of costs. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-generalisation",
    "prompt": "A company tests a scheme only among volunteers who already favour it. What limits a claim that all staff will benefit?",
    "options": [
      "Volunteers can never give useful information.",
      "Their motivation may differ from that of the wider staff.",
      "A test with volunteers proves every possible outcome."
    ],
    "answer": 1,
    "explanation": "Selection may limit generalisation; it does not make the observed experience worthless.",
    "family": "argument-response.ps-generalisation",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: Selection may limit generalisation; it does not make the observed experience worthless. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-burden-of-proof",
    "prompt": "A proposal claims an expensive upgrade will halve failures but supplies no evidence. Which response best examines that claim?",
    "options": [
      "Assume precision proves accuracy.",
      "Accept it because the equipment is new.",
      "Ask what observations or tests justify the predicted reduction."
    ],
    "answer": 2,
    "explanation": "A precise prediction still requires support; novelty alone does not supply it.",
    "family": "argument-response.ps-burden-of-proof",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: A precise prediction still requires support; novelty alone does not supply it. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-condition-reversal",
    "prompt": "Argument: If the seal is broken, the package must be inspected. This package was inspected, so its seal was broken. What is the gap?",
    "options": [
      "Inspection could have been required for another reason.",
      "Broken seals can never be inspected.",
      "The rule says all intact packages must be discarded."
    ],
    "answer": 0,
    "explanation": "The argument incorrectly treats one sufficient condition for inspection as the only possible cause.",
    "family": "argument-response.ps-condition-reversal",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "independenceNote": "Choice distinction: The argument incorrectly treats one sufficient condition for inspection as the only possible cause. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-opposition-steelman",
    "prompt": "A critic worries that a cashless system excludes people without digital access. Which response most fairly engages that objection?",
    "options": [
      "Call the critic afraid of progress.",
      "Explain how an alternative payment route would remain available and test whether it meets the concern.",
      "Describe faster transactions without mentioning excluded users."
    ],
    "answer": 1,
    "explanation": "The reply addresses the strongest relevant access concern. Recognising this move is not proof of band-8 counterargument performance.",
    "family": "argument-response.ps-opposition-steelman",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: The reply addresses the strongest relevant access concern. Recognising this move is not proof of band-8 counterargument performance. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-false-dilemma",
    "prompt": "A writer says we must either close the community hall or ignore all repair costs. What should be examined?",
    "options": [
      "Whether the writer used a short sentence.",
      "Whether the hall has a familiar name.",
      "Whether partial repairs or phased funding provide other feasible options."
    ],
    "answer": 2,
    "explanation": "The argument assumes only two choices when intermediate alternatives may exist.",
    "family": "argument-response.ps-false-dilemma",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: The argument assumes only two choices when intermediate alternatives may exist. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-denominator",
    "prompt": "A service handled twice as many complaints after its customer base tripled. What evidence helps judge whether the complaint problem worsened?",
    "options": [
      "Complaint rates relative to customer numbers, alongside severity and recording changes.",
      "The total count alone, with no context.",
      "The length of the service’s name."
    ],
    "answer": 0,
    "explanation": "Counts must be interpreted against exposure and comparability; a rate is informative but not the entire assessment.",
    "family": "argument-response.ps-denominator",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "practice",
    "independenceNote": "Choice distinction: Counts must be interpreted against exposure and comparability; a rate is informative but not the entire assessment. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-causal-caution",
    "prompt": "Arrange the observation, the competing explanation, then the bounded inference.",
    "options": [
      "The building was also occupied for fewer hours.",
      "The change alone cannot yet be credited for the whole reduction.",
      "Energy use fell after new controls were installed."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The additional change limits attribution of the observed reduction to the controls.",
    "family": "argument-response.concurrent-change-causal-attribution",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The additional change limits attribution of the observed reduction to the controls. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-distribution",
    "prompt": "Order a broad benefit claim, a distributional qualification, then a proposal responding to that qualification.",
    "options": [
      "The change may reduce costs on average.",
      "However, those savings may be uneven while some households pay more initially.",
      "Offer targeted support to households facing the largest transition costs."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "Average benefit does not resolve unequal effects; the final proposal addresses that separate concern.",
    "family": "argument-response.ps-distribution",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: Average benefit does not resolve unequal effects; the final proposal addresses that separate concern. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-evidence-reversal",
    "prompt": "Order an initial recommendation, new contradictory evidence, then a reasoned revision.",
    "options": [
      "Revise the recommendation until that risk has been investigated.",
      "A later test found a safety problem under normal use.",
      "The first report suggested adopting the material."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "A recommendation should respond to relevant contradictory evidence rather than treat consistency as more important than support.",
    "family": "argument-response.ps-evidence-reversal",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: A recommendation should respond to relevant contradictory evidence rather than treat consistency as more important than support. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-comparison-baseline",
    "prompt": "A new process is called successful because output rose. Which missing comparison most directly matters to the claim that the process improved productivity?",
    "options": [
      "Whether the manager likes the process name.",
      "How output changed relative to labour and resources under comparable conditions.",
      "Whether the report has a colourful cover."
    ],
    "answer": 1,
    "explanation": "Productivity concerns outputs relative to inputs; raw volume alone can rise through greater inputs.",
    "family": "argument-response.ps-comparison-baseline",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: Productivity concerns outputs relative to inputs; raw volume alone can rise through greater inputs. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-objection-boundary",
    "prompt": "Arrange a broad recommendation, a case that challenges its scope, then a narrower response.",
    "options": [
      "Publish all project records openly to improve scrutiny.",
      "Some records contain confidential personal details.",
      "Limit publication to records that can be shared without breaching confidentiality."
    ],
    "answer": 0,
    "order": [
      0,
      1,
      2
    ],
    "explanation": "The exception prompts a scope repair rather than requiring either unrestricted publication or rejection of all scrutiny.",
    "family": "argument-response.ps-objection-boundary",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The exception prompts a scope repair rather than requiring either unrestricted publication or rejection of all scrutiny. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-uncertainty-action",
    "prompt": "Two plausible estimates give different costs. Which argument handles this uncertainty responsibly?",
    "options": [
      "Report the cheaper estimate as certain and hide the other.",
      "Claim that disagreement means no decision can ever be made.",
      "Explain how the recommendation changes across the plausible cost range."
    ],
    "answer": 2,
    "explanation": "Sensitivity to the range makes the decision reasoning inspectable without pretending certainty.",
    "family": "argument-response.ps-uncertainty-action",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: Sensitivity to the range makes the decision reasoning inspectable without pretending certainty. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-means-end",
    "prompt": "Arrange the proposed measure, the gap between measure and goal, then a better test.",
    "options": [
      "A high reply count does not establish that users’ problems were solved.",
      "Check whether users obtained usable answers, not just how many replies were sent.",
      "The help desk proposes counting replies as its success measure."
    ],
    "answer": 0,
    "order": [
      2,
      0,
      1
    ],
    "explanation": "The final test addresses the actual goal that the activity count may miss.",
    "family": "argument-response.ps-means-end",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Ordering focus: The final test addresses the actual goal that the activity count may miss. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-expert-scope",
    "prompt": "An expert in bridge design endorses a medical claim without medical evidence. What is the relevant concern?",
    "options": [
      "Experts can never be consulted on anything.",
      "Expertise in one field does not by itself justify authority in another.",
      "Bridge design proves every medical claim false."
    ],
    "answer": 1,
    "explanation": "The expertise cited does not match the subject; the medical claim still needs appropriate evidence.",
    "family": "argument-response.ps-expert-scope",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "confirmation",
    "independenceNote": "Choice distinction: The expertise cited does not match the subject; the medical claim still needs appropriate evidence. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-rebuttal-evidence",
    "prompt": "Arrange a criticism, a test that would address it, then a conditional conclusion.",
    "options": [
      "If that comparison still shows a benefit, the criticism would be weakened, not automatically eliminated.",
      "Compare outcomes for cases of similar difficulty under both methods.",
      "Critics say the reported gains reflect easier cases rather than a better method."
    ],
    "answer": 0,
    "order": [
      2,
      1,
      0
    ],
    "explanation": "The test targets the rival explanation and keeps the conclusion conditional. This is concept recognition, not a validated persuasive-writing performance.",
    "family": "argument-response.ps-rebuttal-evidence",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "retention",
    "independenceNote": "Ordering focus: The test targets the rival explanation and keeps the conclusion conditional. This is concept recognition, not a validated persuasive-writing performance. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  },
  {
    "key": "argument-ps-absence-evidence",
    "prompt": "No failures were reported during a very short trial. Which statement best respects the evidential limit?",
    "options": [
      "The trial found no reported failures, but cannot establish that failures never occur.",
      "The product is guaranteed never to fail.",
      "The trial proves every possible use is safe."
    ],
    "answer": 0,
    "explanation": "A limited period without reports does not justify a universal guarantee.",
    "family": "argument-response.ps-absence-evidence",
    "capability": "EN.WRT.GEN.persuasive",
    "difficulty": "stretch",
    "pool": "retention",
    "independenceNote": "Choice distinction: A limited period without reports does not justify a universal guarantee. This bounded recognition task is not independent prose production or a calibrated proficiency result."
  }
];
