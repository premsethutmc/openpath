"""Tamil Nadu State Board (Samacheer Kalvi, TNSCERT) Tamil, Classes 1-10, as a first language (icse-tamil@4 → tn).

Built like the ICSE course: topics reused where the skill is the same, new generated topics for what the TN textbook adds
(its grammar chapters per class), OpenPath-written stories and public-domain classics for literature. No textbook text.
"""
import copy

MAYANGOLI = [
    ("கடலின் ____ யில் நின்றேன்.", "கரை", "கறை"), ("சட்டையில் ____ பட்டது.", "கறை", "கரை"), ("பூவின் ____ வீசியது.", "மணம்", "மனம்"),
    ("பாராட்டைக் கேட்டு அவன் ____ மகிழ்ந்தது.", "மனம்", "மணம்"), ("ஊருக்குச் செல்லும் ____ இது.", "வழி", "வலி"), ("காலில் ____ ஏற்பட்டது.", "வலி", "வழி"),
    ("மரத்திலிருந்து ஓர் ____ விழுந்தது.", "இலை", "இழை"), ("ஊசியில் ____ கோத்தாள்.", "இழை", "இலை"), ("____ செய்வோம்; தீமை தவிர்ப்போம்.", "அறம்", "அரம்"),
    ("இரும்பைத் தேய்க்க ____ பயன்படும்.", "அரம்", "அறம்"), ("மலை மேல் ____ நின்றான்.", "ஏறி", "ஏரி"), ("ஊரின் ____ நிறைந்தது.", "ஏரி", "ஏறி"),
]
CONNECT = [
    ("மழை பெய்தது; ____ பள்ளிக்கு விடுமுறை.", "ஆகையால்", "ஆனால்", "மேலும்"), ("அவன் நன்றாகப் படித்தான்; ____ தேர்வில் தோற்றான்.", "ஆனால்", "ஆகையால்", "எனவே"),
    ("அவள் நன்றாகப் பாடுவாள்; ____ நன்றாக ஆடவும் செய்வாள்.", "மேலும்", "ஆனால்", "எனவே"), ("உடல்நலம் இல்லை; ____ மருத்துவரைப் பார்த்தேன்.", "எனவே", "ஆனால்", "அல்லது"),
    ("தேநீர் ____ காபி குடிக்கலாம்.", "அல்லது", "ஆனால்", "எனவே"), ("நான் அழைத்தேன்; ____ அவன் வரவில்லை.", "ஆனால்", "எனவே", "ஆகையால்"),
]
REDUP = [("வருக வருக", "அடுக்குத்தொடர்"), ("பாம்பு பாம்பு", "அடுக்குத்தொடர்"), ("வாழ்க வாழ்க", "அடுக்குத்தொடர்"), ("ஓடு ஓடு", "அடுக்குத்தொடர்"),
         ("சலசல", "இரட்டைக்கிளவி"), ("கலகல", "இரட்டைக்கிளவி"), ("மளமள", "இரட்டைக்கிளவி"), ("பளபள", "இரட்டைக்கிளவி"), ("தகதக", "இரட்டைக்கிளவி")]
FIRST_DEP = [("அ", "முதலெழுத்து"), ("ஆ", "முதலெழுத்து"), ("இ", "முதலெழுத்து"), ("க்", "முதலெழுத்து"), ("ம்", "முதலெழுத்து"), ("ப்", "முதலெழுத்து"),
             ("க", "சார்பெழுத்து"), ("கா", "சார்பெழுத்து"), ("மி", "சார்பெழுத்து"), ("ஃ", "சார்பெழுத்து"), ("பு", "சார்பெழுத்து"), ("தே", "சார்பெழுத்து")]
NOT_INITIAL, INITIAL = ["ட", "ண", "ழ", "ள", "ற", "ன"], ["க", "ச", "த", "ந", "ப", "ம"]
NOT_FINAL, FINAL = ["க்", "ச்", "ட்", "த்", "ப்", "ற்"], ["ம்", "ன்", "ல்", "ள்", "ய்", "ர்"]
INAM = [("க", "ங"), ("ச", "ஞ"), ("ட", "ண"), ("த", "ந"), ("ப", "ம"), ("ற", "ன")]
SUTTU = [("அவன்", "அ", "சுட்டெழுத்து"), ("இவள்", "இ", "சுட்டெழுத்து"), ("அந்த", "அ", "சுட்டெழுத்து"), ("இங்கே", "இ", "சுட்டெழுத்து"), ("அது", "அ", "சுட்டெழுத்து"),
         ("எது", "எ", "வினா எழுத்து"), ("எங்கே", "எ", "வினா எழுத்து"), ("யார்", "யா", "வினா எழுத்து"), ("எவன்", "எ", "வினா எழுத்து"), ("யாது", "யா", "வினா எழுத்து")]
FOUR = [("மரம் வளர்ந்தது.", "மரம்", "பெயர்ச்சொல்"), ("கண்ணன் ஓடினான்.", "ஓடினான்", "வினைச்சொல்"), ("அவனும் வந்தான்.", "உம்", "இடைச்சொல்"),
        ("ஐயோ! விழுந்தான்.", "ஐயோ", "இடைச்சொல்"), ("சாலச் சிறந்தது.", "சால", "உரிச்சொல்"), ("மாநகரம் பெரியது.", "மா", "உரிச்சொல்"),
        ("தவச் சிறியது.", "தவ", "உரிச்சொல்"), ("நனி நன்று.", "நனி", "உரிச்சொல்"), ("மீனா பாடினாள்.", "மீனா", "பெயர்ச்சொல்"), ("தம்பி சிரித்தான்.", "சிரித்தான்", "வினைச்சொல்")]
