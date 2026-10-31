# Core and C++ backend review

Reviewed 2026-10-31. Scope: `dist/core.js`, `dist/storage.js`, `tests/core.test.mjs`, `cpp-broker.mjs`, `server.mjs`, `tests/broker.test.mjs`, `docs/cpp-backend.md`, against AGENTS, the development rules, PRD, implementation plan, content contract and adversarial review. These are new files without a Git baseline. UI, authored curriculum and Python runtime are outside this review.

Verdict: changes required. Six material findings remain. Existing tests provide useful coverage, but do not cover these cross-layer cases.

## Material findings

### R1 — Older imports erase known solution exposure (high)

Location: `dist/core.js:46-65`, particularly incoming-only exposure reconciliation at line 57 and state replacement at line 61.

`importState` uses the current state only for its revision. Importing a valid backup from before a solution was viewed removes the current exposure ledger. A subsequent pass on the exposed transfer problem becomes `novelTransfer:true`. This reproduces SC-01 through normal backup recovery, without editing any backup.

Focused reproduction executed: create empty backup; record current exposure to transfer exercise b at t; import the empty backup into current state; pass b at t+1 day. Observed `exposures.length === 0`, `attempts[0].novelTransfer === true`.

Regression expectation: preserve the union of known exposure history when restoring older progress, across exercise versions/families/languages, then reconcile imported transfer flags against that union. The example must retain the exposure and return `novelTransfer:false`. Keep the rest of the documented replace semantics explicit.

### R2 — An unknown review reverses a failed review without new learning evidence (high)

Location: `dist/core.js:35-41`.

The latest automated review is selected even when `passed:null`. A failed review correctly demotes the concept to Practicing, but an infrastructure-unknown retry becomes the latest review and removes the failure override. Existing successful evidence immediately promotes the concept to Provisionally mastered. Infrastructure uncertainty should neither count as failure nor erase the last conclusive failed result.

Focused reproduction executed: practice a passes; distinct unexposed transfer b passes; review a fails on day 8; review a returns `{passed:null,status:'unknown'}` on day 9. Observed state sequence: `Provisionally mastered`, `Practicing`, `Provisionally mastered`.

Regression expectation: select the last conclusive automated review for learning-state decisions. After the unknown result, the concept must remain Practicing until an appropriate successful review supplies new evidence. Also cover retained -> failed -> unknown.

### R3 — Mastery does not require the agreed explanation evidence (high)

Location: `dist/core.js:27-38`; state shape at line 4.

PRD section 7 requires a complete explanation rubric in addition to checkpoint, independent exercises and delayed review. `deriveConcept` checks only exercise passes, one transfer flag and a checkpoint. It has no explanation gate. Completing two coding exercises therefore grants provisional mastery, and a delayed recall can grant Retained, without explaining correctness or complexity. Explanation activities are excluded from automated evidence, which is appropriate, but their labeled rubric evidence still needs a separate requirement.

Focused reproduction executed: empty state with checkpoint score 1; pass practice a and unexposed transfer b; supply no explanation activity or rubric. Observed `Provisionally mastered`.

Regression expectation: keep self-reviewed explanation evidence explicitly labeled and distinct from automated test evidence; missing/incomplete required explanation must prevent promotion. A complete rubric plus the other conditions should allow promotion. This is a model contract gap, not a request to fabricate automated explanation grading.

### R4 — Import accepts malformed or internally inconsistent learning records (medium)

Location: `dist/core.js:49-64`.

Attempt validation checks only a small subset of fields, then trusts `novelTransfer`, `evidenceMethod`, `assisted`, language and concept/lesson associations. Completion/settings values also receive almost no validation. A corrupted backup with `completedLessons.l1 = 'false'` is accepted and treated as completed by mission truthiness. An automated passed practice exercise with `novelTransfer:true` is accepted and counted as transfer evidence, even though current content identifies it as practice. The backup format therefore validates its outer shape while accepting contradictory evidence that affects readiness and routing.

Focused reproduction executed: imported both values above using an otherwise valid empty-state backup, matching current exercise version. Observed accepted string completion value and `deriveConcept(...).transferCount === 1` for a practice-only catalog.

Regression expectation: validate supported field types/enums and content-consistent evidence associations; reject corrupted records atomically or conservatively preserve them as historical/non-qualifying. Never trust imported derived transfer flags when the catalog contradicts them. Test strings in boolean fields, unknown methods/languages/statuses, incompatible concept/family/lesson associations and transfer flags on practice activities. This is corruption handling, not cryptographic tamper resistance.

