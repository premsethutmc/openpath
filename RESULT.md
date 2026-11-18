# Branch check for ef0959e22baa66f938f546c8e93b5fa4fcaa941a
run: 44336878667 at 2026-11-18T15:35:58Z
pip_install_exit=0
npm_ci_exit=0
playwright_install_exit=0
english_build_exit=0
migrate_exit=0
e2e_account_parent-content_exit=0
e2e_account_accounts_exit=0

## e2e-parent-content
```
ok 1 - My Words and My Books in a parent account: told where they are kept, saved to the learner's record, practised, progress kept
ok 2 - another phone signed in to the same account sees the list, the book and their progress; another family sees nothing
ok 3 - deleting a list and a book in a parent account: gone from the server record and export, from another phone, and a stale phone cannot bring the list back
# pass 3
# fail 0
```

## e2e-accounts
```
ok 1 - the whole workflow: register, add Arun, assessment, evidence, plan, lesson, progress, sign out and back in
ok 2 - persistence across devices: another phone signed in to the same account sees Arun's whole history
ok 3 - two pupils of one parent keep separate records, and switching between them is clean
ok 4 - authorisation: another parent cannot see, read or change Arun's record
ok 5 - historical replay: a device record made by the PR \#24 app, imported into an account, opens with its results
ok 6 - deleting a pupil, then the account, removes the records from the server
# pass 6
# fail 0
```
