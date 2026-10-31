# DSA Journey implementation ledger

2026-11-01 local C++ setup: user requested configuration. Ruling: use existing Ubuntu WSL2/bubblewrap with a local GCC C++17 provider, avoiding a paid remote service — source stays on this PC — cost if wrong: this startup requires WSL and is intended for personal use only. Installed GCC15.2 via apt after refreshing stale indexes; no account/key/global skill added. Added docs/LOCAL-CPP-PLAN.md, local-cpp-provider.mjs, sandbox helper, local startup, real integration/launcher tests and C++ reference validator. `npm start` serves the configured provider on5174, preserving the current origin. Local results are durable; the existing broker's unknown/replay semantics remain.

Independent review findings reproduced and fixed: writable root/dev tmpfs now read-only; no learner-stderr-prefix infrastructure classification; trusted JSON exit record required after direct exec; runtime seccomp denies process/thread creation. Broker preserves provider truncation. Background C++ availability now rerenders instead of leaving a stale warning. Current evidence:72 Node tests including9 WSL scenarios pass;100 C++ programs/366 declared cases pass; browser C++ Run/Submit, wrong answers, compile diagnostics and Python regressions pass. Full evidence and bounded personal-use/unknown-acknowledgement limits in VERIFICATION.md and cpp-backend.md. Earlier unconfigured-provider entries below are historical; optional remote Judge0 remains unconfigured.

Authorization: user requested all safeguards and creation, 2026-10-31. Source design pack v0.3 plus implementation plan. This is not a preexisting Git repository; work is isolated in dsa-journey-app, leaving example/ untouched. Site workflow may initialize its own source repository.

Ruling: use dependency-free modular browser ESM instead of React/CodeMirror because registry.npmjs.org DNS lookup failed (npm ENOTFOUND). Native editor with explicit labels/tab controls and monospace display; can replace later without changing content/model. Cost if wrong: richer editor features need later integration.

Ruling: Python foundations followed by C++ orientation and interleaved bridge/DSA, with weekly Python retrieval and a re-entry check. Both languages remain in the 28-module curriculum. Cost if wrong: route can be switched to sequential in settings; exercise/content inventory unchanged.

Ruling: do not provision a paid C++ service without a budget. Implement real configurable backend adapter, durable request IDs, honest availability and local compile guides. Cost: C++ execution requires provider configuration; learning/trace/reference code remains available.

Task 1: implemented and tested core/storage interfaces. Core model originally RED then GREEN; independent review corrections covered by regressions. IndexedDB browser verification pending.

Task 2: four authored batches complete: 28 modules / 112 lessons / 180 activities / 100 coding problems. Content checker passes; 366 declared Python cases pass. Independent sample adds 483 passing checks. Two semantic/navigation findings corrected. C++ uncompiled.

Task 3: all workspace screens and six reference visualizers implemented. Route rendering, every lesson/activity kind, escaping, filters, route progression and milestone prompts tested. Browser interaction/visual verification blocked and not claimed.

Task 4: isolated fresh Python runner and standalone frame protocol implemented; stdin contract and lifecycle VM regressions pass. C++ broker durability/conflicts/races tested. Live Python browser runtime and C++ provider remain unverified; C++ provider unconfigured.

Task 5: independent whole-source review produced six Important findings, now fixed with controller regressions and full-suite verification. Current Node suite: 60 pass, 0 fail, 1 network skip. Portable app built. Private publication attempted using existing project ID; source Git host failed to resolve. No deployment success claimed.

Final: Ruling: timer-on-coding, route consistency, and catalog filters affect specified behavior, so they were treated as requirement gaps rather than cosmetic minors and completed with regression coverage. Cost if wrong: a small increase in implementation surface.

Latest evidence and release limitations: docs/VERIFICATION.md. No unrelated example files changed; no paid services or global skills installed.

2026-11-01 startup and evaluation: opened the source in local Edge at http://127.0.0.1:5174 because an existing listener on 5173 did not respond. No existing process or progress was removed. Reproduced Python worker startup failure with a real-browser regression, then fixed opaque-origin blob module-worker incompatibility using a classic worker with dynamic module loading. Isolation remains intact. Rebuilt standalone HTML and verified its actual Python execution. Added scripts/browser-eval.mjs and docs/browser-eval evidence. Fresh results: 61 Node tests pass without skips; content integrity passes; 366 trusted reference cases and 483 independent checks pass; real browser Run/Submit, exceptions, fresh globals/filesystem, timeout, abort/cleanup, persisted draft reload, ten routes and mobile Today overflow check pass. Desktop/mobile screenshots inspected. Browser evidence is now available for these bounded checks; C++ provider, full accessibility, backup/quota/multi-tab integration and learning outcomes remain unverified. See the current section in docs/VERIFICATION.md.
