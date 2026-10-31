# Product Requirements Document
DSA Journey · v0.2 · 31 Oktober 2026 · DRAFT

## 1. Intent
Membantu pembelajar dari dasar programming menuju kemampuan menyelesaikan masalah DSA, mempertahankan pengetahuan, membangun proyek, dan mempersiapkan lamaran Software Engineer di perusahaan teknologi besar. FAANG merupakan aspirasi, bukan hasil yang dapat dijamin aplikasi.

Pengguna awal: satu pembelajar dewasa dengan pengalaman QA dan double job. Kemampuan Python, C++, atau matematika diskrit tidak diasumsikan. Waktu sesi dapat berubah setiap hari.

## 2. Problems
Daftar soal tidak menjembatani pemula menuju problem solving mandiri. Membaca solusi mudah disalahartikan sebagai penguasaan. Belajar dua bahasa sekaligus dapat mencampurkan kesulitan sintaks dengan konsep. Jadwal sibuk membutuhkan review dan resume yang sederhana. Kesiapan interview mencakup reasoning, coding, testing, komunikasi, dan pengalaman proyek.

## 3. Goals
| Goal | Evidence |
| --- | --- |
| Menguasai programming dasar | Program kecil dan penjelasan sendiri |
| Memahami DSA | Variasi baru, correctness, dan complexity |
| Mempertahankan kemampuan | Delayed review mandiri |
| Belajar konsisten | Sesi sesuai kapasitas, resume, dan reschedule |
| Mendukung lamaran | Proyek, mock interview, dan checklist role |

Jumlah soal dan streak bukan ukuran penguasaan. Tidak ada hiring probability atau klaim sertifikasi perusahaan.

## 4. Scope
Produk lengkap v1: 28 modul, Python/C++, 112 lessons, 180 latihan/lab orisinal, visualisasi terpilih, code runner, review, mistake notes, interview practice, proyek, backup, dan career workspace manual.

Di luar v1: tutor AI generatif, classroom multiuser, leaderboard, pembayaran, auto-apply, scraping/sync LeetCode, menyalin premium problems, live collaboration, cloud sync, offline penuh, serta visual debugging otomatis untuk arbitrary user code.

## 5. User stories
- Sebagai pemula, saya tahu next step dan prerequisite-nya.
- Sebagai pengguna sibuk, saya dapat menyelesaikan sesi 15 menit dan melanjutkannya nanti.
- Sebagai pembelajar dua bahasa, saya melihat penguasaan konsep terpisah dari sintaks.
- Sebagai kandidat, saya menyelesaikan soal tanpa petunjuk pola dan menguji solusi.
- Sebagai QA, saya menggunakan pengalaman testing tanpa melewati fondasi programming.

## 6. Functional requirements
| ID | Requirement | Acceptance ringkas | Release |
| --- | --- | --- | --- |
| FR-01 | Onboarding | Mulai dari nol, waktu, tema, dan bahasa; dapat diubah | R1 |
| FR-02 | Roadmap 28 modul | Prerequisite dan Planned/Available terlihat | R1 |
| FR-03 | Today's Mission | Satu next action; kapasitas 15/45/90 menit; reschedule | R1 |
| FR-04 | Lesson workspace | Tujuan, materi, contoh, checkpoint, sources, next step | R1 |
| FR-05 | Python lab | Run, Submit, Stop, stdin, stdout, stderr, dan retry | R1 |
| FR-06 | C++ lab | Compile/run nyata, job status, error dan limits | R2 |
| FR-07 | Test feedback | Expected/actual untuk contoh; status suite jelas | R1 |
| FR-08 | Hint ladder | Konsep sampai solusi; assisted attempt tercatat | R1 |
| FR-09 | Visualisasi | Step/play/pause/reset, input validation, deskripsi teks | R1–R3 |
| FR-10 | Mastery/review | Konsep dan bahasa terpisah; delayed review | R1 |
| FR-11 | Mistake notebook | Diagnosis otomatis sederhana dan catatan editable | R1 |
| FR-12 | Autosave/resume | Kode, attempts, lesson position, dan due dates | R1 |
| FR-13 | Backup/restore | JSON berversi; preview; atomic replace | R1 |
| FR-14 | Interview room | Timer opsional; pattern tags disembunyikan; rubrik | R4 |
| FR-15 | Career workspace | Proyek, STAR notes, checklist, tracker manual | R4 |
| FR-16 | Catalog/search | Filter konsep, bahasa, status, difficulty | R1 |
| FR-17 | Provenance | Content version dan sources terlihat | R1 |
| FR-18 | Return after absence | Prioritas review; backlog tidak menjadi hukuman | R1 |