MOODURAI = "நன்றி ஒருவற்குச் செய்தக்கால் அந்நன்றி\nஎன்று தருங்கொல் எனவேண்டா — நின்று\nதளரா வளர்தெங்கு தாளுண்ட நீரைத்\nதலையாலே தான்தருத லால்.\n\n— ஔவையார், மூதுரை"
MOODURAI_QS = [("இப்பாடலை இயற்றியவர் யார்?", "ஔவையார்", "திருவள்ளுவர்", "பாரதியார்"), ("«தெங்கு» என்பதன் பொருள் எது?", "தென்னை", "மாமரம்", "வாழை"),
               ("தென்னை, வேரால் உண்ட நீரை எப்படித் தருகிறது?", "தலையால் இளநீராக", "வேரால் திருப்பி", "இலையால் நிழலாக"),
               ("இப்பாடல் சொல்லும் கருத்து எது?", "நல்லவருக்குச் செய்த உதவி உரிய காலத்தில் தானே பயன் தரும்", "உதவி செய்யக் கூடாது", "நன்றி எதிர்பார்த்தே உதவ வேண்டும்")]
KUTRIYAL = [("காசு", "நெடில்தொடர்"), ("நாடு", "நெடில்தொடர்"), ("எஃகு", "ஆய்தத்தொடர்"), ("அஃது", "ஆய்தத்தொடர்"), ("வரகு", "உயிர்த்தொடர்"), ("அரசு", "உயிர்த்தொடர்"),
            ("பாக்கு", "வன்தொடர்"), ("பட்டு", "வன்தொடர்"), ("பந்து", "மென்தொடர்"), ("சங்கு", "மென்தொடர்"), ("மார்பு", "இடைத்தொடர்"), ("சார்பு", "இடைத்தொடர்")]
ONE_LETTER = ["பூ", "கை", "தீ", "ஈ", "மா", "தை"]
NOT_ONE = ["மரம்", "கடல்", "வீடு", "மலர்", "நிலா", "பழம்"]
PAGU = [("மரம்", "பகாப்பதம்"), ("கல்", "பகாப்பதம்"), ("நீ", "பகாப்பதம்"), ("மண்", "பகாப்பதம்"), ("பொன்", "பகாப்பதம்"),
        ("படித்தான்", "பகுபதம்"), ("வந்தாள்", "பகுபதம்"), ("ஓடினர்", "பகுபதம்"), ("பொன்னன்", "பகுபதம்"), ("வேலன்", "பகுபதம்")]
AAGU = [("ஊர் சிரித்தது.", "ஊர்", "இடவாகுபெயர்"), ("இந்தியா வென்றது.", "இந்தியா", "இடவாகுபெயர்"), ("தமிழ்நாடு மகிழ்ந்தது.", "தமிழ்நாடு", "இடவாகுபெயர்"),
        ("வெள்ளை அடித்தான்.", "வெள்ளை", "பண்பாகுபெயர்"), ("இனிப்பு தின்றான்.", "இனிப்பு", "பண்பாகுபெயர்"), ("கார் அறுத்தான்.", "கார்", "காலவாகுபெயர்")]
THOGAI = [("ஊறுகாய்", "வினைத்தொகை"), ("சுடுசோறு", "வினைத்தொகை"), ("வீசுதென்றல்", "வினைத்தொகை"), ("செந்தாமரை", "பண்புத்தொகை"), ("வெண்ணிலவு", "பண்புத்தொகை"),
          ("நெடுமரம்", "பண்புத்தொகை"), ("மலர்க்கை", "உவமைத்தொகை"), ("கயல்விழி", "உவமைத்தொகை"), ("மதிமுகம்", "உவமைத்தொகை"), ("இரவுபகல்", "உம்மைத்தொகை"),
          ("தாய்தந்தை", "உம்மைத்தொகை"), ("வெற்றிலைபாக்கு", "உம்மைத்தொகை"), ("தமிழ்கற்றான்", "வேற்றுமைத்தொகை"), ("மரக்கிளை", "வேற்றுமைத்தொகை"), ("பொற்றொடி", "அன்மொழித்தொகை")]
VALLINAM = [("அந்தப் பையன்", "அந்த பையன்", "அந்த, இந்த, எந்த — பின் வல்லினம் மிகும்."), ("இந்தச் செடி", "இந்த செடி", "அந்த, இந்த, எந்த — பின் வல்லினம் மிகும்."),
            ("எந்தக் கடை", "எந்த கடை", "அந்த, இந்த, எந்த — பின் வல்லினம் மிகும்."), ("பாடத்தைப் படித்தான்", "பாடத்தை படித்தான்", "இரண்டாம் வேற்றுமை (ஐ) விரியில் மிகும்."),
            ("மரத்தைச் சுற்றினான்", "மரத்தை சுற்றினான்", "இரண்டாம் வேற்றுமை (ஐ) விரியில் மிகும்."), ("அவனுக்குக் கொடு", "அவனுக்கு கொடு", "நான்காம் வேற்றுமை (கு) விரியில் மிகும்."),
            ("அது பெரியது", "அதுப் பெரியது", "அது, இது — பின் மிகாது."), ("தம்பி படித்தான்", "தம்பிப் படித்தான்", "எழுவாயின் பின் மிகாது."),
            ("சுடுசோறு", "சுடுச்சோறு", "வினைத்தொகையில் மிகாது."), ("கண்ணா கேள்", "கண்ணாக் கேள்", "விளியின் பின் மிகாது.")]
