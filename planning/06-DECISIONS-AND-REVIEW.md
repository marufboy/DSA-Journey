# Decisions and Review
DSA Journey · v0.2 · 31 Oktober 2026 · DRAFT

## 1. Confirmed intent
Current authority: user explicitly said "Oke go for it all and create them" on 2026-10-31 after SC-01 through SC-06. Authorization: IMPLEMENTATION AUTHORIZED. [12-IMPLEMENTATION-ADDENDUM.md](12-IMPLEMENTATION-ADDENDUM.md) supersedes earlier pending implementation approval, chooses interleaved default, and records dependency-free ESM after npm ENOTFOUND. Paid-provider choice remains open; product acceptance is not implied. Historical proposals below remain traceable.

User meminta basic-to-advanced, Python/C++, interactive app, readable UI/UX, PRD/Markdown untuk iterasi sebelum coding, dan aturan dari repository Karpathy-inspired dibaca sebelum pengerjaan.

28 modul, stack, content counts, mastery rules, local storage, dan timeline adalah proposal assistant; belum approval final.

## 2. Decision register
| ID | Topic | Proposed default | Status |
| --- | --- | --- | --- |
| D-01 | Learning order | Python → C++ → DSA bahasa utama | Proposed |
| D-02 | Role | SWE utama; SDET pilihan | Proposed |
| D-03 | Time | 8–10h/week; praktis 18–24 bulan | Proposed |
| D-04 | Storage | Local-first + backup | Proposed; tidak auto-sync PC/phone |
| D-05 | C++ runner | Managed sandbox via API | OPEN sebelum R2: provider/budget/auth/retention |
| D-06 | Hosting | Owner-private | Proposed; belum dibuat |
| D-07 | Content | 112 lessons / 180 original exercises/labs | Proposed; staged |
| D-08 | AI | Deferred; authored hints | Proposed |
| D-09 | UI | Readable workspace, theme, keyboard | Proposed; wireframe next |
| D-10 | Advanced depth | Core interview + selected electives | Proposed |
| D-11 | Language | Indonesian explanation, English practice | Proposed |
| D-12 | Cloud sync | Deferred | Proposed; bila wajib scope berubah |
| D-13 | Development rules | Project-local adapted rules + AGENTS entry | Requested; drafted |

D-05 tidak menghalangi review dokumen; tidak boleh menganggap provider gratis/tanpa batas tersedia. Tidak ada biaya/subscription diaktifkan melalui task ini.

## 3. Review checklist
- [ ] Tujuan/role sesuai.
- [ ] Python-first dan C++ sesuai.
- [ ] Jadwal dan kurikulum realistis.
- [ ] UI mendukung membaca dan bereksperimen.
- [ ] Local progress/backup cukup untuk v1.
- [ ] Rilis bertahap diterima.
- [ ] Advanced scope jelas.
- [ ] Acceptance mewakili kebutuhan.
- [ ] Aturan pengerjaan berlaku sebelum implementasi.

## 4. Feedback template
- Document/section:
- Requirement/decision ID:
- What should change:
- Why it matters:
- Priority: must / should / optional
- Example of acceptable behavior:

Contoh: UX-01, saya ingin pindah Problem/Code dengan keyboard karena sering belajar tanpa mouse.

## 5. Review status
Outcome: IMPLEMENTATION AUTHORIZED, 2026-10-31; six safeguards accepted. Browser QA/runtime NOT VERIFIED; C++ provider UNCONFIGURED. Earlier NOT REVIEWED status is superseded by the explicit instruction recorded in section 1.
Pilihan: Needs revision / Approved with explicit changes / Approved for implementation planning.
Approved version:
Date:
Notes:

Tidak ada komentar bukan approval. PRD approval tidak otomatis memilih layanan berbayar.

## 6. Precedence
PRD = scope; Curriculum = learning inventory; UI/UX = interaction; Architecture = technical proposal; Acceptance = verification. Bila konflik, catat lalu update dokumen terkait sebelum implementation planning. AGENTS dan Development Rules mengatur workflow, tetap tunduk pada instruksi user dan aturan platform yang lebih tinggi.

## 7. Risks
Adversarial review reopens six cross-layer conditions (see 11-ADVERSARIAL-REVIEW.md): exposure-aware mastery, fresh Python grading, content-version recovery, durable remote-job idempotency, language/review workload, and early career-fit checkpoints. Current end-to-end assurance is CONDITIONAL. These are proposed amendments, not runtime fixes. Sequential versus interleaved C++ route remains a user choice; no curriculum change is silently applied.

Scope besar → authoring per batch. Dua bahasa → bridge terpilih. Terlalu banyak hints → assisted evidence. Data browser hilang → backup. C++ biaya/outage → provider decision/adapter. UI padat → progressive disclosure dan walkthrough. Salah mengartikan readiness → evidence/rubrik, bukan hiring score.

## 8. Changelog
v0.1, 2026-10-31: initial review pack; project-local development rules dari referensi user. Tidak ada implementasi aplikasi atau global skill installation.

Builder review resolved: distinguish coding/trace/rubric/career activity kinds; record evidence method; add concept-to-exercise coverage matrix; introductory electives cannot receive Retained without sufficient variants. These are explicit design choices for user review, not questions blocking this draft.

v0.2, 2026-10-31: independent validator; complete requirement traceability, kind-specific grading, named visualizers, migration scenarios. Original findings and limits retained in Validation Report.

## 9. Next step
v0.3 review addendum: resolve the Swiss-cheese amendments at their explicit gates; structural PASS alone does not authorize implementation.

Continue authorized implementation in .., following its plan, ledger and the addendum. Validate UI with the user and browser; do not infer runtime/provider acceptance from source or documentation checks.
