# Maths on this device only (device-mode@1)

My Learning Year (maths) was built to need an account server: it stores each learner's record and checks every record it
stores. The hosted demo has no server and no database. device-mode@1 lets the same app run there, free: the learner's record
is kept in the browser.

## How it works

- The app reaches its server through `Api`, which takes the `fetch` it uses. A device build (`build-year.mjs --device`) gives
  it `deviceFetch` (`frontend/src/year/device-api.ts`), which answers the same paths from `localStorage`. The app above it is
  unchanged. A build without `--device` never uses the device store (`OPENPATH_DEVICE` is false and the choice folds away).
- The demo build carries maths only when `OPENPATH_MATHS_ON_DEVICE=1` is set where it is built (`build-english.mjs`). The
  demo server serves it at `/year/`, behind the same password as the rest.
- A learner is added on the device (a first name or nickname). A banner says on every screen that progress is kept in this
  browser only.

## What is different from the server

| | With the server | On this device |
|---|---|---|
| Where the record is | The server's database | This browser's storage; clearing site data, or the demo's "log out and erase", removes it |
| Other devices | Any device, after signing in | None: the record cannot be opened elsewhere and is not backed up |
| Checking a record before it is stored | The server checks every field and refuses what is not valid | Stored as the app made it |
| Grading | The server records its own decision; that is what is shown | The app's own assessment is shown; replay compares the stored answer again |
| Time of a record | The server's clock | The device's clock (a wrong device date moves the one-week delayed check) |
| Educator marks, handover, sharing | Available | Not available (written answers stay unmarked) |
| Two tabs | Second device is told to reload | Second tab is told to reload |

So this is the learning engine as the simulations and unit tests run it, without the server's second check. It is right for
looking at the product and for trying it; it is not where a child's long-term record should live.

## Tests

`frontend/src/year/device-api.test.ts` (6): signed in as this device, add and list learners, append in order, kept across a
reload, stale position and repeats refused, per-learner records, delete, full storage reported. `demo-server.test.mjs` DS-11:
`/year/` is served as its own page only after logging in and only if the build made it. Checked by hand in a headless browser
against the real demo server: log in, open `/year/`, add a learner, choose CISCE Class V (62 skills), answer a question
("Right."), reload (progress kept).

## Not done

- No export or backup of a maths record from the device (English has one).
- No link from the English home screen to `/year/`; it is reached by its address.
- The setup screen still offers "Add my textbook" and goals that were designed with the server in mind; they were not
  exercised here.
