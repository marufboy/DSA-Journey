# Acceptance and Validation
DSA Journey · v0.2 · 31 Oktober 2026 · DRAFT

Kriteria yang direncanakan; belum ada aplikasi/test yang dinyatakan lolos.

## 1. Critical journeys
| ID | Scenario | Expected |
| --- | --- | --- |
| AT-01 | Onboarding nol | Modul 01 recommended; preferences editable |
| AT-02 | Lesson/reload | Posisi dan draft pulih |
| AT-03 | Python correct/error | Output/test nyata dan diagnosis |
| AT-04 | Python infinite loop/Stop | UI responsif; draft utuh; run berikutnya sukses |
| AT-05 | Language switch | Dua draft dan language evidence terpisah |
| AT-06 | C++ compile/crash/timeout | Status, limits, logs, recovery benar |
| AT-07 | Hint/solution | Assisted tercatat; bukan independent mastery |
| AT-08 | Delayed review failure | Remedial schedule dan reason |
| AT-09 | Backup/import | Round-trip setara; invalid file no mutation |
| AT-10 | Storage failure | Tidak Saved palsu; copy/export tersedia |
| AT-11 | Late response | Tidak menimpa attempt terbaru |
| AT-12 | Planned content | Jelas unavailable; bukan completed |
| AT-13 | Long absence | Capacity-aware review; backlog tidak dihapus |
| AT-14 | Network/provider down | Draft utuh; retry tidak duplicate job |
| AT-15 | Clear app data | Konfirmasi/cancel; hanya data aplikasi |
| AT-16 | Interview | Timer/hints akurat; self-review berlabel |

## 2. Content validation
Setiap lesson: objective, prerequisite, example, retrieval/practice, explanation, source, version. Semua activity memiliki ID/version, objective, instructions, activity kind, evidence method, attribution, dan explicit assessed criteria. Validation berikut bergantung pada kind, bukan stdin/stdout universal.

| Activity kind | Required validation |
| --- | --- |
| Coding | Input/output/constraints, reference solution, normal/boundary/counterexample tests, hints, correctness/complexity |
| Trace/predict | Structured accepted answer atau validator, reasoning/reference trace, ambiguous-answer policy |
| Counterexample | Input constraints, reference behavior, predicate yang membuktikan counterexample, illustrative valid/invalid cases |
| Explanation | Rubric dan example reasoning; self-review/manual-review label, bukan fabricated automated judgment |
| Project | Deliverable checklist, runnable/test evidence sesuai proyek, artifact review; tidak mewajibkan satu stdout universal |
| Career | Field/completion validation, edit/persistence checks, self-reported status; bukan verified DSA evidence |

Untuk soal yang memungkinkan, bandingkan optimized solution dengan independent brute-force oracle pada exhaustive/small seeded random inputs. Jangan hanya mirror implementasi. Kedua bahasa harus memenuhi kontrak yang sama. Penjelasan Indonesia dan istilah teknis diperiksa.

## 3. Progress/scheduler checks
Validate exercise-kind routing and evidence labels: coding/trace automatic checks, explanation/project rubrics, career self-report. Verify the concept coverage matrix before claiming a topic can reach Retained. Multi-concept exercises count only for explicitly assessed criteria; insufficiently covered electives remain introductory. No self-reported career activity may promote verified DSA mastery.

Independent versus assisted, distinct exercises, checkpoint threshold, delayed review min tujuh hari, timezone changes, empty queue, backlog, reschedule, import IDs/version, dan content revision. Completed count tidak otomatis mastery. Manual override bukan verified evidence.

## 4. Runtime checks
Python: initialization failure, stdin, syntax/runtime errors, output cap, Stop/restart, stale response.
C++: pinned compiler, valid/invalid code, crash, CPU/wall timeout, memory/output limit, network-disabled configuration, provider outage, rate limit, request authorization, polling/backoff, duplicate prevention.