Related reconciliation gap: lesson completions/checkpoint scores have no content version, and `catalog.lessons` is never consulted during import. Same-ID changed checkpoint criteria can retain an old score as current qualifying evidence. Preserve that history with version/staleness metadata rather than silently qualifying revised criteria.

### R5 — A retired concept can indefinitely hide valid due reviews (medium)

Location: `dist/core.js:71-72`.

Due reviews are capped before checking whether a matching current activity exists. In a 15-minute session, one earlier due concept whose exercises have been retired takes the only slot, then maps to null. A later valid due review is never recommended. Import intentionally preserves historical records, so this is an ordinary historical-data recovery path, not merely artificial input.

Focused reproduction executed: reviews `{retired:{dueAt:1}, loops:{dueAt:2}}`, now 100, a catalog containing only a loops coding exercise, session 15. Observed only a lesson mission, with no loops review. Repeated calls leave the same result.

Regression expectation: resolve actionable review activities before applying the session cap. The example must recommend loops review and retain the retired record with an explicit historical/deferred disposition. Cover short sessions and several orphaned concepts.

### R6 — Cross-connection polls can resurrect terminal jobs and violate the global cap (medium)

Location: `cpp-broker.mjs:54`, `58-60`, `90-105`.

Submission reservation is atomic across SQLite connections, but polling deduplication is only a per-broker JavaScript Map, and result writes update by request ID without a state/revision guard. Two live brokers sharing the database can poll the same job. A late running response can overwrite a completed result already committed by the other broker. If another submission was accepted after completion, both jobs become active. This contradicts the documented one-active-job guarantee across connections and can make completed recovery regress to waiting.

Focused reproduction executed against temporary real SQLite:

1. Open brokers A and B on one database; submit job one.
2. A starts a poll whose response is held.
3. B polls the same token, receives completed and commits it.
4. B submits job two; it is queued.
5. Resolve A's held response as running.

Observed final replay states: job one `running`, job two `queued`. Temporary database files were removed after this check.

Regression expectation: terminal states must not regress; use conditional/versioned updates or a cross-connection polling lease. Race a delayed nonterminal response against a terminal response/new reservation and assert that job one remains completed, its output is preserved and at most one active reservation exists. Also cover stale unknown/error responses.

## Smaller issues / follow-up

- `makeMissions` ignores `primaryLanguage`, marks every review Python, and labels a C++ bridge lesson Python during outage rather than selecting a verified Python activity. The current outage test checks labels only, so it does not demonstrate the planned meaningful fallback. Validate the final route against real content and the UI's action semantics before claiming SC-05 closed.
- The model never returns Learning despite the PRD state progression; completed lessons alone still show Not started. Consider a distinct completion/learning signal without promoting mastery.
- Retention delay is measured from the earliest successful exercise, not from the qualifying transfer/provisional milestone. An old practice plus today's first transfer and today's review can immediately yield Retained. Clarify the intended delay anchor and test it.
- `buildTrace('dp',{n:-1})` and values above 12 are silently clamped despite the validation message promising an integer from 0 to 12. Explicit rejection would make invalid-input handling consistent.
- No IndexedDB transaction/conflict/failure tests appear in the reviewed test file. Static inspection shows a single readwrite revision check/commit, but browser multi-tab/storage-failure verification remains necessary; no storage success claim is made here.

## Positive findings and limits

The broker durably reserves request ID and payload hash before provider invocation; same-body replays do not submit again; conflicting bodies are rejected. Unacknowledged provider acceptance conservatively retains an unknown reservation, with the permanent-block tradeoff documented. The configured provider is explicit HTTPS, rejects redirects, sends bounded resource/network settings, bounds received JSON and maps unfamiliar/internal statuses to unknown. Source/stdin are not stored in the SQLite job table. Loopback host/origin checks and static path checks are present. These are suitable boundaries for the stated local single-user scope, not an authenticated multi-user deployment.

Existing core tests were reported RED then 15 GREEN by the owner. Existing backend report states 23 pass / 1 network skip overall. I did not rerun passed suites. I ran only the focused Node reproductions described above, including the real-SQLite race. No provider network calls, browser/runtime verification, product launch, installation or edits to implementation/tests occurred during this review. The report is the only file added by the reviewer.