ASAI = [("கல்", "நேர்"), ("வா", "நேர்"), ("பூ", "நேர்"), ("வாள்", "நேர்"), ("தேன்", "நேர்"), ("மண்", "நேர்"),
        ("கடல்", "நிரை"), ("மலர்", "நிரை"), ("படம்", "நிரை"), ("நிலா", "நிரை"), ("புலி", "நிரை"), ("கனா", "நிரை")]
TINAI = [("குறிஞ்சி", "மலையும் மலை சார்ந்த இடமும்"), ("முல்லை", "காடும் காடு சார்ந்த இடமும்"), ("மருதம்", "வயலும் வயல் சார்ந்த இடமும்"),
         ("நெய்தல்", "கடலும் கடல் சார்ந்த இடமும்"), ("பாலை", "மணலும் மணல் சார்ந்த இடமும்")]
PAA = [("திருக்குறள் எந்தப் பாவால் ஆனது?", "குறள் வெண்பா", ["ஆசிரியப்பா", "கலிப்பா"]), ("வெண்பாவின் ஓசை எது?", "செப்பலோசை", ["அகவலோசை", "துள்ளலோசை"]),
       ("ஆசிரியப்பாவின் ஓசை எது?", "அகவலோசை", ["செப்பலோசை", "தூங்கலோசை"]), ("கலிப்பாவின் ஓசை எது?", "துள்ளலோசை", ["அகவலோசை", "செப்பலோசை"]),
       ("வஞ்சிப்பாவின் ஓசை எது?", "தூங்கலோசை", ["துள்ளலோசை", "செப்பலோசை"]), ("குறள் வெண்பா எத்தனை அடிகள் கொண்டது?", "இரண்டு", ["நான்கு", "மூன்று"])]

# TN class -> ICSE topics reused (same skill), by "cN.name"
REUSE = {
    1: ["c1.vowels", "c1.consonants", "c1.length", "c1.pictures", "c1.first-letter", "c1.listen", "c1.aathichoodi", "c1.reading"],
    2: ["c2.uyirmei", "c2.aytham", "c2.numbers", "c2.colours", "c2.days", "c2.plural", "c2.listen", "c2.aathichoodi", "c2.reading"],
    3: ["c3.antonyms", "c3.synonyms", "c3.gender", "c3.months", "c3.missing", "c3.plural", "c3.listen", "c3.aathichoodi-meaning", "c3.reading"],
    4: ["c4.noun-verb", "c4.tense", "c4.question-words", "c4.antonyms", "c4.synonyms", "c4.listen", "c4.kondrai", "c4.reading", "c5.sounds"],
    5: ["c4.noun-verb", "c10.sentence-parts", "c5.idam", "c7.pairs", "c6.idioms", "c5.bharathi", "c5.reading", "c6.kural"],
    6: ["c8.letter-kinds", "c7.noun-kinds", "c10.simile", "c6.kural", "c6.story", "c6.reading"],
    7: ["c7.noun-kinds", "c10.figures", "c7.kural", "c7.story", "c7.reading", "c6.proverbs"],
    8: ["c7.verb-forms", "c6.case-marker", "c6.case", "c9.sandhi", "c10.simile", "c8.story", "c8.reading", "c10.kural"],
    9: ["c9.sandhi", "c9.edhugai", "c10.figures", "c9.story", "c9.reading", "c8.poem"],
    10: ["c10.sentence-parts", "c10.figures", "c9.voice", "c10.kural", "c10.story", "c10.reading"],
}


