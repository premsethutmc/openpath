"""Build content/english/vocabulary/size-check.json (the word check) from the bank below.

A word's level is MEASURED, not chosen: it comes from how often the word and its plain inflections occur in
SUBTLEX-US (51 million words of film and television subtitles), ranked against every word form there.
Rarer words sit at higher levels. The frequency list is not kept in this repository; fetch it with

    npm pack subtlex-word-frequencies && tar xzf subtlex-word-frequencies-*.tgz

and run:  python3 tools/english/vocabulary/build_word_check.py package/index.json

Each word carries one closest word and three wrong ones. The wrong ones are close on purpose (the same kind of
word, the same field of meaning, and at most one look-alike), and every choice must be a commoner word than the word tested,
so a learner cannot work the answer out from the choices. The script refuses to write if a rule is broken.
"""
import bisect, json, pathlib, re, sys

EDGES = [3000, 8000, 14000, 21000, 30000, 42000, 58000]  # upper rank of levels 1 to 7; rarer is level 8
LABELS = ["everyday words", "common reading words", "wider reading words", "advanced reading words",
          "exam words (SAT level)", "common GRE words", "core GRE words", "rare GRE words"]
PER_LEVEL = 10

BANK = """
a glad happy proud calm kind
a entire whole half main single
a huge large tall heavy wide
a brave fearless strong proud wild
a tiny small thin short light
a silent quiet still slow empty
v rescue save catch carry follow
a ancient old broken famous holy
a ordinary normal simple cheap quiet
v admire respect envy copy thank
a cruel unkind angry strict rude
a brief short early small plain
a anxious worried angry tired lonely
v vanish disappear escape hide finish
a fragile delicate thin light tiny
v conceal hide steal guard deny
a rapid fast sudden early strong
a wealthy rich famous powerful lucky
a vast huge empty distant deep
a furious angry scared loud wild
a weary tired sad bored weak
v persuade convince force advise order
v postpone delay cancel plan miss
v imitate copy follow repeat admire
v depart leave arrive travel return
a modest humble quiet poor honest
a scarce rare expensive small empty
a feeble weak old sick small
v loathe hate fear avoid blame
v linger stay wander hurry return
a futile useless boring careless dangerous
a timid shy weak quiet lazy
a shrewd clever greedy strict rude
a candid honest friendly calm funny
a cautious careful worried slow quiet
a trivial unimportant simple boring silly
v contemplate consider discuss complete remember
a valiant brave loyal proud noble
v boast brag shout joke lie
a immense huge heavy strong deep
a tedious boring difficult slow painful
a meticulous thorough tidy strict patient
a serene calm cheerful gentle pretty
a ominous threatening mysterious gloomy sudden
a lucid clear simple brief clever
a frivolous silly lazy cheerful greedy
a diligent hardworking clever honest obedient
a lenient forgiving generous lazy friendly
a benevolent kind wise wealthy powerful
a obstinate stubborn rude proud angry
v thwart prevent attack punish annoy
a wary cautious tired worried angry
v squander waste lose steal scatter
v replenish refill repair replace return
v hasten hurry follow leave shorten
a belligerent aggressive stubborn rude noisy
v dissuade discourage warn forbid convince
a arduous difficult lengthy boring dangerous
a aloof distant proud shy lonely
v embellish decorate enlarge praise invent
v alleviate relieve cure prevent treat
v placate soothe flatter obey please
a docile obedient quiet lazy gentle
a ostentatious flashy expensive proud noisy
a pragmatic practical honest clever cautious
a concise brief clear exact simple
a haughty arrogant angry wealthy stern
a morose gloomy tired lonely bitter
v exacerbate worsen annoy exaggerate repeat
a fastidious fussy quick clean strict
v emulate imitate admire defeat envy
v abhor hate fear avoid forbid
a raucous noisy angry cheerful crowded
v cajole persuade scold trick tease
a pernicious harmful stubborn secret permanent
a magnanimous generous famous powerful grand
a cogent convincing clever brief relevant
v inundate flood surround invade soak
a enigmatic mysterious energetic silent charming
a ephemeral temporary delicate invisible imaginary
a frugal thrifty greedy poor simple
v deride mock scold blame cheat
a taciturn quiet gloomy shy stern
a ambivalent unsure uncaring flexible dishonest
a opulent luxurious spacious colourful ancient
v abate lessen worsen delay spread
a affable friendly talkative wealthy polite
a recalcitrant disobedient reluctant careless forgetful
a verbose wordy loud clever vague
a churlish rude childish stingy gloomy
a diffident shy uncaring cautious gloomy
a garrulous talkative quarrelsome greedy cheerful
a indolent lazy rude careless weary
a intransigent stubborn temporary aggressive impatient
a erudite educated polite blunt wealthy
v extol praise demand remove announce
a lugubrious gloomy slippery sluggish weary
a limpid clear weak pale damp
v ameliorate improve combine worsen delay
a brusque blunt lively brutal hasty
a truculent fierce honest sulky cowardly
a pusillanimous cowardly stingy cautious tiny
a sagacious wise brave talkative patient
v castigate scold mock imprison banish
v enervate weaken excite annoy awaken
a vociferous loud greedy talkative fierce
a munificent generous splendid powerful wealthy
a phlegmatic unemotional sickly stubborn practical
a querulous complaining curious argumentative nervous
a refulgent shining overflowing fragrant rebellious
a risible laughable noticeable risky shameful
a sedulous persistent tempting calm loyal
a timorous fearful punctual angry gentle
a impecunious poor rude flawless stingy
a inveterate habitual experienced spineless innocent
a sycophantic flattering obedient deceitful crazy
v excoriate condemn expel forgive mock
"""
# Invented words: none is a real English word. "plain" ones look everyday, "long" ones look learned.
FAKE = {"plain": "plindle drasket quibbet traskle dromble noffle grombin frandle mesker morvish pavelin wendrick".split(),
        "long": "obnoctal defragate antrigent sublicate ebruvious condacious vorticent malidrous premonate inturbid cathrive prunkard".split()}


