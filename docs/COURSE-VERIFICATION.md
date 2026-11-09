# Course library integration verification

2026-11-09 · user requested implementation and startup after reviewing the research catalog. [Plan](superpowers/plans/2026-11-09-course-integration.md) · [Research](research/course-library/README.md).

## Delivered behavior

- Default Courses tab in Video library: **61 entries, 41 English, 20 Indonesian**. Every card links to its detail page, primary source and exact YouTube resource. **55 source-inspected / 6 provisional** status is preserved from research; no course is represented as playback-certified merely because a source opened.
- Search plus language/topic/level/evidence filters, 12 results per page, and preserved filter/page return links. Topics include SOLID/design principles, patterns, architecture and testing. Supplementary SOLID/DRY/YAGNI readings are clearly outside the course count.
- Click-to-load privacy-enhanced native YouTube playlists/full videos, explicit unload, navigation cleanup, external fallback and HTTP/file-origin handling.
- Separate optional schema-1 `courseProgress` records: notes, manual full-video bookmarks (0–172800 seconds), self-reported completion, timestamp. Playlist bookmarks use episode notes and zero timestamp rather than claiming automatic tracking. Existing video/personal records, limits and backups remain supported. Course activity never grants exercise/mastery evidence.
- Existing five lesson videos and personal links remain in **Video pelajaran & pribadi**. Static generated ESM data is sourced from the research catalog and included in standalone HTML. No dependencies, paid services, new account or runner changes.

## Verification evidence

| Check | Result / scope |
| --- | --- |
| `node --test tests/*.test.mjs` | **95 pass, 0 fail, 0 skip.** Includes 12 new tests over the preceding 83-test video feature. Optional WSL integration flag was not enabled; compiler behavior did not change. |
| Course data fidelity | All 61 records match the source catalog for identity/title/language/source/YouTube/evidence; unique IDs; fixed media-resource parser rejects unsupported hosts, credentials, arbitrary channels and malformed resources. |
| Domain filters and progress | Combined filters, all six pages, empty/invalid/clamped page values, categories, long-bookmark bounds, unknown/prototype-like resource keys, immutable progress, legacy defaults and new backup round trips. Invalid progress rejects before replacement; attempts/checkpoints/reviews/exposures remain unchanged. |
| Views/controller | Default/legacy tabs, source labels, escaped notes, detail routes, preserved return page, playlist/full-video mount/unload, file fallback, failed validation, background C++ refresh preserving course inputs/player. |
| Content validation | `node scripts/check-content.mjs` PASS: 28 modules / 112 lessons / 180 activities / 100 coding activities, no errors. This check does not execute every reference case. |
| Build | `node scripts/build-course-data.mjs` and `node scripts/build-standalone.mjs` PASS. Standalone JS parses; generated HTML includes all course modules and existing curriculum. |
| Course browser QA | [Results](course-eval/report.json): all 61 reached across six pages, Indonesian filter and page return, principles filter, six provisional labels, empty search, playlist lifecycle/notes reload, 100000-second full-video bookmark, real export/import, evidence isolation, layouts at 390px and 320px, legacy-video tab, standalone catalog/file fallback, no page errors. |
| Actual playback | Fresh Edge context loaded the CS50P playlist and played its Introduction past two seconds. This proves one current playlist, not all 61 upstream resources. |
| Legacy browser regression | [Video results](video-eval/report.json): personal add/notes/reload/export/delete/import, offline notes, full-video playback past two seconds, Python Run after video→practice navigation, filters/mobile/file fallback and no storage warnings all pass after integration. |
| Local running instance | `http://127.0.0.1:5174/course-data.js` responds 200 with the generated data; `/api/status` reports the existing configured local WSL provider. Source server reads updated static modules without a restart. |

Both browser scripts used installed Playwright and Edge with fresh isolated storage and ephemeral test servers. They did not alter the user's real progress. The persistent app remains on the established 5174 origin.

## Review and corrections

Premerge review (2026-11-09): independent review found no critical or important issues. Its minor finding about stale storage warnings was reproduced with a failing controller regression and fixed: form feedback now uses the current queued save result, including temporary storage unavailability. Successful retries no longer report unsaved notes or prevent the add-video redirect. The final suite has **96 passing tests, 0 failures, 0 skips**. No unresolved review findings remain.

A fresh read-only reviewer inspected the course integration and ran 42 targeted tests. No critical or important issue was reported. The coordinator treated the reported topic-classification defects as functional filter issues and fixed them with regressions: `shortest paths` no longer matches `testing`, and Docker now appears under Tools & deployment. An additional regression rejects unknown/prototype-like progress IDs before assigning records. Final full suite passes; no findings deferred.

Browser QA reproduced a 375px scroll width on a 320px screen: the player's 16:9 ratio transferred its 200px minimum height to a 356px automatic width. A definite `width:100%` now respects the parent width while retaining minimum height. Browser checks at both 320px and 390px pass. A failing view regression also pinned filter/page restoration before correcting the return-link helper.

## Screenshots and limits

[Library desktop](course-eval/library-desktop.png) · [Library mobile](course-eval/library-mobile.png) · [Course desktop](course-eval/course-desktop.png) · [Course mobile](course-eval/course-mobile.png). Screenshots were inspected; this is not a full WCAG or all-device audit.

Upstream videos can disappear, become private, require YouTube interaction or block embedding. Research status is source metadata evidence, not a full-course accuracy/completeness/quality review. Six entries remain provisional. Suggested practice is original curator guidance and may need a language/tool environment beyond the app's Python/C++ runner; cloud labs can carry costs. Course completion is manual self-report. No automatic episode tracking or cross-device sync was added, and no public deployment was performed.
