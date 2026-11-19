/**
 * The sure slips the writing check knows. Every entry is a form that is never right in plain English prose,
 * whatever the writer meant; anything that could be a real word or a fair choice is left out on purpose,
 * because a wrong note teaches a mistake. A test holds every entry against all the English content of the
 * app: if one of these forms ever appears in our own reading passages, the test fails.
 */
const pairs = (s: string): Record<string, string> => Object.fromEntries(s.trim().split(/\s*,\s*/).map((p) => p.split(":").map((x) => x.trim()) as [string, string]));

/** Misspellings, with the spelling meant. */
export const MISSPELT: Record<string, string> = pairs(`
abscence:absence, accomodate:accommodate, accomodation:accommodation, acheive:achieve, acheived:achieved, acheivement:achievement,
accross:across, adress:address, agressive:aggressive, allready:already, allmost:almost, allso:also, allways:always, amoung:among,
anwser:answer, apparantly:apparently, appearence:appearance, arguement:argument, attendence:attendance, auther:author, awfull:awful,
balence:balance, basicly:basically, beatiful:beautiful, beautifull:beautiful, becuase:because, becouse:because, becomming:becoming,
beggining:beginning, begining:beginning, beleive:believe, belive:believe, beleived:believed, benifit:benefit, bicicle:bicycle,
biscut:biscuit, breakfeast:breakfast, brillant:brilliant, buisness:business, busness:business, bussiness:business, calender:calendar,
carefull:careful, carefuly:carefully, catagory:category, cieling:ceiling, cemetary:cemetery, certian:certain, challange:challenge,
cheif:chief, childern:children, choclate:chocolate, clasroom:classroom, collegue:colleague, comming:coming, commitee:committee,
completly:completely, concious:conscious, congradulations:congratulations, curiousity:curiosity, decieve:deceive, decission:decision,
definate:definite, definately:definitely, definatly:definitely, definitly:definitely, desparate:desperate, developement:development,
diffrence:difference, diffrent:different, dificult:difficult, dilema:dilemma, dinosour:dinosaur, disapear:disappear,
dissapear:disappear, disapoint:disappoint, dissapoint:disappoint, dissappoint:disappoint, disipline:discipline, docter:doctor,
easyly:easily, eigth:eighth, embarass:embarrass, embarassed:embarrassed, enviroment:environment, enought:enough,
equiptment:equipment, equipement:equipment, especialy:especially, exagerate:exaggerate, excelent:excellent, excellant:excellent,
exept:except, excercise:exercise, exersise:exercise, existance:existence, experiance:experience, expierence:experience,
explaination:explanation, extreem:extreme, extremly:extremely, familar:familiar, familly:family, famaly:family, favourit:favourite,
favrite:favourite, febuary:February, feild:field, finaly:finally, foriegn:foreign, fourty:forty, foward:forward, freind:friend,
freinds:friends, freindly:friendly, frist:first, fullfil:fulfil, garantee:guarantee, gaurantee:guarantee, gaurd:guard,
gaurdian:guardian, generaly:generally, goverment:government, grammer:grammar, gratefull:grateful, greatful:grateful,
happend:happened, happyness:happiness, happines:happiness, happilly:happily, harrass:harass, heigth:height, hieght:height,
hopefull:hopeful, hopefuly:hopefully, hospitel:hospital, humerous:humorous, hygeine:hygiene, immediatly:immediately,
immediatley:immediately, importent:important, independant:independent, inteligent:intelligent, intrest:interest,
intrested:interested, intresting:interesting, interupt:interrupt, journy:journey, knowlege:knowledge, langauge:language,
languege:language, libary:library, librery:library, litle:little, littel:little, lonley:lonely, lovley:lovely,
maintainance:maintenance, maintenence:maintenance, marrige:marriage, mathamatics:mathematics, medecine:medicine, minite:minute,
mischievious:mischievous, mispell:misspell, mornig:morning, mountian:mountain, naturaly:naturally, neccessary:necessary,
necesary:necessary, neice:niece, nieghbour:neighbour, nineth:ninth, noticable:noticeable, occassion:occasion, ocassion:occasion,
occured:occurred, occuring:occurring, occurence:occurrence, offen:often, oppertunity:opportunity, oportunity:opportunity,
opposit:opposite, orignal:original, paralel:parallel, parliment:parliament, particuler:particular, peice:piece, peopel:people,
poeple:people, perhapes:perhaps, prehaps:perhaps, permanant:permanent, persue:pursue, plesant:pleasant, pleasent:pleasant,
polution:pollution, posession:possession, possesion:possession, posible:possible, prefered:preferred, presance:presence,
privelege:privilege, priviledge:privilege, probaly:probably, probly:probably, problam:problem, profesor:professor,
pronounciation:pronunciation, publically:publicly, realy:really, reccomend:recommend, recomend:recommend, recieve:receive,
recieved:received, refered:referred, relevent:relevant, religous:religious, rember:remember, remeber:remember,
repitition:repetition, resturant:restaurant, restaraunt:restaurant, rythm:rhythm, rhythem:rhythm, sacrafice:sacrifice,
saftey:safety, sandwitch:sandwich, scedule:schedule, shedule:schedule, skool:school, sience:science, scince:science,
secratary:secretary, sieze:seize, sentance:sentence, seperate:separate, seperately:separately, shure:sure, similer:similar,
sincerly:sincerely, sinse:since, speach:speech, stoped:stopped, stomache:stomach, strenght:strength, studing:studying,
studyed:studied, succesful:successful, successfull:successful, sucessful:successful, sucess:success, succes:success,
sudenly:suddenly, supose:suppose, suprise:surprise, suprised:surprised, swiming:swimming, teh:the, techer:teacher,
temperture:temperature, tendancy:tendency, thankfull:thankful, thier:their, theif:thief, thoght:thought, thougth:thought,
tounge:tongue, togather:together, togehter:together, tommorow:tomorrow, tommorrow:tomorrow, tomorow:tomorrow, truely:truly,
tryed:tried, twelth:twelfth, unfortunatly:unfortunately, untill:until, unusal:unusual, usefull:useful, usualy:usually,
vaccum:vacuum, vegtable:vegetable, vegatable:vegetable, vehical:vehicle, visable:visible, wich:which, wierd:weird,
welcom:welcome, wellcome:welcome, wendsday:Wednesday, wensday:Wednesday, wether:whether, whereever:wherever,
wonderfull:wonderful, writting:writing, writen:written, yeild:yield, yestarday:yesterday, yesturday:yesterday,
youself:yourself, yourselfs:yourselves, childrens:children's
`);