def main(freq_path: str) -> None:
    root = pathlib.Path(__file__).resolve().parents[3]
    cnt: dict[str, int] = {}
    for e in json.load(open(freq_path)):
        cnt[e["word"].lower()] = cnt.get(e["word"].lower(), 0) + e["count"]
    counts = sorted(cnt.values())

    def forms_of(w: str) -> set[str]:
        forms = {w, w + "s", w + "es", w + "ed", w + "d", w + "ing", w + "ly"}
        if w.endswith("e"): forms |= {w[:-1] + "ing", w[:-1] + "ed"}
        if w.endswith("y"): forms |= {w[:-1] + "ies", w[:-1] + "ied", w[:-1] + "ily"}
        return forms

    def family(w: str) -> int:
        # the list is American: a British spelling is counted with its American one (scrutinise, fervour, sombre)
        american = re.sub(r"is(e|ed|es|ing|ation)$", r"iz\1", w)
        american = re.sub(r"our$", "or", american)
        american = re.sub(r"([bt])re$", r"\1er", american)
        return sum(cnt.get(x, 0) for x in forms_of(w) | forms_of(american))

    def rank(w: str) -> int:
        c = family(w)
        return len(counts) - bisect.bisect_left(counts, c) + 1 if c else 99999

    level = lambda r: bisect.bisect_left(EDGES, r) + 1
    speller = set((root / "content/english/spelling/speller-words.txt").read_text().split())
    problems, words, seen = [], [], set()
    for line in BANK.strip().splitlines():
        pos, word, right, *wrong = line.split()
        r = rank(word)
        if word in seen: problems.append(f"{word}: twice")
        seen.add(word)
        if len(wrong) != 3 or len({right, *wrong}) != 4: problems.append(f"{word}: needs four different choices")
        for o in (right, *wrong):
            if rank(o) >= r and level(r) > 1: problems.append(f"{word}: choice '{o}' (rank {rank(o)}) is not commoner than the word (rank {r})")
            if o not in speller and o not in cnt: problems.append(f"{word}: choice '{o}' is not a listed word")
        words.append([level(r), r, pos, word, right, *wrong])
    # No surface rule may beat the questions. Two rules a learner who does not know the word could try: "pick a choice
    # that looks like the word" and "avoid the choices that look like it" (looks like: shares its first two letters).
    # On each level's words neither may score better than one in three, where blind guessing scores one in four.
    def surface(w, avoid):
        word, right, wrong = w[3], w[4], w[5:]
        alike = [o for o in (right, *wrong) if o[:2] == word[:2]]
        pool = [o for o in (right, *wrong) if (o not in alike) == avoid] or [right, *wrong]
        return (right in pool) / len(pool)
    for b in range(1, 9):
        at = [w for w in words if w[0] == b]
        for avoid, name in ((False, "pick the look-alike"), (True, "avoid the look-alikes")):
            score = sum(surface(w, avoid) for w in at) / max(1, len(at))
            if score > 1 / 3: problems.append(f"level {b}: the rule '{name}' scores {score:.2f} without knowing a word (limit 0.33)")
    for kind, fs in FAKE.items():
        for f in fs:
            if f in speller or f in cnt: problems.append(f"{f}: is a real word")
    words.sort(key=lambda w: (w[0], w[1]))
    for b in range(1, 9):
        n = sum(w[0] == b for w in words)
        print(f"level {b}: {n} words", [w[3] for w in words if w[0] == b])
        if n < PER_LEVEL: problems.append(f"level {b}: {n} words, needs {PER_LEVEL}")
    if problems:
        print("\n".join(problems)); sys.exit(1)
    out = {
        "version": 6,
        "status": "candidate: word levels are measured from SUBTLEX-US word frequency (rarer words are higher), not chosen by hand; the check itself is tested on simulated learners (size-check.test.ts). Not yet calibrated on real learners.",
        "built_by": "tools/english/vocabulary/build_word_check.py",
        "bands": [{"id": i + 1, "rank": EDGES[i] if i < 7 else None, "label": LABELS[i]} for i in range(8)],
        "words": words,
        "fake": [[f, k] for k, fs in FAKE.items() for f in fs],
    }
    text = json.dumps(out, ensure_ascii=False, indent=1)
    text = re.sub(r"\[\n\s+(\d+),\n\s+(\d+),\n\s+(\"[^\]]*?)\n\s+\]", lambda m: "[" + m.group(1) + ", " + m.group(2) + ", " + re.sub(r"\n\s+", " ", m.group(3)) + "]", text)
    text = re.sub(r"\[\n\s+(\"\w+\"),\n\s+(\"\w+\")\n\s+\]", r"[\1, \2]", text)
    (root / "content/english/vocabulary/size-check.json").write_text(text + "\n")
    print("written", len(words), "words")
    relevel_daily_words(root, rank, level, {w[3] for w in words})


def relevel_daily_words(root, rank, level, check_words) -> None:
    """New words uses the same measured levels as the check, and never teaches a word the check asks."""
    path = root / "content/english/vocabulary/daily-words.json"
    text = path.read_text()
    data = json.loads(text)
    kept = [[level(rank(w[2])), *w[1:]] for w in data["words"] if w[2] not in check_words]
    head = text[: text.index('"words": [')]
    head = re.sub(r'"version": \d+', '"version": 8', head)
    head = re.sub(r'"status": "[^"]*"', '"status": "candidate: a word\'s level is measured from SUBTLEX-US word frequency by tools/english/vocabulary/build_word_check.py, the same measure as the word check; no word of the word check is taught here. Meanings and sentences are not yet reviewed with learners."', head)
    path.write_text(head + '"words": [\n' + ",\n".join(json.dumps(w, ensure_ascii=False) for w in kept) + "\n]\n}\n")
    print("daily words:", {b: sum(w[0] == b for w in kept) for b in range(1, 9)}, "dropped", len(data["words"]) - len(kept))


if __name__ == "__main__":
    main(sys.argv[1])
