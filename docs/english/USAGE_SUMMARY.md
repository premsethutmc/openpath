# English usage summary (english-usage@1)

*20 November 2026.*

Every simulated-learner finding is a model. This summary is what real children do. At each start of the family
site the server prints, for the last 30 days and for each English activity: how many children used it, on how many
child-days, sittings started and finished, answers and the share right, and the median minutes a sitting takes.
It also prints how many children were active (and in the last seven days) and the median number of days active.

Counts only: no names, no email addresses, no typed words, no writing. It reads the records that accounts sync to
the server; a phone without an account keeps its records to itself and is not counted.

Run by hand: `python manage.py english_usage --days 30`. Code: `backend/family/english_usage.py`.

What to look for: an activity started far more often than finished (children give up), a right share far below
two thirds (too hard) or near all (too easy), and long median minutes (too long for a child).
