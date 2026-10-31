# Swiss-Cheese Review — DSA Journey
Review pack v0.3 · 31 Oktober 2026 · DESIGN RISKS, NOT APPLICATION BUGS

## Verdict
Historical review notice: [12-IMPLEMENTATION-ADDENDUM.md](12-IMPLEMENTATION-ADDENDUM.md) records the user's subsequent authorization of implementation and all six safeguards. The original latent-risk analysis and proposed experiments below are retained; implementation work does not itself prove each risk closed.

CONDITIONAL for end-to-end implementation readiness. Six material failure chains require explicit safeguards at the gates below. No application exists, so these are latent design risks identified by scenario analysis, not reproduced runtime defects. The earlier structural/document PASS was narrower and remains historical evidence; it did not prove learning effectiveness or close these chains.

User requested a challenge to the plan. The owner performed controlled document mutations; an independent validator agent reread the specifications adversarially without editing them. This report preserves the findings rather than silently redefining the product. Proposed mitigations below are amendments for review, not implemented protections.

## Why several passing layers can fail together
A test may measure code output correctly while the runtime supplies missing state. The mastery engine may correctly count that test while the learner is recalling an exposed solution. The dashboard may then accurately display the resulting state while communicating more confidence than the evidence supports. Each component obeys its local rule; the end-to-end inference is still wrong.

## SC-00 — Structural PASS cannot establish meaning
**Evidence: demonstrated document-checker limitation.** In temporary copies of the v0.2 pack:
- Baseline: 44 PASS / 0 FAIL.
- Replace FR-10 acceptance evidence with TODO: still 44 PASS / 0 FAIL.
- Change curriculum narrative target to 999 lessons while the table remains 112: still 44 PASS / 0 FAIL.

See [adversarial-checks.json](adversarial-checks.json). Original inputs were not mutated. The script checks known structural assertions, not every narrative claim or semantic adequacy. This is a limit of the checker, not evidence that the application is broken.

**Action:** retain automated checks but require independent cross-layer review. Strengthen obvious placeholder/narrative consistency checks when revising the validator; do not relabel that improvement full semantic validation. Do not use a PASS badge without stating its scope. A new substantive audit can legitimately find gaps after an earlier PASS.

## SC-01 — Memorized solution counted as new independent skill
**Severity / gate:** MAJOR, before R1 mastery implementation.

**Evidence:** PRD section 7 requires independent exercises and delayed review; Architecture section 5 stores hints on Attempt; UI records solution use as assisted. Exposure history across attempts, versions, and languages is unspecified.

**Chain:** read solution → assisted attempt correctly recorded → open a fresh attempt later → reproduce memorized answer without opening hints → automated pass → count as independent transfer evidence. Delaying the same exposed solution does not by itself demonstrate transfer to an unfamiliar problem.

**Proposed amendment:** distinguish independent recall from independent transfer. Record solution exposure by activity family/version across attempts and language bridge. Recall remains valuable; it is not novel-transfer evidence. Require an unexposed, reasoning-distinct variant before claiming transfer; avoid permanently penalizing a learner for legitimately reading a solution. Outside assistance cannot be reliably detected and should use honest self-report, not fake proctoring.

**Acceptance experiment:** open solution, retry after seven days, reload, and round-trip backup. The retry can count as recall, but must not satisfy novel transfer. A distinct unexposed variant may supply transfer evidence. Check that content coverage actually offers that variant.

## SC-02 — Warm Python session passes an invalid standalone program
**Severity / gate:** MAJOR, before R1 runner/grading release.

**Evidence:** Architecture section 3 resets globals after Stop, but defines neither clean Submit context nor isolation between grading cases. Acceptance section 4 tests Stop/restart, not grading equivalence after previous Runs.

**Chain:** Run defines variable/import/file → learner removes its definition → Submit reuses worker state → program passes with inherited state → correctness/mastery accepted → same source fails fresh execution.

**Proposed amendment:** Submit must grade source in a clean, specified environment independent of playground Runs. Define per-case reset semantics, stdout/input isolation, and package/module/file effects; clearing a globals dictionary alone is not automatically sufficient. Runtime caching for startup performance must not cache user-program state into grading.

**Acceptance experiment:** seed a Run with a name, then Submit source relying on it without definition. Warm and cold Submit verdicts must match. Repeat with mutable module state and a file left by a prior case. Restarting the app must not change the verdict for fixed source/input/runtime.

## SC-03 — Valid backup conflicts with ordinary content revisions
**Severity / gate:** MAJOR, before first content revision/import compatibility release.

**Evidence:** Architecture sections 5–6 version content and validate references; Acceptance section 10 covers database-schema migration. Content can change while database schema remains 1. The reconciliation policy is missing.

**Chain:** export valid backup → revise/retire exercise under same schema → import checks references against current content → reject otherwise recoverable history OR attach old evidence to new criteria → lost recovery or unsupported mastery. Atomic transactions prevent partial writes, not incorrect compatibility decisions.

**Proposed amendment:** preserve historical attempts/drafts with their original versions; unavailable activities remain historical/orphaned records rather than silently dropped. Mark materially changed evidence stale and request reassessment. Do not inherit mastery for changed criteria. Distinguish syntactically broken references from legitimate retired-content references. Choose whether to bundle archived content or support history-only recovery.

