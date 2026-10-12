/**
 * Builds content/english/framework/en-0.2.0.json from en-0.1.0.json (E2a).
 *
 *   node tools/english/authoring/framework-0.2.0.ts
 *
 * What 0.2.0 changes, and nothing else:
 *   - the 39 core capabilities get descriptions, band descriptors (2, 4, 6, 8), misconception lists,
 *     the formats they can be observed through, and reference mappings;
 *   - the 17 skeleton capabilities keep their 0.1.0 definitions word for word, and gain reference mappings;
 *   - candidate couplings for core capabilities are added (strength ≤ 0.35, marked candidate);
 *   - no prerequisites are added: the references checked state topics by class, not dependencies;
 *   - scale, prior and policy are unchanged, so the update mathematics are unchanged.
 *
 * Everything here is candidate content, unvalidated until an English educator reviews it (D-4).
 * OpenPath's 1–8 band descriptors are the definitions; CEFR and CBSE/NCERT are references only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT } from "../load.ts";

type Spec = {
  description: string;
  bands: Record<"2" | "4" | "6" | "8", string>;
  misconceptions: [string, string][];
  observable_through: string[];
  cefr: string[];
  cbse?: string;
};

// CEFR scale names as in the Companion Volume (Council of Europe, 2020).
const ORTH = "Orthographic control";
const VRANGE = "Vocabulary range";
const VCTRL = "Vocabulary control";
const GACC = "Grammatical accuracy";
const COH = "Coherence and cohesion";
const THEM = "Thematic development";
const PREC = "Propositional precision";
const SOC = "Sociolinguistic appropriateness";
const READ = "Overall reading comprehension";
const RINFO = "Reading for information and argument";
const INFER = "Identifying cues and inferring";
const CREATIVE = "Creative writing";
const ESSAYS = "Reports and essays";
const CORR = "Correspondence";

export const CORE: Record<string, Spec> = {
  "EN.FND.SPL.homophones": {
    description: "Chooses the right spelling of words that sound the same or nearly the same (there/their/they're, its/it's, whose/who's).",
    bands: {
      "2": "Chooses between very common pairs in simple sentences (to/two, see/sea).",
      "4": "Chooses correctly among common sets in everyday writing (there/their/they're, your/you're, its/it's).",
      "6": "Distinguishes less common pairs and near-homophones (principal/principle, stationary/stationery, whose/who's).",
      "8": "Uses demanding homophones and near-homophones accurately (complement/compliment, affect/effect, discreet/discrete).",
    },
    misconceptions: [
      ["contraction_possessive", "Confuses a contraction with a possessive (it's/its, you're/your, who's/whose)."],
      ["familiar_spelling", "Uses the more familiar spelling whatever the meaning (there for their)."],
      ["near_homophone", "Confuses words that sound nearly alike (accept/except, affect/effect)."],
    ],
    observable_through: ["choice:spelling", "typed:cloze", "writing"],
    cefr: [ORTH],
  },
  "EN.FND.SPL.morphological": {
    description: "Keeps the spelling of a base word and its prefix or suffix when they are joined (unnecessary, misspell, hopeful, government, -able/-ible).",
    bands: {
      "2": "Adds common prefixes and suffixes without changing the base (unhappy, helpful).",
      "4": "Keeps both letters where a prefix meets a base with the same letter (unnatural, misspell), and spells -ful, -ly and -ment correctly.",
      "6": "Chooses between -able/-ible, -tion/-sion/-ssion and -ance/-ence in common words.",
      "8": "Spells less common derived words reliably, using knowledge of roots (accommodate, conscientious, irrelevant).",
    },
    misconceptions: [
      ["dropped_double_at_join", "Drops one letter where a prefix and base meet (mispell, unecessary)."],
      ["full_suffix", "Writes -full for the suffix -ful (hopefull, carefull)."],
      ["suffix_by_sound", "Chooses -able/-ible or -ance/-ence by sound alone."],
    ],
    observable_through: ["typed:cloze", "choice:spelling", "writing"],
    cefr: [ORTH],
  },
  "EN.VOC.BRD.academic": {
    description: "Understands and uses the general academic words of school subjects (compare, evidence, method, factor, significant).",
    bands: {
      "2": "Knows classroom instruction words (list, match, underline, describe).",
      "4": "Knows common cross-subject words in context (compare, method, result, explain).",
      "6": "Understands abstract academic words in textbooks (factor, significant, contrast, evaluate).",
      "8": "Uses precise academic words accurately in their own explanations and arguments (hypothesis, implication, consequently).",
    },
    misconceptions: [
      ["everyday_sense", "Reads an academic word in an everyday sense (a 'factor' as a person, 'significant' as big)."],
      ["instruction_word_confusion", "Confuses what instruction words ask for (describe and explain, compare and contrast)."],
    ],
    observable_through: ["choice:meaning", "typed:cloze", "match:meaning"],
    cefr: [VRANGE],
  },
  "EN.VOC.MOR.prefixes": {
    description: "Uses prefixes to work out and form meanings (un-, re-, dis-, mis-, pre-, over-, im-/in-/il-/ir-, inter-, sub-).",
    bands: {
      "2": "Knows un- and re- on familiar words (unhappy, redo).",
      "4": "Uses common prefixes to work out meanings (disagree, misread, preview, overcook).",
      "6": "Chooses the right negative prefix and uses less common prefixes (impossible, irregular, illegal; international, submarine).",
      "8": "Uses prefixes in abstract and academic words to infer precise meanings (counterproductive, semi-permanent, misconception).",
    },
    misconceptions: [
      ["wrong_negative_prefix", "Uses the wrong negative prefix (unpossible, inregular, unlegal)."],
      ["prefix_meaning_confusion", "Confuses prefixes with similar forms (pre-/pro-, inter-/intra-, dis-/mis-)."],
    ],
    observable_through: ["typed:word_form", "choice:word_form", "match:meaning"],
    cefr: [VRANGE, VCTRL],
  },
  "EN.VOC.CTX.multiple_meaning": {
    description: "Chooses the meaning of a word that fits its context when the word has several (bank, light, current, address).",
    bands: {
      "2": "Knows two everyday meanings of very common words (a bat, to bat).",
      "4": "Picks the meaning that fits the sentence for common words (light: not heavy / a lamp).",
      "6": "Distinguishes subject-specific meanings of familiar words (table in maths, current in science).",
      "8": "Handles less obvious and figurative senses (a sharp decline, to address a problem).",
    },
    misconceptions: [["first_meaning", "Uses the most familiar meaning whatever the context."]],
    observable_through: ["choice:meaning_in_context", "match:meaning"],
    cefr: [VRANGE, INFER],
  },
  "EN.VOC.REL.synonyms_antonyms": {
    description: "Recognises words with similar or opposite meanings, and how near-synonyms differ.",
    bands: {
      "2": "Matches very common opposites (big/small, open/close).",
      "4": "Finds a synonym or antonym for common words in context (begin/start, ancient/modern).",
      "6": "Chooses the synonym that fits a sentence's meaning and formality (huge, vast, immense).",
      "8": "Distinguishes fine differences between near-synonyms and their effect (stubborn/determined, thrifty/stingy).",
    },
    misconceptions: [
      ["related_not_synonym", "Chooses a word from the same topic rather than one with the same meaning (doctor for hospital)."],
      ["synonym_antonym_swap", "Gives an opposite when asked for a similar word, or the reverse."],
    ],
    observable_through: ["choice:meaning", "match:meaning", "multi:meaning"],
    cefr: [VRANGE],
  },
  "EN.VOC.REL.collocations": {
    description: "Uses words that naturally go together (make a decision, heavy rain, take a photo, strong coffee).",
    bands: {
      "2": "Uses very common fixed phrases (thank you very much, good morning).",
      "4": "Chooses common verb–noun collocations (make a mistake, do homework, take a photo).",
      "6": "Uses adjective–noun and adverb collocations (heavy traffic, deeply sorry, strong argument).",
      "8": "Uses less common and academic collocations accurately (draw a conclusion, pose a question, bitterly disappointed).",
    },
    misconceptions: [
      ["make_do_confusion", "Confuses make and do (do a mistake, make homework)."],
      ["word_by_word", "Builds a phrase word by word from another language (big rain, open the light)."],
    ],
    observable_through: ["choice:collocation", "typed:cloze", "writing"],
    cefr: [VCTRL],
  },
  "EN.VOC.FIG.similes_metaphors": {
    description: "Understands what a simile or metaphor compares and what it suggests.",
    bands: {
      "2": "Understands common simple similes (as cold as ice).",
      "4": "Explains what a simile or simple metaphor compares (her voice was music).",
      "6": "Interprets less familiar metaphors and the feeling they create.",
      "8": "Interprets extended or layered metaphors and how they shape a text's meaning.",
    },
    misconceptions: [
      ["literal_reading", "Reads the comparison literally."],
      ["wrong_shared_quality", "Picks a quality the two things do not share in this context."],
    ],
    observable_through: ["choice:reading", "multi:meaning"],
    cefr: [READ, INFER],
  },
  "EN.VOC.FIG.phrasal_verbs": {
    description: "Understands and uses verb + particle combinations (look after, give up, put off, turn down).",
    bands: {
      "2": "Understands common phrasal verbs with literal meanings (sit down, get up).",
      "4": "Understands common idiomatic phrasal verbs (look after, give up, find out).",
      "6": "Chooses between similar phrasal verbs (put off, put up with, put out) and uses them in writing.",
      "8": "Uses a wide range of phrasal verbs accurately, including those with several meanings (pick up, make out, bring about).",
    },
    misconceptions: [
      ["literal_particle", "Reads the particle literally (give up as giving something upwards)."],
      ["particle_swap", "Uses the wrong particle (look for when look after is meant)."],
    ],
    observable_through: ["choice:meaning", "typed:cloze", "match:meaning"],
    cefr: [VRANGE],
  },
  "EN.VOC.USE.word_choice": {
    description: "Chooses precise, varied words in their own writing.",
    bands: {
      "2": "Uses very general words (good, nice, thing) for most meanings.",
      "4": "Sometimes replaces general words with more precise ones.",
      "6": "Chooses precise verbs, nouns and adjectives that suit the purpose.",
      "8": "Chooses words deliberately for precision, tone and effect.",
    },
    misconceptions: [
      ["vague_word", "Relies on vague words (nice, thing, stuff, very good)."],
      ["misused_advanced_word", "Uses an unfamiliar, impressive-sounding word with the wrong meaning."],
    ],
    observable_through: ["writing", "choice:word_choice"],
    cefr: [VRANGE, PREC],
  },
  "EN.GRM.NOUN.plurals_countability": {
    description: "Forms regular and irregular plurals and treats countable and uncountable nouns correctly (information, advice, furniture; many/much).",
    bands: {
      "2": "Forms regular plurals with -s and -es (cats, boxes).",
      "4": "Forms common irregular plurals (children, teeth, mice) and uses many and much with simple nouns.",
      "6": "Treats common uncountable nouns correctly (advice, information, furniture, luggage).",
      "8": "Handles nouns used both ways and less common plurals (a coffee / coffee; criteria, phenomena).",
    },
    misconceptions: [
      ["plural_uncountable", "Adds -s to uncountable nouns (informations, advices, furnitures)."],
      ["regularised_plural", "Regularises irregular plurals (childs, mouses)."],
      ["much_many_confusion", "Uses much with countable nouns or many with uncountable ones."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
    cbse: "Determiners (quantifiers with countable and uncountable nouns)",
  },
  "EN.GRM.VERB.present_past_simple": {
    description: "Forms and uses the present simple and past simple, including irregular past forms, questions and negatives.",
    bands: {
      "2": "Uses the present simple for habits and the past simple of common regular verbs (walked, played).",
      "4": "Uses common irregular past forms (went, saw, bought) and did/didn't in questions and negatives.",
      "6": "Keeps tense consistent across a text and uses less common irregular forms (caught, brought, chose).",
      "8": "Uses uncommon irregular forms accurately (sought, forbade, wept) and controls tense in complex narratives.",
    },
    misconceptions: [
      ["regularised_past", "Adds -ed to irregular verbs (goed, buyed)."],
      ["past_after_did", "Uses a past form after did (Did you went?)."],
      ["tense_shift", "Shifts between present and past without reason."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
    cbse: "Tenses",
  },
  "EN.GRM.VERB.modals": {
    description: "Uses modal verbs for ability, permission, possibility, obligation, advice and deduction (can, could, may, might, must, should, have to).",
    bands: {
      "2": "Uses can and can't for ability.",
      "4": "Uses must, should, can and may for obligation, advice and permission.",
      "6": "Uses modals for degrees of possibility (might, could, must) and simple past modals (could have).",
      "8": "Uses modals precisely for deduction and nuance (must have been, needn't have, should have).",
    },
    misconceptions: [
      ["modal_plus_to", "Adds to after a modal (must to go, can to swim)."],
      ["modal_inflected", "Adds -s or a past form after a modal (she cans, could went)."],
      ["mustnt_dont_have_to", "Confuses mustn't (not allowed) with don't have to (not necessary)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
    cbse: "Modals",
  },
  "EN.GRM.VERB.passive": {
    description: "Forms and uses the passive voice (is made, was built, has been sold, will be announced).",
    bands: {
      "2": "Recognises a simple passive with a familiar verb (The cake was eaten).",
      "4": "Forms the present and past simple passive (is cleaned, was built).",
      "6": "Forms passives in other tenses and with modals (has been sold, will be announced, must be done) and chooses active or passive sensibly.",
      "8": "Uses passive structures deliberately for focus and formality, including reporting passives (It is said that…).",
    },
    misconceptions: [
      ["missing_be", "Leaves out be (The house built in 1990)."],
      ["wrong_participle", "Uses the base or past form instead of the past participle (was write, was wrote)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.VERB.conditionals": {
    description: "Forms and uses conditional sentences (zero, first, second, third and mixed).",
    bands: {
      "2": "Understands simple if-sentences about facts and routines (If it rains, we stay inside).",
      "4": "Forms first conditionals (If it rains, we will stay inside).",
      "6": "Forms second conditionals for unreal situations (If I had wings, I would fly).",
      "8": "Forms third and mixed conditionals (If she had left earlier, she would be here now).",
    },
    misconceptions: [
      ["will_in_if_clause", "Uses will in the if-clause (If it will rain…)."],
      ["conditional_mixup", "Mixes forms from different conditionals (If I would have…)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.MOD.comparatives": {
    description: "Forms and uses comparatives and superlatives, and comparison structures (as … as, less/fewer).",
    bands: {
      "2": "Adds -er and -est to short adjectives (taller, tallest).",
      "4": "Uses more and most with longer adjectives, and common irregular forms (better, worst).",
      "6": "Uses spelling changes (bigger, happier) and structures such as as … as and not as … as.",
      "8": "Compares precisely, including less/fewer, much or far + comparative, and the more …, the more ….",
    },
    misconceptions: [
      ["double_comparative", "Uses more with -er (more taller)."],
      ["regularised_irregular", "Regularises irregular forms (gooder, badder)."],
      ["less_fewer_confusion", "Uses less with countable plurals (less people)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.PREP.time_place": {
    description: "Uses prepositions of time and place accurately (in, on, at, since, for, by, until, during).",
    bands: {
      "2": "Uses in, on and under for simple places.",
      "4": "Uses at, on and in for times (at 5 o'clock, on Monday, in June) and common places.",
      "6": "Uses since/for, by/until and during/while correctly.",
      "8": "Chooses prepositions accurately in less common expressions (in time / on time, at the end / in the end).",
    },
    misconceptions: [
      ["in_on_at_confusion", "Confuses in, on and at for times or places (on 5 o'clock, in Monday)."],
      ["since_for_confusion", "Uses since with a length of time or for with a starting point (since two hours)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.CLS.questions": {
    description: "Forms yes/no, wh-, subject and indirect questions, and question tags.",
    bands: {
      "2": "Forms simple yes/no questions with be and can (Is she…? Can you…?).",
      "4": "Forms wh- questions with do, does and did (Where do you live?).",
      "6": "Forms subject questions and question tags (Who broke it? It's late, isn't it?).",
      "8": "Forms indirect and embedded questions correctly (Could you tell me where the station is?).",
    },
    misconceptions: [
      ["no_inversion", "Leaves out the auxiliary or the inversion (Where you live?)."],
      ["embedded_inversion", "Inverts inside an embedded question (Tell me where is the station)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "order:words", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.CLS.relative_clauses": {
    description: "Uses relative clauses with who, which, that, whose and where, defining and non-defining.",
    bands: {
      "2": "Understands simple who and which clauses after a noun.",
      "4": "Joins two sentences with who, which or that.",
      "6": "Uses whose and where, and punctuates non-defining clauses with commas.",
      "8": "Uses relative clauses with prepositions and reduced forms accurately (the house in which…, the man sitting there).",
    },
    misconceptions: [
      ["which_for_people", "Uses which for people (the boy which…)."],
      ["resumptive_pronoun", "Repeats the pronoun inside the clause (the book that I read it)."],
    ],
    observable_through: ["typed:cloze", "choice:combine", "writing"],
    cefr: [GACC],
  },
  "EN.GRM.CLS.reported_speech": {
    description: "Reports statements, questions, commands and requests, with the right tense, pronoun, word-order and time changes.",
    bands: {
      "2": "Understands simple reported statements (She said she was tired).",
      "4": "Reports statements with tense and pronoun changes (He said, 'I am hungry.' → He said he was hungry).",
      "6": "Reports questions, commands and requests (asked if…, told me to…) with word-order and time changes.",
      "8": "Uses a range of reporting verbs accurately (advised, denied, suggested) with the right patterns.",
    },
    misconceptions: [
      ["no_backshift", "Keeps the original tense where it should change."],
      ["question_order_kept", "Keeps question word order in a reported question (asked where was I going)."],
      ["pronoun_not_changed", "Keeps the speaker's pronouns (He said I am hungry)."],
    ],
    observable_through: ["typed:cloze", "choice:grammar", "writing"],
    cefr: [GACC],
    cbse: "Reported Speech (commands and requests, statements, questions)",
  },
  "EN.GRM.PUN.capitalisation": {
    description: "Uses capital letters for sentence starts, I, names, places, days, months, languages and titles, and not elsewhere.",
    bands: {
      "2": "Uses a capital at the start of a sentence and for I and names.",
      "4": "Capitalises days, months, places and languages (Monday, July, Chennai, Tamil).",
      "6": "Capitalises titles, organisations and proper adjectives, and avoids capitals on common nouns.",
      "8": "Applies capitalisation conventions consistently, including in headings, quotations and less common proper nouns.",
    },
    misconceptions: [
      ["lowercase_proper", "Writes proper nouns in lower case (chennai, monday)."],
      ["random_capitals", "Capitalises common nouns for emphasis (my School, the River)."],
    ],
    observable_through: ["choice:punctuation", "multi:error_spot", "writing"],
    cefr: [ORTH],
  },
  "EN.GRM.PUN.end_punctuation": {
    description: "Ends sentences with the right mark: full stop, question mark or exclamation mark.",
    bands: {
      "2": "Ends a simple statement with a full stop.",
      "4": "Uses question marks and exclamation marks correctly, including in short dialogue.",
      "6": "Punctuates indirect questions (without a question mark) and longer sentences correctly.",
      "8": "Uses end punctuation consistently and deliberately, including inside quotations.",
    },
    misconceptions: [
      ["question_mark_on_indirect", "Puts a question mark after an indirect question (I wonder where he is?)."],
      ["missing_question_mark", "Ends a direct question with a full stop."],
    ],
    observable_through: ["choice:punctuation", "writing"],
    cefr: [ORTH],
  },
  "EN.GRM.PUN.apostrophes": {
    description: "Uses apostrophes for contractions and possession, and not for plain plurals.",
    bands: {
      "2": "Uses apostrophes in very common contractions (don't, I'm).",
      "4": "Uses 's for singular possession (the girl's bag) and apostrophes in contractions.",
      "6": "Uses s' for plural possession and its/it's correctly (the girls' bags).",
      "8": "Handles irregular plural and joint possession, and avoids apostrophes in plain plurals (children's; mangoes, not mango's).",
    },
    misconceptions: [
      ["plural_apostrophe", "Adds an apostrophe to a plain plural (mango's for sale)."],
      ["its_with_apostrophe", "Writes it's for the possessive its."],
      ["possessive_position", "Puts the apostrophe in the wrong place for plural possession (the girl's bags for several girls)."],
    ],
    observable_through: ["choice:punctuation", "typed:cloze", "writing"],
    cefr: [ORTH],
  },
  "EN.SEN.CMP.fragments": {
    description: "Writes complete sentences, each with a subject and a main verb, and avoids accidental fragments.",
    bands: {
      "2": "Writes simple complete sentences with a subject and verb.",
      "4": "Recognises and fixes obvious fragments (Because it was raining.).",
      "6": "Avoids fragments in longer writing, including -ing and which fragments.",
      "8": "Uses fragments only deliberately, for effect.",
    },
    misconceptions: [
      ["subordinate_fragment", "Writes a subordinate clause on its own as a sentence."],
      ["missing_verb", "Leaves out the main verb (My brother in the garden.)."],
    ],
    observable_through: ["choice:sentence_boundaries", "multi:sentences", "writing"],
    cefr: [GACC],
  },
  "EN.SEN.CMB.coordination": {
    description: "Joins ideas with coordinating words (and, but, or, so, yet, nor) and paired forms (either … or, both … and).",
    bands: {
      "2": "Joins two simple ideas with and or but.",
      "4": "Chooses and, but, or and so to show the right link.",
      "6": "Uses yet, nor and paired forms (either … or, both … and), and avoids long chains of and.",
      "8": "Balances coordination and subordination for clarity and rhythm.",
    },
    misconceptions: [
      ["and_chaining", "Strings many clauses together with and."],
      ["wrong_coordinator", "Uses a coordinator that shows the wrong link (but where so is meant)."],
    ],
    observable_through: ["typed:cloze", "choice:combine", "writing"],
    cefr: [COH],
  },
  "EN.SEN.CMB.embedding": {
    description: "Combines ideas by embedding relative clauses and participle phrases.",
    bands: {
      "2": "Understands a sentence with a short describing phrase (the girl in the red dress).",
      "4": "Combines two sentences using who or which.",
      "6": "Combines sentences using participle phrases (Running for the bus, she dropped her bag) without dangling them.",
      "8": "Embeds several ideas in one controlled sentence for concision.",
    },
    misconceptions: [
      ["dangling_participle", "The participle phrase does not describe the subject (Walking home, the rain started)."],
      ["overloaded_sentence", "Packs in so many embedded parts that the sentence loses its meaning."],
    ],
    observable_through: ["choice:combine", "writing"],
    cefr: [GACC],
  },
  "EN.SEN.COH.connectives": {
    description: "Uses connectives and transitions that show how sentences relate (however, therefore, for example, as a result).",
    bands: {
      "2": "Uses first, then and next to order events.",
      "4": "Uses common connectives for addition, contrast and result (also, however, so).",
      "6": "Chooses connectives that show the exact relationship (therefore, despite this, for instance).",
      "8": "Uses a range of transitions to guide a reader through an argument.",
    },
    misconceptions: [
      ["wrong_connective", "Uses a connective that shows the wrong relationship (however where therefore is meant)."],
      ["connective_overuse", "Starts most sentences with a connective."],
    ],
    observable_through: ["choice:connective", "typed:cloze", "writing"],
    cefr: [COH],
  },
  "EN.RDG.LIT.sequence": {
    description: "Puts the events of a text in the order they happened.",
    bands: {
      "2": "Orders three events in a short story.",
      "4": "Orders events in a text of several paragraphs, using time words.",
      "6": "Orders events when the text tells them out of order (flashbacks, later explanations).",
      "8": "Reconstructs complex or interleaved timelines.",
    },
    misconceptions: [["order_of_mention", "Assumes events happened in the order they are mentioned."]],
    observable_through: ["order:events", "choice:reading"],
    cefr: [READ],
  },
  "EN.RDG.INF.cause_effect": {
    description: "Identifies and infers causes and effects in a text.",
    bands: {
      "2": "Finds a cause stated with because.",
      "4": "Links a cause and effect stated in different sentences.",
      "6": "Infers causes and effects that are not directly stated.",
      "8": "Distinguishes multiple and indirect causes, and causes from coincidences.",
    },
    misconceptions: [
      ["sequence_as_cause", "Treats an earlier event as the cause just because it came first."],
      ["cause_effect_swap", "Gives the effect as the cause, or the reverse."],
    ],
    observable_through: ["choice:reading", "match:cause_effect"],
    cefr: [INFER],
  },
  "EN.RDG.SUM.summarise": {
    description: "Identifies the key points of a text and condenses them, leaving out minor detail.",
    bands: {
      "2": "Retells the main event of a short text.",
      "4": "Chooses the summary that covers the main points without small details.",
      "6": "Identifies the key points of a multi-paragraph text and leaves out examples.",
      "8": "Condenses a complex text accurately, keeping the writer's line of argument.",
    },
    misconceptions: [
      ["detail_in_summary", "Includes minor details or examples."],
      ["partial_summary", "Covers only part of the text."],
      ["adds_opinion", "Adds their own opinion to the summary."],
    ],
    observable_through: ["choice:reading", "multi:key_points", "writing"],
    cefr: [READ],
  },
  "EN.RDG.STR.nonfiction_structure": {
    description: "Recognises how non-fiction is organised (sequence, description, compare and contrast, cause and effect, problem and solution) and uses headings.",
    bands: {
      "2": "Uses a title and pictures to tell what a text is about.",
      "4": "Recognises sequence and description structures, and uses headings to find information.",
      "6": "Recognises compare-and-contrast, cause-and-effect and problem-and-solution structures.",
      "8": "Explains how a text's structure supports its purpose.",
    },
    misconceptions: [["structure_from_topic", "Judges structure by the topic instead of by how the text is organised."]],
    observable_through: ["choice:reading", "match:headings"],
    cefr: [RINFO],
  },
  "EN.RDG.CRF.purpose_audience": {
    description: "Identifies a text's purpose and intended audience, and how its language suits them.",
    bands: {
      "2": "Tells whether a text is a story, a letter or instructions.",
      "4": "Identifies the main purpose (to inform, persuade, entertain or instruct).",
      "6": "Identifies the intended audience and how the language is chosen for it.",
      "8": "Explains mixed or hidden purposes (an advertisement written to look like news).",
    },
    misconceptions: [["purpose_by_topic", "Decides the purpose from the topic instead of from what the text does."]],
    observable_through: ["choice:reading", "match:purpose"],
    cefr: [READ],
  },
  "EN.RDG.CRT.fact_opinion": {
    description: "Distinguishes facts, opinions and opinions presented as facts.",
    bands: {
      "2": "Tells a simple fact from a simple opinion (Cats have four legs / Cats are the best pets).",
      "4": "Recognises opinion words (best, should, I think) in short texts.",
      "6": "Distinguishes facts, opinions and claims presented as facts.",
      "8": "Evaluates how a writer blends fact and opinion to persuade.",
    },
    misconceptions: [
      ["confident_is_fact", "Treats a confidently stated opinion as a fact."],
      ["number_is_fact", "Treats any sentence containing a number as a fact."],
    ],
    observable_through: ["multi:statements", "choice:reading"],
    cefr: [RINFO],
  },
  "EN.WRT.TSK.idea_development": {
    description: "Develops ideas with relevant detail, examples and explanation.",
    bands: {
      "2": "Lists ideas with little detail.",
      "4": "Adds a reason or an example to some ideas.",
      "6": "Develops each main idea with relevant detail, examples or explanation.",
      "8": "Develops ideas in depth, choosing the most telling detail.",
    },
    misconceptions: [
      ["listing_without_development", "Lists ideas without explaining or supporting them."],
      ["irrelevant_detail", "Adds detail that does not support the idea."],
    ],
    observable_through: ["writing", "choice:best_support"],
    cefr: [THEM],
    cbse: "Writing: analytical paragraph on a given map, chart, graph or cues",
  },
  "EN.WRT.ORG.sequencing": {
    description: "Orders ideas and events logically so a reader can follow them.",
    bands: {
      "2": "Puts events in a sensible order.",
      "4": "Orders ideas so the reader can follow them.",
      "6": "Orders points logically, with clear links between them.",
      "8": "Arranges complex content in the most effective order for the purpose.",
    },
    misconceptions: [["jumps_between_ideas", "Moves between ideas and back again without a clear order."]],
    observable_through: ["writing", "order:sentences"],
    cefr: [COH],
  },
  "EN.WRT.GEN.narrative": {
    description: "Writes stories with a clear structure, characters and setting.",
    bands: {
      "2": "Writes a few connected sentences about events.",
      "4": "Writes a story with a beginning, middle and end.",
      "6": "Develops character, setting, and a clear problem and resolution.",
      "8": "Controls pace, viewpoint and detail for effect.",
    },
    misconceptions: [
      ["no_resolution", "Stops the story without resolving its problem."],
      ["list_of_events", "Lists events without connecting them into a story."],
    ],
    observable_through: ["writing"],
    cefr: [CREATIVE],
  },
  "EN.WRT.GEN.persuasive": {
    description: "Writes to persuade: a clear position supported by reasons and evidence, aware of the reader.",
    bands: {
      "2": "States an opinion.",
      "4": "Gives an opinion with reasons.",
      "6": "Supports a clear position with reasons and evidence, and addresses the reader.",
      "8": "Builds a structured argument, answers counter-arguments and persuades through language.",
    },
    misconceptions: [
      ["opinion_without_reasons", "States opinions without reasons or evidence."],
      ["ignores_other_side", "Does not acknowledge any other point of view where the task needs it."],
    ],
    observable_through: ["writing", "choice:best_support"],
    cefr: [ESSAYS],
  },
  "EN.WRT.GEN.functional": {
    description: "Writes letters, emails, notices and messages with the right conventions, purpose and register.",
    bands: {
      "2": "Writes a short message with a greeting.",
      "4": "Uses the main conventions of an informal letter, email or notice.",
      "6": "Writes formal letters and notices with the right layout, purpose and register.",
      "8": "Writes precise, well-judged functional texts for varied real purposes.",
    },
    misconceptions: [
      ["missing_conventions", "Leaves out expected parts (greeting, subject, closing, date of a notice)."],
      ["informal_in_formal", "Uses informal language in a formal letter or notice."],
    ],
    observable_through: ["writing", "choice:task_fit", "order:letter_parts"],
    cefr: [CORR],
    cbse: "Writing: formal letter based on a given situation",
  },
  "EN.WRT.STY.register": {
    description: "Adjusts formality and tone to the audience and purpose.",
    bands: {
      "2": "Writes the same way for every reader.",
      "4": "Makes some changes for formal or informal readers.",
      "6": "Keeps a suitable register throughout a piece (a formal letter as against a message to a friend).",
      "8": "Adjusts register precisely for purpose, audience and effect.",
    },
    misconceptions: [
      ["register_mix", "Mixes formal and informal language (Dear Sir, hope ur fine)."],
      ["text_speak", "Uses text-message spellings in formal writing."],
    ],
    observable_through: ["writing", "choice:register", "multi:register"],
    cefr: [SOC],
  },
};

/** Reference mappings for the 17 skeleton capabilities (their definitions are unchanged). */
export const SKELETON_REFS: Record<string, { cefr: string[]; cbse?: string }> = {
  "EN.FND.SPL.inflections": { cefr: [ORTH] },
  "EN.VOC.BRD.general": { cefr: [VRANGE] },
  "EN.VOC.MOR.suffixes": { cefr: [VRANGE, VCTRL] },
  "EN.VOC.CTX.context": { cefr: [INFER] },
  "EN.GRM.NOUN.articles": { cefr: [GACC], cbse: "Determiners" },
  "EN.GRM.VERB.aspect": { cefr: [GACC], cbse: "Tenses" },
  "EN.GRM.VERB.sva": { cefr: [GACC], cbse: "Subject–Verb Concord" },
  "EN.GRM.PUN.commas": { cefr: [ORTH] },
  "EN.SEN.CMP.run_ons": { cefr: [GACC, COH] },
  "EN.SEN.CMB.subordination": { cefr: [COH] },
  "EN.RDG.LIT.locate_detail": { cefr: [RINFO] },
  "EN.RDG.INF.motives": { cefr: [INFER] },
  "EN.RDG.SUM.main_idea": { cefr: [READ] },
  "EN.WRT.TSK.task_response": { cefr: [THEM] },
  "EN.WRT.ORG.paragraphing": { cefr: [COH] },
  "EN.WRT.ACC.grammar": { cefr: [GACC] },
  "EN.WRT.ACC.spelling": { cefr: [ORTH] },
};

