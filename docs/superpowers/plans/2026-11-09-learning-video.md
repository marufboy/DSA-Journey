# Guided learning and video implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task in this session. The user approved implementation.

**Goal:** Deliver guided Learn → Check → Practice → Review actions and an integrated curated/personal YouTube library.

**Architecture:** Pure video state and URL normalization in `dist/videos.js`; rendering in `dist/views-video.js`; existing controller and atomic IndexedDB persistence. Preserve the existing evidence engine and runner adapters.

**Tech Stack:** Native browser ESM, HTML/CSS, Node built-in tests; no dependencies added.

**Spec:** ../specs/2026-11-09-learning-video-design.md (approved).

## Global constraints
- Preserve all existing curriculum and evidence safeguards; watched flags never grant mastery.
- Optional schema-1 fields: videos and videoProgress; validate before import commits.
- Maximum 500 personal videos/progress entries, notes 10000 characters, resume 0–86400 seconds.
- Click-to-load privacy-enhanced iframe; no autoplay, thumbnails, arbitrary embed URLs or new paid services.
- Support HTTP playback and honest file/blocked-video fallback.

## Review focus
- Malicious/lookalike URLs and imported metadata cannot introduce active HTML or arbitrary iframe origins (Task 1/2 tests).
- Restoring old/new backups preserves existing evidence and valid personal notes (Task 1).
- Background status refresh and failed saves must not clear player/unsaved video inputs (Task 3/browser).
- Navigation/unload removes the active player, including same-video navigation (Task 3/browser).
- Mobile video controls meet 200px minimum and do not overflow (Task 4/browser).

### Task 1: Video domain and persistence
**Files:** create dist/videos.js, tests/videos.test.mjs; modify dist/core.js.
**Interfaces:** parseYouTubeUrl(text) → videoId; curatedVideos array; allVideos(state) → resources; addVideo(state,input,catalog,now) → copied state; saveVideoProgress(state,id,input,now) → copied state; removeVideo(state,id) → copied state; validateVideoState(state) throws on invalid optional fields.
- [x] Write tests covering accepted URL forms, exact hosts, invalid/credential URLs, bounds, duplicate handling, curated immutability, old-backup defaults, round trips, malformed import rejection, and evidence isolation.
- [x] Run `node --test tests/videos.test.mjs`; expect failure for missing feature.
- [x] Implement pure functions and seed five publisher-linked videos; wire import validation and defaults.
- [x] Rerun domain tests; expect zero failures.

### Task 2: Lesson and library views
**Files:** create dist/views-video.js; modify dist/views.js, dist/styles.css; extend tests/views.test.mjs.
**Interfaces:** videoView(route,ctx) → HTML; lessonVideos(lesson,ctx) → HTML; render from existing shell; use Task 1 allVideos/state data.
- [x] Write failing views tests for guided actions, video navigation, library filters/empty states, escaped metadata, watch controls and lesson fallback.
- [x] Run `node --test tests/views.test.mjs`; expect new assertions to fail.
- [x] Implement accessible catalog, add form, watch/notes/bookmark form, lesson resources and guided actions.
- [x] Rerun view and video tests; expect zero failures.

### Task 3: Controller, embed lifecycle and delivery policy
**Files:** modify dist/app.js, server.mjs, scripts/build-standalone.mjs, tests/controller.test.mjs; create tests/video-server.test.mjs.
**Interfaces:** controller calls Task 1 functions; view renders player placeholder; load-video mounts iframe in place; unload/navigation clears it. Only fixed youtube-nocookie frame origin allowed by server.
- [x] Write failing controller tests for add/save/delete and load/unload, invalid form preservation, no evidence mutation, background refresh preservation; server test for narrowly extended CSP.
- [x] Run targeted tests and confirm failure.
- [x] Implement actions and forms, non-interrupting background C++ check, fixed embed construction with strict-origin-when-cross-origin referrer, HTTP/file fallback and standalone module inclusion.
- [x] Rerun targeted tests; expect zero failures. Build standalone with `node scripts/build-standalone.mjs`.

### Task 4: Browser QA, review and delivery
**Files:** create scripts/video-browser-eval.mjs, docs/VIDEO-VERIFICATION.md; update README.md and docs/PROGRESS.md.
- [x] Run full Node suite, content check, syntax/diff checks and standalone build.
- [x] Browser test personal add/reload, manual bookmark/notes, backup restore, click-load/unload/navigation, lesson→video→practice, mobile overflow and standalone fallback. Inspect screenshots. Attempt real playback and record exact result separately.
- [x] Have a fresh reviewer check final implementation against PRD; fix material findings with failing regressions first.
- [x] Record requirements-to-evidence and any environmental limits. Leave changes reviewable locally; no publish/push requested.

## Execution ledger
Ruling: Work on a feature branch in the requested app checkout, which contains only this task's untracked PRD; no separate checkout or dependency installation is needed. Cost if wrong: branch switching shares these local files.
Ruling: Execute inline as requested by "Approve PRD and implement"; do not add another plan approval gate. No push/publish or paid service is authorized.
Pre-flight: Task 1 pure functions are consumed by Tasks 2/3; names above are binding. Task 3 module list must include Task 1 before core.js and Task 2 before views.js. No interface conflicts.

Task 1: complete — domain tests RED→GREEN, optional backup fields and strict metadata validation implemented.
Task 2: complete — views tests RED→GREEN, all lesson views and video routes render.
Task 3: complete — controller/CSP tests RED→GREEN; standalone modules bundled.
Task 4: complete — 83 Node tests pass; content/syntax/build checks pass; browser checks and real playback pass; screenshots inspected. Four material reviewer findings fixed with regressions. Evidence: docs/VIDEO-VERIFICATION.md and docs/video-eval/report.json.
Final review: fresh read-only reviewer; no unresolved findings after one regression-backed correction pass. No push, merge, or publish performed.