Python client-side tests tidak dijanjikan rahasia. Tidak ada hasil eksekusi atau AI review palsu.

## 7. Mastery policy
States: Not started → Learning → Practicing → Provisionally mastered → Retained. Gagal review dapat mengembalikan state ke Practicing dengan alasan.

Default proposed evidence: checkpoint minimal 80%, dua latihan berbeda tanpa solusi, explanation rubric lengkap, dan satu delayed independent review minimal tujuh hari kemudian. Retained belum tersedia jika bukti tidak cukup. Reading advanced content tetap boleh; prerequisite recommendation jelas.

Self-assessment dibedakan dari hasil test. Concept evidence tidak otomatis memberi mastery implementasi bahasa kedua. Threshold adalah heuristik internal yang dapat dikalibrasi, bukan standar perusahaan.

## 8. Nonfunctional requirements
- NFR-01: target WCAG 2.2 AA; keyboard, focus, contrast, zoom 200%, reduced motion.
- NFR-02: light/dark; body 16–18 px; reading width terbatas; editor font adjustable.
- NFR-03: lesson dapat dibaca sebelum runtime coding selesai dimuat.
- NFR-04: network/storage/runtime failure tidak menghapus draft.
- NFR-05: UI menunjukkan Python lokal dan C++ remote; pengiriman kode melalui aksi eksplisit.
- NFR-06: API secret backend; C++ sandbox dengan limits dan network disabled.
- NFR-07: content/backup schema berversi dengan migration.
- NFR-08: telemetry pihak ketiga off secara default.
- NFR-09: loading, empty, error, offline, timeout, unavailable states lengkap.

## 9. Evaluation limits
Correctness dinilai menurut test contract. Explanation/communication/behavioral memakai rubrik dan self-review berlabel pada v1. Runtime browser tidak membuktikan Big O dan tidak membandingkan Python/C++ secara adil. Readiness bukan peluang diterima kerja.

## 10. Delivery
| Release | Scope tersedia | Gate |
| --- | --- | --- |
| R0 | Dokumen, kemudian wireframe setelah persetujuan arah | Design review |
| R1 | Modul 01–04: 16 lesson/32 exercise; Python, review, backup | Acceptance foundation |
| R2 | Modul 05–08: 16 lesson/24 exercise; C++ bridge dan runner | Provider/budget/limits diputuskan |
| R3 | Modul 09–24: 64 lesson/96 exercise; DSA dan visualisasi | Content/test validation per batch |
| R4 | Modul 25–28: 16 lesson/28 lab; proyek/interview/career | Full v1 acceptance |

Total 112 lessons/180 exercises. Outlines tidak dihitung sebagai authored content. Jumlah target dapat direvisi eksplisit. Tidak ada deadline development sebelum breakdown dan dependencies diputuskan. Estimasi belajar berbeda dari estimasi pembuatan.

## 11. Dependencies and risks
C++ runner membutuhkan layanan/host terpisah; provider dan biaya belum dipilih. Progres lokal dapat hilang saat browser data dibersihkan; backup wajib berfungsi. Authoring lebih besar daripada UI; setiap batch direview. Interview scope tergantung role/level; sumber direfresh menjelang lamaran.

## 12. Approval
Status: IMPLEMENTATION AUTHORIZED, 2026-10-31. User: "Oke go for it all and create them" after the Swiss-cheese review. [Implementation addendum](12-IMPLEMENTATION-ADDENDUM.md) supersedes the earlier documentation-only phase, sequential-route default and proposed stack. Product acceptance remains unverified until its release evidence exists; authorization is not a test result.
