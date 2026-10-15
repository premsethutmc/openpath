# Spelling Bee: the 21 new words and the levels

**Status (15 October 2026): owner-approved, provisionally, for pilot use, subject to the automated content checks.**
- **Who approved:** the founder (product owner). The approval is recorded on each of the 21 entries in
  `content/english/spelling/spelling-bee.json`, with:
  - `status`: "owner-approved (provisional, for pilot use …)";
  - an `approval` block: authority product-owner, scope "pilot (provisional)", date, the founder's instruction as
    provenance, and the time it was recorded.
- **What it is not:** an educator review or an independent validation, and nothing says it is.
- **How it relates to the 291:** it is kept apart from the 291 question approvals in `content/english/pilot/reviews.json`,
  which are unchanged. None of the 2,348 generated practice questions is approved.
- **The checks it depends on:** `logic/spelling.test.ts` SB-1, SB-2 and SB-12 run in CI.
- **Pilot builds do not include the Spelling Bee yet.** Adding it to the pilot allowlist is a separate change, not
  made here.

**Reference lists.** "CEW" means a *common exception word* in the English National Curriculum (Years 1–2). "Y5/6 list"
means its statutory spelling list for Years 5 and 6.

## The 21 words

| # | Word | Level | Why it belongs at that level | Pronunciation could be ambiguous? | Example sentence (spoken after the word) | Suitable? | Accepted alternative spelling | Decision (15 Oct) |
|---|---|---|---|---|---|---|---|---|
| 1 | friend | 1 Beginner | Y1 CEW; the irregular "ie" is the challenge | No | My best friend lives next door. | Yes | None | Approved (provisional) |
| 2 | because | 1 | Y2 CEW; unusual "au" | No | We stayed inside because it was raining. | Yes | None | Approved (provisional) |
| 3 | said | 1 | Y1 CEW; "ai" sounds like "e" | No | She said goodbye at the gate. | Yes | None | Approved (provisional) |
| 4 | school | 1 | Y1 CEW; "ch" sounds like "k" | No | We walk to school every morning. | Yes. It also contains "every", another Bee word, which is only spoken, so it gives nothing away | None | Approved (provisional) |
| 5 | people | 1 | Y2 CEW; silent "o", "-le" ending | No | Many people came to the fair. | Yes. It also contains "many", only spoken | None | Approved (provisional) |
| 6 | again | 1 | Y2 CEW; "ai" | Mildly: "a-GEN" or "a-GAIN", but the spelling is the same either way | Please read the story again. | Yes | None | Approved (provisional) |
| 7 | water | 1 | Y2 CEW; "a" sounds like "or" | Mildly: a US-accented voice says "wadder". The app prefers en-IN and en-GB voices | Drink some water after the race. | Yes. It also contains "after", only spoken | None | Approved (provisional) |
| 8 | after | 1 | Y2 CEW | No (accents differ in the vowel only) | We played football after lunch. | Yes | None | Approved (provisional) |
| 9 | every | 1 | Y2 CEW | **Yes**: in speech the middle "e" is usually silent ("EV-ree"). That is the reason it is a CEW, but it is hard to hear | He brushes his teeth every night. | Yes. It also contains "brushes", only spoken | None | Approved (provisional) |
| 10 | little | 1 | Phonics: double "t" and "-le" | No | The little puppy chased its tail. | Yes | None | Approved (provisional) |
| 11 | house | 1 | Y1 CEW | No | Their house has a red door. | Yes | None | Approved (provisional) |
| 12 | laugh | **2** (moved from 1) | Irregular "augh": harder than the level-1 words, so moved to level 2 | No | The joke made everyone laugh. | Yes | None | Approved (provisional) |
| 13 | many | 1 | Y2 CEW; "a" sounds like "e" | No | There are many stars in the sky. | Yes | None | Approved (provisional) |
| 14 | animal | 1 | Regular three-syllable word | No | A giraffe is a very tall animal. | Yes | None | Approved (provisional) |
| 15 | around | 1 | Regular "ou" | No | We walked around the lake. | Yes | None | Approved (provisional) |
| 16 | together | 1 | Three syllables, two "er" sounds | No | We built the model together. | Yes | None | Approved (provisional) |
| 17 | rhythm | 5 Challenging | Y5/6 list; no written vowel in "-thm" | No ("RITH-um"; a hint is shown to an adult reader) | Clap along to the rhythm of the song. | Yes | None | Approved (provisional) |
| 18 | embarrass | 5 | Y5/6 list; double "r" and double "s" | No ("em-BARR-us") | Please don't embarrass me in front of my friends. | Yes | None | Approved (provisional) |
| 19 | accommodate | 5 | Y5/6 list; double "c" and double "m" | No ("uh-KOM-uh-date") | The hotel can accommodate fifty guests. | Yes; a harder sentence, suited to level 5 | None | Approved (provisional) |
| 20 | mischievous | 5 | Y5/6 list; three syllables, "ie" | **Yes**: often said "mis-CHEE-vee-us", which suggests a wrong spelling. The adult hint says "MISS-chiv-us (three syllables)". How a phone's own voice says it can only be checked on the phone | The mischievous kitten hid my sock. | Yes | None ("mischievious" is a misspelling, not a variant) | Approved (provisional) |
| 21 | definitely | 5 | The Y5/6 list has "definite"; the "-ite-" is the challenge | **Yes**: in quick speech it sounds like "DEF-nit-lee". This is the intended challenge, but it is hard to hear | I will definitely come to your party. | Yes | None | Approved (provisional) |

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

