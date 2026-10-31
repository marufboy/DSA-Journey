# Curriculum — 28 Modules
DSA Journey · v0.2 · 31 Oktober 2026 · DRAFT

## 1. Learning model
Python dulu untuk logika; C++ untuk types, reference, memory, STL. Setelah mencoba keduanya, mayoritas latihan DSA memakai satu bahasa utama. Bridge exercises tertentu memakai keduanya. Target 112 lessons (4/modul) dan 180 exercises/labs; belum konten yang tersedia.

| Module | Topic | Outcome | Lessons / exercises |
| --- | --- | --- | --- |
| 01 | Program, Python, I/O | Program input-transform-output | 4 / 8 |
| 02 | Variables, types, conditions | Memilih tipe dan branching | 4 / 8 |
| 03 | Loops, functions | Memecah program menjadi fungsi | 4 / 8 |
| 04 | Collections, debugging, tests | Program kecil dengan edge cases | 4 / 8 |
| 05 | C++ compile, I/O, types | Compile dan baca error sederhana | 4 / 6 |
| 06 | Functions, value/reference, const | Menjelaskan mutasi dan scope | 4 / 6 |
| 07 | Pointer, memory, lifetime, RAII | Safe ownership dan dangling reference intuition | 4 / 6 |
| 08 | STL and language bridge | vector/string/map/set dan operasi | 4 / 6 |
| 09 | Logic, sets, logarithms, discrete math | Reasoning, counting, sets | 4 / 6 |
| 10 | Time/space complexity | Big O dan amortized intuition | 4 / 6 |
| 11 | Recursion and call stack | Base case, progress, termination | 4 / 6 |
| 12 | Correctness, invariant, testing | Justification dan counterexample | 4 / 6 |
| 13 | Arrays and strings | Traversal, mutation, bounds | 4 / 6 |
| 14 | Hash map/set | Counting, lookup, deduplication | 4 / 6 |
| 15 | Linked list, stack, queue | Implementasi dan pemilihan struktur | 4 / 6 |
| 16 | Sorting and search patterns | Sorting, binary search, two pointers, sliding window, prefix sum | 4 / 6 |
| 17 | Trees and BST | Traversal dan invariant | 4 / 6 |
| 18 | Heap and priority queue | Top-k dan scheduling | 4 / 6 |
| 19 | Backtracking | State, undo, pruning | 4 / 6 |
| 20 | Graph representation/BFS/DFS | Connectivity, cycles, traversal | 4 / 6 |
| 21 | Advanced graph | Topological sort, union-find, Dijkstra | 4 / 6 |
| 22 | Greedy | Reasoning dan counterexamples | 4 / 6 |
| 23 | Dynamic programming | State, transition, memoization, tabulation | 4 / 6 |
| 24 | Advanced electives | Bits, trie/string matching, range query overview | 4 / 6 |
| 25 | Applied project | Code, tests, Git, README, trade-offs | 4 / 7 |
| 26 | CS/system design foundation | DB/index, HTTP/network, OS/concurrency, design | 4 / 7 |
| 27 | Mixed problems/mock interview | Clarify, implement, test, explain | 4 / 7 |
| 28 | Career preparation | CV, portfolio, STAR stories, role fit | 4 / 7 |

Modul 16/21/23/24 dapat berisi beberapa sublesson per lesson. Broad advanced topics adalah pengantar/elective; tidak mengklaim seluruh algoritma lanjut atau competitive programming dikuasai dengan empat lesson. Pemecahan konten dapat direvisi tanpa mengubah tujuan 28 modul.

## 2. Prerequisites
Current route ruling: [Implementation addendum](12-IMPLEMENTATION-ADDENDUM.md) supersedes the sequential 01-08 default below. Default is interleaved after Python foundations and C++ orientation, retaining selected language bridges and Python retrieval; sequential remains selectable. Topic-level prerequisites still apply. The original schedule remains an uncalibrated estimate.

01–08 berurutan untuk fondasi bahasa. 09–12 setelah basic programming. 13–16 membutuhkan fondasi complexity/recursion/testing. 17–20 membutuhkan basic structures dan recursion. 21 sesudah 20; 23 membutuhkan recursion dan state modeling. Modul 24 mengikuti prerequisite masing-masing topik.

Proyek kecil mulai setelah 04; behavioral notes dapat dimulai kapan saja. Preview outline bebas. Tidak melewati fondasi hanya karena pengguna bekerja sebagai QA.

## 3. Lesson format
Objectives → concrete example → intuition/state → predict/trace → guided implementation → independent variation → correctness/complexity/edge cases → reflection/review.

Blok reading/activity umumnya 10–20 menit; seluruh lesson dengan latihan bisa lebih lama. Bentuk exercise: tracing, bug fix, fill code, implementation, counterexample, explanation, dan project assessment. Variasi baru mengubah reasoning, bukan sekadar angka.

## 4. Language policy
Python runtime version dipin saat implementasi. C++17 proposed baseline dengan GCC version tercatat. Hindari fitur nonstandard. Bahas overflow, division, copy/reference, mutability, container complexity, string encoding.

Kontrak soal menjelaskan empty/duplicates/order/ties/numeric bounds. Floating-point memakai tolerance eksplisit. Jangan menyamakan byte C++ string dengan grapheme Unicode.

## 5. Applied projects
Pilihan: transaction deduplication (hashing); test dependency scheduler (graph); catalog prefix search (trie); LRU cache (map + linked list). Minimal satu proyek lengkap dengan README/tests/trade-offs sebelum portfolio review. Keempat proyek tidak wajib.

## 6. Time estimate
| Stage | Modules | Hours incl. practice/review |
| --- | --- | --- |
| Python | 01–04 | 60–80 |
| C++ | 05–08 | 80–110 |
| CS foundation | 09–12 | 60–80 |
| Basic DSA | 13–16 | 90–120 |
| Intermediate | 17–20 | 80–110 |
| Advanced | 21–24 | 100–140 |
| Project/interview/career | 25–28 | 130–160 |
| Total | 28 | 600–800 |

8h/week = 75–100 weeks (~17–23 months) tanpa jeda. 10h/week = 60–80 weeks (~14–19 months). Rencana praktis 18–24 bulan dengan buffer; dapat lebih lama. Ini estimasi penulis, bukan jaminan atau estimasi resmi universitas. Development effort berbeda.

## 7. Review and readiness
Initial review intervals 1/3/7/14/30 hari adalah heuristik. Gagal → remedial/interval pendek. Sesi 15 menit menawarkan maksimal tiga due items, sisanya tetap tersedia. Simpan local date/timezone; perubahan zona tidak membuat review ganda.

Interview practice dimulai setelah core patterns sebelum seluruh elective selesai. Readiness rubric internal mencakup clarification, correctness, complexity reasoning, testing, communication, project depth. Lamaran dapat dimulai saat bukti sesuai target role; tidak wajib menunggu seluruh elective.
