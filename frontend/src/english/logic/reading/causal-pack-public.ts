import type {CausalDimension, CausalItem, CausalPack} from './causal.ts';

// Fictional public-project passages. Authored local reading tasks, not calibrated levels.
function item(key:string,dimension:CausalDimension,passage:string[],prompt:string,options:string[],answer:number,explanation:string,sets:number[][]=[]):CausalItem {
  return {id:`causal.public.${key}`,family:`causal.public.family.${key}`,dimension,passage,prompt,options,answer,sets,explanation};
}

export const PUBLIC_CAUSAL_PACK:CausalPack={
 id:'causal-public-projects',version:1,title:'Connecting clues: public projects',
 language:{vocabulary:'Context-supported public-project and mechanism vocabulary.',syntax:'Embedded qualifications, contrasting clauses and explicit reference links.'},
 context:'Fictional public-project trials, accessible without specialist knowledge.',
 integrationDemand:'Join two relevant sentence clues among three to connect a stated mechanism with an action and a bounded observation; not proof of sole causation.',
 battery:[
  item('acoustic-facing','integration',[
   'The panels chosen for a station corridor absorb sound on their soft faces but reflect it on their hard backs.',
   'During the trial, installers turned the soft faces towards the noisy service room, without changing the room’s operating hours; echoes were shorter afterwards, although the report did not record every other change in the corridor.',
   'The trial report used a blue cover.'
  ],'Which explanation connects the panel design with the installation, without treating the trial as conclusive proof? Choose the sentence clues needed for that connection.',[
   'The service equipment produced less sound after its motor was replaced.',
   'The side designed to absorb sound faced the noise source, making reduced reflection plausible, though other changes remain possible.',
   'Either side of the panels would necessarily have had the same effect.'
  ],1,'The panel-design clue states which face absorbs sound; the installation clue locates that face relative to the source. Together they supply the mechanism and its application. The installation clue also includes the observation and its limitation; the report-cover detail does not explain the echoes.',[[0,1]]),
  item('noticeboard-glare','integration',[
   'On the information board’s glossy surface, a bright reflected sky can hide the printed letters.',
   'The new swivel mount allowed staff to angle the unchanged board towards a shaded arcade rather than the open sky; visitors then reported fewer reading difficulties, but staff had also begun giving spoken directions.',
   'The board carries the square’s name above the notices.'
  ],'How could the swivel mount have helped people read the board? Select the clues that link the original difficulty to the change.',[
   'It could reduce the bright reflection by changing what the surface faced; this does not establish that it caused the entire improvement.',
   'It enlarged the letters, which the passage identifies as the only source of improvement.',
   'Staff replaced the lettering with larger print that was easier to read from the same distance.'
  ],0,'The reflection clue supplies the glare mechanism and the mounting clue supplies the changed orientation. The spoken-directions detail leaves a separate possible contributor, so the explanation is deliberately limited.',[[0,1]]),
  item('mosaic-cordon','word',[
   'While workers repaired the civic mosaic, the damaged area was cordoned off: a line of temporary barriers kept visitors outside it.',
   'The rest of the square remained open.'
  ],'What does “cordoned off” mean here?',[
   'Decorated to attract a larger crowd.','Closed forever and removed from the map.','Separated by a boundary to keep people out.'
  ],2,'The barriers and the instruction to keep visitors outside establish a restricted boundary, not permanent closure.'),
  item('fountain-intermittent','word',[
   'The plaza fountain ran intermittently during its test: ten seconds of spray were followed by a minute with no spray, and this pattern continued.',
   'An observer recorded the pauses as well as the bursts.'
  ],'Which meaning of “intermittently” fits the test?',[
   'With breaks between periods of operation.','Without stopping for the whole test.','With steadily increasing height.'
  ],0,'The repeated pauses between bursts explain the word; spray height is not described.'),
  item('gantry-permit','literal',[
   'Although the viewing gantry is finished, visitors may enter only after the inspector has signed the access notice.',
   'The inspector has inspected the structure but has not yet signed that notice.'
  ],'According to the notice, may visitors enter now?',[
   'Yes, because finishing the structure cancels the signature requirement.',
   'No, because the stated requirement has not yet been met.',
   'Yes, because an inspection and a signed notice mean exactly the same thing.'
  ],1,'“Although” acknowledges completion without removing the condition. Inspection alone is not the required signature.'),
  item('beacon-reference','literal',[
   'The technician compared the harbour beacon’s old controller with its replacement before connecting the latter to the power supply.',
   'The old controller remained on the workbench.'
  ],'What was connected to the power supply?',[
   'Both controllers at the same time.','The old controller.','The replacement controller.'
  ],2,'“The latter” refers to the second of the two controllers mentioned, the replacement; “before” places comparison first.')
 ],
 lessons:{
  word:{
   title:'Use the local explanation of an unfamiliar word',
   explanation:'A technical-looking word may be explained by what the people do next. Use that detail rather than a familiar but unrelated meaning.',
   steps:['Locate the unfamiliar expression.','Read the action or description immediately around it.','Substitute a short meaning and check that the whole sentence still makes sense.'],
   workedExample:item('surplus-tiles','word',[
    'After the walkway was complete, the depot stored the surplus tiles: these were the unused tiles left over from the order.',
    'They were kept for possible repairs.'
   ],'What does “surplus” mean in this account?',['Broken beyond repair.','More than were needed for the completed job.','Borrowed from another project.'],1,'The phrase “unused tiles left over” supplies the meaning. Storing them for repairs does not imply that they are broken.')
  },
  literal:{
   title:'Separate the main statement from its qualification',
   explanation:'Dense sentences often acknowledge one fact while keeping a different restriction in force. Identify exactly which action the restriction controls.',
   steps:['Find the action being permitted or required.','Identify words such as although, until and only.','Restate the restriction without discarding it just because another condition looks favourable.'],
   workedExample:item('crane-clearance','literal',[
    'Although the crane has been unloaded, its operator must remain at the controls until the supervisor gives the release signal.',
    'The signal has not been given.'
   ],'Which statement follows the instruction?',['The operator must still remain at the controls.','Unloading automatically releases the operator.','The supervisor must now operate the crane.'],0,'Unloading is acknowledged, but “until” makes the release signal the stopping condition. The passage does not say that the supervisor takes over.')
  },
  integration:{
   title:'Connect a stated mechanism to a specific change',
   explanation:'One sentence can describe how something works while another describes what the project changed. Join those clues before choosing an explanation. A plausible mechanism is not proof of the whole outcome.',
   steps:['Identify the physical relationship stated in the passage.','Find the project action that changes one part of that relationship.','Connect those two facts in your own words, then keep any limits on the conclusion.'],
   workedExample:item('bridge-expansion','integration',[
   'When metal bridge sections warm, they lengthen; if their ends press against a fixed obstruction, they can bend.',
   'The footbridge redesign left a narrow space between each section’s end and the next fixed support; no bending was recorded during the first summer, which was cooler than the previous one.',
   'The footbridge is named after a nearby village.'
   ],'Why might the added spaces reduce bending? Select the clues that explain how the redesign addresses the stated problem.',[
    'They guarantee the metal can never become warm.',
    'They show that summer temperatures were identical in both years.',
    'They give lengthening sections room before their ends press against a fixed support; the cooler summer still limits the comparison.'
   ],2,'The lengthening-and-obstruction relationship combines with the spaces described in the redesign. The cooler-summer qualification prevents attributing the result solely to the redesign.',[[0,1]])
  },
  mixed:{
   title:'Unpack the words, then build the link',
   explanation:'First clarify an unfamiliar term or a dense clause. Then connect the mechanism with the project action. Keep an alternative explanation separate from the proposed mechanism.',
   steps:['Translate the key term using its nearby explanation.','Restate what the project changed, including any restriction.','Join that change to the mechanism, using at least two sentence clues.'],
   workedExample:item('cable-sleeve','integration',[
   'Abrasion means surface wear caused by rubbing; a cable wears where it repeatedly slides against a sharp metal edge.',
   'At the public clock tower, workers fitted a smooth sleeve over the edge touched by the moving cable; the next inspection found less wear, but it covered a shorter period of use.',
   'The clock tower appears on the town crest.'
   ],'Which explanation links the sleeve to possible reduced wear? Choose the linking sentence clues.',[
    'The sleeve changes the contact surface at the place where rubbing can wear the cable, although the unequal inspection periods limit the result.',
    'Abrasion means a loss of electrical power, so the sleeve must supply electricity.',
    'A shorter inspection period proves that the sleeve prevented every kind of damage.'
   ],0,'The abrasion clue defines the wear mechanism; the installation clue changes the edge in contact with the cable. The shorter observation period is a limitation, not proof of the proposed effect.',[[0,1]])
  }
 },
 practice:{
  word:[item('recessed-speaker','word',[
   'The announcement speaker was recessed into the tunnel wall: its front sat behind the wall’s outer surface instead of projecting into the passage.',
   'A grille covered the opening.'
  ],'In this description, “recessed” means:',[
   'Switched off for a short break.','Set back into a surface.','Suspended high above a surface.'
  ],1,'The position behind the outer wall surface explains “recessed”. The sentence describes placement, not an interruption of sound.')],
  literal:[item('archive-loading','literal',[
   'The loading entrance, unlike the visitors’ entrance, remains available during the exhibition, provided that a staff member accompanies each delivery.',
   'A delivery driver has arrived without a staff member.'
  ],'Does the sentence permit this unaccompanied delivery through the loading entrance?',[
   'Yes; “remains available” makes the rest of the sentence optional.',
   'Yes; the visitors’ entrance and loading entrance have identical rules.',
   'No; availability is qualified by the staff-accompaniment condition.'
  ],2,'“Provided that” imposes a condition on the loading entrance’s availability; the contrast with the visitors’ entrance does not remove it.')],
  integration:[item('pavilion-roof','integration',[
   'Water remains on a level roof unless it reaches an outlet; a sloping surface instead lets it run towards the lower edge.',
   'The pavilion’s replacement roof was tilted towards an open collection channel at its lower edge; less water remained after the next shower, though that shower was lighter than the one used for the earlier observation.',
   'The pavilion stands beside the eastern entrance to the park.'
  ],'Which connection explains why the replacement could leave less water standing? Select the clues that establish the mechanism and its use.',[
   'The tilt provides a path towards the lower collection channel, but the unequal showers prevent a clean before-and-after comparison.',
   'The roof must have absorbed all the water because no outlet was available.',
   'A lighter shower demonstrates that roof angle has no possible effect.'
  ],0,'The roof-behaviour clue supplies the relationship between slope and movement; the replacement description places the channel where that movement leads. The rainfall difference limits attribution, not the plausibility of the mechanism.',[[0,1]])],
  mixed:[item('turnstile-drag','integration',[
   'In the ticket hall report, “drag” means resistance to turning; the report says it increases when grit lodges between a turnstile’s moving surfaces.',
   'Workers cleaned grit from those surfaces without replacing the turnstile; the turnstile was easier to push afterwards, although a different observer made the second judgement.',
   'The hall’s floor has a geometric tile pattern.'
  ],'How might the cleaning account for the change? Select the two clues that connect the stated mechanism and action.',[
   'Cleaning replaced the whole turnstile with one of a different design.',
   'Removing material associated with resistance could make turning easier; the different observers limit the comparison.',
   '“Drag” refers to the length of the queue, so cleaning shortened the queue.'
  ],1,'The local definition links grit with resistance. The cleaning description removes grit at that location. The observer qualification does not justify treating subjective judgements by different observers as an exact measurement.',[[0,1]])]
 },
 immediate:[
  item('signal-lens','integration',[
   'Drops on the outer face of a warning signal’s lens scatter its light, making its outline less distinct.',
   'The new hood projects above and around that face while leaving the forward light path open; during rain, fewer drops reached the lens beneath it, and observers described a clearer outline, although brightness was not measured.',
   'The signal housing bears the project’s identification number.'
  ],'Which explanation links the hood trial to a possible clearer outline? Select the smallest sentence set that supplies the water-related mechanism and evidence that it changed.',[
   'The hood blocked the forward light path completely, making the signal clearer.',
   'A more powerful lamp produced a clearer outline through the same number of drops.',
   'Fewer drops reached a surface where drops scatter light, so reduced scattering is a plausible explanation.'
  ],2,'The lens clue supplies the effect of drops; the hood-trial clue describes the hood and states that fewer drops reached the lens. Neither alone explains the connection. The identification number is irrelevant, and brightness was not measured.',[[0,1]]) ,
  item('crossing-clicker','integration',[
   'The crossing’s audible click is generated when a small striker hits a metal plate, not when its display changes.',
   'In the replacement unit, a thin cushioning layer sits at that point of contact and softens each impact; pedestrians reported a quieter click, but the team had not measured how easily it could be heard in heavy traffic.',
   'The crossing is called West Gate in the council records.'
  ],'Which explanation follows by connecting the sound source and the replacement design? Select those sentence clues.',[
   'The replacement reduced the speed of the striker before it reached the plate.',
   'Softening the impact at the stated sound source could reduce the click; hearing it in heavy traffic is a separate, untested issue.',
   'A quieter click proves that every pedestrian can still hear it under all conditions.'
  ],1,'The sound-source clue locates sound generation at the strike; the replacement-design clue softens that very contact. This supports a mechanism for quieter sound, not a conclusion about accessibility in every setting.',[[0,1]])
 ],
 delayed:[
  item('ventilation-baffle','integration',[
   'When air blows directly across the counter window, it can lift loose forms from the counter.',
   'The new baffle redirects incoming air upwards before it reaches the counter, rather than stopping ventilation altogether; fewer forms moved during a trial, though the outside wind was also weaker that afternoon.',
   'The counter is numbered seven on the building plan.'
  ],'What connection makes a reduction in moving forms plausible without proving the baffle caused the entire change? Choose the linking clues.',[
   'Redirecting air away from the direct path across the forms could reduce lifting; the weaker wind remains another possible contributor.',
   'Heavier forms resisted the same direct airflow across the counter.',
   'The trial proves that wind strength never matters.'
  ],0,'The airflow clue describes the lifting condition, and the baffle description changes the direction of airflow relative to the counter. The weaker wind prevents attributing the whole observed difference to the baffle.',[[0,1]]),
  item('paint-screen','integration',[
   'When airborne dust settles into a mural’s wet base coating, workers must remove it before applying the final layer, delaying that layer.',
   'During the next section, a temporary mesh screen intercepted much of the dust arriving from the adjacent work area; the final layer could be applied sooner, although the next section was also smaller.',
   'The mural depicts figures from a local folktale.'
  ],'Which explanation connects the screen’s stated action to a possible reduction in the wait? Select the relevant linking sentence clues.',[
   'A smaller section proves that dust never affects the work.',
   'A faster-setting base coating allowed the final layer to be applied sooner.',
   'Intercepting dust could reduce the dust-removal delay described for the wet coating; the smaller section is another possible contributor.'
  ],2,'The coating clue supplies the dust-related delay, and the screen description reduces incoming dust. Together they support a possible mechanism, not a conclusion that screen installation explains all the time difference.',[[0,1]])
 ]
};
