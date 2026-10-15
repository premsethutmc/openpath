# Spelling Bee: the 21 new words, for the founder's review

**Status: awaiting the founder's review.**
- The 79 reused dictation words are covered by the owner approval of 15 October 2026.
- These 21 are **not covered** by it. They are marked in `content/english/spelling/spelling-bee.json` as "new: … not
  part of the owner-approved 291; awaiting the product owner's review".
- Nothing in the code or the records claims they are approved.
- The review does not block development: the words are in the development build and its tests. They are not in any
  pilot build, which has no Spelling Bee.

**How to decide.** Fill in the last column (approve, change or remove) and send it back. A change can be a new word,
level, sentence or accepted spelling. I will then record the approval the same way as the 291.

**Reference lists.** "CEW" means a *common exception word* in the English National Curriculum (Years 1–2). "Y5/6 list"
means its statutory spelling list for Years 5 and 6.

## The 21 words

| # | Word | Level | Why it belongs at that level | Pronunciation could be ambiguous? | Example sentence (spoken after the word) | Suitable? | Accepted alternative spelling | Founder decision |
|---|---|---|---|---|---|---|---|---|
| 1 | friend | 1 Beginner | Y1 CEW; the irregular "ie" is the challenge | No | My best friend lives next door. | Yes | None | |
| 2 | because | 1 | Y2 CEW; unusual "au" | No | We stayed inside because it was raining. | Yes | None | |
| 3 | said | 1 | Y1 CEW; "ai" sounds like "e" | No | She said goodbye at the gate. | Yes | None | |
| 4 | school | 1 | Y1 CEW; "ch" sounds like "k" | No | We walk to school every morning. | Yes. It also contains "every", another Bee word, which is only spoken, so it gives nothing away | None | |
| 5 | people | 1 | Y2 CEW; silent "o", "-le" ending | No | Many people came to the fair. | Yes. It also contains "many", only spoken | None | |
| 6 | again | 1 | Y2 CEW; "ai" | Mildly: "a-GEN" or "a-GAIN", but the spelling is the same either way | Please read the story again. | Yes | None | |
| 7 | water | 1 | Y2 CEW; "a" sounds like "or" | Mildly: a US-accented voice says "wadder". The app prefers en-IN and en-GB voices | Drink some water after the race. | Yes. It also contains "after", only spoken | None | |
| 8 | after | 1 | Y2 CEW | No (accents differ in the vowel only) | We played football after lunch. | Yes | None | |
| 9 | every | 1 | Y2 CEW | **Yes**: in speech the middle "e" is usually silent ("EV-ree"). That is the reason it is a CEW, but it is hard to hear | He brushes his teeth every night. | Yes. It also contains "brushes", only spoken | None | |
| 10 | little | 1 | Phonics: double "t" and "-le" | No | The little puppy chased its tail. | Yes | None | |
| 11 | house | 1 | Y1 CEW | No | Their house has a red door. | Yes | None | |
| 12 | laugh | 1 | Irregular "augh". **Harder than most level-1 words; level 2 may fit better** | No | The joke made everyone laugh. | Yes | None | |
| 13 | many | 1 | Y2 CEW; "a" sounds like "e" | No | There are many stars in the sky. | Yes | None | |
| 14 | animal | 1 | Regular three-syllable word | No | A giraffe is a very tall animal. | Yes | None | |
| 15 | around | 1 | Regular "ou" | No | We walked around the lake. | Yes | None | |
| 16 | together | 1 | Three syllables, two "er" sounds | No | We built the model together. | Yes | None | |
| 17 | rhythm | 5 Challenging | Y5/6 list; no written vowel in "-thm" | No ("RITH-um"; a hint is shown to an adult reader) | Clap along to the rhythm of the song. | Yes | None | |
| 18 | embarrass | 5 | Y5/6 list; double "r" and double "s" | No ("em-BARR-us") | Please don't embarrass me in front of my friends. | Yes | None | |
| 19 | accommodate | 5 | Y5/6 list; double "c" and double "m" | No ("uh-KOM-uh-date") | The hotel can accommodate fifty guests. | Yes; a harder sentence, suited to level 5 | None | |
| 20 | mischievous | 5 | Y5/6 list; three syllables, "ie" | **Yes**: often said "mis-CHEE-vee-us", which suggests a wrong spelling. The adult hint says "MISS-chiv-us (three syllables)". How a phone's own voice says it can only be checked on the phone | The mischievous kitten hid my sock. | Yes | None ("mischievious" is a misspelling, not a variant) | |
| 21 | definitely | 5 | The Y5/6 list has "definite"; the "-ite-" is the challenge | **Yes**: in quick speech it sounds like "DEF-nit-lee". This is the intended challenge, but it is hard to hear | I will definitely come to your party. | Yes | None | |

**Alternative spellings.** All 21 are spelled the same in British and American English, so none has an accepted
alternative. The same holds for the 79 reused words.

## The whole 100-word bank

These checks are automated in `logic/spelling.test.ts` (SB-1 and SB-2) and were also checked by hand.

| Check | Result |
|---|---|
| Duplicates | None. 100 different words (ignoring capital letters) and 100 different ids |
| Words per level | 20 at each of 5 levels |
| Sentences | Each uses its word exactly once, as a whole word, in 12 words or fewer, ending with `. ? !` |
| Inappropriate content | None found. The sentences are everyday, child-appropriate situations (school, family, animals, weather, games); no violence, fear or brands |
| Homophones | None among the 100. Every word also has a sentence, which would settle one |
| Other Bee words inside a sentence | 13 sentences contain another Bee word, for example "water" → "…after the race". A sentence is only spoken, never shown to the learner, so this gives no spelling away. In adult-reader mode the adult sees the sentence |
| Pronunciation with a device voice | Hard-to-hear words are listed above (every, mischievous, definitely). Among the 79: "naturally", "usually" and "meanness" sound the same as common misspellings; that is the point of those spelling rules. The phone check (ANDROID_MANUAL_TEST §A8) should listen to a few |

### Difficulty levels that may mislead

The 79 reused words take their level from the dictation bank's difficulty estimates (`b`), in order. Those estimates
rate the **spelling rule** a word tests, not how hard the word itself is. Seven words at levels 4–5 test the hard rule
"do not double the last letter when the last syllable is unstressed". On their own, though, they are common words that
many children spell by analogy:

| Word | Level now | Rule-based estimate (b) | Comment |
|---|---|---|---|
| opened | 4 | 6.0 | Common; most children spell it right without knowing the rule |
| entered | 4 | 6.25 | As above |
| happened | 5 | 6.25 | As above |
| ordered | 5 | 6.25 | As above |
| offering | 5 | 6.25 | As above |
| limited | 5 | 6.5 | As above |
| gardening | 5 | 6.25 | As above |

**Founder decision:** keep the levels as they are (consistent with the documented rule-based estimates), or move these
seven down. Moving them would mean swapping each with a level-3 word, to keep 20 per level, for example "dissatisfied",
"unnoticed", "naturally", "excitement", "enjoyment", "wonderful" and "peaceful".

I have **not** changed any level: the levels of owner-approved words follow a documented rule, and changing it is
your call. "laugh" (level 1, above) is the same kind of question for a new word.

## What is not reviewed here

**Not checked on a phone.** How each word actually sounds on a given phone's voice can only be checked on that phone
(ANDROID_MANUAL_TEST §A8).
