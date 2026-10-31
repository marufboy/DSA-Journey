# DSA Journey — Review Pack
Version 0.3 · 31 Oktober 2026 · DRAFT / adversarial amendments pending review

Paket spesifikasi untuk aplikasi belajar programming dan DSA personal. Implementation is now explicitly authorized and source is in ... Read [12-IMPLEMENTATION-ADDENDUM.md](12-IMPLEMENTATION-ADDENDUM.md) for current authorization, six safeguards, interleaved route, stack ruling and evidence limits. Browser QA/runtime remain NOT VERIFIED; C++ real provider is UNCONFIGURED. Historical review statements below describe their original snapshots.

## Mulai dari sini
1. [PRD](01-PRD.md): tujuan, scope, requirements, dan release.
2. [UI/UX](02-UI-UX.md): layar, alur, keterbacaan, dan aksesibilitas.
3. [Curriculum](03-CURRICULUM.md): 28 modul dan estimasi belajar.
4. [Architecture](04-TECHNICAL-ARCHITECTURE.md): runtime Python/C++, data, dan trade-off.
5. [Acceptance](05-ACCEPTANCE-AND-VALIDATION.md): bukti verifikasi yang dibutuhkan.
6. [Decisions](06-DECISIONS-AND-REVIEW.md): asumsi, keputusan terbuka, dan template feedback.
7. [Sources](07-SOURCES.md): rujukan dan batas klaim.
8. [Development rules](08-DEVELOPMENT-RULES.md): wajib dibaca sebelum implementasi atau menjalankan perintah proyek.
9. [AGENTS](AGENTS.md): entry point bagi coding agent.
10. [Validation agent](09-VALIDATION-AGENT.md): reusable reviewer brief dan cara menjalankannya.
11. [Validation report](10-VALIDATION-REPORT.md): hasil audit, perbaikan, dan batas validasi.
12. [Swiss-cheese review](11-ADVERSARIAL-REVIEW.md): failure chains lintas komponen dan proposed safeguards. Latest end-to-end assurance: CONDITIONAL; structural PASS tidak menutup temuan ini.

## Re-run validation
Jalankan Python 3 pada tools/validate_docs.py dari folder ini. Script memeriksa struktur, local links, requirements inventory, jumlah materi/jam, dan coverage baris traceability. PASS struktural tidak berarti semua acceptance criteria sudah memadai atau aplikasi bekerja. Minta agent: "Run DSA Plan Validator against the current review pack and update the validation report." Definisi agent bersifat project-local; bukan skill global terpasang.

Tautan relatif berfungsi jika file dibuka sebagai satu folder. Untuk review mandiri, nama file pada tabel isi sama dengan judul file yang dibagikan.

## Rekomendasi utama
- Penjelasan Indonesia; istilah teknis dan latihan interview Inggris.
- Python dahulu, kemudian C++; satu bahasa utama untuk mayoritas latihan DSA.
- 28 modul, target 112 lessons dan 180 latihan/lab orisinal.
- Estimasi belajar 600–800 jam; rencana praktis 18–24 bulan pada 8–10 jam per minggu dengan buffer.
- Python di browser; C++ melalui sandbox remote.
- Progres lokal + export/import pada v1; cloud sync berikutnya.
- Materi, hints, dan feedback dasar tidak membutuhkan AI generatif.
- Target karier SWE; SDET sebagai opsi terkait pengalaman QA. Tidak menjamin pekerjaan.

## Cara review
Prioritaskan tujuan, urutan bahasa, kenyamanan UI, waktu belajar, dan keterbatasan progres lokal. Gunakan ID requirement seperti FR-05 atau decision D-04 saat memberi komentar.

Semua pilihan teknis dan angka konten adalah proposal penulis. Dokumen bukan bukti user sudah menyetujuinya. Ketiadaan komentar bukan approval.

## Iterasi
Current addendum v0.4 records explicit implementation authorization on 2026-10-31; historical v0.1-v0.3 review/approval notices do not rescind it. Implementation acceptance and provider/budget gates remain separate.

v0.2 memuat validation agent, traceability, dan perbaikan hasil audit; v0.1 adalah baseline review. Revisi memakai file yang sama, menaikkan versi, dan mencatat keputusan pada Decisions. Setelah design disetujui, susun implementation plan dan review wireframe sebelum implementasi penuh.