/** Two words written as one. */
export const JOINED: Record<string, string> = pairs(`
alot:a lot, aswell:as well, infact:in fact, inspite:in spite, atleast:at least, eachother:each other, noone:no one,
incase:in case, ofcourse:of course, thankyou:thank you, upto:up to, eventhough:even though
`);

/** A regular ending put on a word that does not take one: the form meant is given. */
export const WRONG_FORM: Record<string, string> = pairs(`
goed:went, wented:went, comed:came, eated:ate, runned:ran, taked:took, gived:gave, writed:wrote, buyed:bought,
thinked:thought, teached:taught, catched:caught, bringed:brought, drawed:drew, falled:fell, feeled:felt, finded:found,
keeped:kept, knowed:knew, leaved:left, maked:made, sayed:said, selled:sold, sended:sent, sitted:sat, sleeped:slept,
speaked:spoke, swimmed:swam, telled:told, throwed:threw, drinked:drank, drived:drove, growed:grew, hurted:hurt,
cutted:cut, hitted:hit, breaked:broke, choosed:chose, heared:heard, holded:held, losed:lost, meeted:met, readed:read,
rided:rode, standed:stood, stealed:stole, winned:won, weared:wore, builded:built, beginned:began, blowed:blew,
digged:dug, feeded:fed, fighted:fought, hided:hid, shaked:shook, spended:spent, sweeped:swept, understanded:understood,
childs:children, womans:women, tooths:teeth, sheeps:sheep, furnitures:furniture, informations:information,
homeworks:homework, equipments:equipment, luggages:luggage
`);

