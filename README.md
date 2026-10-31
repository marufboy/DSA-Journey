# DSA Journey

Interactive Indonesian learning workspace for Python, C++, data structures, algorithms, projects, and interview preparation.

Source repository: https://github.com/marufboy/DSA-Journey. The original specifications and development rules are bundled in [planning/](planning/README.md). For a fresh clone without the prepared Windows/WSL C++ environment, use `npm run start:static` for Python and lessons; local C++ prerequisites are described in [docs/cpp-backend.md](docs/cpp-backend.md).

## Open the app
Open **artifacts/DSA-Journey.html** in a modern Chrome or Edge browser (run the standalone builder below if it is missing). Reading lessons, checkpoints, reference visualizers, notes, and the career workspace do not require a Node installation. Python execution downloads Pyodide 0.27.7 from jsDelivr; the first run needs internet. On 2026-11-01, real Python execution passed in Edge for both the local server and standalone HTML. See docs/VERIFICATION.md for tested behavior and remaining limits.

Progress uses IndexedDB where the browser permits it. If storage is unavailable, the app shows a temporary-session warning. Export a JSON backup before closing; local-file storage behavior varies by browser. Import validates records and preserves known solution exposure, historical attempts, and drafts.

## Run the source locally
From this folder, with Node 26 (the tested version):

```text
npm start
```

Then open http://127.0.0.1:5174. No npm installation is required. This starts the verified local C++17 sandbox using the installed Ubuntu WSL2 distribution, GCC 15.2 and bubblewrap. It binds only to 127.0.0.1. `node scripts/start-local.mjs` is equivalent; set PORT to select another port and DSA_WSL_DISTRO to select another prepared distribution. Keep this process running while using the app.

For static/Python-only use or an explicitly configured remote Judge0 provider, `npm run start:static` starts server.mjs on port 5173. An explicit alternative-port static start is:

```text
node --input-type=module -e "import {startServer} from './server.mjs'; await startServer({port:5174}); console.log('DSA Journey: http://127.0.0.1:5174');"
```

Use http://127.0.0.1:5174 for that instance. Progress is stored per browser and origin; changing the port creates a separate progress store. Use export/import to transfer existing progress.

## What is included
- 28 modules, 112 original lessons, and 180 activities, including 100 coding problems.
- Python/C++ reference implementations, worked examples, checkpoints, gradual hints, and sources.
- Learning path, coding lab, six reference visualizers, review queue, notebook, evidence-based progress, interview timer, and early role-fit workspace.
- Interleaved Python/C++ route plus sequential option. Prerequisites are route-aware.
- Solution exposure survives retries and old-backup restoration. Recall and unseen transfer remain distinct.
- Fresh isolated Python worker per execution case; immutable submission snapshots; Stop preserves drafts.
- Historical-content recovery, stale checkpoint handling, atomic backups, and multi-tab revision checks.
- Durable SQLite C++ request correlation and replay/conflict protection.

## C++ execution
Real C++17 Run/Submit is **configured locally on this PC** through Ubuntu WSL2, GCC 15.2, bubblewrap and seccomp. Compilation and execution use isolated jobs, disabled network, resource limits and bounded output. All 100 authored C++ coding references compiled and passed 366 declared cases. Runtime process/thread creation is disabled; this runner is for the personal curriculum, not a public multiuser judge. The standalone file cannot access this backend: use the local server URL for C++.

A separately provisioned remote Judge0 provider remains optional through JUDGE0_URL, JUDGE0_LANGUAGE_ID, and server-only authentication when starting server.mjs. No paid provider or API account was provisioned. See [docs/cpp-backend.md](docs/cpp-backend.md) for setup, limits and recovery details.

## Verify and rebuild
```text
node --test tests/*.test.mjs
node scripts/check-content.mjs
python scripts/check_references.py
python scripts/check_independent_algorithms.py
node scripts/build-standalone.mjs
```

The Python checker executes trusted authored reference programs only; it is not a learner-code execution server. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for results and exact limits. The standalone builder writes artifacts/DSA-Journey.html and parses its bundled JavaScript before delivery.

Optional real-browser evaluation with an existing Playwright installation:

```text
node scripts/browser-eval.mjs PATH_TO_PLAYWRIGHT_PACKAGE
```

Set BROWSER_EXECUTABLE to your installed browser executable if needed. This uses isolated temporary browser storage, starts an ephemeral server, tests real CDN-backed Python and the rebuilt standalone HTML, and writes results/screenshots under docs/browser-eval/. Build the standalone artifact first. If `python` resolves to the Windows Store alias, use an installed interpreter explicitly; this session used `uv run --offline --no-project python`.

Set DSA_CPP_BROWSER_EVAL=1 to include real local C++ browser checks. Set DSA_CPP_INTEGRATION=1 when running `node --test tests/*.test.mjs` to include the WSL integration tests. C++ content validation: `wsl -d Ubuntu -- python3 '/mnt/c/Users/Afif/Desktop/Project/REA Apps/dsa-journey-app/scripts/check_cpp_references.py'` on this machine.

## Scope and evidence
Some granular concepts are introductory and lack enough independent variants for Retained status; the UI labels this instead of inventing mastery. Completing the curriculum does not certify eligibility or guarantee employment. The 600–800 hour estimate includes substantial practice/review/project work and remains uncalibrated for the individual learner. No cloud synchronization or third-party analytics is enabled.

Private Site registration exists, but publication was blocked when the source Git host could not resolve. No deployed URL is claimed. Source and portable artifacts are the current deliverables.