/** Candidate couplings involving core capabilities. Expert guesses, like E1's; unvalidated. */
export const NEW_COUPLINGS: [string, string, number][] = [
  ["EN.FND.SPL.morphological", "EN.VOC.MOR.prefixes", 0.3],
  ["EN.FND.SPL.morphological", "EN.FND.SPL.inflections", 0.3],
  ["EN.FND.SPL.homophones", "EN.WRT.ACC.spelling", 0.3],
  ["EN.GRM.PUN.apostrophes", "EN.FND.SPL.homophones", 0.2],
  ["EN.VOC.BRD.academic", "EN.VOC.BRD.general", 0.3],
  ["EN.VOC.CTX.multiple_meaning", "EN.VOC.CTX.context", 0.3],
  ["EN.VOC.REL.synonyms_antonyms", "EN.VOC.BRD.general", 0.3],
  ["EN.GRM.VERB.present_past_simple", "EN.GRM.VERB.aspect", 0.3],
  ["EN.GRM.VERB.present_past_simple", "EN.WRT.ACC.grammar", 0.3],
  ["EN.GRM.CLS.relative_clauses", "EN.SEN.CMB.embedding", 0.35],
  ["EN.SEN.CMP.fragments", "EN.SEN.CMP.run_ons", 0.3],
  ["EN.SEN.CMB.coordination", "EN.SEN.CMB.subordination", 0.3],
  ["EN.SEN.COH.connectives", "EN.SEN.CMB.subordination", 0.25],
  ["EN.RDG.INF.cause_effect", "EN.RDG.INF.motives", 0.25],
  ["EN.RDG.SUM.summarise", "EN.RDG.SUM.main_idea", 0.35],
  ["EN.RDG.LIT.sequence", "EN.RDG.LIT.locate_detail", 0.25],
  ["EN.WRT.GEN.functional", "EN.WRT.STY.register", 0.3],
  ["EN.WRT.TSK.idea_development", "EN.WRT.TSK.task_response", 0.3],
  ["EN.WRT.ORG.sequencing", "EN.WRT.ORG.paragraphing", 0.3],
];

