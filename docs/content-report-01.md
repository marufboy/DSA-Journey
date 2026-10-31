# Content report 01 — Modules m01–m07

Tanggal: 2026-10-31. Scope: authored curriculum only; hanya `dist/content/part-01.json` dan laporan ini.

## Konten

- 7 modul berurutan, 28 lesson substantif (empat per modul), 50 aktivitas.
- m01–m04: masing-masing 8 coding exercises; m05–m07: masing-masing 6 aktivitas C++ berbentuk trace/explanation.
- Total: 32 coding, 11 trace, 7 explanation. Semua coding memiliki Python dan C++ reference, scaffold yang belum menyelesaikan soal, serta minimal tiga kasus nyata.
- 84 blok penjelasan, 28 worked-code blocks, 28 callouts, 28 checkpoints empat opsi. Posisi jawaban benar bervariasi.
- 125 kasus stdin/stdout mencakup nol, satu item, batas inklusif, semua negatif, duplikasi, ordering, panjang kosong yang diizinkan, dan representasi identifier dengan nol awal.
- Python: program/I/O, types/branching, loops/functions, collections/debugging/testing. C++: build/I/O/types, value/reference/const/scope, pointer/lifetime/RAII/move.

## Variasi dan kejujuran penilaian

Pasangan practice/transfer mengubah reasoning: satu baris ke pemetaan dua field, penjumlahan ke konversi satuan, quotient/remainder ke dekomposisi durasi, angka ke identifier, AND ke interval lintas tengah malam dengan OR, sum ke count, banyak digit ke jumlah digit, reverse ke rotation, frequency ke first unique, maksimum ke first mismatch, serta threshold sum ke adjacent groups. Bukan sekadar angka contoh yang diganti.

Coding function/dict exercises memuat tujuan struktur implementasi. Tes stdout hanya membuktikan hasil kasus yang dideklarasikan; pemakaian helper, tanpa global, atau dict tetap memerlukan review kode. Aktivitas explanation tidak memakai penilaian otomatis palsu dan menyertakan expected response serta rubric. Materi C++ yang sengaja memiliki dangling pointer hanya didiagnosis; tidak dijalankan dan tidak diberi output deterministik. Tidak ada klaim penguasaan luas dari hitungan latihan.

## Verifikasi

- JSON UTF-8 parse: PASS.
- Exact required field sets, ID uniqueness, module/lesson/exercise backlinks, prerequisite sequence, per-module counts, hint count, checkpoint/trace bounds, dan example-to-test correspondence: PASS.
- Semua 32 reference Python yang saya tulis dijalankan dalam proses baru per kasus dengan timeout 5 detik dan input stdin. Interpreter: `C:/Users/Afif/AppData/Roaming/uv/python/cpython-3.11-windows-x86_64-none/python.exe`.
- Hasil akhir: **125/125 declared coding cases PASS; 0 failures**. Output dibandingkan sesuai urutan, dengan trailing whitespace per baris dan trailing newline dinormalisasi; leading whitespace dan urutan tidak dihapus.
- Jalur initial verification juga 125/125 PASS. Setelah review urutan pedagogis, m01-e5 diubah dari dua token sebaris menjadi dua baris agar belum membutuhkan split sebelum lesson 4; seluruh 125 kasus dijalankan ulang dan PASS.
- Tidak ada reference-test failure yang perlu diperbaiki. Satu command authoring awal melewati batas panjang command line Windows sebelum menulis; konten ditulis ulang dalam batch lebih kecil.
- 11 trace ditelusuri secara manual berdasarkan tipe, state, alias, dan lifetime; daftar hasil ada di bawah.
- Tidak menginstal paket, tidak menjalankan learner code, dan tidak mengubah application source.

## Trace review

| ID | Expected selection | Reasoning focus |
| --- | --- | --- |
| m05-e1 | QA2 | cpp-compile |
| m05-e3 | 3:Ada | cpp-streams |
| m05-e5 | 10000000000 | cpp-types |
| m05-e6 | -2 -2 | cpp-division |
| m06-e1 | 3 7 | cpp-value |
| m06-e3 | 10 4 | cpp-reference |
| m06-e4 | 10 | cpp-reference |
| m07-e1 | 6 1 | cpp-pointer |
| m07-e3 | Undefined behavior; tidak ada output portabel | cpp-lifetime |
| m07-e5 | ADB | cpp-raii |
| m07-e6 | 1 7 | cpp-ownership |

## Batas verifikasi dan sumber

Reference C++ tersedia untuk 32 coding activities tetapi belum dikompilasi atau dieksekusi; runner C++ tetap dapat unavailable. Trace/explanation ditujukan untuk belajar saat native runner belum tersedia. Pengujian ini memvalidasi trusted author references, bukan browser execution, rendering aplikasi, atau arbitrary learner submissions.

Sumber konsep: official Python 3.11 tutorial dan built-in docs, C++ Core Guidelines (ISO C++ community), serta Standard C++ FAQ. Penjelasan, soal, solusi, dan test cases ditulis sendiri. Sumber Python dan C++ Guidelines diverifikasi melalui web discovery; tidak menyalin soal berbayar atau prose sumber.