### Levels: the changes of 15 October 2026

**The principle (the founder's instruction):** a word's level reflects the **spelling rule** it tests, not how familiar
the word is. Each reused word's rule is its `step` in the dictation bank (for example `no_double_unstressed`), and each
rule has a difficulty band (`b`). The levels are now set by rule:
- **One rule, one level,** wherever 20 words per level allows it.
- **Levels rise in order of the rule's band.**
- **Paired rules together:** both halves of a rule that must be told apart are at the same level.

This is recorded in the content's `policy.levels_rule` and checked by SB-12.

**The seven words in question** (opened, entered, happened, ordered, offering, limited, gardening) all test one rule:
**do not double the last consonant when the last syllable is unstressed** (gardening, limited). It is the second half
of the rule **double it when the last syllable is stressed** (preferred, forgotten). That pair is one curriculum
point (England's Years 3–4 appendix gives "forgetting, preferred, gardening, limited" together), and a learner has to
tell the two apart.
- **Before:** the stressed half was all at level 4, but the unstressed half was split, with 2 words at level 4 and 5 at
  level 5, because its estimates were 0.25 higher.
- **Now:** all 7 are at level 4, with the 7 stressed-doubling words.
- **This was not done on familiarity.** They stay at level 4, the Advanced level, which is where the rule belongs;
  they do not drop to level 3.

**All moves, and why** (20 words remain at every level):

| Word | Rule (dictation bank `step`) | Level before → now | Why |
|---|---|---|---|
| laugh | irregular "augh" (new word) | 1 → **2** | Founder's instruction: harder than the level-1 words |
| unlock | prefix un- (`plain_affix`) | 2 → **1** | Balances laugh. "un-" is the Year 1 prefix rule, the easiest in its group |
| happened, ordered, offering, limited, gardening | `no_double_unstressed` | 5 → **4** | Joins the rest of its rule and its paired rule `stress_doubling` (all at 4) |
| attention, competition, education | `tion_sion` | 4 → **5** | Joins the rest of its rule at 5 (explosion, information, television, confusion) |
| valuable, responsible | `able_ible` | 4 → **5** | Balances level 4: the two with the highest estimates in their rule (5.75 and 6.0) |

**What this fixes, and the cost:**
- **Fixed:** two rules were split across levels 4 and 5 (`no_double_unstressed`, `tion_sion`); both are now whole.
- **Still split**, to keep 20 per level, all across neighbouring levels:
  - `plain_affix` (1–2): unlock at 1, the rest at 2;
  - `drop_e` (2–3) and `y_to_i` (3–4), as before;
  - `able_ible` (4–5): 5 at level 4, valuable and responsible at 5.
- **The five-level progression is preserved.** Each level's typical rule band (its median `b`) still rises from 1 to
  5. However, a level-5 word can now have a lower estimate than a level-4 word (valuable 5.75 below limited 6.5),
  because grouping is by rule.

**Learners' history is unaffected.** Every answer records the word's level at the time, and practice levels are
rebuilt from those records. New sessions use the new levels.

## What is not reviewed here

**Not checked on a phone.** How each word actually sounds on a given phone's voice can only be checked on that phone
(ANDROID_MANUAL_TEST §A8).
