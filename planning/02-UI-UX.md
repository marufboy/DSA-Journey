# UI/UX Specification
DSA Journey · v0.2 · 31 Oktober 2026 · DRAFT

## 1. Principles
Satu primary action per area; teks mudah dibaca; detail dibuka bertahap; errors memberi langkah pemulihan. Tidak ada streak yang menghukum. Infrastructure details muncul hanya bila membantu keputusan pengguna.

## 2. Information architecture
| Screen / route | Purpose |
| --- | --- |
| Today /today | Mission, due review, resume |
| Roadmap /roadmap | 28 modul, prerequisite, evidence |
| Lesson /learn/:id | Materi dan checkpoint |
| Practice /practice/:id | Editor dan pengujian |
| Playground /playground/:id | Visualisasi referensi |
| Review /review | Review queue |
| Notes /notes | Mistake notebook |
| Progress /progress | Evidence per konsep/bahasa |
| Interview /interview | Simulasi dan history |
| Career /career | Proyek dan preparation |
| Settings /settings | Tema, bahasa, backup, data |

Sidebar desktop: Learn, Practice, Prepare, Settings. Planned routes diberi status; tidak terlihat seperti fitur aktif.

## 3. Screen specifications
### Today
Satu kartu Continue berisi tujuan sesi dan estimasi waktu. Due review, next lesson, ringkasan mingguan berada di bawah. Pengguna baru melihat satu ajakan mulai, bukan grafik kosong. Kapasitas 15/45/90 menit adalah planner, bukan timer pemaksaan.

### Lesson
Tujuan → prerequisite → penjelasan → contoh → prediksi → latihan → refleksi → next step. Target reading column 60–75 karakter; istilah didefinisikan saat pertama muncul. Bahasa Indonesia untuk penjelasan; nama API dan technical keywords konsisten. Editor hanya muncul bila aktivitas membutuhkan coding.

### Coding lab
Desktop: panel soal 40%, editor/results 60%, divider adjustable dengan pointer dan keyboard. Kiri: Problem/Hints/Explanation. Kanan: language selector, editor, Run/Submit/Stop, Input/Output/Tests.

Run memakai contoh atau custom input; Submit memakai suite. Bahasa memiliki draft sendiri. Reset draft meminta konfirmasi bila akan menimpa edit. Status jelas: Loading Python, Compiling, Running, Finished. Errors memisahkan ringkasan sederhana dan compiler detail.

Mobile: Problem/Code/Results menjadi tab, mempertahankan draft dan scroll position. Kontrol tidak menutupi keyboard. Code block dapat scroll sendiri; halaman keseluruhan tidak overflow horizontal.

### Visualizer
Previous/next, play/pause, reset, speed, dan input. State variable dan penjelasan langkah selalu dapat dibaca sebagai teks. Validasi sorted input binary search atau graph bounds sebelum mulai. Reduced motion mengganti state tanpa animasi. Label "Reference algorithm" membedakan dari user-code debugging.

Scope per release mengikuti named inventory VIZ-01 sampai VIZ-06 di Acceptance section 9: R1 loop/list trace; R2 value/reference; R3 binary search, tree traversal, graph traversal, dan DP table. Animasi lain tidak otomatis termasuk scope.

### Review and progress
Review menampilkan konsep, alasan, last result, dan estimasi waktu. Assisted berbeda dari independent. Setelah membuka solusi: "Selesai dengan bantuan; coba variasi mandiri berikutnya." Progress menunjukkan evidence/tanggal, bukan skor tanpa dasar. Visual chart memiliki tabel/teks ekuivalen.

### Interview and career
Interview menyembunyikan pattern tags/solusi selama sesi; timer opsional. Checklist clarify/propose/implement/test/complexity. Self-review berlabel. Career tracker manual dan tidak mengirim lamaran/pesan.

## 4. Key flows
Pemula: onboarding → mulai dari nol → lesson 01 → predict → code → feedback → review date → resume.

Gagal: Submit → expected/actual → diagnosis/hint → edit → retry. Attempt history utuh; solusi tidak menggantikan kode otomatis.

Absen: pilih kapasitas → review remedial kecil → next lesson disesuaikan. Backlog tetap ada, tidak dibebankan seluruhnya hari itu.

Backup: Export JSON; Import → validate → preview counts/replace consequence → confirm → atomic commit. Invalid file tidak mengubah data.

## 5. Design tokens — proposed
| Token | Proposal |
| --- | --- |
| Light background / surface | #F8FAFC / #FFFFFF |
| Dark background / surface | #0F172A / #1E293B |
| Light text / muted | #0F172A / #475569 |
| Dark text / muted | #F8FAFC / #CBD5E1 |
| Primary | #1D4ED8 + white text; dark variants diuji |
| Body / code | 18 px / 15–16 px; adjustable |
| Line height | 1.6 body; ≥1.45 code |
| Spacing | 4/8/12/16/24/32/48 px |
| Main controls | Target area 44 × 44 px |

System sans dan monospace lokal; font eksternal bukan dependency. Status memakai label/ikon selain warna. Breakpoint berdasarkan layout, bukan jenis perangkat. Uji 360 px mobile, tablet, desktop 1280/1440 px, dan zoom 200%. Warna belum dinyatakan lolos sebelum contrast testing.

## 6. Accessibility
- UX-01: keyboard untuk seluruh core journey; editor dapat ditinggalkan tanpa trap.
- UX-02: visible focus; modal mengembalikan focus ke pemicu.
- UX-03: headings/labels benar; test result diumumkan screen reader tanpa spam.
- UX-04: target WCAG AA contrast 4.5:1 normal text, 3:1 large text; states turut diperiksa.
- UX-05: visualizer memiliki text equivalent.
- UX-06: pause, speed, reduced motion; tidak ada autoplay menghalangi membaca.
- UX-07: mobile navigation dan split pane punya keyboard alternative.

## 7. States and recovery
| State | Response |
| --- | --- |
| Runtime loading | Materi terbaca; progress text; retry/cancel |
| C++ unavailable | Honest unavailable label dan local compile guide |
| Offline | Python bila assets sudah ada; C++ unavailable; draft disimpan |
| Timeout | Batas dijelaskan; retry; draft utuh |
| Storage failure | Jangan tampilkan Saved; copy/export ditawarkan |
| Invalid import | Alasan jelas; data lama utuh |
| Planned content | Outline dan target release; bukan completed |
| Unknown remote job | Check status sebelum retry agar tidak menggandakan |

## 8. Next design deliverables
Setelah PRD direction disetujui: wireframe Today/Lesson/Coding Lab desktop-mobile; contoh high-fidelity satu lesson; state components dan keyboard walkthrough. Dokumen ini belum usability-tested mockup.
