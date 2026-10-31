# C++ execution bridge

## Active local setup — 1 November 2026

The user requested C++ setup. `npm start` (or `node scripts/start-local.mjs`) now starts http://127.0.0.1:5174 with a real local C++17 provider. Ubuntu WSL2 and bubblewrap 0.11.1 already existed. GCC 15.2.0 was installed through Ubuntu apt; stale package indexes initially caused a 404, then apt update and the installation succeeded. Apt installed compiler dependencies and upgraded four required libc/locale packages. No paid service, account, API key or external source-code submission was used. Compiler packages consume approximately 264 MB additional disk.

The local provider passes JSON through a pipe to scripts/cpp-sandbox.py, without a shell. Compilation and execution run as the normal WSL user inside fresh bubblewrap user/mount/PID/network/IPC namespaces. `/usr` is read-only; Windows drives and home are not mounted. Root, `/work` during execution, and `/dev` including `/dev/shm` are read-only; `/tmp` is a fresh 64 MiB tmpfs. No environment credentials are inherited. libseccomp denies process/thread creation, namespace manipulation, ptrace and several privileged interfaces during execution. This is a bounded personal local runner; kernel/container hardening against arbitrary hostile public users has not been certified. Its namespace design follows the [bubblewrap policy model](https://github.com/containers/bubblewrap#sandbox-security).

Execution limits: 2 CPU seconds, 5 wall seconds, 256 MiB address space, 64 KiB output across captured channels, 64 KiB per file, 64 descriptors, no core files, one learner process with no threads/children. Compilation limits: 20 CPU seconds, 30 wall seconds, 1 GiB address space per process, 16 MiB per file, 128 descriptors and NPROC 64 (per real WSL UID). This is not a cgroup aggregate memory limit. GCC command is fixed to C++17, -O2, -Wall, -Wextra, finite diagnostics. The current GCC version is reported by `/api/status`; future package upgrades require re-verification.

Bubblewrap JSON status is received on a private inherited descriptor, independently of learner stdout/stderr. Normal completion requires its trusted exit-code record, which is absent on sandbox setup or direct executable-launch failure. Wall/output termination is a deliberate resource verdict. Resource limits are applied by the trusted Python parent before launch; runtime bubblewrap directly execs the compiled program. Learner stderr such as `bwrap:` cannot create an infrastructure error. There is no unsandboxed fallback.

Results are atomically written under data/local-cpp using opaque UUID tokens before acknowledgement, so accepted-token polling survives restart. The existing SQLite request/payload/replay/reservation contract remains in force. Source/input are temporary and removed when the helper exits normally; a forced helper/OS crash may leave a temporary WSL directory. Result files and SQLite records have no automatic expiry. A crash before token acknowledgement can still become durable unknown and require operator reconciliation; no unsafe automatic retry/reset was added. Browser Stop cancels waiting, while local work can continue until its bound; Recover uses the same logical job.

Startup probes namespace creation, seccomp and compiler availability and fails closed if they are unavailable. It requires the existing Ubuntu distribution, python3, g++, bubblewrap and libseccomp.so.2. On another Windows machine prepare these dependencies first; no global skills or background startup service are installed. The server is loopback-only; do not expose it publicly. Standalone file:// HTML has no local API origin and retains its unavailable C++ state.

Verification: the opt-in full Node suite includes real compiler/runtime/isolation and trusted-launcher failure tests. The reference checker compiled all 100 authored programs and passed 366 declared cases. Browser evaluation verifies local C++ Run, 3/3 correct Submit cases, 3/3 wrong-answer verdicts, real compiler errors and learner stderr; Python and standalone Python regressions pass. See VERIFICATION.md and browser-eval/results.json for current totals. Earlier sections below describe the optional remote bridge and historical evidence, not the current local availability.

Remote/static mode with Node 26: `node server.mjs`, then open `http://localhost:5173`. This mode binds only `127.0.0.1:5173` and forwards C++ only to an explicitly configured remote provider. Local C++ uses the separate startup above.

## Configuration

Without `JUDGE0_URL`, `/api/status` reports `{ "configured": false }` and a C++ submission returns `unavailable`. This flag reports configured credentials/endpoint, not provider health or a successful compilation.

To use an independently provisioned, trusted Judge0 sandbox, set `JUDGE0_URL` to its HTTPS base URL and `JUDGE0_LANGUAGE_ID` to that provider's C++ language ID. Optionally set `JUDGE0_TOKEN` and `JUDGE0_TOKEN_HEADER` (default `X-Auth-Token`). Credentials stay in the backend. No public runner, paid service, or default endpoint is selected. Redirects are rejected so credentials are not forwarded to another endpoint.

Requests use Judge0 base64 input/output and explicitly request `compiler_options:"-std=c++17"`, `enable_network:false`, 2 CPU seconds, 5 wall seconds, 128 MiB memory, 16 processes/threads, one run and a 64 KiB file limit. The configured provider must enforce these settings and its own compilation/isolation/queue limits; this client cannot prove provider sandbox security. Each provider HTTP request has a 15-second timeout and a 1 MiB received JSON cap.

## API and recovery

`POST /api/submissions` accepts `{requestId, source, stdin, language:"cpp"}`. `requestId` is a client-generated persisted identifier (1–128 ASCII letters, digits, underscores or hyphens). `GET /api/submissions/:requestId` retrieves and, if appropriate, polls the same logical job. Missing IDs return 404. Malformed bodies return 400, oversized bodies/input 413, same-key payload conflicts 409 and another active job 429. Error responses are JSON without source, provider errors, or credentials.

Persist the client requestId **before** sending the first POST. Reuse it after a lost response, reload or another-tab retry. The SHA-256 hash covers language, source and stdin; a replay of the same key/body returns the same logical job without another provider submission. `createdAt`, `updatedAt`, status, outputs and optional time/memory accompany results. `completed` means program execution completed; the learning checker still determines correctness.

SQLite (`data/cpp-jobs.sqlite`, WAL and FULL synchronous writes) reserves the identifier/hash before calling the provider. Source and stdin are not retained in this database. Tests inject a temporary real SQLite path. Files persist across server restarts; there is no automatic expiry or deletion, so replay history remains available. Back up the SQLite database consistently, including its WAL when open, and protect the directory using local account permissions.

Only one job may be active globally, across keys/tabs and SQLite connections. `submitting`, `queued`, `running` and `unknown` hold this reservation. Completed/failed jobs release it. With no provider, an `unavailable` result is terminal and a new attempt after configuration needs a new ID.

All result updates atomically require that the persisted job is still active. Terminal results are immutable across connections: a delayed running/unknown response or poll error cannot overwrite a completed result, its output, or revive its reservation after the next job was accepted. A stale polling caller receives the already committed terminal result.

If provider acceptance is not acknowledged, status is `unknown`, even when the provider may already have accepted work. A crash during submission recovers as `unknown`. Replays never submit again. A known token permits later GET polling to recover a status; an unknown acknowledgement without a token requires provider/operator reconciliation and keeps the single-job reservation. There is intentionally no unsafe reset endpoint. This bounds uncertain provider compute to one submission, at the cost of blocking additional C++ work until reconciled. Exactly-once third-party execution cannot be promised without provider idempotency/reconciliation support. Unknown infrastructure outcomes must not count as failed learning attempts.

Only Judge0 status IDs 4–12 map to failed program execution; internal errors, malformed or unfamiliar statuses map to unknown. Total stdout/stderr/compileOutput is capped at 64 KiB UTF-8 and `truncated:true` signals truncation. Source is capped at 64 KiB and stdin at 256 KiB. Oversized transport bodies are separately bounded at 384 KiB, including JSON escaping.

## Browser boundary

API requests reject unexpected Host, foreign/opaque Origin and cross-site fetch metadata; no API CORS permission is granted. This is a local single-user boundary, not a multi-user authenticated service.

Static assets alone send `Access-Control-Allow-Origin:*` because the Python iframe deliberately has an opaque origin (`sandbox=allow-scripts`) and fetches ES modules with CORS. CSP permits self and the exact validated loopback document host, jsDelivr scripts/connections and WebAssembly compilation, blob workers, local styles and local frames. The explicit loopback host avoids relying on opaque-origin `'self'` matching for module imports. No COEP/CORP, same-origin iframe sandbox permission or extra sandbox policy is added that would break the isolated runtime. Static traversal and backslash paths are rejected. These headers were checked through the HTTP handler; a browser runtime check remains necessary for the Python chain.

## Verification and limits (2026-10-31)

Tests were written first: the first run failed with missing `cpp-broker.mjs`; subsequent regression assertions exposed provider-unavailable reservation release and the absent explicit opaque-frame host allowance before both were corrected. `node --test tests/broker.test.mjs`: 8 pass, 0 fail, 1 explicit skip. Tests cover real SQLite reopen/replay, lost client response, conflicting body, process exit during provider invocation, lost provider acknowledgement, concurrent cap, unknown statuses, UTF-8 limits, output bounds, HTTP routing/security and the isolated Judge0 request boundary. The full suite at this checkpoint: 23 pass, 0 fail, 1 skip (24 total).

TCP loopback smoke is explicitly skipped only when this environment reports `EACCES` on connect; the native server request handler is integration-tested directly, including real static file reads. No real provider was configured or called, so live compilation, billing limits and provider health are unverified. No browser execution claim is made by these backend tests.

### R6 review regression follow-up

The two-connection race was reproduced before the fix with three RED tests: broker A holds a poll, broker B completes the first job and accepts the second, then A resolves running, unknown, or throws. All three initially replaced the first terminal result. A fourth RED assertion showed Judge0 omitted the explicit C++17 compiler option. The SQL update now requires an active stored state, and the Judge0 payload includes `-std=c++17`.

Fresh verification after these changes: `node --test tests/broker.test.mjs` reports 11 pass, 0 fail, 1 network skip (12 total); `node --test tests/*.test.mjs` reports 26 pass, 0 fail, 1 network skip (27 total). `node --check cpp-broker.mjs` and `node --check server.mjs` pass. Each race checks the late caller's terminal status/output, persisted replay, the second job remaining queued and a third request rejected by the global cap. Windows test cleanup closes both real database connections before removing temporary files. Live-provider and browser limits above remain unchanged.