def build_tn(icse, Topic, nfc, first_letter):
    by_suffix = {t["id"].removeprefix("icse.ta."): t for t in icse}
    topics = []

    def reuse(cls, suffix):
        t = copy.deepcopy(by_suffix[suffix])
        name = suffix.split(".", 1)[1]
        t["id"], t["class"] = f"tn.ta.c{cls}.{name}", cls
        for i, q in enumerate(t["questions"], 1):
            q["id"] = f"{t['id']}.{i}"
        topics.append(t)

    def T(cls, tid, *a):
        t = Topic(cls, tid, *a)
        t.id = t.data["id"] = f"tn.ta.c{cls}.{tid}"
        topics.append(t)
        return t

    for cls, names in REUSE.items():
        for s in names:
            reuse(cls, s)

    def mayangoli(cls, rows):
        t = T(cls, "mayangoli", "மயங்கொலிச் சொற்கள்", "Look-alike sounds", "ல ள ழ, ர ற, ண ந ன — ஒலி ஒன்றுபோலத் தோன்றினாலும் பொருள் வேறு. கரை (கடற்கரை) — கறை (மாசு).", "Similar-sounding letters change the meaning.", "மணம் (வாசனை) — மனம் (உள்ளம்)")
        for s, a, w in rows:
            t.q(s, a, [w], "Choose the word that fits.", s.replace("____", a), n=2)
    mayangoli(5, MAYANGOLI[:6])
    mayangoli(6, MAYANGOLI[6:])
    t = T(5, "connect", "இணைப்புச்சொற்கள்", "Joining words", "இரண்டு கருத்துகளை இணைக்கும் சொற்கள்: ஆகையால், எனவே (காரணம்); ஆனால் (மாறுபாடு); மேலும் (கூடுதல்); அல்லது (தேர்வு).", "Words that join two ideas.", "மழை பெய்தது; ஆகையால் விடுமுறை.")
    for s, a, *w in CONNECT:
        t.q(s, a, w, "Choose the joining word.", s.replace("____", a))
    t = T(5, "redup", "அடுக்குத்தொடர், இரட்டைக்கிளவி", "Repeated words", "அடுக்குத்தொடர்: பொருளுள்ள சொல் விரைவு, உணர்ச்சிக்காக அடுக்கி வருவது (வருக வருக). இரட்டைக்கிளவி: பிரித்தால் பொருள் தராத இணை (சலசல).", "Repetition with meaning vs sound-pairs without meaning alone.", "பாம்பு பாம்பு — அடுக்குத்தொடர்; கலகல — இரட்டைக்கிளவி")
    for w, k in REDUP:
        t.q(f"«{w}» — எது?", k, ["அடுக்குத்தொடர்", "இரட்டைக்கிளவி"], "Which kind?", n=2)
    t = T(6, "mudhal-saarbu", "முதலெழுத்தும் சார்பெழுத்தும்", "Primary and dependent letters", "உயிர் 12, மெய் 18 — முதலெழுத்துகள். உயிர்மெய், ஆய்தம் போன்றவை முதலெழுத்தைச் சார்ந்து வருவதால் சார்பெழுத்துகள்.", "Vowels and consonants are primary; combined letters and ஃ depend on them.", "அ, க் — முதல்; கா, ஃ — சார்பு")
    for l, k in FIRST_DEP:
        t.q(f"«{l}» — முதலெழுத்தா, சார்பெழுத்தா?", k, ["முதலெழுத்து", "சார்பெழுத்து"], "Primary or dependent?", n=2)
    t = T(6, "word-edges", "மொழிமுதல், இறுதி எழுத்துகள்", "Letters that begin and end words", "ட, ண, ழ, ள, ற, ன — தமிழ்ச்சொல்லின் முதலில் வாரா. க், ச், ட், த், ப், ற் — சொல்லின் இறுதியில் வாரா.", "Some letters never begin a Tamil word; some consonants never end one.", "நாடு ✓ — டாநு ✗")
    for i, l in enumerate(NOT_INITIAL):
        t.q("தமிழ்ச்சொல்லின் முதலில் வராத எழுத்து எது?", l, [INITIAL[i], INITIAL[(i + 2) % 6]], "Which letter never begins a Tamil word?")
    for i, l in enumerate(NOT_FINAL):
        t.q("தமிழ்ச்சொல்லின் இறுதியில் வராத மெய் எது?", l, [FINAL[i], FINAL[(i + 3) % 6]], "Which consonant never ends a Tamil word?")
    t = T(6, "inam-pairs", "இன எழுத்துகள்", "Letter pairs (inam)", "வல்லினத்துக்கு இனமான மெல்லினம்: க-ங, ச-ஞ, ட-ண, த-ந, ப-ம, ற-ன. சொல்லில் இவை சேர்ந்தே வரும்: தங்கம், மஞ்சள், பந்து.", "Each hard consonant has a nasal partner that goes with it.", "க — ங (தங்கம்)")
    soft = [b for _, b in INAM]
    hard = [a for a, _ in INAM]
    for i, (a, b) in enumerate(INAM):
        t.q(f"«{a}» வின் இன எழுத்து எது?", b, [soft[(i + 1) % 6], soft[(i + 3) % 6]], "Which is its partner?")
        t.q(f"«{b}» வின் இன எழுத்து எது?", a, [hard[(i + 2) % 6], hard[(i + 4) % 6]], "Which is its partner?")
    t = T(6, "suttu-vina", "சுட்டெழுத்து, வினா எழுத்து", "Pointing and question letters", "அ, இ — சுட்டெழுத்துகள் (அவன், இது). எ, யா, ஆ, ஓ, ஏ — வினா எழுத்துகள் (எது, யார்).", "அ/இ point; எ/யா ask.", "அந்த — சுட்டு; எந்த — வினா")
    for w, l, k in SUTTU:
        t.q(f"«{w}» — முதலில் உள்ள «{l}» எவ்வகை?", k, ["சுட்டெழுத்து", "வினா எழுத்து"], "Pointing or question letter?", n=2)
    t = T(6, "four-kinds", "நால்வகைச் சொற்கள்", "The four kinds of words", "பெயர்ச்சொல், வினைச்சொல், இடைச்சொல் (உம், ஐயோ — தனித்து வராதவை), உரிச்சொல் (சால, மா, தவ, நனி — மிகுதியைக் குறிப்பவை).", "Nouns, verbs, particles and intensifying words.", "சாலச் சிறந்தது — «சால» உரிச்சொல்")
    for s, w, k in FOUR:
        t.q(f"«{s}» — «{w}» எவ்வகைச் சொல்?", k, ["பெயர்ச்சொல்", "வினைச்சொல்", "இடைச்சொல்", "உரிச்சொல்"], "Which kind of word?", n=4)
    t = T(6, "moodurai", "மூதுரை", "Moodurai (Avvaiyar)", "ஔவையார் இயற்றிய மூதுரை — நன்றி, நட்பு பற்றிய வெண்பாக்கள்.", "A verse by Avvaiyar on doing good.", "தென்னை தான் உண்ட நீரைத் தலையால் தரும்")
    t.data["passage"] = nfc(MOODURAI)
    for q, a, *w in MOODURAI_QS:
        t.q(q, a, w, "Answer from the verse.")
    t = T(7, "kutriyal", "குற்றியலுகரம்", "Shortened u (kutriyalugaram)", "சொல்லின் இறுதியில் வல்லின மெய்யுடன் (கு, சு, டு, து, பு, று) வரும் உகரம் குறைந்து ஒலிப்பது குற்றியலுகரம். அதன் முன் உள்ள எழுத்தைக் கொண்டு ஆறு வகை.", "Six kinds, named by the letter before it.", "காசு — நெடில்தொடர்; பந்து — மென்தொடர்")
    kinds = sorted({k for _, k in KUTRIYAL})
    for w, k in KUTRIYAL:
        t.q(f"«{w}» — எவ்வகைக் குற்றியலுகரம்?", k, kinds, "Which kind?")
    t = T(7, "one-letter", "ஓரெழுத்து ஒருமொழி, பகுபதம்", "One-letter words; splittable words", "ஒரே எழுத்து ஒரு சொல்லாகப் பொருள் தருவது ஓரெழுத்து ஒருமொழி (பூ, கை). பிரிக்கக் கூடியது பகுபதம் (படித்தான்); பிரிக்க முடியாதது பகாப்பதம் (மரம்).", "One-letter words; words that can or cannot be split into parts.", "பூ — ஓரெழுத்து ஒருமொழி")
    for i, w in enumerate(ONE_LETTER):
        t.q("ஓரெழுத்து ஒருமொழி எது?", w, [NOT_ONE[i], NOT_ONE[(i + 2) % 6]], "Which is a one-letter word?")
    for w, k in PAGU:
        t.q(f"«{w}» — பகுபதமா, பகாப்பதமா?", k, ["பகுபதம்", "பகாப்பதம்"], "Splittable or not?", n=2)
    t = T(7, "aagupeyar", "ஆகுபெயர்", "A name standing for another", "ஒன்றன் பெயர் அதனோடு தொடர்புடைய வேறொன்றுக்கு ஆகி வருவது ஆகுபெயர். «ஊர் சிரித்தது» — ஊர் மக்களைக் குறிக்கிறது (இடவாகுபெயர்).", "A place, quality or time name used for something linked to it.", "வெள்ளை அடித்தான் — பண்பாகுபெயர்")
    for s, w, k in AAGU:
        t.q(f"«{s}» — «{w}» எந்த ஆகுபெயர்?", k, ["இடவாகுபெயர்", "பண்பாகுபெயர்", "காலவாகுபெயர்"], "Which kind?")
    t = T(8, "thogai", "தொகைநிலைத் தொடர்", "Compound phrases (thogai)", "சொற்களுக்கு இடையே உருபு மறைந்து வருவது தொகைநிலை: வினைத்தொகை (ஊறுகாய்), பண்புத்தொகை (செந்தாமரை), உவமைத்தொகை (மலர்க்கை), உம்மைத்தொகை (இரவுபகல்), வேற்றுமைத்தொகை (தமிழ்கற்றான்), அன்மொழித்தொகை (பொற்றொடி).", "Six kinds of compound where a linking part is hidden.", "கயல்விழி — உவமைத்தொகை")
    tk = ["வினைத்தொகை", "பண்புத்தொகை", "உவமைத்தொகை", "உம்மைத்தொகை", "வேற்றுமைத்தொகை", "அன்மொழித்தொகை"]
    for w, k in THOGAI:
        t.q(f"«{w}» — எத்தொகை?", k, tk, "Which kind of compound?")
    t = T(8, "vallinam", "வல்லினம் மிகும், மிகா இடங்கள்", "When a hard consonant doubles", "அந்த, இந்த, எந்த, இரண்டாம் (ஐ), நான்காம் (கு) வேற்றுமைகளின் பின் வல்லினம் மிகும். அது, இது, எழுவாய், விளி, வினைத்தொகை ஆகியவற்றின் பின் மிகாது.", "Rules for adding க், ச், த், ப் between words.", "அந்தப் பையன் ✓; அது பெரியது ✓")
    for right, wrong, why in VALLINAM:
        t.q("சரியான தொடர் எது?", right, [wrong], "Which is written correctly?", why, n=2)
    t = T(8, "asai", "யாப்பு: அசை", "Prosody: syllable units (asai)", "குறில் அல்லது நெடில் தனித்தோ ஒற்றுடனோ வந்தால் நேரசை (கல், வா). இரண்டு குறில்கள் அல்லது குறில்-நெடில் சேர்ந்து, ஒற்றுடனோ இன்றியோ வந்தால் நிரையசை (கடல், நிலா).", "Ner and nirai, the units of Tamil verse.", "மலர் — நிரை; தேன் — நேர்")
    for w, k in ASAI:
        t.q(f"«{w}» — நேரசையா, நிரையசையா?", k, ["நேர்", "நிரை"], "Ner or nirai?", n=2)
    for cls in (9,):
        t = T(cls, "vallinam", "வல்லினம் மிகும், மிகா இடங்கள் (மீள்பார்வை)", "Doubling rules (revision)", "வல்லினம் மிகும், மிகா இடங்களை மீண்டும் பார்.", "Revise the doubling rules.", "எந்தக் கடை ✓")
        for right, wrong, why in VALLINAM:
            t.q("சரியான தொடர் எது?", right, [wrong], "Which is written correctly?", why, n=2)
        t = T(cls, "four-kinds", "இடைச்சொல், உரிச்சொல்", "Particles and intensifiers", "இடைச்சொல் தனித்து வராது (உம், ஐயோ); உரிச்சொல் மிகுதி காட்டும் (சால, மா, தவ, நனி).", "Particles and intensifying words.", "நனி நன்று — «நனி» உரிச்சொல்")
        for s, w, k in FOUR:
            t.q(f"«{s}» — «{w}» எவ்வகைச் சொல்?", k, ["பெயர்ச்சொல்", "வினைச்சொல்", "இடைச்சொல்", "உரிச்சொல்"], "Which kind of word?", n=4)
        t = T(cls, "aagupeyar", "ஆகுபெயர் (மீள்பார்வை)", "Aagupeyar (revision)", "ஒன்றன் பெயர் தொடர்புடைய வேறொன்றுக்கு ஆகி வருவது.", "A name standing for something linked.", "ஊர் சிரித்தது — இடவாகுபெயர்")
        for s, w, k in AAGU:
            t.q(f"«{s}» — «{w}» எந்த ஆகுபெயர்?", k, ["இடவாகுபெயர்", "பண்பாகுபெயர்", "காலவாகுபெயர்"], "Which kind?")
        t = T(cls, "asai", "யாப்பு: அசை (மீள்பார்வை)", "Asai (revision)", "நேரசை, நிரையசை.", "Ner and nirai.", "கனா — நிரை")
        for w, k in ASAI:
            t.q(f"«{w}» — நேரசையா, நிரையசையா?", k, ["நேர்", "நிரை"], "Ner or nirai?", n=2)
    t = T(10, "thogai", "தொகைநிலைத் தொடர் (மீள்பார்வை)", "Compounds (revision)", "ஆறு தொகைகள்: வினை, பண்பு, உவமை, உம்மை, வேற்றுமை, அன்மொழி.", "The six compounds.", "இரவுபகல் — உம்மைத்தொகை")
    for w, k in THOGAI:
        t.q(f"«{w}» — எத்தொகை?", k, tk, "Which kind of compound?")
    t = T(10, "tinai", "அகப்பொருள்: ஐந்திணை", "The five landscapes", "சங்க இலக்கியத்தின் ஐந்து நிலங்கள்: குறிஞ்சி (மலை), முல்லை (காடு), மருதம் (வயல்), நெய்தல் (கடல்), பாலை (மணல்).", "Sangam poetry's five landscapes.", "நெய்தல் — கடல்")
    lands = [b for _, b in TINAI]
    names = [a for a, _ in TINAI]
    for i, (a, b) in enumerate(TINAI):
        t.q(f"«{a}» — எந்த நிலம்?", b, [lands[(i + 1) % 5], lands[(i + 3) % 5]], "Which land?")
        t.q(f"«{b}» — எத்திணை?", a, [names[(i + 2) % 5], names[(i + 4) % 5]], "Which tinai?")
    t = T(10, "paa", "பாவகை", "Kinds of verse", "வெண்பா (செப்பலோசை), ஆசிரியப்பா (அகவலோசை), கலிப்பா (துள்ளலோசை), வஞ்சிப்பா (தூங்கலோசை). திருக்குறள் — குறள் வெண்பா (இரண்டு அடிகள்).", "The four verse forms and their rhythms.", "வெண்பா — செப்பலோசை")
    for q, a, w in PAA:
        t.q(q, a, w, "Choose the answer.")
    return [x if isinstance(x, dict) else x.data for x in topics]


