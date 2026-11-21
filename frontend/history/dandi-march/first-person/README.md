# Walk to Dandi: cinematic first-person lesson

Open `index.html` through a static server. For one offline file, run `python3 package.py Walk-to-Dandi-Journey.html` from here. No sign-in, microphone, telemetry, model calls or external media. Both video encodes remain unchanged from the accepted web cut.

1. Watch the genuine opening, then walk from a child’s viewpoint near Aslali. Walk/Stop control progress. Looking right or swiping to the companion makes “Why salt?” available, with a caption and a pouch reveal. The prototype scratch voice was removed; all speech is caption-only. Sound still enables the opening score, footsteps and surf.
2. Walk far enough to pass the village and see the spectators. The route can also be opened at any point. In the route view, choose a marker to see what happened there. The Mahi crossing shows how far the march extended beyond day one.
3. At Dandi, arriving on 5 April and witnessing the symbolic salt action at dawn on 6 April are separate. The ending compares the Gujarat and Vedaranyam routes and provides optional causes and aftermath.

The digital child and companion are fictional, not members of the original group. OpenPath uses photographic-style stills with in-engine camera movement, not full 3D. The coastal hand is a symbolic reconstruction. The archival opening is not synthetic and no historical dialogue is invented. Archive credit: [Wikimedia/GandhiServe Salt March compilation](https://commons.wikimedia.org/wiki/File:Salt_March.ogv), listed there as public domain in India and the US. The original archive soundtrack is not used. The approved standalone opening film remains unchanged.

## Teaching and provenance

- [Gandhi Heritage Portal itinerary](https://www.gandhiheritageportal.org/dandi-march-details): March 12 Sabarmati/Aslali, March 19–20 Mahi/Kareli, April 5 Dandi arrival, April 6 salt-law breach. Route is explicitly schematic and omits unverified details of the crossing. The opening does not establish the exact site of each historical shot.
- [Gandhi’s 2 March letter, reproduced in Sushila Nayar, vol. VI](https://www.mkgandhi.org/ebks/Mahatma-Gandhi-Sushila-Nayar-volume6.pdf): basis for the fictional companion’s explanation of the salt tax.
- [Tamil Nadu Archives, print p. 45](https://tamilnaduarchives.tn.gov.in/UPLOAD/PUBLICATION/PDF/6.pdf): Rajaji’s group left Tiruchirappalli on 13 April, arrived at Vedaranyam on 28 April, and went to collect salt on 30 April. Tamil Nadu Class 10 Social Science, Vol. 2, §9.5(b), p. 63 covers this episode and local support.
- [CISCE Classes VI–VIII](https://cisce.org/wp-content/uploads/2025/03/UpperPrimary.pdf): Class VIII freedom struggle, causes and impact. [ICSE Class X](https://cisce.org/wp-content/uploads/2026/01/5.-History-Civics.pdf#page=4): Dandi, campaign and political context. [CBSE Class X](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/SocialScience_SecP1X_2026-27.pdf#page=7): Dandi in map work. Covers a case study, not the full chapter or examination preparation.

## Checks

From `frontend`: `node --test history/dandi-march/first-person/journey.test.mjs`, then `node --test --test-timeout=65000 e2e/history-dandi-first-person.test.mjs` with Playwright Chromium installed. The latter tests film playback, gestures via touch controls, stop/resume, the route and two coast dates, the ending, silence/reduced motion, visibility interruption, and replay. Browser emulation does not substitute for a physical Android test or listening review.
