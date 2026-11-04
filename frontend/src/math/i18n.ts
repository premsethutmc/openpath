/**
 * Localization — interface labels only, not mathematical content.
 *
 * Mathematical content (questions, expressions, explanations) is passed
 * through the rendering contract and displayed as-is. Only UI chrome
 * strings live here.
 */

import type { LocaleStrings, SupportedLocale } from "./types";

const en: LocaleStrings = {
  submit: "Check",
  skip: "Skip",
  hint: "Hint",
  next: "Next",
  back: "Back",
  correct: "Correct!",
  incorrect: "Not quite right",
  notMarked: "Not marked",
  tryAgain: "Try again",
  showWorking: "Show working",
  hideWorking: "Hide working",
  enterAnswer: "Enter your answer",
  questionOf: (c, t) => `Question ${c} of ${t}`,
};

const ta: LocaleStrings = {
  submit: "சரிபார்",
  skip: "தவிர்",
  hint: "குறிப்பு",
  next: "அடுத்து",
  back: "பின்",
  correct: "சரி!",
  incorrect: "சரியில்லை",
  tryAgain: "மீண்டும் முயற்சி",
  showWorking: "வேலையைக் காட்டு",
  hideWorking: "வேலையை மறை",
  enterAnswer: "உங்கள் பதிலை உள்ளிடவும்",
  questionOf: (c, t) => `கேள்வி ${c} / ${t}`,
};

const locales: Record<SupportedLocale, LocaleStrings> = { en, ta };

export function getStrings(locale: SupportedLocale): LocaleStrings {
  return locales[locale] ?? locales.en;
}