G = "guided:Done aloud with a grown-up, who listens. The app does not hear or mark speaking."
BOOK = "partly:The TNSCERT textbook is not reproduced. OpenPath's own stories, public-domain classics and questions practise the same skills."
EARLY = "Samacheer Kalvi Tamil (TNSCERT), Classes 1-4: outcomes written by OpenPath on the textbook's letter, word and sentence progression; the class chapter lists were not read."
TN_ROWS = {
    1: [("r", "R1", "Reads and writes the vowels and consonants.", ["vowels", "consonants"]), ("r", "R2", "Tells short and long vowels.", ["length"]),
        ("r", "R3", "Reads picture words.", ["pictures", "first-letter"]), ("ls", "LS1", "Listens and picks the word heard.", ["listen"]),
        ("ls", "LS2", "Recites rhymes and Aathichoodi.", ["aathichoodi", G]), ("r", "R4", "Reads a short passage.", ["reading"]), ("w", "W1", "Writes simple words.", ["writing"])],
    2: [("r", "R1", "Reads and forms uyirmei letters.", ["uyirmei"]), ("r", "R2", "Knows ஆய்தம்.", ["aytham"]), ("v", "V1", "Numbers, colours, days.", ["numbers", "colours", "days"]),
        ("g", "G1", "One and many.", ["plural"]), ("ls", "LS1", "Listens and picks the word heard.", ["listen"]), ("l", "L1", "Aathichoodi.", ["aathichoodi"]),
        ("r", "R3", "Reads a short passage.", ["reading"]), ("w", "W1", "Writes two or three sentences.", ["writing"])],
    3: [("v", "V1", "Opposites and same-meaning words.", ["antonyms", "synonyms"]), ("g", "G1", "Masculine and feminine; one and many.", ["gender", "plural"]),
        ("v", "V2", "Tamil months.", ["months"]), ("w", "W1", "Spells words correctly.", ["missing"]), ("ls", "LS1", "Listens and picks the word heard.", ["listen"]),
        ("l", "L1", "Explains Aathichoodi lines.", ["aathichoodi-meaning"]), ("r", "R1", "Reads a story and its lesson.", ["reading"]), ("w", "W2", "Writes about a person.", ["writing"])],
    4: [("g", "G1", "Naming and doing words.", ["noun-verb"]), ("g", "G2", "Tense.", ["tense"]), ("g", "G3", "Question words.", ["question-words"]),
        ("v", "V1", "Opposites, same-meaning words, animal sounds.", ["antonyms", "synonyms", "sounds"]), ("ls", "LS1", "Listens and picks the word heard.", ["listen"]),
        ("l", "L1", "Kondrai Vendhan.", ["kondrai"]), ("r", "R1", "Reads an information passage.", ["reading"]), ("w", "W1", "Writes a paragraph.", ["writing"])],
    5: [("g", "G1", "பெயர்ச்சொல், வினைச்சொல் (2.4).", ["noun-verb"]), ("g", "G2", "சொற்றொடர் அமைப்பு முறை (3.4).", ["sentence-parts"]),
        ("g", "G3", "மூவிடப்பெயர்கள் (4.4).", ["idam"]), ("g", "G4", "இணைப்புச்சொற்கள் (5.4).", ["connect"]), ("g", "G5", "அடுக்குத் தொடர், இரட்டைக்கிளவி (6.4).", ["redup"]),
        ("v", "V1", "இணைச்சொற்கள் (7.4).", ["pairs"]), ("v", "V2", "மயங்கொலிச்சொற்கள் (8.4).", ["mayangoli"]), ("v", "V3", "மரபுத்தொடர்கள் (9.4).", ["idioms"]),
        ("l", "L1", "திருக்குறள் and poems.", ["kural", "bharathi"]), ("r", "R1", "Reads a passage and answers.", ["reading"]), ("w", "W1", "Writes a paragraph and a letter.", ["writing"]),
        ("l", "L2", "The textbook's lessons.", ["reading", BOOK]), ("ls", "LS1", "Speaks about a lesson.", [G])],
    6: [("g", "G1", "தமிழ் எழுத்துகளின் வகை தொகை (1.5).", ["letter-kinds"]), ("g", "G2", "முதலெழுத்தும் சார்பெழுத்தும் (2.5).", ["mudhal-saarbu"]),
        ("g", "G3", "மொழிமுதல், இறுதி எழுத்துகள் (3.5).", ["word-edges"]), ("g", "G4", "இன எழுத்துகள் (4.5).", ["inam-pairs"]), ("g", "G5", "மயங்கொலிகள் (5.5).", ["mayangoli"]),
        ("g", "G6", "சுட்டெழுத்துகள், வினா எழுத்துகள் (6.5).", ["suttu-vina"]), ("g", "G7", "நால்வகைச் சொற்கள் (7.4).", ["four-kinds"]), ("g", "G8", "பெயர்ச்சொல் (8.5).", ["noun-kinds"]),
        ("g", "G9", "அணி இலக்கணம் (9.4).", ["simile"]), ("l", "L1", "திருக்குறள், மூதுரை.", ["kural", "moodurai"]), ("l", "L2", "The textbook's prose and poems.", ["story", BOOK]),
        ("r", "R1", "Reads a passage and answers.", ["reading", "story"]), ("w", "W1", "Writes an essay and a letter.", ["writing"]), ("ls", "LS1", "Speaks about a lesson.", [G])],
    7: [("g", "G1", "குற்றியலுகரம் (1.5).", ["kutriyal"]), ("g", "G2", "ஓரெழுத்து ஒருமொழி, பகுபதம், பகாப்பதம் (5.5).", ["one-letter"]), ("g", "G3", "தொழிற்பெயர் (6.5).", ["noun-kinds"]),
        ("g", "G4", "அணி இலக்கணம் (7.5, 8.5).", ["figures"]), ("g", "G5", "ஆகுபெயர் (9.5).", ["aagupeyar"]), ("v", "V1", "சொலவடைகள் (1.4).", ["proverbs"]),
        ("g", "G6", "குற்றியலிகரம், குறுக்கங்கள், வழக்கு, இலக்கியவகைச் சொற்கள் (1.5, 2.5, 3.5, 4.5).", ["kutriyal", "partly:Kutriyalugaram is practised; the other short-sound forms, usage kinds and literary word kinds are not yet."]),
        ("l", "L1", "திருக்குறள்.", ["kural"]), ("l", "L2", "The textbook's prose and poems.", ["story", BOOK]), ("r", "R1", "Reads a passage and answers.", ["reading", "story"]),
        ("w", "W1", "Writes an essay and a leave letter.", ["writing"]), ("ls", "LS1", "Speaks about a lesson.", [G])],
    8: [("g", "G1", "வினைமுற்று (2.5), எச்சம் (3.5).", ["verb-forms"]), ("g", "G2", "வேற்றுமை (4.5).", ["case", "case-marker"]), ("g", "G3", "தொகைநிலை, தொகாநிலைத் தொடர்கள் (5.5).", ["thogai", "partly:Thogainilai is practised; the nine thogaanilai kinds are not yet."]),
        ("g", "G4", "புணர்ச்சி (6.5).", ["sandhi"]), ("g", "G5", "வல்லினம் மிகும் இடங்களும் மிகா இடங்களும் (7.5).", ["vallinam"]), ("g", "G6", "யாப்பு இலக்கணம் (8.5).", ["asai"]),
        ("g", "G7", "அணி இலக்கணம் (9.5).", ["simile"]), ("g", "G8", "எழுத்துகளின் பிறப்பு (1.5).", ["partly:Letter kinds are practised in Class 6; where each letter is formed in the mouth is not yet."]),
        ("l", "L1", "திருக்குறள்.", ["kural"]), ("l", "L2", "The textbook's prose and poems.", ["story", BOOK]), ("r", "R1", "Reads a passage and answers.", ["reading", "story"]),
        ("w", "W1", "Writes an essay and a complaint letter.", ["writing"]), ("ls", "LS1", "Speaks about a lesson.", [G])],
    9: [("g", "G1", "வல்லினம் மிகும், மிகா இடங்கள் (3.4, 4.5).", ["vallinam"]), ("g", "G2", "இடைச்சொல், உரிச்சொல் (5.5).", ["four-kinds"]), ("g", "G3", "புணர்ச்சி (6.5).", ["sandhi"]),
        ("g", "G4", "ஆகுபெயர் (7.6).", ["aagupeyar"]), ("g", "G5", "யாப்பிலக்கணம் (8.6).", ["asai", "edhugai"]), ("g", "G6", "அணியிலக்கணம் (9.5).", ["figures"]),
        ("g", "G7", "தொடர் இலக்கணம், துணைவினைகள் (1.5, 2.6).", ["partly:Not yet practised here; sentence parts are covered in Class 10."]),
        ("l", "L1", "The textbook's prose and poems (Sangam and later).", ["story", "poem", BOOK]), ("r", "R1", "Reads an unseen passage and answers.", ["reading", "story"]),
        ("w", "W1", "Writes a composition and a formal letter.", ["writing"]), ("ls", "LS1", "Speaks about a lesson.", [G])],
    10: [("g", "G1", "தொகைநிலைத் தொடர்கள் (2.5).", ["thogai"]), ("g", "G2", "தொகாநிலைத் தொடர்கள் (3.5).", ["partly:Not yet practised; compounds (thogai) are."]),
         ("g", "G3", "இலக்கணம் பொது, சொற்றொடர் (4.5).", ["sentence-parts", "voice"]), ("g", "G4", "அகப்பொருள், புறப்பொருள் இலக்கணம் (6.6, 7.6).", ["tinai", "partly:The five landscapes are practised; purapporul is not yet."]),
         ("g", "G5", "பாவகை, அலகிடுதல் (8.5).", ["paa"]), ("g", "G6", "அணி (9.5).", ["figures"]), ("l", "L1", "திருக்குறள்.", ["kural"]),
         ("l", "L2", "The textbook's prose and poems.", ["story", BOOK]), ("r", "R1", "Reads an unseen passage of exam length and answers.", ["reading", "story"]),
         ("w", "W1", "Writes a composition and a letter.", ["writing"]), ("ls", "LS1", "Speaks about a lesson.", [G])],
}
STRANDS = {"ls": "Listening and speaking", "r": "Reading", "w": "Writing", "v": "Vocabulary", "g": "Grammar (இலக்கணம்)", "l": "Literature"}


