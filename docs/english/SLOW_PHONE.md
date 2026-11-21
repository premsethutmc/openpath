# slow-phone@1: opening the English app on a cheap phone (21 November 2026)

`frontend/scripts/slow-phone.mjs` serves the built app compressed (as the real server does) and opens it in Chromium
at 360×740 with the CPU slowed four times and the network held to "Slow 4G" (1.6 Mbps down, 150 ms round trip).

| | Sent | Until "Let's begin" can be tapped |
|---|---:|---:|
| First visit | 944 kB | 6.1 s |
| Later visit (browser's copy checked, not downloaded) | 0 kB | 1.2 s |

The script is one 5.6 MB file (about 0.9 MB compressed) because all practice content is built into it. On a slower 3G
line (0.4 Mbps) the first visit would take about 20 seconds. If real families find the first open slow, the next step
is to load each activity's content only when it is opened.

Version 2 (same day): the build now writes best-quality compressed copies of the script, styles and spelling list
(`file.br`, which the server sends as they are), and leaves out the generated spelling questions' "rationale" notes,
which the app never shows. First visit: 826 kB, 5.5 s (was 944 kB, 6.1 s); later visit 1.1 s. Getting to about 2 s
needs the practice content loaded only when an activity opens; most of the script is the spelling bank (1.7 MB) that
the progress engine reads at start, so that is a change to how the engine starts, not a build setting.
