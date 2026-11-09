# Verification and Delivery Status
## Course library integration — 9 November 2026

All 61 researched courses/series are now available in Video library with language/topic/level/evidence filters, pagination, full-video/playlist embeds and separate local course notes. Current suite: 95 Node tests pass. Real Edge playlist playback, notes/reload/backup, 320px/390px layouts, standalone catalog/fallback and legacy video/Python regression checks pass. See [course verification](COURSE-VERIFICATION.md), which states precise scope and remaining third-party/course-quality limits. C++ provider code was unchanged; existing local API still reports configured.

## Current C++ setup and evaluation — 1 November 2026

Local C++17 is configured and running at http://127.0.0.1:5174 via `npm start`: GCC 15.2.0 in Ubuntu WSL2 with bubblewrap/seccomp. No paid remote service was used. Local architecture/limits/recovery are documented in [cpp-backend.md](cpp-backend.md).

- Full suite with DSA_CPP_INTEGRATION=1: 72 PASS, 0 FAIL, 0 SKIP, including nine WSL integration scenarios and two nested Python tests for trusted launcher failures.
- All 100 authored C++ coding reference programs compile; 366 declared cases pass under the production compile/run policy.
- Browser C++ Run and Submit: PASS; 3/3 correct cases, 3/3 known wrong-answer failures, real compile diagnostics and safe learner stderr. Updated [browser results](browser-eval/results.json) also cover Python, standalone Python, routes and mobile smoke.
- Local execution tests cover CPU/output termination, memory rejection, no host/home visibility or external networking, fresh storage, read-only root/dev mounts, bounded scratch and denied child-process creation. Missing mount/exec paths remain infrastructure errors.
- Independent review found writable tmpfs and stderr-spoofing defects; regressions reproduced them, then fixes passed. Review also caught an insufficient early setup signal; trusted bubblewrap JSON exit records plus direct executable launch close that demonstrated failure. This does not certify every possible sandbox escape or public-service security.
- Fixed a startup UI defect where the initial unavailable warning remained after the background API check; controller regression and live browser reload confirm availability refresh renders.

Remaining limits: remote Judge0 is still unconfigured/unverified; local runner requires this prepared WSL environment and a running server, has no thread/process spawning, and has not been certified for hostile multiuser workloads. Full accessibility, backup/quota/multi-tab integration and learning effectiveness remain outside this bounded evaluation. Existing unknown-acknowledgement reconciliation limits remain documented.

## Current browser evaluation — 1 November 2026

The local app opens at http://127.0.0.1:5174 in Edge. Port 5173 was occupied by a pre-existing nonresponsive listener; that process was left untouched. README includes the alternate-port startup command. Browser storage is origin-specific, so progress on different ports is separate.

Found and reproduced a real Python startup failure: Chromium rejects module workers created from blob:null URLs in an opaque sandbox, even with an empty worker body. Classic workers start in the same sandbox. runner-host.js now uses a classic worker and dynamically imports the external worker module before forwarding the execution message. The standalone worker loads Pyodide dynamically inside its message handler. The iframe remains sandboxed without allow-same-origin; each case still gets a fresh worker/frame. The browser regression failed with the old implementation and passed after the fix.

Fresh verification:
- Full Node suite: 61 PASS, 0 FAIL, 0 SKIP (including real TCP loopback).
- Content checker: 28 modules / 112 lessons / 180 activities / 100 coding problems, no errors.
- Trusted Python references: 366/366; independent algorithm checks: 483/483.
- Edge 156.0.4314.58: actual Python Run with stdin and Submit with 3/3 cases; draft survives reload; explicit runtime exception; fresh globals/filesystem; infinite-loop timeout; abort and iframe cleanup all PASS.
- All ten main navigation routes render; desktop 1440px and mobile 390px screenshots inspected; no horizontal overflow on the mobile Today page. This is a smoke evaluation, not comprehensive accessibility or usability certification.
- Rebuilt standalone HTML executes actual Python from file://: PASS.
- No uncaught page errors in the browser evaluation. A missing favicon was observed during exploratory browsing and does not affect application execution.
- Planning structural validator: PASS. No learning-outcome claim follows from this.

Repeatable harness: [browser-eval.mjs](../scripts/browser-eval.mjs). Machine-readable evidence: [results.json](browser-eval/results.json), [desktop](browser-eval/desktop.png), [mobile](browser-eval/mobile.png). This session used an existing local Playwright installation and Edge; no packages or paid services were installed.

Still unverified: C++ live provider (unconfigured), all-browser coverage, screen-reader/complete accessibility testing, full import/quota/multi-tab browser integration, learning effectiveness and deployment. The historical restrictions below describe the previous build session and are superseded only for the checks listed above.

