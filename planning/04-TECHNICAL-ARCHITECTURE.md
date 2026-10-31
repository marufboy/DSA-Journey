# Technical Architecture
DSA Journey · v0.2 · 31 Oktober 2026 · PROPOSED

## 1. Approaches
Current implementation ruling: [12-IMPLEMENTATION-ADDENDUM.md](12-IMPLEMENTATION-ADDENDUM.md) supersedes the React/CodeMirror proposal below with dependency-free browser ESM/native controls after npm ENOTFOUND. It also records six accepted safeguards and the source/evidence boundaries. Browser QA/runtime are NOT VERIFIED; C++ provider is UNCONFIGURED. The original alternatives remain design history.

| Option | Trade-off |
| --- | --- |
| Browser workbook | Sederhana; native C++ dan server grading terbatas |
| Full cloud sejak awal | Sync/central grading; auth, biaya, operasi lebih besar |
| Hybrid personal app — recommended | Python lokal + C++ remote; progres lokal; sync berikutnya |

Proposal stack: React + TypeScript, CodeMirror editor, Markdown + typed metadata, SVG/state-machine visualizers, IndexedDB, Pyodide worker, backend HTTP adapter ke C++ sandbox. Frontend language berbeda dari bahasa pembelajaran. Pin dependency versions saat spike, bukan berdasarkan asumsi versi di dokumen.

## 2. Components
Curriculum engine memuat konten/prerequisite; UI menangani lesson/editor; progress engine menghitung evidence/review; storage adapter menangani transaction/backup; execution adapter menyeragamkan runtime.

Data flow: UI → execution adapter → Python worker ATAU backend API → C++ runner. UI → progress engine → IndexedDB. Static content dimuat terpisah dari user records.

## 3. Execution contract
Implementation clarification: Python Submit uses a fresh opaque-origin iframe/worker for each case; prior Run state must not affect verdicts. Durable C++ request recovery is implemented through the configurable broker, with no real provider configured. See addendum and linked backend evidence; browser/live-provider verification is still required.

Request: requestId, exerciseId/version, language, mode(run/submit), source, stdin.
Response: requestId, optional jobId, status, stdout/stderr/compileOutput, testResults, applied limits, truncated flag.

States: idle → loading/queued → compiling jika C++ → running → passed/failed/compile_error/runtime_error/timeout/cancelled/unavailable/unknown. HTTP success bukan test success. ID mencegah stale response menimpa attempt terbaru.

### Python
Pyodide lazy-loaded dalam worker; stdin berupa text; output capture dibatasi. Stop terminate worker lalu reinitialize; globals sesi hilang, draft tetap ada. Main UI tetap responsif.

Worker bukan security sandbox untuk hostile arbitrary code karena JavaScript interop. V1 personal menjalankan kode pengguna sendiri. Secrets tidak ada di frontend; sebelum public untrusted use, gunakan runtime origin terpisah/restrictive policies atau server sandbox. Jangan mengklaim worker melindungi seluruh data aplikasi.

### C++
Backend memvalidasi request dan meneruskan ke sandbox terpisah. API key tidak ke browser; tidak menyusun shell command dari source/input. Hosting frontend/Cloudflare Worker bukan tempat native compiler.

Provider harus mendukung GCC pinned/C++17, logs, stdin, polling, CPU/wall/memory/output limits, dan network disabled. Proposed initial bounds: source 64 KiB, stdin 256 KiB, output 64 KiB, CPU 2s/run, wall 10s/run, memory 256 MiB; compilation max 30s terpisah. Final limits mengikuti provider dan reference tests.

Satu active job per workspace; rate limits dan API authorization wajib untuk internet-facing endpoint. Lost response → unknown + status check sebelum retry. Cancel remote hanya jika provider mendukung; bila tidak UI menjelaskan job dapat berjalan sampai timeout.

Provider/budget/auth/retention belum dipilih. Jangan mengklaim live C++ siap sebelum adapter/limits tervalidasi. Local compile instructions adalah fallback yang berlabel.

## 4. Grading and visualizations
Untuk activity kind coding, v1 memakai stdin/stdout contract untuk dua bahasa. Run = samples/custom input; Submit = exercise suite. Activity lain memakai structured validator atau rubric sesuai kind (section 5 dan Acceptance section 2). Checkers coding: exact normalized text, tokens, unordered collection, float tolerance. Rules eksplisit; normalization tidak boleh menyembunyikan bug.