export const REFERENCES = {
  note: "Reference frameworks only. OpenPath's 1–8 band descriptors are the definitions. Every mapping here is indicative and unvalidated (D-4).",
  cefr: {
    source: "Council of Europe (2020). Common European Framework of Reference for Languages: Learning, teaching, assessment. Companion volume.",
    use: "Each capability names the CEFR illustrative scale(s) it relates to. Bands map to CEFR levels only roughly (CAPABILITY_FRAMEWORK.md).",
    indicative_levels: { "1": "below Pre-A1 / Pre-A1", "2": "A1", "3": "A2", "4": "A2+ / B1", "5": "B1", "6": "B1+", "7": "B2", "8": "B2+ / C1" },
  },
  cbse: {
    source: "CBSE. English Language and Literature (Code No. 184), Class X annual syllabus 2025–26.",
    grammar_topics: ["Determiners", "Tenses", "Modals", "Subject–Verb Concord", "Reported Speech (commands and requests, statements, questions)"],
    writing_tasks: ["Formal letter based on a given situation", "Analytical paragraph on a given map, chart, graph or cues"],
    use: "Capabilities that cover a listed topic or task name it. No other CBSE mapping is claimed.",
  },
  ncert: {
    source: "NCERT (2017). Learning Outcomes at the Elementary Stage.",
    use: "Document-level reference for the English topic areas of Classes VI–VIII. No capability-level mapping is claimed.",
  },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(CONTENT, "framework");
  const fw = JSON.parse(readFileSync(join(dir, "en-0.1.0.json"), "utf8"));
  fw.version = "0.2.0";
  fw.status = "draft";
  fw.review = {
    status: "candidate-unvalidated",
    author: "OpenPath",
    licence: "internal",
    note: "Candidate draft (E2a), not reviewed by an English educator (D-4). Descriptors are OpenPath's own wording. Difficulty labels are expert estimates, not empirically calibrated. Builds on 0.1.0: the 17 skeleton capabilities are unchanged; the 39 core capabilities are newly specified.",
  };
  fw.references = REFERENCES;
  const seen = new Set<string>();
  for (const s of fw.strands)
    for (const ss of s.substrands)
      for (const c of ss.capabilities) {
        if (c.tier === "core") {
          const spec = CORE[c.id];
          if (!spec) throw new Error(`no specification for core capability ${c.id}`);
          c.description = spec.description;
          c.bands = spec.bands;
          c.misconceptions = spec.misconceptions.map(([id, description]) => ({ id, description }));
          c.observable_through = spec.observable_through;
          c.references = { cefr: spec.cefr, ...(spec.cbse ? { cbse: spec.cbse } : {}) };
          seen.add(c.id);
        } else if (c.tier === "skeleton") {
          c.references = SKELETON_REFS[c.id];
          seen.add(c.id);
        }
      }
  for (const id of [...Object.keys(CORE), ...Object.keys(SKELETON_REFS)]) if (!seen.has(id)) throw new Error(`unknown capability ${id}`);
  fw.couplings = [...fw.couplings, ...NEW_COUPLINGS.map(([a, b, strength]) => ({ a, b, strength, status: "candidate" }))];
  fw.prerequisites = fw.prerequisites.map((p: object) => ({ ...p, source: "OpenPath E1 (candidate; no reference states it)" }));
  writeFileSync(join(dir, "en-0.2.0.json"), JSON.stringify(fw, null, 1) + "\n");
  console.log(`wrote en-0.2.0.json: ${seen.size} capabilities specified`);
}