/** A short form with its apostrophe left out. Only forms that are not words themselves. */
export const NO_APOSTROPHE: Record<string, string> = pairs(`
dont:don't, didnt:didn't, doesnt:doesn't, dosent:doesn't, dosen't:doesn't, isnt:isn't, wasnt:wasn't, couldnt:couldn't,
wouldnt:wouldn't, shouldnt:shouldn't, havent:haven't, hasnt:hasn't, hadnt:hadn't, arent:aren't, werent:weren't,
ive:I've, thats:that's, whats:what's, theyre:they're, youre:you're, weve:we've, shes:she's
`);

/** Short forms from phone messages, as written in small letters. */
export const TEXTING = /(?<![A-Za-z'’-])(u|ur|bcoz|becoz|bcz|plz|pls|gud|gr8|thnx|tht|wud|shud|cud|abt|frnd|frnds|wanna|gonna|gotta)(?![A-Za-z'’-])/g;

/** Where a new clause can begin, so that the word after it is the doer of a verb. */
const CLAUSE = `(?<=^|[.?!,;:]\\s+["“‘']?|\\b(?:and|but|because|so|then|when|if|while|although)\\s+)`;
/** Past forms that are never the plain verb. "saw" and "fell" are also plain verbs (to saw wood, to fell a tree), so they are listed only where that cannot be meant. */
const PAST = "went|ate|took|gave|wrote|did|came|ran|knew|broke|spoke|drank|sang|began|flew|drove|chose";

