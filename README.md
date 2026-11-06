# Branch archive, 2026-11-06

Every branch listed in ARCHIVE-INDEX.tsv was deleted from GitHub on 2026-11-06 to tidy the repository.
No work was lost: this commit has every one of those branch heads as a parent, so all their commits stay
reachable from this branch. To restore any branch exactly:

    git fetch origin archive/branches-2026-11-06
    git branch <name> <commit from ARCHIVE-INDEX.tsv>
    git push origin <name>

`contained_in` shows which kept branches already contained the branch at archive time
(main, 112 = consolidation/openpath-candidate, 115 = integration/v3-from-112, dr8 = research/dr8-candidate).
Do not merge this branch anywhere; it exists only to keep the history.
