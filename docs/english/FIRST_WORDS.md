# First words: for a learner who cannot yet read a sentence (November 2026)

Status: candidate content, practice-only. Nothing is educator-reviewed. The pictures are stand-ins.

## What it is

An activity below the present first levels. Nothing on the screen has to be read: a guide speaks, and the learner
taps. A sitting has ten steps:

| Step | What is said | What the learner does |
|---|---|---|
| Hear (four) | "Tap the cat." | taps one of three pictures |
| Build (three) | "This is a cat. Build the word cat." | taps the letters in order; two letters do not belong |
| Count | "Tap three stars." | taps the group of three |
| Colour | "Tap the red one." | taps the red one |
| Place | "Put the hen on the box." | taps the place on top of, beside or under the box |

- It is practice, not a test. A wrong tap is switched off and the learner tries again. What is recorded is
  whether the first tap was right.
- The written word appears only after the right answer, with the word said once more.
- Four new words a sitting; a missed word returns when the new ones run out. 66 words in all.
- The guide ("Chintu") can be hidden. Where the device cannot speak, the guide's words are shown in small print
  for a helper to read out.

## One engine, swappable art

Every step is made from `content/english/first/words.json`. A new word needs one entry (word, picture, group)
and is then heard and built like the others. The picture is a slot holding an emoji for now; artwork can replace
it word by word without touching the activities.

## Where a beginner meets it

- A card on the home screen ("First words").
- After Find my level: a learner who passed no reading text and stands on the first listening level is told to
  start here, and the card moves to the top of the home screen as "Start here".

## Limits

- The taps are taps, not drags.
- Chintu is a stand-in face and has no voice of his own: the device's voice speaks. Hiding him is not remembered
  between visits.
- Nothing here checks what is actually heard on a phone; the automated browser has no voice.
- Only nouns are taught as words; colours, numbers and places come in the "do what you hear" steps. No verbs yet.
- ICSE Class 1 is not loaded yet; this activity is what its first lines will point to.
