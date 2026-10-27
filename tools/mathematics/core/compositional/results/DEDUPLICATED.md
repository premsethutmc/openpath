# Deduplicated evidence

These files were byte-identical copies of another file in this directory; the copy was removed from the repository, the content is unchanged and still stored once. Restore any of them with `cp <kept> <removed>`; the SHA-256 proves they are the same bytes.

| Removed path (under results/) | Same bytes as | SHA-256 | Why this copy was removed |
|---|---|---|---|
| `composition.merged.jsonl` | `firstpass/composition.merged-before-fix.jsonl` | `25baf47f17ecf2ada090760cb07486fa67a9a5418d765cae6d521928d590439e` | byte-identical; the firstpass copy keeps the failure-history name |
| `firstpass/judged-before-fix.json` | `judged.json` | `cc6b34cd88ae94b2e65a9e9b4a5b5b134fcadc687e3e2ff36ca74a8e8c2425fa` | byte-identical; judged.json is read by summarize.py |
