"""M1: writes docs/subskill-gated-mastery/04-s2-comparison.md from m1/results/{A,B,C}.json (python3 report.py, from this directory)."""
import json, pathlib

here = pathlib.Path(__file__).parent
R = {c: json.loads((here / "results" / f"{c}.json").read_text()) for c in "ABC"}
P = ["existing", "gated", "gated-typed", "gated-method", "gated-slip"]
V = P[1:]
K = ["two-step", "both-sides", "brackets", "modelling"]


def agg(get):
    n = sum(get(R[c])["n"] for c in R)
    d = sum(get(R[c])["d"] for c in R)
    return n, d


def fmt(n, d):
    return f"{n}/{d} ({100 * n / d:.1f}%)" if d else f"{n}/0 (n/a)"


def row(label, get):
    cells = [fmt(get(R[c])["n"], get(R[c])["d"]) for c in "ABC"]
    return f"| {label} | " + " | ".join(cells) + f" | {fmt(*agg(get))} |"


L = []
w = L.append
w("# S2 comparison: existing vs proposed mastery decisions on the same recorded histories")
w("")
w("The protocol, profiles, seeds and bounds are S2's frozen ones, unchanged. The script is `research/synthetic-learners/experiments/s2/m1/compare.mts`.")
w("")
w("- **Reproduction.** Every journey was re-run with a read-only visit observer:")
for c in "ABC":
    w(f"  - Cohort {c}: **{R[c]['reproducedIdentically']}/{R[c]['journeys']}** re-run journeys are byte-identical to the frozen S2 traces.")
w("- **No drift.** The \"existing\" status computed by the comparison differed from the status the journey recorded on "
  f"**{sum(R[c]['existingStatusDrift'] for c in R)}** visits.")
w(f"- **Size.** {sum(R[c]['visits'] for c in R)} visits across {sum(R[c]['journeys'] for c in R)} journeys.")
w("")
w("Ground truth is the simulator's hidden state, as defined in S2's `metrics.ts`:")
w("")
w("- **weak** = ability < 0.6, or a misconception of that kind ≥ 0.3.")
w("- **strong** = ability ≥ 0.9 and misconception < 0.1.")
w("")
w("A claim is:")
w("")
w("- for the existing status: independent, transfer or verified;")
w("- for a proposed variant: independently-demonstrated or retention-due.")
w("")
w("**Important limitation.** These histories were produced by the existing selector:")
w("")
w("- It ends a journey when the competency-level delayed check passes.")
w("- It never schedules a missing sub-skill or a sub-skill recovery for the proposed policy.")
w("")
w("The proposed policy is therefore judged on data it never asked for. That inflates its missed competence, and does not prove its precision on its own data. Fewer claims is not evidence of better learning.")
w("")
w("## False mastery: a claim while any competency kind is weak")
w("")
w("| Policy | A | B | C | All |")
w("|---|---|---|---|---|")
for p in P:
    w(row(f"{p}: false claim visits / claim visits", lambda d, p=p: d["falseMastery"][p]["falseClaimVisits"]))
w("")
w("| Policy | A | B | C | All |")
w("|---|---|---|---|---|")
for p in P:
    w(row(f"{p}: journeys with a false claim / all journeys", lambda d, p=p: d["falseMastery"][p]["journeysWithFalseClaimOfAll"]))
for p in P:
    w(row(f"{p}: weak visits claimed / weak visits", lambda d, p=p: d["falseMastery"][p]["weakVisitsClaimed"]))
w("")
fb = {k: sum(R[c]["falseMastery"]["existing"]["falseByWeakKind"][k] for c in R) for k in K}
w("Existing false claims by the weak kind (all cohorts; a claim can be false on several kinds): "
  + ", ".join(f"{k} {v}" for k, v in fb.items()) + ".")
w("")
w("## Missed genuine competence")
w("")
w("| Definition | Policy | A | B | C | All |")
w("|---|---|---|---|---|---|")
for p in P:
    w(row(f"visits, all kinds strong | {p}", lambda d, p=p: d["missedCompetence"]["byPolicy"][p]["visits"]).replace("| visits", "| visits", 1))
for p in P:
    w(row(f"journeys, S2 definition, final visit | {p}", lambda d, p=p: d["missedCompetence"]["byPolicy"][p]["journeysFinalVisitS2"]))
for p in P:
    w(row(f"journeys, each kind asked alone ≥ 2, final visit | {p}", lambda d, p=p: d["missedCompetence"]["byPolicy"][p]["journeysFinalVisitAskedEachKind"]))
for v in V:
    w(row(f"kind pairs (S2 competentPairs: strong, ≥ 4 alone of that kind) | {v}", lambda d, v=v: d["missedCompetence"]["missedKindPairsByVariant"][v]))
w("")
why = {}
for c in R:
    for k, n in R[c]["missedCompetence"]["gatedWithheldReasons"].items():
        why[k] = why.get(k, 0) + n
w("Why `gated` withholds the claim on competent visits. These are sub-skill reasons summed over visits, and a visit can have several:")
w("")
w("| Reason | Visits |")
w("|---|---|")
for k, n in sorted(why.items(), key=lambda x: -x[1]):
    w(f"| {k} | {n} |")
w("")
w("## Sub-skill coverage at the end of each journey")
w("")
w("| Sub-skill | Asked alone | Shown (gated) | Ever delayed-checked | Shown but never delayed-checked |")
w("|---|---|---|---|---|")
for k in K:
    w(f"| {k} | {fmt(*agg(lambda d: d['coverage'][k]['askedAlone']))} | {fmt(*agg(lambda d: d['coverage'][k]['shown']))} | "
      f"{fmt(*agg(lambda d: d['coverage'][k]['everDelayedChecked']))} | {fmt(*agg(lambda d: d['coverage'][k]['shownButNeverDelayedChecked']))} |")
