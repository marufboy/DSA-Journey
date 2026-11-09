# Guided learning and YouTube verification

2026-11-09 · Asia/Makassar · feature branch `feat/guided-learning-videos`.

The user approved the [PRD](superpowers/specs/2026-11-09-learning-video-design.md) with “Approve PRD and implement”. Implementation follows the [plan](superpowers/plans/2026-11-09-learning-video.md). Research sources, alternatives and design principles are recorded in that PRD.

## Result

Implemented guided lesson actions, related videos, a searchable/filterable curated and personal library, click-to-load privacy-enhanced YouTube playback, manual notes/bookmarks/watched status, personal-link removal, and legacy-compatible backup validation. Existing curriculum and runner interfaces remain intact.

| Requirement | Evidence |
| --- | --- |
| LV-01 guided learning | All 112 lesson views render; guided-anchor controller regression; browser lesson → checkpoint focus → video → practice navigation. |
| LV-02 lesson resources | View assertions for curated lesson links and uncurated empty state; five publisher-linked videos in `dist/videos.js`, with attribution/language/learning prompts. |
| LV-03 library/search | View filters and browser personal-only/search-empty cases; navigation and desktop/mobile screenshots. |
| LV-04 own links | Domain tests for watch/shorts/live/embed/youtu.be URLs, exact HTTPS host allowlist, credentials/port/ID rejection, duplicate handling, bounds and import type checks; browser invalid link preserves form, valid link persists. |
| LV-05 playback | Fresh Edge context recorded no YouTube requests before activation. Explicit activation mounted one youtube-nocookie iframe; CS50P video played past 2 seconds with `paused=false`. Unload/navigation removed it. Fixed-origin/referrer and server CSP tests pass. File artifact presents localhost/external fallback. |
| LV-06 notes/bookmarks | Browser saves notes, 73-second bookmark and watched flag; reload restores all; resumed embed URL uses `start=73`; saving leaves active player mounted. Offline notes survive subsequent reload. Domain bounds and invalid input tests pass. |
| LV-07 removal/evidence | Confirmed deletion then restoration through UI; domain/controller tests and exported backup show video actions create no attempts or mastery evidence. |
| LV-08 persistence/backups | Domain legacy/current round trips, malformed-data atomic rejection, unknown-field rejection and historical lesson association; actual browser export → delete → import restores notes/bookmark. No storage warnings in final browser run. |
| LV-09 responsive/error behavior | Inspected desktop/mobile library and watch screenshots; 390px viewport overflow and iframe dimensions checked; 200-character unbroken title/publisher wraps. Keyboard lesson-anchor focus is verified. Offline note save and external fallback remain usable. This is bounded QA, not a full WCAG audit. |

## Commands and results

- `node --test tests/*.test.mjs`: **83 passed, 0 failed, 0 skipped**. Baseline was 64 tests. The explicit WSL integration environment flag was not enabled; compiler/sandbox code did not change.
- `node scripts/check-content.mjs`: **PASS** — 28 modules, 112 lessons, 180 activities, 100 coding activities, 366 declared Python cases, no content errors. This command validates the catalog; it does not execute all 366 reference cases.
- `node --check dist/app.js`, `dist/videos.js`, `dist/views-video.js`: **PASS**.
- `node scripts/build-standalone.mjs`: **PASS**, all 112 lessons/180 activities bundled and JavaScript parsed. Artifact: `artifacts/DSA-Journey.html` (ignored generated deliverable).
- `node scripts/video-browser-eval.mjs PATH_TO_EXISTING_PLAYWRIGHT`: **PASS** in installed Edge with fresh browser storage. See [machine-readable results](video-eval/report.json). Includes actual Python Run output `Halo, Rani!` following video → practice navigation. No page errors.
- `git diff --check`: **PASS**.

Browser command used the installed Playwright package under `C:/Users/Afif/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` and `BROWSER_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. No package installation was required. The script cleans its own ephemeral server, SQLite jobs and temporary browser context.

## Review and corrections

A fresh read-only reviewer inspected the implementation against the PRD and ran 37 targeted tests. The four material findings were reproduced and fixed:

1. Redundant saves during pagehide could race the next document's revision read; import replacement also bypassed the queue. Durable-state fingerprints now skip unchanged writes, and import replacement uses the same queue. Regressions verify unchanged pagehide writes are skipped, changes still save, and replacement waits for pending writes. Final browser checks assert absence of storage-conflict warnings.
2. Regex coercion accepted numeric/array video IDs in imports. Validation now requires an actual string; both reproductions reject before replacement.
3. A 200-character unbroken personal heading caused a 3520px scroll width on a 390px screen. Watch headings now wrap; the browser regression passes at 390px.
4. Delayed Add completion could redirect after navigation. The controller captures the inserted ID and checks route/generation/form identity before redirecting. Regression verifies the learner's new route remains active.

An additional self-review regression rejects extra personal metadata, preventing imported records from spoofing curated publisher/source fields. All corrections were verified RED → GREEN before the final full suite. No unresolved review findings are deferred.

## Screenshots and limits

- [Library desktop](video-eval/library-desktop.png), [library mobile](video-eval/library-mobile.png)
- [Watch desktop](video-eval/watch-desktop.png), [watch mobile](video-eval/watch-mobile.png)

Playback is demonstrated for the CS50P functions/variables video on this machine/network in Edge. This is not a promise that every current/future YouTube video is available or embeddable. The other seed IDs were traced to official CS50/MIT publisher pages; playback of all five was not certified. YouTube can serve ads, change availability or require its own interaction. Privacy-enhanced mode does not mean zero third-party traffic after loading. Notes/bookmarks/watched flags are manual and local to the current origin; export is needed for portability. No automatic watch tracking, cloud synchronization, new paid service, or public deployment was added. Full accessibility, hostile multiuser execution and learning efficacy remain outside this feature's bounded checks.
