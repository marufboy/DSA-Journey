# Local C++ runner implementation plan — 2026-11-01

Goal: enable actual C++17 Run/Submit on this PC without paid services, keys, or transmitting learner source to a third party. User requested setup; existing project authorization covers routine implementation choices.

Approach: use the existing Ubuntu WSL2 distribution, GCC and bubblewrap. Network/mount/PID/user/IPC namespaces isolate each compilation and run. Windows files, home, environment and other jobs are absent. A Python helper receives JSON over stdin; no source/input enters a shell command. CPU, wall, memory, file and output bounds apply. No unsandboxed fallback. This is a personal local runner, not an internet-facing hostile multiuser service. The existing HTTPS Judge0 path remains available separately.

Alternatives considered: hosted Judge0 needs a provider/account/budget; Docker is absent and unnecessary because WSL/bubblewrap already work. Local WSL fits the authorized setup and avoids introducing a remote account.

Files: local-cpp-provider.mjs adapts the existing submit/poll contract and durably stores results; scripts/cpp-sandbox.py owns compilation/execution isolation; scripts/start-local.mjs probes readiness and starts the configured loopback server at port 5174. Update UI labels to describe the backend accurately. Keep the existing broker correlation/unknown semantics.

1. Write real WSL integration tests for valid stdin/output, compiler failure, runtime failure, timeout, output/memory bounds, no host/home/network visibility, fresh job storage and durable result recovery. Observe RED before implementation.
2. Implement helper and provider; probe GCC version and sandbox at startup; fail closed on infrastructure errors. Run the integration tests and existing Node suite.
3. Integrate local startup and visible labels. Restart only the previously launched 5174 instance. Verify C++ Run/Submit in Edge, wrong-answer feedback and Python regression. Compile all trusted authored C++ references against their declared cases.
4. Record versions, commands, evidence and limits in cpp-backend.md, PROGRESS.md and VERIFICATION.md; rebuild standalone assets as needed. Review implementation before handoff.

Isolation ruling: source tree is already isolated in dsa-journey-app; its implementation files are untracked in the existing repository. Creating a Git worktree would omit the current app. Work in place, preserve all existing files and avoid unrelated changes; no automatic commits of the untracked application.