/** Grammar slips that follow a pattern and are wrong whatever the meaning. */
/** agree: a pattern about the doer and its verb, which is skipped when a helping or causing verb comes earlier in the sentence ("Did they … goes" is still wrong, but "Does everyone have" is right, and the two cannot be told apart safely). */
export const SLIPS: { agree?: boolean; re: RegExp; say: (m: RegExpExecArray) => string }[] = [
  { re: /(?:(?<=^|[.?!]\s+["“‘']?)A|\ba) (?!(?:or|and|in|is|on|of|at|as|if|it|are|also)\b)([aeio][a-z]+)\b/g, say: (m) => `“a ${m[1]}” should be “an ${m[1]}”` },
  { re: /\b[Aa]n (?!(?:before|with|but|for|from|not|by|to|the|there|that|then|than|when|while|was|will|would|can|could|should|must|may|might|does|did|do|because|so|goes|comes|means)\b)([bcdfgjklmnpqrstvwz][a-z]+)\b/g, say: (m) => `“an ${m[1]}” should be “a ${m[1]}”` },
  { agree: true, re: new RegExp(`${CLAUSE}(he|she|it) (go|do|have|like|want|play|eat|come|make|say|see|live|know|need|love|walk|run|take|give)\\b(?! not)`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: after ${m[1].toLowerCase()}, the verb takes -s (or use the past)` },
  { agree: true, re: new RegExp(`${CLAUSE}(he|she|it) (don't|don’t|do not)\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}” should be “${m[1]} doesn't”` },
  { re: /\b(we|they|you) was\b/gi, say: (m) => `“${m[1]} was” should be “${m[1]} were”` },
  { agree: true, re: new RegExp(`${CLAUSE}(we|they|you) (is|has|doesn't|doesn’t|does not)\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}” is not right: ${m[1].toLowerCase()} ${/^is$/i.test(m[2]) ? "are" : /^has$/i.test(m[2]) ? "have" : "do not"}` },
  { re: /\bI (has|is|are)\b/g, say: (m) => `“I ${m[1]}” is not right: I have, I am` },
  { re: /\bI am agree\b/gi, say: () => "“I am agree” should be “I agree”" },
  { re: /\b(could|should|would|must|might) of\b/gi, say: (m) => `“${m[1]} of” should be “${m[1]} have”` },
  { re: new RegExp(`\\b(did not|didn't|didn’t|did n't) (${PAST}|saw|made|said|bought|told|got)\\b`, "gi"), say: (m) => `after “${m[1]}”, use the plain verb, not “${m[2]}”` },
  { re: /\b(does not|doesn't|doesn’t) (likes|wants|goes|has|knows|comes|plays|eats|makes|says|sees|lives|needs|loves|works)\b/gi, say: (m) => `after “${m[1]}”, use the plain verb, not “${m[2]}”` },
  { re: new RegExp(`\\b(can|could|will|would|shall|should|must|might) (${PAST}|goes|comes|has|does)\\b`, "gi"), say: (m) => `after “${m[1]}”, use the plain verb, not “${m[2]}”` },
  { re: /\bto (went|ate|came|took|gave|wrote|bought|told|knew)\b/gi, say: (m) => `after “to”, use the plain verb, not “${m[1]}”` },
  { re: new RegExp(`\\b(have|has|had) (${PAST}|saw|fell)\\b(?! (?:you|he|she|it|we|they|i)\\b)`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: after ${m[1].toLowerCase()}, use the third form of the verb (gone, seen, eaten …)` },
  { re: /\bmore (better|bigger|smaller|faster|easier|taller|worse|happier|older|younger|stronger|cheaper|higher|longer)\b/gi, say: (m) => `“more ${m[1]}”: “${m[1]}” already means more` },
  { re: /\b(most) (best|biggest|fastest|worst|tallest|easiest|smallest|happiest|strongest)\b/gi, say: (m) => `“most ${m[2]}”: “${m[2]}” already means most` },
  { re: /\b(me and (?:my )?[a-z]+) (went|are|were|have|did|play|played|go)\b/gi, say: (m) => `“${m[1]}” as the doer should be “my … and I”` },
  { re: /\b(Myself) (?:am |is )?([A-Z][a-z]+)\b/g, say: (m) => `“Myself ${m[2]}” should be “I am ${m[2]}”` },
  { re: /\bits (a|an|the|not|been)\b/gi, say: (m) => `“its ${m[1]}” should be “it's ${m[1]}” (it is, it has)` },
  { re: /\byour (not|a|an|the)\b/gi, say: (m) => `“your ${m[1]}” should be “you're ${m[1]}” (you are)` },
  { re: /\btheir (is|are|was|were)\b/gi, say: (m) => `“their ${m[1]}” should be “there ${m[1]}”` },
  { re: /\bone of (my|his|her|our|their) (friend|brother|sister|classmate|cousin|neighbour|uncle|aunt)(?=\s+(?:is|was|has|had|and|who|came|went|told|said|gave|lives|lived)\b|[.,;!?])/gi, say: (m) => `“one of ${m[1]} ${m[2]}” should be “one of ${m[1]} ${m[2]}s”` },
  { re: /\b(discuss|discussed|discussing) about\b/gi, say: (m) => `“${m[1]} about”: leave out “about”` },
  { re: /\b(cope|coped|coping) up with\b/gi, say: (m) => `“${m[1]} up with” should be “${m[1]} with”` },
  { re: /\b(return|returned|reply|replied|revert|reverted) back\b/gi, say: (m) => `“${m[1]} back”: “${m[1]}” already means back` },
  { re: /\b(the|an|is|are|was|were|and|of|at|for|with|my|we|they|she|this)\s+\1\b/gi, say: (m) => `“${m[1]} ${m[1]}”: the word is written twice` },
  // the doer and the verb do not agree
  { agree: true, re: new RegExp(`${CLAUSE}(I|we|they|you) (goes|likes|wants|plays|eats|comes|makes|says|sees|lives|knows|needs|loves|walks|runs|takes|gives|does)\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: after ${m[1] === "I" ? "I" : m[1].toLowerCase()}, the verb has no -s` },
  { agree: true, re: new RegExp(`${CLAUSE}((?:(?:the|my|our|these|those|some|many|all|his|her|their) )?(?:people|children|men|women|boys|girls|friends|parents|teachers|students|animals|birds|trees|books)) (is|was|has|does|doesn't|doesn’t)\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: more than one, so ${({ is: "are", was: "were", has: "have", does: "do" } as Record<string, string>)[m[2].toLowerCase()] ?? "do not"}` },
  { agree: true, re: new RegExp(`${CLAUSE}(everyone|everybody|someone|somebody|nobody|no one|each of (?:us|them|you)) (are|were|have|don't|don’t)\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: ${m[1].toLowerCase()} takes ${({ are: "is", were: "was", have: "has" } as Record<string, string>)[m[2].toLowerCase()] ?? "doesn't"}` },
  { re: /\bthere is (many|two|three|four|five|six|seven|eight|nine|ten|several)\b/gi, say: (m) => `“there is ${m[1]}” should be “there are ${m[1]}”` },
  // the wrong form of the verb
  { re: new RegExp(`\\b(am|is|are|was|were|be|been) (${PAST})\\b`, "gi"), say: (m) => `“${m[1]} ${m[2]}”: use one or the other, not both` },
  { re: /\b(I am|he is|she is|it is|we are|they are|you are|I was|he was|she was|we were|they were) (go|come|eat|live|study|write|bring|take|give|know|want)\b(?![-'’])/gi, say: (m) => `“${m[1]} ${m[2]}”: use “${m[2]}ing”, or leave out “${m[1].split(" ")[1]}”` },
  { agree: true, re: /\b(have|has|had) (go|eat|see|take|give|do|know|speak|choose|sing|begin)\b(?![-'’])/gi, say: (m) => `“${m[1]} ${m[2]}”: after ${m[1].toLowerCase()}, use the third form of the verb (gone, eaten, seen …)` },
  { re: /\b(am|is|are|was|were) knowing\b/gi, say: (m) => `“${m[1]} knowing” should be “know” or “knew”` },
  { re: /\b(am|is|are) having (a|an|one|two|three|many) (car|bike|cycle|phone|pen|book|books|house|dog|cat|brother|brothers|sister|sisters|friend|friends)\b/gi, say: (m) => `“${m[1]} having ${m[2]} ${m[3]}” should be “have” or “has”` },
  { re: /\b(can|could) able to\b/gi, say: (m) => `“${m[1]} able to”: use “${m[1]}” or “able to”, not both` },
  { re: /\b(look|looks|looking|looked) forward to (meet|see|hear|receive|join)\b/gi, say: (m) => `“forward to ${m[2]}” should be “forward to ${m[2]}ing”` },
  { re: /\b(enjoy|enjoys|enjoyed|avoid|avoids|avoided) to ([a-z]+)\b/gi, say: (m) => `“${m[1]} to ${m[2]}”: after ${m[1].toLowerCase()}, use the -ing form` },
  // time words against the verb
  { re: /\b(yesterday|last (?:night|week|month|year)),? (I|we|he|she|they) (go|goes|come|comes|eat|eats|see|sees|play|plays|is|am|are|have|has|buy|buys|meet|meets|visit|visits)\b/gi, say: (m) => `“${m[1]} … ${m[3]}”: ${m[1].toLowerCase()} is past, so the verb is past too` },
  { re: /\btomorrow,? (I|we|he|she|they) (went|came|ate|saw|played|was|were|had|bought|met|visited)\b/gi, say: (m) => `“tomorrow … ${m[2]}”: tomorrow is still to come, so use “will”` },
  { re: /\bsince (two|three|four|five|six|seven|eight|nine|ten|\d+|many|several|a few) (years|months|weeks|days|hours)\b(?! ago)/gi, say: (m) => `“since ${m[1]} ${m[2]}” should be “for ${m[1]} ${m[2]}”` },
  // how many, which one
  { re: /\bmuch (people|friends|books|things|students|children|problems|questions|marks|games|trees|animals)\b/gi, say: (m) => `“much ${m[1]}” should be “many ${m[1]}”` },
  { re: /\bmany (water|money|homework|information|furniture|rice|milk|advice|traffic|rain)(?=[.,;!?]|\s+(?:is|was|and|in|to|for|at|on|from|with)\b)/gi, say: (m) => `“many ${m[1]}” should be “much ${m[1]}” or “a lot of ${m[1]}”` },
  { re: /\b(every|each) (students|children|people|boys|girls|days|years|things|books|teachers|friends|persons)\b(?!['’])/gi, say: (m) => `“${m[1]} ${m[2]}”: after ${m[1].toLowerCase()}, name just one` },
  { re: /\b(these|those) (book|boy|girl|thing|day|student|friend|flower|tree|house|animal|word|question|problem)(?=[.,;!?]|\s+(?:is|are|was|were|and|in|to|for|at|on|from|with)\b)/gi, say: (m) => `“${m[1]} ${m[2]}”: ${m[1].toLowerCase()} is for more than one, so “${m[2]}s”` },
  { re: /\bthis (books|boys|girls|things|days|students|friends|flowers|trees|houses|animals|words|questions|problems|people|children)\b(?!['’])/gi, say: (m) => `“this ${m[1]}” should be “these ${m[1]}”` },
  { re: /\ba (children|men|women|mice|teeth)\b(?!['’-])/gi, say: (m) => `“a ${m[1]}”: “${m[1]}” is more than one` },
  { re: /\b([a-z]+) years old (boy|girl|man|woman|child|son|daughter|brother|sister)\b/gi, say: (m) => `“${m[1]} years old ${m[2]}” should be “${m[1]}-year-old ${m[2]}”` },
  // small words that do not belong, or the wrong one
  { re: /\b(said|says) me\b/gi, say: (m) => `“${m[1]} me” should be “${m[1]} to me” or “told me”` },
  { re: /\b(explain|explains|explained) me\b/gi, say: (m) => `“${m[1]} me” should be “${m[1]} to me”` },
  { re: /\btold to (me|him|her|us|them)\b/gi, say: (m) => `“told to ${m[1]}” should be “told ${m[1]}”` },
  { re: /\b(listen|listens|listened|listening) (music|songs|me|him|her|them)\b/gi, say: (m) => `“${m[1]} ${m[2]}” should be “${m[1]} to ${m[2]}”` },
  { re: /\b(go|goes|going|went|come|comes|coming|came) to home(?=[.,;!?]|\s+(?:and|after|at|by|with|in|late|early|from)\b)/gi, say: (m) => `“${m[1]} to home” should be “${m[1]} home”` },
  { re: /\bangry on\b/gi, say: () => "“angry on” should be “angry with”" },
  { re: /\bafraid from\b/gi, say: () => "“afraid from” should be “afraid of”" },
  { re: /\binterested on\b/gi, say: () => "“interested on” should be “interested in”" },
  { re: /\b(depend|depends|depended) (of|from)\b/gi, say: (m) => `“${m[1]} ${m[2]}” should be “${m[1]} on”` },
  { re: /\b(prefer|prefers|preferred) (?!to\b)(?:(?!rather\b)[a-z]+ ){1,2}than\b/gi, say: () => "after “prefer”, use “to”, not “than”: I prefer tea to coffee" },
  { re: /\b(better|bigger|smaller|faster|taller|older|younger|more|less|worse|higher|longer|stronger|easier|cheaper) then (me|him|her|us|them|mine|yours|his|hers|ours|theirs|before|ever|usual)\b/gi, say: (m) => `“${m[1]} then” should be “${m[1]} than”` },
];
/** Words after which "a" is right although they start with a vowel letter, and the other way round. */
export const A_OK = /^(one|once|uni|use|usu|eu|ew|ut[ei])/i;
export const AN_OK = /^(hour|honest|honou?r|heir)/i;
/** A helping or causing verb earlier in the sentence: after one, a plain verb can be right. */
export const HELPER = /\b(did|does|do|can|could|will|would|shall|should|may|might|must|let|lets|make|makes|made|help|helps|helped|see|sees|saw|watch|watched|hear|heard|have|has|had|that)\b/i;
/** A question written as a statement: a helping verb, then the doer, and a full stop at the end. */
export const ASKED = /^["“‘']?(?:(?:Does|Did|Is|Are|Was|Can|Could|Will|Would|Should) (?:you|he|she|it|we|they|I|there)|Do (?:you|we|they|I)) [^,]*\.$/;