## Historical build report
31 Oktober 2026 · Implementation v1.0 · Local build / user acceptance pending

## Verified in this environment
| Check | Observed result |
| --- | --- |
| Full Node suite | 61 total: 60 PASS, 0 FAIL, 1 explicit network SKIP |
| Authored inventory | 28 modules, 112 lessons, 180 activities; 100 coding exercises |
| Content integrity | Unique IDs, backlinks, prerequisites, objectives, checkpoints, hints, sources, coding cases: PASS |
| Trusted Python reference cases | 366 declared cases: PASS |
| Independent algorithm sample | 483 additional checks across 11 problems: PASS; reviewer harness preserved and rerun as scripts/check_independent_algorithms.py |
| View generation | All workspace routes, all lessons and all exercise kinds render without errors under Node; user strings escaped |
| Standalone build | Embedded data/modules, JavaScript syntax parsed: PASS |
| Runtime contract | Stdin EOF and newline boundaries tested; fresh-context protocol and standalone worker branch tested in VM |
| Documentation | Planning validator accepts explicit authorization and catches demonstrated placeholder/total contradictions |

Node/VM view and controller tests are not browser tests. The 483 independent checks do not certify every problem or every C++ implementation.

## Review findings fixed
The independent whole-source review found six Important defects. Each has an executable safe-behavior regression in tests/controller.test.mjs; the pre-fix run had 8 failures and the fix run passed all 9 initial controller tests. Additional lifecycle/accessibility/UX cases were added and run afterward.

| Finding | Disposition and regression |
| --- | --- |
| Standalone about:srcdoc URL resolution | Embedded worker source selected before resolving external worker URL |
| Trace answer exposure | Feedback records exposure after first grading; first correct evidence survives import, exposed retry cannot become transfer |
| Pending C++ ID overwritten | New submission blocked while prior logical job remains recoverable |
| Mutable execution metadata | Session reserved before await; language/source/review metadata frozen; double activation/navigation/stale recovery tested |
| Malformed imported data | Dates, text, settings, optional session/maps/pending records validated before replacement |
| Normal boot stale content | Database load uses version-aware reconciliation; changed completions/checkpoints do not qualify |

Earlier review findings also fixed: old import cannot erase known exposure; unknown reviews do not erase conclusive failures; explanation self-review gate required; contradictory imported transfer evidence cannot qualify; retired reviews cannot hide actionable items; stale cross-connection broker polls cannot resurrect terminal jobs.

Content review fixed an ambiguous C++ overflow checkpoint by declaring operand types. Route-specific prerequisites now agree with interleaving. Additional requirements completed: timer expiry while coding, route-consistent next lessons, early career checkpoint prompt, language/status/difficulty catalog filters, explicit Python weekly retrieval/re-entry mission, and keyboard skip link without breaking routing.

## NOT VERIFIED / integration limits
- Browser controls ended because URL policy could not be enforced confidently. No browser screenshot, visual usability, responsive viewport, screen reader, IndexedDB end-to-end, or real iframe/Pyodide execution claim is made.
- One TCP loopback test skipped on EACCES. Native request-handler integration passed; a usable browser connection was not established.
- Real C++ sandbox provider unconfigured. Provider protocol/resource requests tested at the boundary; live compiler/isolation/billing behavior unverified. C++ source references are reviewed, not compiled.
- Remote Site source sync/publication failed: Git host resolution returned getaddrinfo thread failure. The private Site ID is preserved, but there is no successful deployment.
- Learning-effectiveness, schedule calibration, outside-help detection, and employment outcomes remain unverified. Evidence is personal coaching data, not proctored certification.

## Review and audit record
core-backend-review.md and final-code-review.md preserve original findings. Their snapshot reproduction fixture deliberately describes old failures and should not be used as the current test command. Use the full Node suite above. No second review was used to substitute for the regression tests; fixes were verified by reproducing tests and the complete suite.

## Rulings made
1. Dependency-free ESM/native editor replaced proposed React/CodeMirror because registry DNS was unavailable. Cost: richer editor capabilities may need later integration.
2. Default route interleaves C++ orientation/bridge with Python DSA, with retrieval/re-entry and a sequential setting. Cost: a learner preferring a single-language block should switch route.
3. No paid C++ service without a budget; provide a real configurable adapter and honest unavailable state. Cost: live C++ execution needs provider configuration.
4. Timer-on-coding, route consistency and catalog filters were treated as functional requirement gaps rather than cosmetic review minors and implemented with regressions. Cost: a small increase in implementation surface, covered by the final suite.

No unresolved known material code finding from the final review remains without a regression. Browser/provider acceptance remains an explicit unfinished release gate. No claim that every possible defect has been found.