def tn_syllabus(topics, tasks):
    out = {}
    for cls, rows in TN_ROWS.items():
        have = {t["id"].split(".")[-1] for t in topics if t["class"] == cls}
        if any(t["class"] == cls for t in tasks):
            have.add("writing")
        strands = {}
        for st, oid, text, where in rows:
            refs = [w for w in where if ":" not in w]
            notes = [w.split(":", 1) for w in where if ":" in w]
            missing = [r for r in refs if r not in have]
            if missing:
                raise SystemExit(f"TN class {cls} {oid}: no topic {missing}")
            kind = notes[0][0] if notes else "covered"
            o = {"id": oid, "text": text, "coverage": kind, "where": [f"tn.ta.c{cls}.{r}" if r != "writing" else f"writing:c{cls}" for r in refs]}
            if notes:
                o["note"] = notes[0][1]
            strands.setdefault(st, []).append(o)
        note = EARLY if cls <= 4 else ("Grammar outcomes follow the chapter titles of the Samacheer Kalvi Tamil textbook (TNSCERT) as listed by public study-guide sites; chapter numbers in brackets. "
                                       "Outcomes are written by OpenPath; no textbook text is reproduced.")
        out[cls] = {"id": f"tn-samacheer-tamil-class-{cls}", "board": "Tamil Nadu State Board (Samacheer Kalvi)", "class": cls, "subject": "Tamil (first language)",
                    "source": {"read": "Samacheer Kalvi Tamil textbook chapter lists (TNSCERT)", "url": "https://www.tnschools.gov.in/", "note": note},
                    "licence": "Outcomes written by OpenPath in its own words; no textbook text is reproduced.",
                    "strands": [{"id": k, "name": STRANDS[k], "outcomes": v} for k, v in strands.items()]}
    return out
