# DSA Journey Implementation Plan

> For agentic workers: use superpowers:executing-plans for integration; bounded independent content-authoring tasks may use the dispatching-parallel-agents workflow. Follow the project rules and test meaningful behavior before implementing it.

Goal: Deliver the complete learning workspace and authored 28-module curriculum with real Python execution, Python/C++ learning material, durable progress, and the six adversarial safeguards.

Architecture: static modular ESM frontend, IndexedDB persistence, isolated Python runner, and optional Node HTTP C++ broker. Keep content separate from UI, model, storage, and execution. Local Node server serves the app without package installation; private Sites publication attempted using its supported workflow.

Tech stack: browser HTML/CSS/ES modules, Node 26 built-ins, Python 3 for trusted reference checks, Pyodide browser runtime. React/CodeMirror are replaced by accessible native controls to avoid a network dependency: npm registry DNS failed during setup. The original goals/UX and data contracts remain binding.

Spec: ../planning/01-PRD.md through 11-ADVERSARIAL-REVIEW.md plus this approved implementation ruling.

## Global constraints
- 28 modules, 112 lessons, 180 authored exercises/labs; show actual availability.
- Indonesian explanation, English technical terms and interview prompts.
- Keep concept mastery distinct from completion, self-report, and language evidence.
- Exposure history persists across retries/imports; fresh transfer variants required.
- Python Submit must not inherit prior Run/user state.
- Preserve historical evidence after content updates; mark stale rather than silently promoting or dropping.
- Remote execution credentials remain backend-only; unknown is not learning failure.
- C++ is unavailable until a real configured sandbox provider responds; never simulate compiler success.
- No paid service is provisioned without an explicit budget.

## File map and interfaces
- dist/index.html, dist/styles.css, dist/app.js: responsive UI, routing, interaction.
- dist/core.js: pure progress, mastery, scheduling, import, checker, trace functions.
- dist/storage.js: IndexedDB atomic state store, revision conflicts, backup adapter.
- dist/runner.js, dist/runner-frame.html, dist/python-worker.js: isolated fresh Python execution with finite startup/execution/output limits.
- dist/content/part-01.json through part-04.json: non-overlapping curriculum batches; schema in CONTENT-CONTRACT.md.
- server.mjs, cpp-broker.mjs: loopback static server and durable idempotent remote execution bridge.
- tests/*.test.mjs: Node test runner behavior tests; scripts/check-content.mjs and scripts/check_references.py: content integrity and trusted reference tests.
- docs/PROGRESS.md: task status, decisions, evidence and limitations.

Data contract: emptyState() returns {schemaVersion:1,revision:0,settings,completedLessons,checkpointScores,drafts,attempts,exposures,reviews,notes,career}; deriveConcept(state,conceptId,exercises,now) returns {state,recallCount,transferCount,languageEvidence,reason}; importState(current,backup,catalog) validates and preserves historical records with stale flags; makeMissions(state,catalog,minutes,now) balances review/new/bridge work.

## Review focus
1. Memorized retry may be correct recall but cannot become unseen transfer.
2. Identical source/input/runtime produces same verdict after warmed or fresh session.
3. Same-schema old content backup remains recoverable without unsupported mastery.
4. Lost accepted-job response/reload reuses durable logical submission.
5. Short sessions and C++ outage offer meaningful Python work; no repeated review starvation.

## Tasks
### Task 1 — Safeguards and progress model
- [ ] Write Node tests for exposure, new transfer, delayed retention, stale imported evidence, backup atomic validation, mission balancing, and checker semantics. Run RED before core.js exists.
- [ ] Implement core.js and storage.js interfaces. Run node --test tests/core.test.mjs and the whole suite.
- [ ] Verify all five Review Focus classes have an owning test or explicit browser/integration check.

### Task 2 — Authored curriculum
- [ ] Four independent authoring batches, seven modules each. Authors write only their batch JSON and report; consume CONTENT-CONTRACT.md.
- [ ] Check unique IDs, references, kinds, actual text, language examples, valid tests, sources, counts, and prerequisite links.
- [ ] Execute only trusted authored Python references locally against every declared coding case; validate traces independently. Fix content failures before marking available.

### Task 3 — Runnable workspace
- [ ] Build Today, Roadmap, Lesson, Practice, Review, Notebook, Progress, Visualizers, Interview, Career, Settings.
- [ ] Implement keyboard-visible focus, light/dark, adjustable font, mobile tabs, and clear loading/error/unavailable states.
- [ ] Implement six named reference visualizers and early role/learning-route checkpoints.
- [ ] Verify routes, persisted edits, interactions, and import/export using browser QA when available.

### Task 4 — Execution
- [ ] Write tests for C++ request recovery/conflicts and provider outage; RED then durable broker implementation.
- [ ] Python uses a sandboxed iframe and a new worker per execution case; Run cannot contaminate Submit. Stop/timeout remove worker/frame and preserve draft.
- [ ] Configure no unknown public runner by default; provide C++ lesson code, local compile instructions, and integration configuration.
- [ ] Browser verify Python normal/error/input/output/Stop/warm-state chain; external CDN unavailability must be honest and recoverable.

### Task 5 — Final audit and delivery
- [ ] Run full tests, content checks, reference tests, JS syntax checks, and independent review.
- [ ] Fix material findings with reproducing tests and rerun suite.
- [ ] Attempt private publication, preserve returned Site ID, never claim deployed without a successful result.
- [ ] Deliver local app and exact verification report if hosting/network is unavailable. State runtime/integration limits concretely.

## Preflight interface ledger
Core → UI: pure state operations; storage handles actual commit before showing Saved. Content → UI/model: stable IDs/version, activity family/variant and explicit concepts. UI → runner: source/language/input only on Run/Submit; runner returns results, not mastery. Broker → UI: durable requestId/job status; infrastructure failure does not create failed correctness evidence. No interface conflicts identified; content schema is authoritative for authored batches.
