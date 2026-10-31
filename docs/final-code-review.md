# Final code review

Reviewed 2026-10-31. Scope: new application/controller, runtime bridge, storage/import, progress model, views, reference visualizers, standalone builder, loopback server and C++ broker. Read the project rules, implementation plan, progress ledger and review package, then inspected actual source. Content JSON semantics are being reviewed separately.

Assessment: **changes required before treating the standalone deliverable and six safeguards as complete**. No Critical finding identified. Six Important findings below have concrete source paths and narrow Node reproductions of the actual modules/controller. No implementation files were changed by this review.

Reproduction fixture: `node docs/final-review-repro.mjs`. Executed successfully against the review snapshot and printed all six reproduced findings. Its assertions deliberately describe the broken behavior; it is a reusable fixture to convert into safe-behavior regressions, not evidence that the application passes those regressions.

Browser QA and Python browser execution remain **NOT VERIFIED**. A live C++ provider remains **UNCONFIGURED**. The owner's reported suite/content/reference counts are not browser or provider evidence; this review did not repeat or certify those counts.

## Important findings

### I1. Embedded standalone Python fails before creating its worker

- Location: `dist/runner-host.js:6`, used by `scripts/build-standalone.mjs` and the `srcdoc` branch in `dist/runner.js`.
- The host unconditionally constructs `new URL('./python-worker.js', location.href)` before selecting the supplied embedded `workerSource`. In the standalone `srcdoc` iframe, `location.href` is `about:srcdoc`, which cannot resolve that relative URL. Consequently the self-contained local deliverable reports `Invalid URL` without ever creating a worker, irrespective of CDN availability.
- Reproduction: execute the actual `runner-host.js` in Node `vm` with `location.href='about:srcdoc'`, a parent message listener and a Worker constructor spy; deliver an execute message with a nonempty embedded `workerSource`. Observed: `workerCreated:false`, reply `{type:'error',error:'Invalid URL'}`.
- Fix: resolve the external worker URL only when embedded source is absent, or provide an explicit valid base for that branch. Rebuild the standalone artifact.
- Regression expectation: the embedded-source branch creates its module worker when the frame URL is `about:srcdoc`; the external-source branch still resolves correctly. This unit regression does not replace subsequent real browser/runtime QA.

### I2. Trace answer feedback launders exposed retries into novel transfer

- Location: `dist/app.js:117` (trace activity submission); eligibility calculation in `dist/core.js:8`.
- Every trace submission displays `e.answer.explanation`, including after an incorrect answer. This often explicitly reveals the correct answer, but the controller does not call `recordExposure`. A corrected retry can therefore become `novelTransfer:true`, violating SC-01 even though the app itself supplied the solution.
- Reproduction: actual authored trace transfer `m05-e6` explains `Output -2 -2` after a wrong answer. Calling the same `recordAttempt` flow first with `passed:false`, then with `passed:true`, yields `novelTransfer:true` on the second attempt. The missing exposure call is visible in the controller.
- Fix: record solution exposure after grading the initial answer and before revealing answer-bearing feedback. Preserve it across retries, reload and import, including the family association.
- Regression expectation: an independently correct first submission can retain its legitimate evidence; a wrong answer followed by displayed explanation and a correct retry is recall, never unseen transfer. Reload/import must not restore novelty.

### I3. Starting another C++ run destroys the outstanding job's recovery identity

- Location: `dist/app.js:49` (unconditional `state.pendingRun` replacement); `dist/views-lab.js` run/recover controls; broker active-reservation check in `cpp-broker.mjs`.
- After an uncertain accepted job, the UI still permits Run/Submit. The next attempt replaces and persists the sole `pendingRun` with a fresh request ID before contacting the broker. The broker correctly rejects that second ID with 429 while the original job is active, but the client has already lost the original ID. Recover now requests the never-accepted ID and cannot reconcile the original job. This also follows Stop on a server job that remains active.
- Reproduction: actual controller executed in Node `vm`, starting with `pendingRun.requestId='original-accepted-job'`; injected `runCpp` rejects the new submission as active-job conflict. The resulting persisted state contains a newly generated ID instead of `original-accepted-job`.
- Fix: reconcile/retain an existing logical job before allowing another submission, or maintain separately addressable pending jobs. A rejected replacement must never erase an accepted/uncertain job's payload and ID.
- Regression expectation: unknown/Stop -> new Run -> 429 leaves the original request ID recoverable; recovery reuses it and does not resubmit code. Reload preserves the same result.

### I4. Running submissions use mutable UI language and unsafe lifecycle boundaries

