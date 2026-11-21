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