**Acceptance experiment:** export, materially revise one exercise and retire another, then import using the same schema. Preserve recoverable drafts/history; no unsupported mastery and no silent record deletion. Invalid data still fails atomically.

## SC-04 — Lost job response makes status recovery impossible
**Severity / gate:** MAJOR, before R2 API design is finalized.

**Evidence:** Architecture section 3 provides requestId, optional jobId, unknown state and no-duplicate goal. Recovery by requestId and durable idempotency are not defined. UX says check status before retry, but the needed ID may have been lost.

**Chain:** backend accepts job → response containing jobId disappears → reload loses client memory → status query cannot locate job → retry creates duplicate compute/billing OR interface waits forever. One active client job does not establish backend idempotency across reload/tabs.

**Proposed amendment:** persist a client-generated idempotency key before send; backend durably maps authenticated owner + key to one logical submission. Replaying the same key/body returns the same logical job; conflicting payload gets an explicit conflict. Define persistence/retention, provider failure reconciliation and safe expiry rather than promising exactly-once third-party execution without provider support. Unknown infrastructure outcome must not become a failed learning attempt.

**Acceptance experiment:** lose first response after acceptance, reload and retry same key, including another tab. Recover one logical submission and eventual result. Test lost provider acknowledgement separately; document remaining provider-dependent limitations and cost bound.

## SC-05 — Language bridge and review compete for scarce learning time
**Severity / gate:** MAJOR, before locking the learning route.

**Evidence:** Curriculum sections 2,6,7 prescribe sequential modules 01–08, 80–110 hours of C++, capped reviews in short sessions. Both language evidence and Python runner can work correctly while the recommended learning route stalls.

**Chain:** finish Python → spend months on C++ bridge → Python retrieval grows overdue → short sessions repeatedly serve bridge or review → one displaces the other → Python retention or forward progress declines. C++ outage adds friction. Free preview avoids a hard technical lock, but does not supply a coherent learning plan.

**Proposed amendment for user choice:** keep Python foundations; add a short C++ orientation, then interleave selected bridge lessons with Python DSA, OR keep the sequential route with an explicit weekly Python retrieval budget and re-entry diagnostic. Preserve both languages in the curriculum. During C++ outage recommend available Python retrieval/concept work and label local execution evidence unverified until checked. Do not force a pedagogical route change silently.

**Acceptance experiment:** walk through four weeks of 15-minute weekdays, a backlog, and a seven-day C++ outage. Mission planner must provide achievable work, preserve both language evidence, show deferred load, and avoid silent skip or perpetual review-only recommendations. Pilot with the actual learner before treating the 600–800h estimate as calibrated.

## SC-06 — Career mismatch discovered after most learning investment
**Severity / gate:** MAJOR, before locking the full career route; not a blocker to a foundation pilot.

**Evidence:** Decisions D-02 is broad SWE; Curriculum sections 5–7 permit projects/interview earlier, but lack scheduled role/level-fit checkpoints. Career modules are 25–28. No hiring guarantee is honest, but does not create course correction.

**Chain:** broad aspiration → general curriculum for many months → DSA evidence improves → target role/level/market chosen late → missing engineering/project/communication evidence discovered → substantial additional preparation.

**Proposed amendment:** early lightweight role/level/location preference checkpoint after foundations, then evidence review after core patterns. Map a small set of current representative job requirements to milestones and projects; distinguish eligibility/experience from skills learned in the app. Revisit when goals change. No recruiting integration, auto-apply, or offer prediction is needed.

**Acceptance experiment:** for one user-chosen role profile, show evidence required, where curriculum supplies it, gaps outside scope, and what changes if the target becomes SDET or backend SWE. Do not imply completing the same checklist qualifies for every company/level.

## Technical boundary corroboration
Official docs consulted in this pass: [Pyodide workers](https://pyodide.org/en/stable/usage/webworker.html), [Pyodide Python/JS interop](https://pyodide.org/en/stable/usage/api/python-api/ffi.html), and [MDN worker IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/indexedDB). They support keeping responsiveness isolation distinct from a security boundary. Inference: a same-origin worker must not be assumed unable to access application-origin storage merely because it cannot access the DOM. Existing Architecture already acknowledges the trust limitation; it remains a design decision to validate before using copied/untrusted code. No exploit or runtime experiment was performed.

## Prioritized disposition
| Item | Next action | Closed? |
| --- | --- | --- |
| SC-00 | Keep independent semantic review; improve obvious checker assertions separately | Limitation demonstrated, not eliminated |
| SC-01/02 | Amend mastery and grading contracts before R1 implementation | No |
| SC-03 | Define content/evidence reconciliation before update/import testing | No |
| SC-04 | Specify durable request recovery before R2 | No |
| SC-05 | User reviews bridge route; test mission workload in pilot | No |
| SC-06 | Define early role-fit checkpoints | No |

No claim that every possible hole has been found. Proposed protections also require implementation tests. A further review should replay these end-to-end chains rather than checking only that this table exists.