C++ release blocked jika sandbox isolation/limits belum terbukti pada provider. Worker Python bukan adversarial sandbox. Uji aman dibatasi pada runner yang disediakan.

## 5. UI/accessibility checks
Keyboard journey: onboarding → lesson → editor → results → hint → next → backup. Editor escape, focus order/return, labels, announcement, split pane, reduced motion. Automated audit plus manual screen-reader smoke check. Target WCAG 2.2 AA bukan klaim sertifikasi.

Uji kedua tema, contrast setiap state, zoom 200%, 360px mobile, tablet, desktop 1280/1440, long code/error overflow. User walkthrough: menemukan next action, menjalankan contoh, memahami error, dan memulihkan backup tanpa instruksi verbal tambahan.

## 6. Performance budget — proposal
Target lesson usable ≤3s pada simulated fast 4G dan perangkat yang dicatat; Python runtime lazy loading dikecualikan dan memiliki indikator. Interaction feedback target ≤100ms di luar network/compiler/runtime startup. Semua klaim membutuhkan measurement, bukan angka asumsi.

## 7. Release gates
Current authorization is recorded in [12-IMPLEMENTATION-ADDENDUM.md](12-IMPLEMENTATION-ADDENDUM.md): implementation may proceed. R0 below is the historical documentation gate, not a renewed ban. Planned product acceptance evidence is still required and cannot be inferred from authorization.

| Release | Required |
| --- | --- |
| R0 | Design reviewed; decisions recorded; no implementation |
| R1 | Modul 01–04, 16/32; critical Python/storage/review/keyboard paths |
| R2 | Modul 05–08, 16/24; C++ runner, auth, limits, errors |
| R3 | Modul 09–24, 64/96; DSA content/visualizer/scheduler; regression |
| R4 | Modul 25–28, 16/28; project/interview; final total 112/180 |

Tidak menguji unavailable features seolah available. Completion report menyebut scope nyata, checks/results, yang belum diuji, dan limitations. Tidak "all passed" jika browser atau runner verification belum dilakukan.

## 8. Requirement-to-validation matrix
This is a specification of evidence to collect, not evidence that the product passes. Every row is required at its gate; documentation checker verifies row coverage only, while an independent reviewer judges adequacy.