Local Python tests dapat diperiksa pengguna; bukan secure hidden tests. C++ suite dapat disimpan server. Timing diagnostic saja, tidak membuktikan complexity atau perbandingan antar bahasa.

Visualizer menjalankan reference algorithm dengan sequence state deterministik; tidak menginstrumentasi arbitrary user source. Previous/next memakai state snapshots; explanation text tersedia. Release inventory VIZ-01 sampai VIZ-06 beserta input contract dan gate berada di Acceptance section 9.

## 5. Data model
Exercise kinds: coding (stdin/stdout checker), trace/predict (structured answer checker), counterexample (validator + reference behavior), explanation (rubric/self-review), project (artifact checklist + manual review), career (completion/self-report). Record evidenceMethod as automated/rubric/manual/self_report and assessedConceptIds per activity. Career completion and self-report do not satisfy verified concept mastery. Explanation rubrics remain visibly self-reviewed until human review is recorded; independent coding evidence must still be automated.

Maintain a coverage matrix of conceptId → activities → assessed criteria → independent variants → delayed review. One exercise may supply evidence for multiple concepts only when each criterion is explicitly checked. Introductory electives without two independent variants stay Learning/Practicing; 180 exercises is a content budget, not a promise every subtopic reaches Retained. Expand the bank through scope review if coverage is insufficient.

| Entity | Fields |
| --- | --- |
| Module | id, title, order, prerequisites, release, availability |
| Lesson | id, moduleId, objectives, contentPath, exercises, sources, version |
| Exercise | id/version, concepts, difficulty, templates, checker, tests, hints, references |
| Activity grading | kind, evidenceMethod, assessedConceptIds, per-kind validation or rubric; coding fields optional for non-coding |
| Attempt | id, exercise/version, language, source, status, hints, timestamps, results |
| ConceptProgress | conceptId, evidenceIds, state, languageEvidence, rulesVersion |
| ReviewItem | id, conceptId, dueLocalDate, timezone, interval, lastResult |
| Note | id, optional attemptId, category, body, timestamps |
| Settings | schemaVersion, theme, language, sessionTarget, timezone |
| CareerItem | id, type, manual fields, status |

Stable IDs; attempts append-only kecuali explicit user deletion. Mastery dapat direcompute saat rules berubah dengan penjelasan UI.

## 6. Storage/backup
Implementation clarification: same-schema content revisions preserve historical attempts/drafts and flag obsolete evidence rather than dropping it or granting unsupported mastery. Imported checkpoints also need compatible content versions. Browser transaction/failure recovery must still be validated.

IndexedDB user records; content sebagai bundled assets. Autosave debounce max ~1s; navigation menunggu commit atau menampilkan error. Multi-tab revision conflict menawarkan reload/copy, bukan silent overwrite.

Backup JSON: schemaVersion, appVersion, exportedAt, contentVersions, settings, records; tidak berisi credentials/cache. Import v1 replace, bukan merge. Validate schema, max awal 20 MiB, IDs/references/duplicates, supported version. Preview lalu atomic transaction. Pre-import snapshot bila ruang cukup; jika tidak tawarkan export dahulu. Invalid import tidak mengubah data lama.

Browser clear/quota/origin change dapat menghilangkan data. Backup status terlihat. Persistence API bukan jaminan durability. Sync lintas perangkat deferred.

Initial schemaVersion adalah 1: tidak ada historical production schema yang diklaim didukung. Reject unsupported/newer versions tanpa mutation. Saat schema 2 dibuat, migration v1 ke v2 dengan preservation/rollback tests wajib sebelum release; detail skenario di Acceptance section 10.

## 7. Content pipeline
Markdown/metadata → schema validation → reference solution checks → exercise review → UX/accessibility review → batch availability. Raw HTML dinonaktifkan/disanitasi. Kode selalu text, tidak eval untuk rendering. External links aman.

Manifest memisahkan planned/available. Final 112/180 counts hanya authored content. Sources dan content version wajib.

## 8. Operations
Private hosting recommended, belum diprovisi. Sites/Workers jika digunakan bertindak sebagai HTTP broker; runner native terpisah. Telemetry eksternal off. Source logging minimal; provider retention ditinjau. Nomor runtime/compiler dilampirkan pada hasil agar reproducible.

## 9. Deferred
Cloud auth/sync, cross-device merge, full offline app shell, AI tutor, real-time interview partner, arbitrary-code debugger. Menambahnya membutuhkan scope/privacy/migration review.
