# 1. Six versioned learner profiles

Profiles are in `profiles/S00x.json`, schema `synthetic-learner-profile@1`, version `1.0.0`. `src/profiles.ts validateProfile` checks every file when it is loaded.

**All numbers are synthetic, configurable parameters.** Each was chosen so that its profile behaves as its one-line description says. None is an empirical statistic about real students. None was tuned against OpenPath's decisions or scores. The only post-hoc changes were made so a profile would match its own description: S001's skills were raised and its slip rate lowered from 0.04 to 0.02, so that "occasional slips" holds; S005's skills were raised; and S002 gained one error OpenPath has no explanation for, so that errors are not limited to OpenPath's catalogue.

| | S001 Strong | S002 Struggling beginner | S003 Procedural | S004 Guesser | S005 Careless | S006 Forgetful |
|---|---|---|---|---|---|---|
| Starting skill: one-step / two-step / both-sides / brackets / modelling | .99 .98 .96 .95 .92 | .45 .20 .10 .08 .15 | .96 .93 .25 .20 .45 | .60 .40 .30 .25 .30 | .98 .97 .95 .94 .90 | .70 .45 .30 .25 .35 |
| Misconception tendencies (strength 0–1) | none | inverse-operation .5, added-not-subtracted .55, forgot-divide .45, only-one-side .6, first-term-only .6, model-swap .6, divide-wrong-way .2 | only-one-side .45, x-sign-kept .35, first-term-only .5, bracket-sign .45 | forgot-divide .2, only-one-side .2 | none | added-not-subtracted .3, only-one-side .35, first-term-only .35 |
| Slip chance per step | .02 | .12 | .04 | .08 | **.18** | .06 |
| Guess chance (does not engage) | 0 | .05 | 0 | **.5** | 0 | 0 |
| Right answer with invalid working | 0 | 0 | 0 | **.5** | 0 | 0 |
| Working style: full / partial / bare / none; unsupported notation | .6/.1/.2/.1; .1 | .5/.2/.2/.1; .25 | .75/.1/.1/.05; .1 | .15/.15/.5/.2; .2 | .7/.1/.15/.05; .05 | .55/.15/.2/.1; .1 |
| Hints: chance of asking (× (1 − skill)); help when a hint is shown | .1; .2 | .7; .25 | .3; .2 | .2; .1 | .05; .1 | .4; .25 |
| Instruction: full / partial; gain; fragile share | .7/.2; .6; .3 | .25/.35; .4; .6 | .5/.3; .55; .4 | .2/.3; .3; .7 | .6/.25; .5; .3 | .7/.2; .65; **.8** |
| Misconception change after its own explanation: chance; size | .9; .8 | .35; .5 | .6; .7 | .4; .5 | .8; .8 | .7; .7 |
| Practice: consolidation; gain if right / wrong | .5; .05/.02 | .25; .03/0 | .4; .04/.01 | .2; .02/0 | .5; .04/.01 | .15; .03/0 |
| Forgetting: half-life (days); floor; fragile half-life; relapse | 180; .85; 30; .05 | 21; .1; 4; .4 | 90; .2; 10; .2 | 45; .2; 5; .3 | 150; .8; 20; .05 | **6; .25; 2; .6** |
| Seed | 1001 | 2002 | 3003 | 4004 | 5005 | 6006 |

The five covered kinds are one-step, two-step, variables on both sides, brackets, and modelling (choosing an equation for a story, or forming and solving one). Response to recovery is not a separate parameter. It is the same instruction-and-practice model, applied after forgetting, so recovery can succeed or fail (tested).
