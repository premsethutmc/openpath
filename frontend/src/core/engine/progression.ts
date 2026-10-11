/** On-device mirror of backend/assessment/progression.py. */
import type { Curriculum, DatedObservation, Profile, RoundSpec, SessionPlan, SkillState, SkillView } from "../types";
import { SECURE, computeSkillState } from "./mastery";

const BANDS: Record<SessionPlan["band"], [number, number, number][]> = {
  support: [[3, 2, 4], [2, 4, 3], [4, 3, 2]],
  core: [[5, 3, 4], [4, 6, 3], [7, 5, 6], [6, 4, 7], [3, 7, 5]],
  stretch: [[8, 6, 9], [7, 10, 6], [9, 7, 8], [6, 9, 10], [10, 8, 7]],
};
const KINDS: [string, string, string][] = [
  ["apple", "orange", "pear"],
  ["pear", "apple", "orange"],
  ["orange", "pear", "apple"],
];

const CARDINALITY = "math.counting.cardinality";
const ONE_TO_ONE = "math.counting.one_to_one";

export function buildProfile(curriculum: Curriculum, observations: DatedObservation[], now: Date): Profile {
  const bySkill = new Map<string, DatedObservation[]>();
  for (const o of observations) {
    if (!bySkill.has(o.skill)) bySkill.set(o.skill, []);
    bySkill.get(o.skill)!.push(o);
  }

  const states = new Map<string, SkillState>();
  for (const skill of curriculum.skills) {
    states.set(skill.key, computeSkillState(bySkill.get(skill.key) ?? [], curriculum.mastery_policy, now));
  }

  const skills: SkillView[] = curriculum.skills.map((skill) => {
    const waitingOn = skill.prerequisites.filter((p) => !SECURE.includes(states.get(p)!.status));
    return {
      key: skill.key,
      name: skill.name,
      description: skill.description,
      prerequisites: skill.prerequisites,
      assessed: skill.assessed,
      ready: waitingOn.length === 0,
      waiting_on: waitingOn,
      ...states.get(skill.key)!,
    };
  });

  return {
    curriculum_version: curriculum.version,
    skills,
    ready_next: skills
      .filter((s) => s.ready && s.status === "no_evidence" && s.prerequisites.length > 0)
      .map((s) => s.key),
    review_due: skills.filter((s) => s.review_due).map((s) => s.key),
  };
}

export function chooseBand(profile: Profile): [SessionPlan["band"], string] {
  const status = Object.fromEntries(profile.skills.map((s) => [s.key, s.status]));
  if (SECURE.includes(status[CARDINALITY])) {
    return ["stretch", "Counting out a set looks secure, so the numbers get bigger and other fruit is mixed in."];
  }
  if (status[CARDINALITY] === "emerging" || status[ONE_TO_ONE] === "emerging") {
    return ["support", "Counting out a set is still new, so the numbers stay small and the shelf is uncluttered."];
  }
  return ["core", "Gathering more evidence with numbers up to 7."];
}

export function planNextSession(profile: Profile, sessionsCompleted: number): SessionPlan {
  const [band, reason] = chooseBand(profile);
  const targets = BANDS[band][sessionsCompleted % BANDS[band].length];
  const kinds = KINDS[sessionsCompleted % KINDS.length];
  const mixed = band === "stretch";

  const shelf = (kind: string, target: number, other: string | null): Record<string, number> => {
    const available: Record<string, number> = { [kind]: Math.max(target + 3, 8) };
    if (other) available[other] = 4;
    return available;
  };
  const round = (
    id: string,
    index: number,
    representation: RoundSpec["representation"],
    isTransfer: boolean,
    other: string | null,
  ): RoundSpec => ({
    id,
    task_type: "produce_set",
    target: targets[index],
    target_kind: kinds[index],
    representation,
    is_transfer: isTransfer,
    available: shelf(kinds[index], targets[index], other),
  });

  return {
    activity: "apple-shopping",
    band,
    reason,
    rounds: [
      round("r1", 0, "numeral", false, mixed ? kinds[1] : null),
      round("r2", 1, "numeral", true, mixed ? kinds[0] : null),
      round("r3", 2, "set", true, mixed ? kinds[1] : null),
    ],
  };
}
