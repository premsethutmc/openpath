/** Candidate article practice references; neither measured levels nor validated exam items. */
import type {WorkspaceBankDraft} from './workspace-bank-types.ts';

export const ARTICLE_DRAFTS: WorkspaceBankDraft[] = [
  {
    "key": "articles-foundation-tool-loan",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "prompt": "Any suitable tool will do; none has been chosen. To tap this pin into place, I need ___ hammer.",
    "options": [
      "a",
      "an",
      "the"
    ],
    "answer": 0,
    "explanation": "Hammer is a singular countable noun beginning with a consonant sound. No particular hammer has been identified.",
    "family": "articles-tool-loan",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-garden-discovery",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "prompt": "Something unexpectedly landed on my sleeve: ___ insect with silver wings. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Insect is singular and begins with a vowel sound. The sentence introduces one previously unidentified insect.",
    "family": "articles-garden-discovery",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-marked-exit",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "diagnosis",
    "prompt": "There is exactly one exit marked EXIT NORTH in this hall. Follow the arrows towards ___ exit marked EXIT NORTH.",
    "options": [
      "a",
      "an",
      "the"
    ],
    "answer": 2,
    "explanation": "The label identifies a particular exit, so the definite article is appropriate.",
    "family": "articles-marked-exit",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-snack-choice",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "practice",
    "prompt": "You may take any single biscuit from this full tin. Please choose ___ biscuit for your snack. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "One unspecified biscuit is a singular countable item, so it needs a.",
    "family": "articles-snack-choice",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-unexpected-invitation",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "practice",
    "prompt": "Until this morning I knew nothing about the ceremony. Then ___ invitation to it arrived unexpectedly. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Invitation begins with a vowel sound and introduces one new, countable item.",
    "family": "articles-unexpected-invitation",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-only-lift",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "practice",
    "prompt": "Three lifts serve this floor. We will enter ___ first lift to arrive, whichever one that is. (— means no article.)",
    "options": [
      "an",
      "—",
      "the"
    ],
    "answer": 2,
    "explanation": "First selects a unique position in the arrival order. Use the before this ordinal description.",
    "family": "articles-ordinal-selection",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-occupation-description",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "Nila makes pots for a living. To name her occupation, complete: Nila is ___ potter. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "A singular countable occupation normally takes an indefinite article. Potter begins with a consonant sound.",
    "family": "articles-occupation-description",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-foundation-night-sighting",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "We had not seen any birds on our walk until ___ owl flew across the path. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Owl begins with a vowel sound. This is the first introduction of one bird.",
    "family": "articles-night-sighting",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-portrait-location",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "We saw a portrait at the exhibition. A signature was visible below ___ portrait. (— means no article; type none for no article.)",
    "options": [
      "an",
      "—",
      "the"
    ],
    "answer": 2,
    "explanation": "The sentence refers back to the portrait already introduced, so use the.",
    "family": "articles-discourse-second-reference",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "the"
    ]
  },
  {
    "key": "articles-foundation-emergency-supplies",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "No special covering is required. Any clean one will do: bring ___ blanket from the supply cupboard. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "Any one of several blankets will serve, so the intended reference is indefinite.",
    "family": "articles-emergency-supplies",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-lift-installation",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "The plans propose one new passenger lift, of no specified model. The building will receive ___ elevator next year. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Elevator starts with a vowel sound and denotes a newly introduced singular object.",
    "family": "articles-lift-installation",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "an"
    ]
  },
  {
    "key": "articles-foundation-labelled-drawer",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "This drawer has a single handle. The handle has not yet been mentioned in our conversation. I say: “Pull ___ handle of this drawer.”",
    "options": [
      "a",
      "an",
      "the"
    ],
    "answer": 2,
    "explanation": "The phrase of this drawer identifies its one handle. A definite article can identify a part through its known whole.",
    "family": "articles-part-whole-handle",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-cooking-search",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "I have not selected a dish yet. I am looking for ___ recipe that uses lentils. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "Recipe is a singular countable noun, and no particular recipe has been selected.",
    "family": "articles-cooking-search",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-foundation-bus-seat",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "confirmation",
    "prompt": "Several seats are vacant, and I do not mind which one I use. I will sit in ___ empty seat. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "The next word, empty, begins with a vowel sound. One unspecified seat calls for an indefinite article.",
    "family": "articles-bus-seat",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-foundation-repair-session",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "retention",
    "prompt": "The group plans one practical session, not yet advertised or named. We hope to run ___ workshop on bicycle repair. (— means no article; type none for no article.)",
    "options": [
      "an",
      "—",
      "a"
    ],
    "answer": 2,
    "explanation": "Workshop is a singular countable noun starting with a consonant sound; one new session is being introduced.",
    "family": "articles-repair-session",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-foundation-single-light",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "foundation",
    "pool": "retention",
    "prompt": "Here is a sentence beginning with the phrase All of: “All of ___ candles on this tray have burned out.”",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "In this phrase, all of is followed by the definite plural noun phrase the candles. A and an cannot precede a plural noun.",
    "family": "articles-all-of-definite-plural",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-radio-first-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "diagnosis",
    "prompt": "A traveller left a radio at reception. Nobody has claimed ___ radio yet.",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "The radio has already been introduced. This second reference identifies that same object.",
    "family": "articles-discourse-second-reference",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-one-time-payment",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "diagnosis",
    "prompt": "This charge happens once, not every month. It is ___ one-time payment. (— means no article.)",
    "options": [
      "an",
      "a",
      "—"
    ],
    "answer": 1,
    "explanation": "One begins with the consonant sound /w/, so the indefinite article is a despite the written vowel.",
    "family": "articles-one-time-payment",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-mri-letter-name",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "diagnosis",
    "prompt": "For a first scan, the doctor recommended ___ MRI examination. Here MRI is pronounced letter by letter. (— means no article.)",
    "options": [
      "a",
      "—",
      "an"
    ],
    "answer": 2,
    "explanation": "The spoken letter M starts with a vowel sound, so an precedes MRI.",
    "family": "articles-mri-letter-name",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-envelope-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "practice",
    "prompt": "Five envelopes have different widths. Choose the article for the comparison within this set: Put the card into ___ widest envelope.",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "The superlative widest selects one envelope from the stated comparison set, so the is required.",
    "family": "articles-superlative-comparison",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-honest-response",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "practice",
    "prompt": "The interviewer requests a truthful reply, not a particular prepared sentence: “Please give me ___ honest response.” (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Honest has a silent h and begins with a vowel sound. The request is for one unspecified response.",
    "family": "articles-honest-response",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-usb-connection",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "practice",
    "prompt": "No particular cable has been selected. The device requires ___ USB cable; pronounce USB as the letter names. (— means no article.)",
    "options": [
      "an",
      "—",
      "a"
    ],
    "answer": 2,
    "explanation": "The letter U starts with the consonant /y/ sound in its name. A is therefore appropriate.",
    "family": "articles-usb-connection",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-hotel-key-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "Choose the article for classifying something, not identifying a particular object: Despite its appearance, this keepsake is ___ musical instrument, not a toy. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "The complement classifies the keepsake as one member of a category. Musical begins with a consonant sound; a fits the singular countable noun phrase.",
    "family": "articles-object-classification",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-developing-union-membership",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "Ravi belongs to a workers’ organisation. Describing his membership rather than identifying him, write: Ravi is ___ union member. (— means no article.)",
    "options": [
      "an",
      "a",
      "—"
    ],
    "answer": 1,
    "explanation": "Union begins with the consonant /y/ sound; membership is expressed with a singular indefinite noun phrase.",
    "family": "articles-union-membership",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-unusual-pattern",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "The analyst had expected a regular sequence. Instead, the data showed ___ unusual pattern never seen in earlier trials. (— means no article; type none for no article.)",
    "options": [
      "a",
      "—",
      "an"
    ],
    "answer": 2,
    "explanation": "Unusual begins with a vowel sound, so the newly introduced pattern takes an.",
    "family": "articles-unusual-pattern",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "an"
    ]
  },
  {
    "key": "articles-developing-ferry-ticket-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "A ferry has one captain on duty. Two passengers can both see that person at the controls. One tells the other: “Ask ___ captain whether we may board.”",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "The shared situation identifies the single captain on duty even without a previous mention in the conversation.",
    "family": "articles-shared-situation-captain",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-fbi-letter-name",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "The novel introduces a new character described as ___ FBI agent. Say FBI as three letter names. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "The letter name F begins with a vowel sound; the first introduction therefore uses an.",
    "family": "articles-fbi-letter-name",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "an"
    ]
  },
  {
    "key": "articles-developing-young-cat-description",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "A newly rescued kitten is described as ___ young animal that needs frequent meals. (— means no article.)",
    "options": [
      "an",
      "—",
      "a"
    ],
    "answer": 2,
    "explanation": "The word immediately following the gap is young, which begins with a consonant sound.",
    "family": "articles-young-cat-description",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-telescope-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "Several telescopes are lightweight; any of them could be selected. The buyer requests ___ lightweight telescope, without identifying a particular one. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 0,
    "explanation": "A descriptive adjective does not by itself identify one object. Lightweight describes several possible telescopes, so this request remains indefinite.",
    "family": "articles-nonunique-descriptive-modifier",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-developing-heir-description",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "confirmation",
    "prompt": "In a story, an unnamed person will inherit a fortune. That person is described as ___ heir to the fortune. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Heir begins with a vowel sound because its h is silent. The noun phrase describes one unnamed person.",
    "family": "articles-heir-description",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-developing-eulogy-sound",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "retention",
    "prompt": "At a memorial, someone plans to deliver ___ eulogy. No particular speech has been written yet. (— means no article; type none for no article.)",
    "options": [
      "an",
      "—",
      "a"
    ],
    "answer": 2,
    "explanation": "Eulogy begins with the consonant /y/ sound. The reference is to one as-yet-unspecified speech.",
    "family": "articles-eulogy-sound",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "a"
    ]
  },
  {
    "key": "articles-developing-archive-map-return",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "developing",
    "pool": "retention",
    "prompt": "The insert names a profession rather than a unique post: “Maya, ___ archivist by training, recognised the handwriting.” (— means no article.)",
    "options": [
      "an",
      "a",
      "—"
    ],
    "answer": 0,
    "explanation": "The appositive describes Maya as a member of the profession. Archivist begins with a vowel sound, so the singular phrase takes an.",
    "family": "articles-profession-appositive",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-abstract-curiosity",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "prompt": "In a statement about the quality in general, not a particular person’s behaviour, complete: ___ curiosity can motivate scientific exploration. (— means no article.)",
    "options": [
      "—",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "Curiosity is an abstract uncountable noun used generally here; an indefinite article is not appropriate.",
    "family": "articles-abstract-curiosity",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-specific-advice",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "prompt": "You sent one set of recommendations yesterday. Referring specifically to those recommendations, write: I have considered ___ advice you sent yesterday. (— means no article.)",
    "options": [
      "an",
      "the",
      "—"
    ],
    "answer": 1,
    "explanation": "The following clause identifies a specific body of advice. Although advice is uncountable, it can take the when definite.",
    "family": "articles-specific-advice",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-generic-tools",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "diagnosis",
    "prompt": "A statement about the whole category, not a known set, begins: ___ telescopes collect light from distant objects. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 2,
    "explanation": "A plural countable noun used for a category in general does not take an indefinite article.",
    "family": "articles-generic-tools",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-mass-equipment",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "practice",
    "prompt": "The manual discusses equipment as a general category: ___ equipment requires maintenance to remain safe. (— means no article.)",
    "options": [
      "—",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "Equipment is uncountable in this use. The general statement does not identify a specific collection.",
    "family": "articles-mass-equipment",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-countable-advice-unit",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "practice",
    "prompt": "You offer one recommendation. Choose the article in: Here is ___ piece of advice about storing batteries. (— means no article.)",
    "options": [
      "an",
      "a",
      "—"
    ],
    "answer": 1,
    "explanation": "Piece is a singular countable unit even though advice is uncountable. Piece begins with a consonant sound.",
    "family": "articles-countable-advice-unit",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-identified-research",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "practice",
    "prompt": "Several studies are on the table. Referring to the particular study we funded, write: ___ research we funded examined coastal erosion.",
    "options": [
      "a",
      "an",
      "the"
    ],
    "answer": 2,
    "explanation": "The clause we funded identifies particular research. An uncountable noun can have a definite reference.",
    "family": "articles-identified-research",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-generic-metal",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "For a statement about the material rather than a particular supply, complete: ___ copper conducts electricity. (— means no article; type none for no article.)",
    "options": [
      "—",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "Copper names a material in general and is uncountable in this context.",
    "family": "articles-generic-metal",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "none",
      "no article",
      "—",
      "-"
    ]
  },
  {
    "key": "articles-stretch-specific-volunteers",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "Six volunteers registered yesterday. Referring to that entire identified group, write: ___ volunteers who registered yesterday have received instructions.",
    "options": [
      "a",
      "the",
      "an"
    ],
    "answer": 1,
    "explanation": "The following clause identifies the group. The is compatible with a definite plural noun phrase.",
    "family": "articles-specific-volunteers",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-generic-permission",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "Discussing the concept generally rather than one particular approval, write: ___ permission is not the same as an obligation. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 2,
    "explanation": "Permission is uncountable in this general contrast, so no indefinite article is used.",
    "family": "articles-generic-permission",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "none",
      "no article",
      "—",
      "-"
    ]
  },
  {
    "key": "articles-stretch-specific-sand",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "Two trays contain different materials. Referring only to the material in tray B, complete: ___ sand in tray B is damp.",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "In tray B identifies a particular quantity of sand. Definite reference does not require countability.",
    "family": "articles-specific-sand",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-countable-furniture-unit",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "A catalogue lists one newly designed object: ___ item of furniture that folds flat. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Item is countable and begins with a vowel sound. Furniture remains uncountable inside the of-phrase.",
    "family": "articles-countable-furniture-unit",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "an"
    ]
  },
  {
    "key": "articles-stretch-generic-music",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "This is a broad claim about music as an art form: ___ music can communicate emotion without words. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 2,
    "explanation": "Music names the art form in general, rather than one identified performance or composition.",
    "family": "articles-generic-music",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-identified-information",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "The paragraph refers only to the details printed on this certificate: ___ information on this certificate must match the register.",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "On this certificate restricts information to a particular body of details; use the.",
    "family": "articles-identified-information",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "the"
    ]
  },
  {
    "key": "articles-stretch-countable-experience",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "confirmation",
    "prompt": "Describe one specific event as an example, rather than expertise accumulated over years: Crossing the glacier was ___ unforgettable experience. (— means no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 1,
    "explanation": "Experience is countable when it means one event. Unforgettable starts with a vowel sound.",
    "family": "articles-countable-experience",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  },
  {
    "key": "articles-stretch-generic-feedback",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "retention",
    "prompt": "A policy discusses feedback as an activity in general: ___ feedback should address the work rather than attack the writer. (— means no article; type none for no article.)",
    "options": [
      "a",
      "an",
      "—"
    ],
    "answer": 2,
    "explanation": "Feedback is uncountable in this general policy statement and does not take an indefinite article.",
    "family": "articles-generic-feedback",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence.",
    "typedAnswers": [
      "none",
      "no article",
      "—",
      "-"
    ]
  },
  {
    "key": "articles-stretch-identified-weather",
    "capability": "EN.GRM.NOUN.articles",
    "difficulty": "stretch",
    "pool": "retention",
    "prompt": "We are discussing conditions during one specified expedition. Complete: ___ weather during that expedition delayed the return journey.",
    "options": [
      "the",
      "a",
      "an"
    ],
    "answer": 0,
    "explanation": "The time phrase identifies particular weather conditions, so the uncountable noun takes the.",
    "family": "articles-identified-weather",
    "independenceNote": "Authored candidate item in a distinct scenario; not calibrated. Do not reuse this item after exposure or count supported practice as independent evidence."
  }
];