| Requirement | Acceptance evidence to collect | Gate |
| --- | --- | --- |
| FR-01 | AT-01: mulai nol, ubah preferensi, reload | R1 |
| FR-02 | AT-12: 28 modul, prerequisite dan status planned/available | R1 |
| FR-03 | Pilih 15/45/90 menit; tepat satu primary next action; reschedule tidak menghapus backlog | R1 |
| FR-04 | AT-02 + audit lesson objectives/examples/checkpoints/source/next step | R1 |
| FR-05 | AT-03/04: output/error/Stop/restart nyata | R1 |
| FR-06 | AT-06/11/14 + seluruh runtime checks C++ | R2 |
| FR-07 | Known wrong answer menampilkan expected/actual dan failed suite sesuai contract | R1 |
| FR-08 | AT-07: hint berurutan, solusi assisted, draft tidak ditimpa | R1 |
| FR-09 | Inventory visualizer section 9; state sesuai oracle, validasi input, reset/back/next | R1–R3 |
| FR-10 | AT-07/08 + scheduler/evidence checks section 3 | R1 |
| FR-11 | Buat/edit/delete note, diagnosis terkait attempt; reload dan export mempertahankan edit | R1 |
| FR-12 | AT-02/10/11 + autosave dan multi-tab conflict simulation | R1 |
| FR-13 | AT-09: round-trip, preview replace, invalid schema dan atomic failure | R1 |
| FR-14 | AT-16: hidden pattern tags, timer controls, rubrik self-review | R4 |
| FR-15 | Create/edit proyek, STAR story, tracker lamaran manual; reload/backup mempertahankan data; tidak mengirim | R4 |
| FR-16 | Search kata known/unknown, combined filters, reset, empty result, planned/available; tidak mengubah progress | R1 |
| FR-17 | Lesson/exercise menampilkan source link dan version yang cocok manifest | R1 |
| FR-18 | AT-13: simulate absence, kapasitas membatasi rekomendasi, backlog tetap utuh | R1 |
| NFR-01 | Section 5 manual keyboard/screen reader + automated audit; target AA | R1–R4 |
| NFR-02 | Verify font controls, width, light/dark dan zoom pada screen sizes section 5 | R1 |
| NFR-03 | Throttle network: lesson usable sebelum Python ready; ukur section 6 | R1 |
| NFR-04 | AT-04/10/14: kegagalan tidak menghapus draft | R1–R2 |
| NFR-05 | Network inspection: Python local, C++ label remote, source dikirim hanya Run/Submit | R1–R2 |
| NFR-06 | Inspect frontend bundle for secrets; API auth dan sandbox configuration/resource tests | R2 |
| NFR-07 | Section 10: R1 schema 1 rejects unsupported/newer/invalid versions without mutation; historical migration/rollback tested when schema 2 ships | R1; migration at schema 2 |
| NFR-08 | Network/log inspection: no third-party telemetry default; metrics local | R1–R4 |
| NFR-09 | State inventory UX section 7: loading/empty/error/offline/timeout/unavailable | R1–R4 |
| UX-01 | Keyboard-only journey section 5; leave editor without trap | R1 |
| UX-02 | Inspect visible focus and modal focus return | R1 |
| UX-03 | Heading/label audit + screen-reader result announcement without duplication | R1 |
| UX-04 | Measure both themes/state contrast; normal 4.5:1, large 3:1 | R1 |
| UX-05 | Every available visualizer has state and explanation text equivalent | R1–R3 |
| UX-06 | Pause/speed/reduced-motion verification on each animation | R1–R3 |
| UX-07 | Mobile navigation and divider keyboard operations at zoom/reflow | R1 |

## 9. Visualization release inventory
| ID / gate | Reference visualizer | Input contract | Acceptance |
| --- | --- | --- | --- |
| VIZ-01 / R1 | Python loop and list trace | Integer list length 0–12; bounded loop; editable values | Zero/one/many iterations match reference state; previous/next/reset deterministic; text equivalent; reduced motion |
| VIZ-02 / R2 | C++ value versus reference | Fixed teaching function with safe local variables; editable bounded integers; no arbitrary code | Copy versus shared mutation and scope exit match explanation; reset/keyboard/text equivalent |
| VIZ-03 / R3 | Binary search | Sorted integer array length 0–32; target; duplicates policy defined | Found/missing/boundaries; left/mid/right match oracle; reject unsorted input |
| VIZ-04 / R3 | Tree traversal | Acyclic binary tree max 15 nodes | BFS/DFS visit order, empty/singleton, deterministic navigation |
| VIZ-05 / R3 | Graph BFS/DFS | Max 12 nodes/24 edges; directed flag; start; neighbor order explicit | Visited/queue/stack and disconnected cases; cycles terminate |
| VIZ-06 / R3 | DP table | Bounded teaching recurrence and base cases specified per lesson | Each cell follows recurrence; base/transition text; reference answer agreement |

Other visualizations are optional future scope unless explicitly added to this inventory. R1 does not require advanced DSA animations. Visualizers use reference algorithms, not arbitrary code instrumentation.

## 10. Migration contract and scenarios
First release uses schemaVersion 1; there is no real older production schema to migrate. Reject unsupported/newer backups without mutation and preserve the original file. Migration interface is versioned; forward compatibility is not promised. When schemaVersion 2 is introduced, supporting v1 to v2 migration is a release gate: test a v1 fixture, verify record counts/IDs/drafts/evidence preservation, inject migration failure, and confirm rollback leaves the pre-migration database untouched. Unsupported old formats receive an actionable export/recovery message; never silently drop records.
