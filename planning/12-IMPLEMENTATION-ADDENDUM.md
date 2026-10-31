# Implementation Addendum
Current runtime evidence update, 2026-11-01: the user subsequently requested C++ setup. A real local GCC15.2 C++17 provider is now configured through Ubuntu WSL2/bubblewrap/seccomp at port5174; no paid remote provider was provisioned. Browser Python and local C++ checks now have bounded evidence. See the current [verification report](../docs/VERIFICATION.md) and [local backend contract](../docs/cpp-backend.md). Earlier NOT VERIFIED / UNCONFIGURED statements below describe the original implementation snapshot; remote Judge0 and broader release gates remain unverified.
Review pack v0.4 - 2026-10-31 - IMPLEMENTATION AUTHORIZED

## Authorization and precedence
Authorization: IMPLEMENTATION AUTHORIZED.
User instruction: "Oke go for it all and create them" after the Swiss-cheese review on 2026-10-31. This authorizes creation of DSA Journey and all six safeguards, superseding the former documentation-only phase. It does not certify completion, learning outcomes, security, usability, deployment, or a live compiler. Paid services require a separately explicit budget; global skill installation and unrelated project changes are outside scope.

This addendum is the source of truth for the changed authorization, learning route, and stack. Read the [implementation plan](../docs/IMPLEMENTATION-PLAN.md) and [progress ledger](../docs/PROGRESS.md) before implementation. Original 28 modules / 112 lessons / 180 exercises remain the curriculum inventory. Actual authored-content and reference-validation reports, rather than planning counts, establish available content.

## Accepted safeguards and current contracts
| Risk | Required safeguard and source inspected | Remaining evidence |
| --- | --- | --- |
| SC-01 exposure laundering | core.js stores family/version exposure across attempts/import; recall and novel transfer are distinct; mastery needs automated evidence, checkpoint, explanation rubric and delayed review | Replay exposure/retry/reload/import in browser; self-reviewed explanations are labelled and outside assistance is not detectable |
| SC-02 warm Python state | runner.js creates a new opaque-origin iframe and worker per execution case; host receives nonce-correlated results; Stop/startup/execution limits remove execution context | Browser QA/runtime NOT VERIFIED: CDN loading, isolation, warm/cold equivalence, file/module state and Stop must be exercised |
| SC-03 content revision | core.js import preserves historical attempts and drafts, marks missing/revised content stale, and separates historical checkpoints; schema validation precedes commit | Browser IndexedDB atomicity, quota failure, reload and content-update recovery need integration evidence |
| SC-04 lost remote response | Configurable C++ broker uses durable logical request recovery and payload-conflict handling; infrastructure unknown is not a failed correctness attempt | Real C++ provider UNCONFIGURED; no claim of live compile, billing bounds, provider isolation or third-party exactly-once execution |
| SC-05 route starvation | Interleaved route default: Python foundations, C++ orientation, Python DSA with selected bridges; sequential route remains selectable; mission order balances review/new work | Four-week short-session/outage pilot and individual workload calibration remain unverified |
| SC-06 late role mismatch | Early role/region preference and evidence checkpoints are required; project/role gaps remain explicit and manual | Real target-role evidence review, communication assessment and employability outcomes remain unverified |

These are accepted contracts with source-level implementation work, not a claim that all risks are proven closed. Current sources inspected: [core.js](../dist/core.js), [runner.js](../dist/runner.js), and [C++ backend evidence](../docs/cpp-backend.md). Tests and authoring reports have their own scope; do not substitute them for browser or live-provider evidence.

## Stack ruling
Dependency-free browser ES modules and native labelled controls replace the proposed React/CodeMirror stack because npm registry access failed with ENOTFOUND during setup, as recorded in the implementation ledger. Node built-ins serve local assets and the optional broker. This preserves content/progress contracts while avoiding an install prerequisite. It does not imply editor accessibility or runtime usability has passed. Pyodide still requires its runtime assets/CDN; dependency-free app setup does not mean full offline support.

## Current release boundaries
Implementation is authorized; app release acceptance is still separate. Browser QA and Python browser runtime are NOT VERIFIED. Real C++ provider is UNCONFIGURED and must remain honestly unavailable until configured and independently checked. No paid provisioning is authorized by this addendum. Historical reports 10 and 11 preserve earlier findings and verdicts at their original snapshots; they are not current product certificates.

## Validation scope
The structural validator now accepts either an explicitly pending review or the documented authorization above. It rejects obvious traceability placeholders and inconsistent adjacent narrative lesson totals. These checks close two demonstrated narrow blind spots; they do not prove semantics or eliminate the need for adversarial review. Rerun the checker after edits and retain exact output with the handoff evidence.
