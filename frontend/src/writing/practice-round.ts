/** Existing practice variations shared by the answer and paper input methods. */
export function practiceRound(topic: string): number {
  const search = new URLSearchParams(location.search);
  const round =
    search.get("answerTopic") === topic
      ? Number(search.get("answerRound") ?? 0)
      : 0;
  return Number.isInteger(round) && round >= 0 && round <= 99 ? round : 0;
}
export function practiceParameters(
  topic: string,
  base: Record<string, number>,
  round: number,
) {
  return {
    ...base,
    ...(round
      ? topic === "division"
        ? { dividend: (base.dividend ?? 379) + round * (base.divisor ?? 3) }
        : topic === "multiplication"
          ? {
              groups: base.groups ?? 4,
              size: 1 + (((base.size ?? 6) - 1 + round) % 12),
            }
          : { numerator: round + 1, denominator: round + 2 }
      : {}),
  };
}
export function storePracticeRound(topic: string, round: number) {
  const url = new URL(location.href);
  url.searchParams.set("answerRound", String(round));
  url.searchParams.set("answerTopic", topic);
  history.replaceState(null, "", url);
}