- Location: `dist/app.js:37-60`, particularly `ui.language` reads at lines 46 and 60; enabled language-change handler at line 79; `recover()` at line 67.
- Source is captured once, but runtime choice and recorded language come from mutable `ui.language` after asynchronous waits. The language selector remains enabled during execution. Switching it while Python runs records a Python verdict as C++ evidence; in a multi-case suite subsequent cases can send the captured Python source to the C++ backend. The C++ availability check is only performed before this mutation. The run reservation also occurs after the first awaited save, allowing multiple Run/Submit invocations or navigation to pass the initial guard before the session is established. Recovery has no matching run-sequence guard and can overwrite a newer session's UI/controller on completion or abort.
- Reproduction: actual `app.js` in Node `vm` with a deferred `runPython`, one test expecting `1`, then change `ui.language` to `cpp` and resolve the Python worker with stdout `1`. Observed attempt: `{executed:'python',recorded:'cpp',passed:true}`.
- Fix: create an immutable execution context (exercise, version, source, language, review mode, token, controller) and reserve it before any await. Check that context after persistence and every asynchronous boundary. Use equivalent lifecycle guards for recovery. Disable or safely isolate controls that mutate active execution settings.
- Regression expectation: changing language during a run cannot change any case's runtime or evidence language; double activation creates one session; navigation/Stop while saving prevents execution from starting afterward; stale recovery completion cannot clear or overwrite a newer run.

### I5. Import accepts malformed records that crash views after replacing good data

- Location: `dist/core.js:45-50` and `79`; destructive commit in `dist/app.js` `importFile`; date formatting in `dist/ui.js`.
- `assertRecords` validates only array shape and IDs for notes and career records, without validating fields consumed by views. Optional structures such as `interviews`, `interview` and `reflections` are also spread into state without adequate shape validation. Thus schema-1 malformed/corrupted backups can pass preview and atomically replace valid state with data that crashes routes or subsequent actions. Atomic persistence alone does not make an invalid candidate safe.
- Reproduction: take `emptyState()`, set `notes=[{id:'note-1',title:'Recover me',body:'valid text'}]`, import it with the actual `importState`, then call `extraView({page:'notes'},...)`. Import succeeds; the view throws `Invalid time value` because `at` was never validated. An imported object in place of `interviews` likewise reaches an array-only view path.
- Fix: validate or explicitly normalize every persisted field consumed by the UI before approving/committing the replacement, including timestamps, text fields, optional maps/arrays and pending-job payloads. Reject malformed candidates while leaving current storage untouched.
- Regression expectation: malformed records and optional structures are rejected before `store.write`, current state remains unchanged, and every accepted backup renders all relevant routes and supports the corresponding update operations.

### I6. Normal startup bypasses content-version reconciliation

- Location: `dist/app.js:132`; `dist/core.js:88` mission completion test and line 33 checkpoint eligibility.
- Stale completion/checkpoint handling runs during manual import, but normal boot directly merges the saved database state. After a content update, stored completions retain no stale marker and old checkpoint scores remain eligible. Missions skip revised lessons, views can label old exercises practiced based solely on stale flags, and unchanged exercise evidence can use a superseded lesson checkpoint toward mastery. Exercise-version filtering in `deriveConcept` does not repair lesson completion or checkpoint version drift.
- Reproduction: load state with `completedLessons.l1={version:1,at:1}` and a catalog containing lesson `l1` version 2. The actual `makeMissions` returns `[]`, skipping the revised lesson. Boot contains no version reconciliation step that would alter this result.
- Fix: apply the same version-aware reconciliation on normal database load as on backup import, preserving historical evidence and drafts while excluding superseded evidence from current completion/mastery. Ensure current checkpoint eligibility checks the current lesson version.
- Regression expectation: seed old-version browser state, load revised content through the normal boot path, retain history/drafts, mark revised completions and checkpoint evidence historical/stale, and offer required current work without granting unsupported mastery.

## Deferred minors

- `dist/app.js:74`: interview expiry is processed only while `#interview-timer` exists. A user starts the timer and opens the interview problem, but receives no expiry notification until returning to Interview room. Separate timer state/expiry processing from the visible timer element.
- `dist/dashboard.js` / `dist/core.js` / `dist/app.js`: review missions compute a Python fallback language during C++ outages, but mission links do not apply that language and the editor keeps the previous C++ selection. A user can select Python manually; automatically honoring the advertised fallback would make SC-05 clearer.
- `dist/dashboard.js`: the secondary next-lessons list uses catalog order rather than the selected interleaved order and counts stale completions in the headline total. Align it with the active route/current-content completion semantics after I6.
- `dist/views-lab.js`: Practice search offers text and activity kind, but lacks the specified language/status/difficulty filters. This is a bounded catalog UX completeness gap.

## Evidence boundaries

The narrow Node reproductions exercised actual source with controlled DOM/runtime stubs or direct module calls. They establish the cited control-flow defects, not DOM accessibility, IndexedDB behavior, iframe/Worker security, Pyodide loading, Stop termination, actual C++ execution, or usable deployment. Those remain subject to their documented browser/provider checks. No browser/computer tools, dependency installation, paid services, or implementation edits were used during this review.
