/** Synthetic UI fixtures only. These are not assessment items, scores or a shared-engine contract. */
export const FIXTURE_VERSION = "essay-ux-fixture.v1";
export const CONTEXT = {
  grade: "Grade 8",
  curriculum: "CBSE · English",
  prompt: "Should schools create more green spaces?",
};
export const SAMPLE_ESSAY = `Our school has a small playground, but it do not have enough trees. Last week, I discussed about this problem with my friends. We thinks a garden would help everyone. Trees give us shade and make the school look beautiful. A garden can also be a place where students learn about plants and insects.

Some people say gardens take too much time to care for. However, each class could look after a small area. We could use fallen leaves to make compost. Students would learn responsibility while working together. In my opinion, I think every school should have a green space because it is good for learning and it is good for our environment.`;
export const SAMPLE_REWRITE = `Schools should create green spaces where students can learn, rest and care for nature. Trees provide shade, while gardens support lessons about plants and insects. Classes could share maintenance and compost fallen leaves. Although gardens require effort, working together would teach responsibility and make schools healthier, more welcoming learning environments.`;
export const CAPABILITIES = [
  {
    id: "grammar",
    name: "Grammar",
    icon: "Aa",
    focus: "Make subjects and verbs agree",
    quote: "“it do not have enough trees”",
    reason:
      "The sample has an agreement pattern worth checking. One essay sentence is not enough to confirm a difficulty.",
    question: "Which sentence uses the verb correctly?",
    options: [
      "The garden give us shade.",
      "The garden gives us shade.",
      "The garden giving us shade.",
    ],
    explanation:
      "A singular subject like “the garden” takes “gives”. With a plural subject, use “give”: “The trees give us shade.”",
    example:
      "The class looks after the garden. The students look after the garden.",
    guided: "Rewrite: “The trees gives us shade.”",
    hint: "“Trees” is plural. Try the verb form used with “they”.",
    independent:
      "Write a new sentence about a school club. Make its subject and verb agree.",
  },
  {
    id: "prepositions",
    name: "Prepositions",
    icon: "↔",
    focus: "Choose the words a verb needs",
    quote: "“discussed about this problem”",
    reason:
      "The sample may be adding a preposition after a verb that does not need one. A targeted check can tell us more.",
    question: "Which sentence sounds complete and natural?",
    options: [
      "We discussed the plan.",
      "We discussed about the plan.",
      "We discussed on the plan.",
    ],
    explanation:
      "Some verbs connect directly to their object. We “discuss a plan”, but we “talk about a plan”. The useful pattern depends on the verb.",
    example: "We discussed the garden. We talked about the garden.",
    guided: "Improve this sentence: “We discussed about the trees.”",
    hint: "Try “discussed” followed directly by the thing being discussed.",
    independent:
      "Write two new sentences about a class project: one with “discuss” and one with “talk”.",
  },
  {
    id: "sentence-structure",
    name: "Sentence structure",
    icon: "¶",
    focus: "Connect ideas clearly",
    quote: "“Trees give us shade and make the school look beautiful.”",
    reason:
      "This sample combines related ideas. More independent writing would be needed to know how reliably the writer can do this.",
    question: "Which sentence joins the ideas clearly?",
    options: [
      "Trees provide shade, they cool the playground.",
      "Trees provide shade and cool the playground.",
      "Trees shade because playground.",
    ],
    explanation:
      "Give each sentence a clear main idea. Join closely related ideas with a suitable connecting word, or use separate sentences.",
    example: "We planted seeds, and we watered them each day.",
    guided:
      "Join these ideas clearly: “The garden needs care. Each class can help.”",
    hint: "Try joining the two complete ideas with “so”.",
    independent: "Write one new sentence that connects a reason to an action.",
  },
  {
    id: "vocabulary",
    name: "Vocabulary",
    icon: "✦",
    focus: "Choose precise, useful words",
    quote: "“use fallen leaves to make compost”",
    reason:
      "“Compost” is a precise word in the sample. Its use here does not establish broad vocabulary strength.",
    question:
      "Which word is most precise in this context: “Fallen leaves can become ___ for the garden”?",
    options: ["stuff", "things", "compost"],
    explanation:
      "A precise word helps a reader picture your idea. Choose a word that adds meaning, rather than a longer word just to sound impressive.",
    example:
      "“Compost enriches the soil” says more than “stuff helps the place”.",
    guided: "Replace a vague word: “The garden is a nice thing for students.”",
    hint: "What does the garden actually offer: shade, a place to learn, or a home for insects?",
    independent:
      "Write a new sentence using one precise word to describe a useful school space.",
  },
  {
    id: "coherence",
    name: "Coherence",
    icon: "⋈",
    focus: "Help your reader follow the argument",
    quote: "“Some people say… However, each class could…”",
    reason:
      "The sample raises a concern and responds to it. We still need to see whether the writer can build this link in a new context.",
    question:
      "Which word introduces a response to the concern “Gardens take time to maintain”?",
    options: ["However", "For example", "First"],
    explanation:
      "Connect ideas by showing their relationship. A concern can be followed by a response; an explanation can be followed by an example.",
    example:
      "A garden needs regular care. However, classes can share the work.",
    guided: "Write a response to: “A school garden may cost too much.”",
    hint: "Acknowledge the concern, then suggest a practical way to reduce the cost.",
    independent:
      "Write a short argument about a different school improvement, including a concern and a response.",
  },
  {
    id: "concise-writing",
    name: "Concise writing",
    icon: "≋",
    focus: "Keep the idea; lose the repetition",
    quote: "“In my opinion, I think…”",
    reason:
      "The sample repeats the same signal of opinion. A short check can explore whether the writer notices that repetition independently.",
    question: "Which opening keeps the meaning with fewer words?",
    options: [
      "In my opinion, I think schools should plant trees.",
      "Schools should plant trees.",
      "Trees.",
    ],
    explanation:
      "Concise writing keeps the important idea while removing words that repeat it. Shorter is useful only when the meaning stays clear.",
    example:
      "“In my opinion, I think we should plant trees” → “We should plant trees.”",
    guided:
      "Make this clearer and shorter: “The reason why we need trees is because they provide shade.”",
    hint: "Start with “We need trees…” and keep the reason.",
    independent:
      "Write one clear sentence explaining why a school garden is useful. Avoid repeating the same idea.",
  },
] as const;
export type DemoCompetencyId = (typeof CAPABILITIES)[number]["id"];
export type DemoScene = "introduced" | "diagnosed" | "guided" | "independent";
export type PresentationStatus =
  | "not-started"
  | "needs-verification"
  | "learning"
  | "independently-demonstrated"
  | "verified";
export const STATUS_LABELS: Record<PresentationStatus, string> = {
  "not-started": "Not started",
  "needs-verification": "Needs verification",
  learning: "Learning",
  "independently-demonstrated": "Independently demonstrated",
  verified: "Verified",
};
export const REWRITE_FEEDBACK = [
  {
    name: "Meaning preservation",
    text: "Sample feedback: the main claim and the practical idea of shared maintenance remain. A live assessor would compare your rewrite with your original essay.",
  },
  {
    name: "Clarity",
    text: "Sample feedback: the central argument appears first, followed by examples and a response to the concern.",
  },
  {
    name: "Grammar",
    text: "Sample feedback: the example uses consistent subject–verb agreement. This does not verify every grammar competency.",
  },
  {
    name: "Concision",
    text: "Sample feedback: repeated opinion phrases are removed while the argument remains complete. A word count alone cannot establish this.",
  },
] as const;
