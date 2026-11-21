"""Build the CBSE and Tamil Nadu English syllabus inventories (content/english/syllabus/cbse-class-N.json, tn-class-N.json).

Each file has the same shape as the ICSE ones: what the board lists for the class, in OpenPath's own words, and for
each line whether the app practises it and where. A line done with a grown-up borrows the guided tasks of an ICSE
line that asks the same thing ("tasks"), so no task is written twice. Run from the repository root:

    python3 content/english/syllabus/build/boards.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICSE = {c: json.loads((ROOT / f"icse-class-{c}.json").read_text()) for c in range(1, 9)}
ICSE_LINE = {(c, o["id"]): o for c, d in ICSE.items() for s in d["strands"] for o in s["outcomes"]}

LONG = "Long reads practise questions on theme, character and plot on OpenPath's own stories; the board's own textbook chapters are not in the app."
POEM = "Poems and everyday texts asks about purpose, point of view and figurative language on OpenPath's own poems; the textbook's poems are not in the app."


def g(i, text, *topics, note=None):
    """Practised in Grammar in use on the topics named."""
    o = {"id": i, "text": text, "coverage": "partly" if note else "covered", "where": "grammar", "topics": list(topics)}
    if note:
        o["note"] = note
    return o


def s(i, text, where, note=None):
    """Practised in another stream; a note makes it partly practised."""
    o = {"id": i, "text": text, "coverage": "partly" if note else "covered", "where": where}
    if note:
        o["note"] = note
    return o


def t(i, text, ref):
    """Done with a grown-up, using the tasks of the ICSE line "class:id"."""
    c, oid = ref.split(":")
    src = ICSE_LINE[(int(c), oid)]
    assert src["coverage"] == "guided", ref
    return {"id": i, "text": text, "coverage": "guided", "where": "guided", "note": src["note"], "tasks": {"syllabus": ICSE[int(c)]["id"], "outcome": oid}}


def no(i, text, note):
    return {"id": i, "text": text, "coverage": "not", "note": note}


def strand(i, name, pages, *outcomes):
    return {"id": i, "name": name, "pages": pages, "outcomes": list(outcomes)}


# ---------------------------------------------------------------------------------------------------------------------
# CBSE (NCERT). Classes 1-8: the NCERT Learning Outcomes at the Elementary Stage (2017), which CBSE asks schools to use;
# the class books are now Mridang (1-2), Santoor (3-5) and Poorvi (6-8). Classes 9-12: the CBSE curriculum documents.

LO_SOURCE = {
    "read": "NCERT, Learning Outcomes at the Elementary Stage (2017), English section, read through a copy hosted by the Indian Education Repository (CPR India); CBSE circular 05/2019 asks schools to use it",
    "url": "https://cprindia.org/wp-content/uploads/2023/04/Learning-Outcomes-at-the-Elementary-Stage-2017.pdf",
    "accessed": "2026-11-21",
    "official": False,
    "note": "UNOFFICIAL SOURCE. A copy of the NCERT document, read through a text summary of the PDF, not the PDF itself. The class books have since changed (Mridang for Classes 1-2, Santoor for 3-5, Poorvi for 6-8, under NCF-SE 2023); their chapters are not listed here and a school may order or extend these outcomes.",
}


def cbse_lo(cls, n):
    return dict(LO_SOURCE, read=LO_SOURCE["read"] + f"; Class {n} list")


CBSE = {
    1: [
        strand("listening-speaking", "Listening and Speaking", "Class I",
               t("LS1", "Says rhymes and poems with actions.", "1:LS3"),
               s("LS2", "Answers simple questions about a story heard, in any language.", "listen", "Answers are chosen on screen in English; answering aloud or in a home language is not heard."),
               t("LS3", "Names the characters of a story, says what happened in order, and asks about it.", "1:RW4"),
               s("LS4", "Follows simple spoken instructions.", "first", "First words gives tap-this-then-that instructions by ear; classroom instructions are not in the app."),
               t("LS5", "Answers greetings and polite words in English.", "1:LS2"),
               t("LS6", "Talks about self, a situation or a picture.", "1:LS7")),
        strand("reading", "Reading", "Class I",
               s("R1", "Matches words with pictures and names objects in pictures.", "first"),
               s("R2", "Knows the letters A to Z and the sounds they make.", "first", "First words says each word aloud with its picture; letter-by-letter sound work is not in the app."),
               s("R3", "Tells small letters from capital letters.", "grammar", "Capital letters are practised at the start of sentences; matching each small letter to its capital is not."),
               s("R4", "Sounds out common blends such as br and fr.", "spelling", "The Spelling Bee teaches spelling by sound; blends are not taught on their own.")),
        strand("writing", "Writing", "Class I",
               t("W1", "Draws or scribbles in answer to poems and stories.", "1:RW3"),
               s("W2", "Writes simple words such as fan, hen and rat.", "listening"),
               t("W3", "Writes letters and words clearly by hand.", "1:RW6")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class I",
               g("GV1", "Uses naming words for people and things.", "parts_of_speech", "noun_kinds"),
               g("GV2", "Uses in, on and under.", "prepositions"),
               g("GV3", "Uses a and an.", "articles")),
    ],
    2: [
        strand("listening-speaking", "Listening and Speaking", "Class II",
               t("LS1", "Sings songs and rhymes with actions.", "2:LS7"),
               s("LS2", "Answers questions on stories and poems heard.", "listen"),
               t("LS3", "Gives a view and asks questions about characters and the story.", "2:LS6"),
               t("LS4", "Answers greetings and polite words in English.", "1:LS2"),
               s("LS5", "Listens to short texts read aloud, such as a children's news column.", "listen"),
               s("LS6", "Follows instructions, for example to draw a picture.", "first", "Tap-this-then-that instructions are practised in First words; drawing from spoken instructions is not.")),
        strand("reading", "Reading", "Class II",
               s("R1", "Names the characters and the order of events in a story.", "grammar", "Putting pictures in story order is practised; naming the characters of a whole story is not.")
               | {"topics": ["picture_order"]},
               s("R2", "Reads short texts and answers questions on them.", "reading")),
        strand("writing", "Writing", "Class II",
               t("W1", "Draws or writes a few words or sentences in answer to poems and stories.", "1:RW8"),
               s("W2", "Writes short sentences with spaces between the words.", "listening"),
               g("W3", "Starts sentences with a capital letter and ends them with a full stop.", "capitals")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class II",
               g("GV1", "Uses describing words for size, shape, colour, weight and feel.", "parts_of_speech", "adjective_kinds"),
               g("GV2", "Uses he, she and it, and this, that, these and those.", "pronouns", "this_these"),
               g("GV3", "Uses position words such as before and between.", "prepositions"),
               g("GV4", "Uses one and many.", "plurals")),
    ],
    3: [
        strand("listening-speaking", "Listening and Speaking", "Class III",
               t("LS1", "Says poems with clear sounds and the right rise and fall.", "3:LS4"),
               t("LS2", "Acts out role plays and short skits with expression.", "3:LS6"),
               t("LS3", "Gives a view about stories and characters.", "3:LS1"),
               t("LS4", "Answers spoken and telephone messages suitably.", "2:LS9")),
        strand("reading", "Reading", "Class III",
               t("R1", "Reads aloud with clear sounds and pauses.", "3:RW2"),
               s("R2", "Reads short texts for the main idea, details and order, and draws conclusions.", "reading"),
               s("R3", "Reads poems, posters and charts on classroom walls.", "kinds", "Poems, notices and timetables are read with questions; the classroom's own walls are not.")),
        strand("writing", "Writing", "Class III",
               s("W1", "Writes words, phrases and sentences from dictation.", "listening"),
               t("W2", "Writes five or six sentences about own experiences from word or picture clues.", "3:RW5"),
               g("W3", "Uses question marks, full stops and capital letters correctly.", "capitals", "punctuation", "questions")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class III",
               g("GV1", "Makes short sentences with nouns, pronouns, adjectives and prepositions.", "parts_of_speech", "pronouns", "prepositions"),
               g("GV2", "Tells the simple past from the simple present.", "past", "agreement"),
               g("GV3", "Knows opposites such as day and night, open and close.", "synonyms_antonyms"),
               s("GV4", "Uses words met in Maths and Environmental Studies.", "words", "New words teaches everyday and school words by level; it is not sorted by school subject.")),
    ],
    4: [
        strand("listening-speaking", "Listening and Speaking", "Class IV",
               t("LS1", "Says poems with fitting expression.", "3:LS4"),
               t("LS2", "Plays different roles in short skits.", "3:LS6"),
               s("LS3", "Follows simple instructions and announcements.", "listen", "Questions on passages heard are practised; acting on announcements is not."),
               t("LS4", "Describes events, places and own experiences briefly.", "4:LS4"),
               t("LS5", "Shares riddles and tongue twisters.", "4:LS5"),
               t("LS6", "Speaks briefly on a familiar issue, such as saving water or a visit to a fair.", "4:LS3")),
        strand("reading", "Reading", "Class IV",
               s("R1", "Answers questions on stories, poems and articles.", "reading"),
               s("R2", "Reads titles, headlines, leaflets and advertisements.", "kinds", "Adverts and notices are read with questions; headlines and subtitles on their own are not."),
               g("R3", "Works out the meaning of a new word from the sentence.", "context_meaning"),
               t("R4", "Uses a dictionary for spelling and meaning.", "4:RW5")),
        strand("writing", "Writing", "Class IV",
               s("W1", "Writes a dictated paragraph of seven or eight sentences.", "passage"),
               t("W2", "Writes informal letters and messages with the reader in mind.", "4:RW12"),
               g("W3", "Uses linking words such as first and next.", "linkers", "sentence_order"),
               t("W4", "Tells the main points of a text, talk, video or picture, aloud and in writing.", "4:LS3")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class IV",
               g("GV1", "Uses nouns, verbs, adjectives and prepositions in speech and writing.", "parts_of_speech", "prepositions"),
               g("GV2", "Uses punctuation correctly.", "punctuation", "capitals"),
               s("GV3", "Builds words through crosswords and word chains.", "words", "New words builds vocabulary by meaning and use; crosswords and word chains are not in the app.")),
    ],
    5: [
        strand("listening-speaking", "Listening and Speaking", "Class V",
               s("LS1", "Answers questions on daily life and on unfamiliar stories and poems.", "listen"),
               t("LS2", "Shares songs, poems, riddles, stories and tongue twisters.", "4:LS5"),
               t("LS3", "Interviews people such as grandparents, teachers or the librarian.", "5:LS2"),
               t("LS4", "Speaks about peace and equality, giving own views.", "5:LS1")),
        strand("reading", "Reading", "Class V",
               t("R1", "Reads storybooks, news and advertisements alone, then talks or writes about them.", "4:RW3"),
               s("R2", "Reads for details and the order of events.", "reading"),
               t("R3", "Links ideas worked out from a text to own experience.", "4:RW2"),
               t("R4", "Uses a dictionary for reference.", "4:RW5"),
               s("R5", "Reads signs and public notices and answers questions on them.", "kinds")),
        strand("writing", "Writing", "Class V",
               s("W1", "Writes lists, paragraphs and dialogues from dictation.", "passage"),
               t("W2", "Writes paragraphs from word or picture clues, with punctuation and linking words.", "5:RW7"),
               t("W3", "Writes a short life story of someone, and of self.", "4:RW10"),
               t("W4", "Writes informal letters, messages and emails.", "4:RW12"),
               t("W5", "Tries creative writing: stories, poems and posters.", "5:RW8"),
               t("W6", "Writes a few sentences about a cartoon, picture or comic strip.", "3:RW1")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class V",
               g("GV1", "Uses correct sentences to describe, tell and ask.", "agreement", "questions", "word_order"),
               g("GV2", "Uses words of the same and opposite meaning found in a text.", "synonyms_antonyms", "context_meaning"),
               g("GV3", "Finds nouns and adverbs, and tells the simple past from the present.", "parts_of_speech", "adverbs", "past")),
    ],
    6: [
        strand("listening-speaking", "Listening and Speaking", "Class VI",
               t("LS1", "Takes part in role play, group discussion and debate.", "4:LS1"),
               t("LS2", "Says and shares poems, songs, jokes, riddles and tongue twisters.", "4:LS5"),
               t("LS3", "Passes on spoken and telephone messages.", "2:LS9"),
               s("LS4", "Follows announcements and instructions in class and in public places.", "listen", "Questions on passages heard are practised; real announcements are not."),
               t("LS5", "Talks or writes about cartoons, pictures and comic strips.", "3:RW1")),
        strand("reading", "Reading", "Class VI",
               s("R1", "Reads varied texts for the main idea, characters and order, and links them to life.", "long"),
               t("R2", "Finds information in notices, newspapers, the internet, tables, charts and maps.", "6:W4"),
               s("R3", "Answers questions on familiar and unfamiliar texts.", "reading"),
               t("R4", "Uses a dictionary and suggested websites for meaning and spelling.", "6:GV7"),
               s("R5", "Knows the purpose of messages, notices, letters, reports, diaries and travel writing.", "grammar", "How a text is built is practised on short pieces; whole texts of each kind are not in the app.")
               | {"topics": ["text_structure"]},
               t("R6", "Writes a book review.", "5:LIT1")),
        strand("writing", "Writing", "Class VI",
               s("W1", "Writes dictated words, sentences and short paragraphs.", "passage"),
               t("W2", "Writes about real and imagined situations with a clear beginning, middle and end.", "6:W1"),
               t("W3", "Plans, revises and writes short paragraphs from word, print and picture clues.", "6:W6"),
               t("W4", "Writes messages, invitations, paragraphs and formal and informal letters.", "6:W13"),
               t("W5", "Uses the internet and other tools to find information for projects and talks.", "5:RW6")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class VI",
               g("GV1", "Uses words of the same and opposite meaning, and words that sound alike.", "synonyms_antonyms", "confusables"),
               g("GV2", "Works out word meanings from the sentence.", "context_meaning"),
               g("GV3", "Writes correct sentences with nouns, pronouns, verbs, adverbs and determiners.", "parts_of_speech", "adverbs", "this_these", "articles")),
    ],
    7: [
        strand("listening-speaking", "Listening and Speaking", "Class VII",
               t("LS1", "Reads stories aloud and says poems with suitable pauses and expression.", "3:RW2"),
               t("LS2", "Takes part in skits, debates, speeches and quizzes.", "7:LS5"),
               t("LS3", "Talks in English with family, friends and people such as shopkeepers.", "5:LS2"),
               t("LS4", "Discusses dialogues, short films, news and debates.", "7:LS2")),
        strand("reading", "Reading", "Class VII",
               s("R1", "Reads for details, characters, the main idea and the order of events.", "reading"),
               s("R2", "Compares characters, events, ideas and themes, and links them to life.", "long"),
               t("R3", "Takes notes from lessons, books and online material.", "8:LS2"),
               g("R4", "Works out the meaning of new words from context.", "context_meaning"),
               t("R5", "Uses a dictionary, thesaurus and encyclopaedia.", "6:GV7"),
               t("R6", "Reads for pleasure: adventure, science fiction, fairy tales, life stories and travel writing.", "7:R5"),
               t("R7", "Writes a book review.", "7:R5")),
        strand("writing", "Writing", "Class VII",
               s("W1", "Writes dictated paragraphs with varied sentences.", "passage"),
               t("W2", "Plans, revises and writes with a clear beginning, middle and end.", "7:W8"),
               t("W3", "Writes formal letters, diaries, lists, emails and text messages.", "7:W1"),
               t("W4", "Tries stories, poems, dialogues and skits.", "7:W3"),
               t("W5", "Writes dialogues from a story and a story from dialogues.", "7:W2")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class VII",
               g("GV1", "Uses nouns, pronouns, verbs, determiners, adjectives and adverbs correctly.", "parts_of_speech", "pronouns", "adjective_kinds", "adverbs"),
               g("GV2", "Uses tenses correctly.", "past", "continuous", "tenses", "tense_shift"),
               g("GV3", "Uses the passive voice.", "passive")),
    ],
    8: [
        strand("listening-speaking", "Listening and Speaking", "Class VIII",
               s("LS1", "Follows instructions and announcements in school and public places.", "listen", "Questions on passages heard are practised; real announcements are not."),
               t("LS2", "Introduces guests and interviews people about their work.", "5:LS2"),
               g("LS3", "Uses polite phrases to make requests and to disagree.", "register", note="Formal and polite wording is practised in sentences; saying it aloud is not heard."),
               t("LS4", "Gives a short prepared speech, for example in the school assembly.", "8:LS6"),
               t("LS5", "Narrates real and imagined stories and experiences.", "4:LS4")),
        strand("reading", "Reading", "Class VIII",
               s("R1", "Reads for details, characters, the main idea and order, and relates ideas to life.", "long"),
               g("R2", "Explains quotations, sayings and proverbs.", "proverbs", "idioms"),
               t("R3", "Reads photographs, sketches, tables, charts and maps, and uses them in writing.", "6:LS12"),
               g("R4", "Works out the meaning of new words from context.", "context_meaning"),
               t("R5", "Uses a dictionary, thesaurus and encyclopaedia for meaning in context.", "6:GV7"),
               t("R6", "Reads for pleasure and writes a book review.", "8:R7")),
        strand("writing", "Writing", "Class VIII",
               s("W1", "Writes from dictation with correct spelling and punctuation.", "passage"),
               t("W2", "Drafts, revises, edits and finishes coherent paragraphs.", "8:W17"),
               t("W3", "Writes emails, notices, formal letters, diary entries and reports.", "8:W14"),
               t("W4", "Writes descriptions, narratives and life stories.", "8:W11"),
               t("W5", "Writes a piece after gathering information from print and online sources.", "8:W7"),
               t("W6", "Turns a story into a skit, and a dialogue into a story.", "8:W12")),
        strand("grammar-vocabulary", "Grammar and Vocabulary", "Class VIII",
               g("GV1", "Uses active and passive voice, reported speech and tenses in context.", "passive", "speech", "tense_shift"),
               g("GV2", "Uses clauses and comparing adjectives accurately.", "clauses", "relative", "comparison"),
               g("GV3", "Notices punctuation in texts and uses it when editing own writing.", "punctuation", "dialogue")),
    ],
    9: [
        strand("reading", "Reading", "Section A",
               s("R1", "Reads a long descriptive or discursive passage and answers questions on it.", "reading"),
               s("R2", "Reads a short case-based passage with data or a chart and answers questions.", "reading", "Reading passages have questions, and charts are read in Notes, charts and maps; long passages built on data are not yet in the app.")),
        strand("writing", "Writing", "Section B",
               t("W1", "Writes a notice and an informal invitation of about fifty words.", "8:W13"),
               t("W2", "Writes a letter to the editor and a formal email giving views.", "8:W14"),
               t("W3", "Writes a factual description and a magazine article.", "8:W12"),
               t("W4", "Writes a descriptive and a narrative essay of about two hundred words.", "8:W16")),
        strand("grammar", "Grammar", "Section B",
               g("G1", "Keeps the sequence of tenses.", "tense_shift", "tenses"),
               g("G2", "Uses modals for ability, permission, duty, possibility and advice.", "modals", "modal_perfect"),
               g("G3", "Reports statements, questions, commands and requests.", "speech"),
               g("G4", "Uses first-type conditionals, determiners and subject-verb agreement.", "conditionals", "articles", "this_these", "agreement"),
               g("G5", "Uses noun clauses and relative clauses.", "clause_kinds", "relative"),
               g("G6", "Edits, transforms and reorders sentences.", "joining", "compound", "word_order")),
        strand("literature", "Literature", "Section C",
               s("L1", "Reads the prose of the class book, Kaveri, and answers questions on extracts and the whole.", "long", LONG),
               s("L2", "Reads the poems of the class book and explains their devices.", "kinds", POEM)),
        strand("listening-speaking", "Listening and Speaking", "Internal",
               t("LS1", "Takes part in discussions and debates.", "8:LS4"),
               t("LS2", "Gives an interview or a short public speech.", "8:LS6"),
               s("LS3", "Analyses what is heard and builds an argument from it.", "listen", "Questions on passages heard are practised; building a spoken argument is not.")),
    ],
    10: [
        strand("reading", "Reading", "Section A",
               s("R1", "Reads a discursive passage of about 400 words and answers questions on it.", "reading"),
               s("R2", "Reads a factual passage with a chart or data and answers questions.", "reading", "Reading passages have questions, and charts are read in Notes, charts and maps; long passages built on data are not yet in the app.")),
        strand("writing", "Writing", "Section B",
               t("W1", "Writes a formal letter on a given situation.", "8:W14"),
               s("W2", "Writes an analytical paragraph on a map, chart, graph or cues.", "study", "A chart is read and an analytical paragraph about it put in order; a paragraph written freely is not marked.")),
        strand("grammar", "Grammar", "Section B",
               g("G1", "Uses determiners.", "articles", "this_these"),
               g("G2", "Uses tenses.", "tenses", "tense_shift", "continuous"),
               g("G3", "Uses modals.", "modals", "modal_perfect"),
               g("G4", "Makes the verb agree with its subject.", "agreement"),
               g("G5", "Reports commands, requests, statements and questions.", "speech"),
               g("G6", "Fills gaps, edits and transforms sentences with correct grammar and punctuation.", "joining", "punctuation", "confusables")),
        strand("literature", "Literature", "Section C",
               s("L1", "Reads the prose and play of First Flight and answers questions on extracts and the whole.", "long", LONG),
               s("L2", "Reads the poems of First Flight and explains their devices.", "kinds", POEM),
               s("L3", "Reads the stories of Footprints without Feet and writes about character and theme.", "long", LONG)),
        strand("listening-speaking", "Listening and Speaking", "Internal",
               t("LS1", "Speaks fluently and interacts well in role play, skits and talks.", "8:LS4"),
               s("LS2", "Listens and answers questions on what is heard.", "listen")),
    ],
    11: [
        strand("reading", "Reading", "Section A",
               s("R1", "Reads a factual, descriptive or literary passage and a case-based passage with data.", "reading", "Reading passages have questions, and charts are read in Notes, charts and maps; long passages built on data are not yet in the app."),
               s("R2", "Makes notes with a title, numbering and a key, from a passage.", "study", "A title and the main points are chosen from a passage; numbering and a key are not asked for."),
               s("R3", "Writes a summary of a passage in about fifty words.", "study")),
        strand("writing", "Grammar and Creative Writing", "Section B",
               g("G1", "Fills gaps with tenses and clauses, and reorders and transforms sentences.", "tenses", "clause_kinds", "word_order", "joining"),
               t("W1", "Writes a classified advertisement and a poster.", "8:W13"),
               t("W2", "Writes a speech from word or picture cues.", "8:LS6"),
               t("W3", "Writes a debate on a topical issue.", "8:W9")),
        strand("literature", "Literature", "Section C",
               s("L1", "Reads the prose of Hornbill and answers questions on extracts and the whole.", "long", LONG),
               s("L2", "Reads the poems of Hornbill and explains their devices.", "kinds", POEM),
               s("L3", "Reads the stories and play of Snapshots and writes about character and theme.", "long", LONG)),
        strand("listening-speaking", "Listening, Speaking and Project", "Internal",
               s("LS1", "Follows talks, news and business information and answers questions.", "listen", "Questions on passages heard are practised; notes from a long talk are not."),
               t("LS2", "Speaks in discussions, interviews and presentations.", "8:LS4"),
               t("LS3", "Completes a research project of about 900 words and talks about it.", "8:W5")),
    ],
    12: [
        strand("reading", "Reading", "Section A",
               s("R1", "Reads a literary or factual passage and a case-based passage with data.", "reading", "Reading passages have questions, and charts are read in Notes, charts and maps; long passages built on data are not yet in the app.")),
        strand("writing", "Creative Writing", "Section B",
               t("W1", "Writes a notice of about fifty words.", "8:W13"),
               t("W2", "Writes a formal or informal invitation and a reply.", "7:W1"),
               t("W3", "Writes letters: job applications with a resume, and letters to the editor.", "8:W14"),
               t("W4", "Writes an article or a report.", "8:W12")),
        strand("literature", "Literature", "Section C",
               s("L1", "Reads the prose of Flamingo and answers questions on extracts and the whole.", "long", LONG),
               s("L2", "Reads the poems of Flamingo and explains their devices.", "kinds", POEM),
               s("L3", "Reads the stories of Vistas and writes about character and theme.", "long", LONG)),
        strand("listening-speaking", "Listening, Speaking and Project", "Internal",
               s("LS1", "Follows talks, news and business information and answers questions.", "listen", "Questions on passages heard are practised; notes from a long talk are not."),
               t("LS2", "Speaks in discussions, interviews and presentations.", "8:LS4"),
               t("LS3", "Completes a research project of about 900 words and talks about it.", "8:W5")),
    ],
}

SEC = {
    9: {"read": "Directorate of Education, Delhi: Class IX English Language and Literature (184) annual syllabus 2026-27, which follows the CBSE curriculum and the new book Kaveri", "url": "https://edustud.nic.in/edu/Syllabus_2026_27/9/9_EnglishR1_Annualsyllabus_EM_2026_27.pdf"},
    10: {"read": "Directorate of Education, Delhi: Class X English Language and Literature (184) annual syllabus 2025-26, which follows the CBSE curriculum (First Flight, Footprints without Feet)", "url": "https://edustud.nic.in/edu/SYLLABUS_2025_26/10/10_English_EM.pdf"},
    11: {"read": "CBSE curriculum 2025-26, English Core (301), Classes XI and XII: the Class XI course", "url": "https://www.cbseacademic.nic.in/web_material/CurriculumMain26/SrSec/English_core_SrSec_2025-26.pdf"},
    12: {"read": "CBSE curriculum 2025-26, English Core (301), Classes XI and XII: the Class XII course", "url": "https://www.cbseacademic.nic.in/web_material/CurriculumMain26/SrSec/English_core_SrSec_2025-26.pdf"},
}


def cbse_source(c):
    if c <= 8:
        return cbse_lo(c, ROMAN[c])
    official = c >= 11
    note = ("Read through a text summary of the PDF, not the PDF itself. " if official else "UNOFFICIAL SOURCE. A state education department's copy of the CBSE syllabus, read through a text summary of the PDF. ") + \
        "The board's prescribed chapters are named, not reproduced; the course is examined mainly through the textbooks, which are not in the app."
    return {**SEC[c], "accessed": "2026-11-21", "official": official, "note": note}


# ---------------------------------------------------------------------------------------------------------------------
# Tamil Nadu State Board (Samacheer Kalvi). Classes 1-9: the state English textbooks, each unit in listening, speaking,
# reading, vocabulary, grammar and writing parts. Classes 10-12: the board's English syllabus and question pattern.

TN_BOOK = {
    "read": "Tamil Nadu State Board (Samacheer Kalvi) English textbooks for the class, term by term, read through third-party copies and summaries of their unit pages",
    "url": "https://www.tntextbooks.in/",
    "official": False,
    "note": "UNOFFICIAL SOURCE. Tamil Nadu publishes English as textbooks rather than as a line-by-line syllabus; this list is OpenPath's reading of what the units teach, gathered from summaries of the books. It is not checked against every term book.",
}


TN = {
    1: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               t("LS1", "Says rhymes and action songs.", "1:LS3"),
               s("LS2", "Listens to a short story and answers simple questions.", "listen"),
               t("LS3", "Greets, introduces self and uses polite words.", "1:LS2"),
               t("LS4", "Talks about a picture in a few words.", "1:LS7")),
        strand("reading", "Reading", "Units",
               s("R1", "Knows the letters, their sounds and simple words with pictures.", "first"),
               s("R2", "Reads simple words and short sentences.", "reading", "The first reading level starts with short texts; reading single new words aloud is not heard.")),
        strand("writing", "Writing", "Units",
               t("W1", "Writes capital and small letters.", "1:GV4"),
               s("W2", "Writes simple words from dictation.", "listening")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               s("VG1", "Names everyday things: family, body, animals, food and colours.", "first"),
               g("VG2", "Uses a and an, and this and that.", "articles", "this_these"),
               g("VG3", "Uses one and many.", "plurals")),
    ],
    2: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               t("LS1", "Says rhymes and poems with actions.", "2:LS7"),
               s("LS2", "Answers questions on a story heard.", "listen"),
               t("LS3", "Asks and answers simple questions about self and others.", "2:LS6"),
               t("LS4", "Tells a short story with pictures.", "2:LS2")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads short texts and answers questions.", "reading"),
               g("R2", "Puts pictures of a story in order.", "picture_order")),
        strand("writing", "Writing", "Units",
               s("W1", "Writes words and short sentences from dictation.", "listening"),
               t("W2", "Writes a few sentences about a picture.", "1:RW8")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses naming words and action words.", "parts_of_speech"),
               g("VG2", "Uses he, she, it, they, and am, is and are.", "pronouns", "be_verbs"),
               g("VG3", "Uses in, on and under.", "prepositions"),
               g("VG4", "Uses opposites and rhyming words.", "synonyms_antonyms", note="Opposites are practised; rhyming words are not."),
               g("VG5", "Starts a sentence with a capital letter and ends it with a full stop.", "capitals")),
    ],
    3: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to a story or passage and answers questions.", "listen"),
               t("LS2", "Says poems with expression.", "3:LS4"),
               t("LS3", "Describes a person, place or picture.", "3:LS2"),
               t("LS4", "Takes part in role play.", "3:LS6")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads a lesson and answers questions on it.", "reading"),
               t("R2", "Reads aloud with clear sounds and pauses.", "3:RW2")),
        strand("writing", "Writing", "Units",
               s("W1", "Writes sentences from dictation.", "listening"),
               t("W2", "Writes a short paragraph from picture or word clues.", "3:RW3"),
               g("W3", "Uses capital letters, full stops and question marks.", "capitals", "questions")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses nouns, pronouns, verbs and describing words.", "parts_of_speech", "pronouns"),
               g("VG2", "Uses the simple present and the simple past.", "agreement", "past"),
               g("VG3", "Uses a, an and the, and one and many.", "articles", "plurals"),
               g("VG4", "Uses opposites and words of the same meaning.", "synonyms_antonyms"),
               g("VG5", "Puts words in alphabetical order.", "alphabetical")),
    ],
    4: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Tells a story or experience in order.", "4:LS4"),
               t("LS3", "Takes part in conversations and discussions.", "4:LS1"),
               t("LS4", "Says poems, riddles and tongue twisters.", "4:LS5")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads a lesson or poem and answers questions.", "reading"),
               g("R2", "Works out new words from the sentence.", "context_meaning")),
        strand("writing", "Writing", "Units",
               s("W1", "Writes a short passage from dictation.", "passage"),
               t("W2", "Writes a paragraph on a familiar topic.", "4:RW6"),
               t("W3", "Writes a letter to a friend or relative.", "4:RW12")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses kinds of nouns, and adjectives that compare.", "noun_kinds", "comparison"),
               g("VG2", "Uses the present continuous and the simple past.", "continuous", "past", "irregular_verbs"),
               g("VG3", "Uses prepositions and joining words.", "prepositions", "conjunctions"),
               g("VG4", "Asks questions with question words.", "questions"),
               g("VG5", "Uses words of the same and opposite meaning.", "synonyms_antonyms")),
    ],
    5: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to rhymes, songs and stories and answers questions.", "listen"),
               t("LS2", "Talks freely about everyday things with classmates.", "5:LS2"),
               t("LS3", "Says poems with expression.", "3:LS4")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads stories and lessons and answers questions.", "reading"),
               s("R2", "Reads longer stories for character and plot.", "long")),
        strand("writing", "Writing", "Units",
               t("W1", "Writes short poems, projects and stories.", "5:RW8"),
               t("W2", "Writes an informal letter.", "4:RW12"),
               t("W3", "Fills in a form with own details.", "6:W13"),
               t("W4", "Makes a group chart, for example on pollution.", "5:RW6")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses collective nouns, plurals, gender and possessives.", "collective_nouns", "plurals", "possessives"),
               g("VG2", "Makes the verb agree with its subject.", "agreement"),
               g("VG3", "Uses the simple present, past and future, and the present continuous.", "past", "future", "continuous"),
               g("VG4", "Uses compound words, words that sound alike, and similes.", "word_formation", "confusables", "similes"),
               g("VG5", "Uses present and past forms of verbs.", "irregular_verbs")),
    ],
    6: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to news and talks and answers questions.", "listen"),
               t("LS2", "Gives a short talk about a picture.", "4:LS3"),
               t("LS3", "Takes part in a group discussion.", "4:LS1"),
               t("LS4", "Tells a story from a comic strip.", "4:LS4")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads prose, poems and supplementary stories and answers questions.", "reading"),
               s("R2", "Reads a story for its order of events and sums it up from a story map.", "long")),
        strand("writing", "Writing", "Units",
               t("W1", "Describes a picture in about fifty words.", "6:W1"),
               t("W2", "Writes a paragraph and a short story.", "6:W8"),
               t("W3", "Writes a message and a recipe.", "6:W13"),
               g("W4", "Compares two things using but, whereas and as well as.", "conjunctions", "linkers")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses statements, questions, commands and exclamations, with punctuation.", "punctuation", "questions", "interjections"),
               g("VG2", "Finds the subject and the predicate.", "subject_predicate"),
               g("VG3", "Uses many, much, few, little, each, every, some and any.", "this_these", "articles"),
               g("VG4", "Uses compound words, agent nouns and words often confused.", "word_formation", "affixes", "confusables"),
               g("VG5", "Uses nouns, noun phrases and plurals.", "noun_kinds", "plurals", "word_order")),
    ],
    7: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Takes part in conversations and role play.", "7:LS6"),
               t("LS3", "Speaks on a topic before the class.", "7:LS5")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads prose, poems and supplementary stories and answers questions.", "reading"),
               s("R2", "Explains figures of speech in poems.", "kinds", POEM)),
        strand("writing", "Writing", "Units",
               t("W1", "Writes formal and informal letters.", "7:W1"),
               t("W2", "Writes a notice and a dialogue.", "6:W13"),
               t("W3", "Writes a story from hints.", "7:W2")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses present, past and future tenses, including the perfect.", "tenses", "continuous"),
               g("VG2", "Uses adverbs, prepositions, articles and conjunctions.", "adverbs", "prepositions", "articles", "conjunctions"),
               g("VG3", "Compares with adjectives.", "comparison"),
               g("VG4", "Uses prefixes, suffixes, and words of the same and opposite meaning.", "affixes", "synonyms_antonyms"),
               g("VG5", "Changes sentences between active and passive.", "passive")),
    ],
    8: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Takes part in discussions and debates.", "8:LS4"),
               t("LS3", "Gives a short speech.", "8:LS6")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads prose, poems and supplementary stories and answers questions.", "reading"),
               s("R2", "Writes about characters and events in a story.", "long")),
        strand("writing", "Writing", "Units",
               t("W1", "Writes formal letters, notices and diary entries.", "8:W14"),
               t("W2", "Writes a story or paragraph from hints.", "8:W11")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses modals.", "modals"),
               g("VG2", "Uses the active and passive voice.", "passive"),
               g("VG3", "Changes direct speech into reported speech.", "speech"),
               g("VG4", "Adds question tags.", "question_tags"),
               g("VG5", "Uses simple, compound and complex sentences.", "compound", "joining", "clause_kinds"),
               g("VG6", "Uses phrasal verbs and idioms.", "phrasal_verbs", "idioms")),
    ],
    9: [
        strand("listening-speaking", "Listening and Speaking", "Units",
               s("LS1", "Listens to a passage or talk and answers questions.", "listen"),
               t("LS2", "Takes part in discussions and gives short talks.", "8:LS4")),
        strand("reading", "Reading", "Units",
               s("R1", "Reads prose, poems and supplementary stories and answers questions.", "reading"),
               s("R2", "Writes about the theme and characters of a story.", "long"),
               s("R3", "Follows a route on a road map and gives directions.", "study")),
        strand("writing", "Writing", "Units",
               t("W1", "Writes formal and informal letters.", "8:W14"),
               t("W2", "Writes a notice and a poster.", "8:W13"),
               t("W3", "Writes a dialogue and a short biography.", "8:W12"),
               s("W4", "Makes notes and writes a summary of a passage.", "study")),
        strand("vocabulary-grammar", "Vocabulary and Grammar", "Units",
               g("VG1", "Uses tenses, modals and question tags.", "tenses", "modals", "question_tags"),
               g("VG2", "Uses the passive voice and reported speech.", "passive", "speech"),
               g("VG3", "Uses conditionals, relative clauses and degrees of comparison.", "conditionals", "relative", "comparison"),
               g("VG4", "Uses prepositional phrases and phrasal verbs.", "prepositions", "phrasal_verbs"),
               g("VG5", "Uses abbreviations, compound words and words of the same and opposite meaning.", "word_formation", "synonyms_antonyms")),
    ],
    10: [
        strand("vocabulary", "Vocabulary", "Part I",
               g("V1", "Gives words of the same and opposite meaning from the lessons.", "synonyms_antonyms", "context_meaning"),
               g("V2", "Expands abbreviations and acronyms, and forms compound and blended words.", "word_formation"),
               g("V3", "Splits words into syllables.", "syllables"),
               g("V4", "Uses phrasal verbs and prepositional phrases.", "phrasal_verbs", "prepositions")),
        strand("grammar", "Grammar", "Part I",
               g("G1", "Uses tenses and modals.", "tenses", "modals"),
               g("G2", "Changes sentences between active and passive.", "passive"),
               g("G3", "Changes direct speech into reported speech.", "speech"),
               g("G4", "Transforms simple, compound and complex sentences.", "compound", "joining", "clause_kinds"),
               g("G5", "Uses articles, conjunctions, pronouns and question tags.", "articles", "conjunctions", "pronouns", "question_tags"),
               g("G6", "Punctuates a passage and rearranges words into a sentence.", "punctuation", "word_order"),
               g("G7", "Turns a verb or adjective into its noun form in a sentence.", "nominalisation")),
        strand("literature", "Prose, Poem and Supplementary", "Part I",
               s("L1", "Reads the prose lessons and answers questions on them.", "long", LONG),
               s("L2", "Reads the poems and explains their figures of speech.", "kinds", POEM),
               s("L3", "Reads the supplementary stories and writes about them.", "long", LONG)),
        strand("writing", "Writing and Language Functions", "Part II",
               t("W1", "Writes formal and informal letters and an email.", "8:W14"),
               t("W2", "Writes a notice and a poster or advertisement.", "8:W13"),
               s("W3", "Gives directions on a road map.", "study", "Directions are chosen and followed on the map; writing them out is not marked."),
               s("W4", "Makes notes and writes a summary of a passage.", "study"),
               t("W5", "Writes a paragraph or story from hints.", "8:W11"),
               g("W6", "Says what to say in an everyday situation.", "register", note="Choosing fitting words is practised in sentences; situations as such are not.")),
        strand("listening-speaking", "Listening, Speaking and Reading", "Internal",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Speaks on a topic and takes part in a conversation.", "8:LS4"),
               s("LS3", "Reads an unseen passage and answers questions.", "reading")),
    ],
    11: [
        strand("vocabulary", "Vocabulary", "Part I",
               g("V1", "Gives words of the same and opposite meaning.", "synonyms_antonyms", "context_meaning"),
               g("V2", "Forms compound and blended words, and expands abbreviations.", "word_formation"),
               g("V3", "Splits words into syllables.", "syllables"),
               g("V4", "Uses prefixes and suffixes, and words often confused.", "affixes", "confusables"),
               g("V5", "Uses phrasal verbs and idioms.", "phrasal_verbs", "idioms")),
        strand("grammar", "Grammar", "Part II",
               g("G1", "Changes sentences between active and passive.", "passive"),
               g("G2", "Uses degrees of comparison.", "comparison"),
               g("G3", "Reports a dialogue in reported speech.", "speech"),
               g("G4", "Fills in conditional clauses.", "conditionals"),
               g("G5", "Transforms simple, compound and complex sentences.", "compound", "joining", "clause_kinds"),
               g("G6", "Spots and corrects errors in sentences.", "agreement", "tense_shift", "confusables")),
        strand("literature", "Prose, Poem and Supplementary", "Part I",
               s("L1", "Reads the prose lessons and answers questions on them.", "long", LONG),
               s("L2", "Answers poem-appreciation questions on poetic devices.", "kinds", POEM),
               s("L3", "Reads the supplementary stories and writes about them.", "long", LONG)),
        strand("writing", "Writing", "Part III",
               t("W1", "Writes formal letters.", "8:W14"),
               t("W2", "Writes a report.", "8:W12"),
               s("W3", "Makes notes and writes a summary of a passage.", "study"),
               t("W4", "Writes a dialogue for a situation.", "7:W2")),
        strand("listening-speaking", "Listening and Speaking", "Internal",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Speaks on a topic and takes part in a discussion.", "8:LS4")),
    ],
    12: [
        strand("vocabulary", "Vocabulary", "Part I",
               g("V1", "Gives words of the same and opposite meaning.", "synonyms_antonyms", "context_meaning"),
               g("V2", "Uses clipped and blended words, and derived words.", "word_formation", "affixes"),
               g("V3", "Uses words that sound alike, words with two meanings and polite alternatives.", "confusables", "register")),
        strand("grammar", "Grammar", "Part II",
               g("G1", "Uses modals and semi-modals.", "modals", "modal_perfect"),
               g("G2", "Uses conditional clauses.", "conditionals"),
               g("G3", "Makes the verb agree with its subject.", "agreement"),
               g("G4", "Uses articles, determiners and prepositions.", "articles", "this_these", "prepositions"),
               g("G5", "Uses tenses and linking words.", "tenses", "linkers"),
               g("G6", "Uses reported speech and the passive voice.", "speech", "passive"),
               g("G7", "Transforms simple, compound and complex sentences.", "compound", "joining", "clause_kinds"),
               g("G8", "Knows sentence patterns: subject, verb, object and the rest.", "transitive", "subject_predicate")),
        strand("literature", "Prose, Poem and Supplementary", "Part I",
               s("L1", "Reads the prose lessons and answers questions on them.", "long", LONG),
               s("L2", "Explains figures of speech in the poems.", "kinds", POEM),
               s("L3", "Reads the supplementary stories and writes about them.", "long", LONG)),
        strand("writing", "Writing", "Part III",
               t("W1", "Writes a notice and an email.", "8:W13"),
               t("W2", "Writes a report and an article.", "8:W12"),
               t("W3", "Writes formal letters and a resume.", "8:W14"),
               s("W4", "Makes notes and writes a summary of a passage.", "study"),
               t("W5", "Writes a dialogue and describes a process.", "7:W2")),
        strand("listening-speaking", "Listening, Speaking and Reading", "Internal",
               s("LS1", "Listens to a passage and answers questions.", "listen"),
               t("LS2", "Speaks on a topic and takes part in a discussion.", "8:LS4"),
               s("LS3", "Reads an unseen passage and answers questions.", "reading")),
    ],
}

TN_EXAM = {
    10: "SSLC (Class X) English: prose, poem, supplementary, vocabulary, grammar and writing, as set out by the Directorate of Government Examinations and summarised by exam-guide sites",
    11: "HSE first-year (Class XI) English: prose, poem, supplementary, vocabulary, grammar and writing, as set out in the question pattern and summarised by exam-guide sites",
    12: "HSE second-year (Class XII) English: prose, poem, supplementary, vocabulary, grammar and writing, as set out in the question pattern and summarised by exam-guide sites",
}


def tn_source(c):
    if c <= 9:
        return {**TN_BOOK, "accessed": "2026-11-21"}
    return {"read": TN_EXAM[c], "url": "https://dge.tn.gov.in/", "accessed": "2026-11-21", "official": False,
            "note": "UNOFFICIAL SOURCE. The official syllabus and question pattern could not be read from the build environment; this list comes from secondary summaries of the board's English paper and the class textbook. The textbook's own chapters are named by kind, not reproduced."}


ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"}
LICENCE = "Strand names as printed (facts). Every outcome is written by OpenPath in its own words; no curriculum or textbook text is reproduced."
REVIEW = "OpenPath curriculum inventory (AI-assisted research from secondary sources; not an educator review)"


def write(board, cls, strands, source, board_name, title):
    doc = {"id": f"{board}-english-class-{cls}", "version": "1.0.0", "board": board_name, "class": cls, "subject": "English",
           "title": title, "source": source, "licence": LICENCE, "review": REVIEW, "strands": strands}
    (ROOT / f"{'cbse' if board == 'cbse' else 'tn'}-class-{cls}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")


for c, st in CBSE.items():
    write("cbse", c, st, cbse_source(c), "CBSE (NCERT)", f"CBSE English, Class {ROMAN[c]}")
for c, st in TN.items():
    write("tn-samacheer", c, st, tn_source(c), "Tamil Nadu State Board (Samacheer Kalvi)", f"Tamil Nadu State Board English, Class {ROMAN[c]}")
print("written", len(CBSE) + len(TN))
