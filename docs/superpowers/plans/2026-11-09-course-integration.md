# Researched course library integration

User instruction: “Please update it and run for me please” after reviewing the 61-course research and the proposed language/topic filters. Execute inline with writing-plans, TDD and verification-before-completion workflows; implementation is authorized without another approval round.

## Design and constraints

Extend Video library with a default Courses tab and a separate existing lesson/personal-video tab. Serve 61 stable course/series records from the researched catalog (41 English, 20 Indonesian; 55 source-inspected and 6 provisional), with source limitations visible. Retain all previous five video IDs, state and backup behavior. Render 12 courses per page; filter language, broad topic, level and evidence, and search title/publisher/topics. Use a dedicated `#courses/id` watch/detail route and the existing privacy-enhanced click-to-load approach for playlists or full videos. Preserve native YouTube controls and external fallback.

Course notes and completion are optional `courseProgress` local records, separately validated and backed up; they never create learning evidence. Full-video bookmarks accept up to 172800 seconds for long courses; playlist position is recorded in notes rather than pretending to track native episode selection. Existing video bookmark limits remain unchanged. No API keys, dependencies, paid services, automatic watch tracking or runner changes.

Use a generated ESM course-data file sourced from the research JSON, pure filtering/embed/progress functions in courses.js, and a separate course view module. Extend routing/controller/styles and standalone module list. This keeps content, pure state rules, rendering, storage and third-party embedding separate. Prefer this small extension over merging playlists into personal-video records or introducing a cloud service.

## Tasks and checks

- [x] Domain/data: tests first for all 61 records matching research, exact YouTube resource validation, categories/filters/pagination, full-video/playlist embeds, progress and legacy/new backup validation. Run RED, implement generator and courses.js, run GREEN.
- [x] UI/controller: failing tests for Courses default, language/topic/provisional labels, pagination links, course detail/notes and click-to-load/unload/route cleanup. Implement views-course.js, extend existing video tabs/routing/controller, retain legacy filters/bookmarks. Run GREEN plus full suite.
- [x] Verify: build standalone; check research/catalog integrity; browser test all61 available across pages, Indonesian/design filters, provisional sources, full-video/playlist mount and actual playback when available, note reload/backup, mobile overflow, existing videos. Inspect screenshots and request a fresh code review. Fix material findings with regressions.
- [x] Deliver: update README/progress/evidence; verify running local server has new modules; open Video library for the user. No push or publish.

Review focus: corrupt/mismatched research URLs; false course verification claims; filter/pagination state loss; active iframe or notes destroyed by background refresh; legacy backup loss; long-course and playlist bookmark semantics; mobile overflow. No unrelated app changes or new provider configuration.

Completion ledger: domain/view/controller assertions observed RED→GREEN; 95/95 full Node suite. Course browser and legacy video/Python browser suites PASS, with real playlist/full-video playback. Screenshots inspected. Fresh reviewer classification findings fixed with regressions; no findings deferred. See docs/COURSE-VERIFICATION.md.