w("")
w("## Retention coverage (the proposed plan)")
w("")
items = {k: sum(R[c]["retention"]["planItemsBySubSkill"][k] for c in R) for k in K}
w("When a sub-skill's check was due, the proposed plan asked for these items, summed over visits: "
  + ", ".join(f"{k} {v}" for k, v in items.items()) + ".")
w(f"Unchecked (the generator had too few fresh items): {fmt(*agg(lambda d: d['retention']['unchecked']))}.")
w("")
w("| Variant | Claims that rest on a due sub-skill never delayed-checked |")
w("|---|---|")
for v in V:
    w(f"| {v} | {fmt(*agg(lambda d, v=v: d['retention']['claimsRestingOnNeverCheckedDueSubSkill'][v]))} |")
w("")
w("## Recovery targeting")
w("")
rv = lambda key: sum(R[c]["recovery"][key] for c in R)
bys = {k: sum(R[c]["recovery"]["bySubSkill"][k] for c in R) for k in K}
w(f"- Visits where the existing policy requires (competency-wide) recovery: {rv('existingRecoveryVisits')}.")
w(f"  - The proposed policy names a sub-skill on {fmt(*agg(lambda d: d['recovery']['gatedNamesASubSkill']))} of them:")
for k, n in bys.items():
    w(f"    - {k}: {n}")
w(f"- The proposed policy requires recovery on a sub-skill while the existing one does not: {rv('gatedRecoveryWithoutExisting')} visits.")
w("  These are failed sub-skill checks that the competency-wide recovery had already cleared by success elsewhere.")
w(f"- The existing policy cleared recovery while a sub-skill was still in recovery: {rv('clearedWhileSubSkillStillInRecoveryUpperBound')} (upper bound).")
w(f"- The proposed policy claims while the existing one is in recovery, and the failing answer came before the sub-skill's own due date: "
  f"{rv('gatedClaimsDespiteEarlyWrongCheck')}.")
w("")
w("## Additional questions required (lower bound: each one answered right alone on a fresh variant)")
w("")
w("| Variant | Per visit where the existing policy claims and the proposed one does not: n, mean, median, max | Per journey at the first such visit | Per journey at the final visit, not claimed |")
w("|---|---|---|---|")
for v in V:
    def s(key, v=v):
        xs = [R[c]["additionalQuestions"][v][key] for c in R]
        n = sum(x["n"] for x in xs)
        mean = sum((x["mean"] or 0) * x["n"] for x in xs) / n if n else 0
        return f"{n}, {mean:.2f}, {'/'.join(str(x['median']) for x in xs)}, {max((x['max'] or 0) for x in xs)}"
    w(f"| {v} | {s('perVisitWhereExistingClaimsButProposedNot')} | {s('perJourneyAtFirstDisagreement')} | {s('perJourneyAtFinalVisitNotClaimed')} |")
w("")
w("The medians are listed per cohort (A/B/C).")
w("")
w("## Agreement (visits)")
w("")
w("| Variant | Both claim | Only existing | Only proposed | Neither |")
w("|---|---|---|---|---|")
for v in V:
    g = lambda key, v=v: sum(R[c]["agreement"][v][key] for c in R)
    w(f"| {v} | {g('bothClaim')} | {g('onlyExisting')} | {g('onlyProposed')} | {g('neither')} |")
w("")
w("## Where the proposed policy is excessively restrictive")
w("")
w("1. **`gated-typed` is unusable as specified.** It withholds the claim on almost every competent visit.")
w("   - The module's modelling practice and its delayed check are `auleq`, a choice item.")
w("   - Excluding choice items removes almost all modelling evidence.")
w("2. **Recovery on a sub-skill the selector never offers again.**")
w("   - Learners who are strong in every kind stay `recovery-required` on a sub-skill, mostly two-step, because they failed one delayed check earlier.")
w("   - The existing selector never asks for two fresh right answers alone on that sub-skill.")
w("   - This is the largest single reason in the table above.")
w("3. **Never asked, or asked fewer than twice alone.**")
w("   - The existing selector does not require both-sides or brackets.")
w("   - A strong learner cannot be shown on them.")
w("4. **`gated-method` and `gated-slip` behave close to `gated`.**")
w("   - `gated-method` withholds a little more: bare answers and modelling are exempt.")
w("   - `gated-slip` withholds a little more here, because a lone tolerated slip leaves the check pending.")
w("")
w("None of these is evidence that the gate is wrong about the learner. They show that the gate needs a selector that asks for what it requires (07).")
w("")
w("## The proposed policy's remaining false claims")
w("")
w("All of the gated variants' false claims are in cohort C, and all are on profile C04, the negative control for misleading early success.")
w("")
w("- The learner answers every kind correctly, alone, in the first visit.")
w("- Every core sub-skill is genuinely demonstrated at that point.")
w("- The knowledge then decays within days, before any delayed check is due.")
w("")
w("No evidence-based gate can see this before the delayed check, so the gate does not remove it. Only retention catches it.")
w("")
w("## What this does not show")
w("")
w("- It does not show that the proposed policy improves learning. It declares mastery less often.")
w("- Its zero false claims sit beside a large rise in missed competence on histories it did not choose.")
w("- The precision and recall of a gated policy driven by its own selector are untested.")
(here.parents[3] / ".." / "docs" / "subskill-gated-mastery" / "04-s2-comparison.md").resolve().write_text("\n".join(L) + "\n")
print("written")
