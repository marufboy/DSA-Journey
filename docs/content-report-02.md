# Content report 02 — m08–m14

Status: authored and locally verified on 2026-10-31.

## Scope and inventory

Only dist/content/part-02.json and this report were written. Content follows docs/CONTENT-CONTRACT.md and the approved implementation ruling in the application AGENTS.md. No dependencies were installed, no product server or service was started, and no learner code was executed.

- 7 modules, exactly 4 lessons and 6 exercises each.
- 28 Indonesian lessons, each with three authored explanatory text blocks and a worked code example. Seven final lessons add an English interview reflection with Indonesian guidance.
- 42 original exercises: 27 coding, 7 trace, 8 explanation.
- Variants: 22 practice, 19 transfer, 1 guided.
- 27 Python and 27 C++17 standard-library reference solutions. Coding starter programs are unsolved scaffolds.
- 103 declared stdin/stdout cases, at least three per coding exercise. All coding cases have explicit contracts and deterministic expected output. No floating-point or unordered checker is required.

| Module | Focus | Coding | Trace | Explanation | Declared cases |
| --- | --- | ---: | ---: | ---: | ---: |
| m08 | STL dan language bridge | 5 | 1 | 0 | 17 |
| m09 | Logic, sets, logarithms, discrete math | 2 | 2 | 2 | 7 |
| m10 | Time dan space complexity | 1 | 3 | 2 | 4 |
| m11 | Recursion dan call stack | 4 | 1 | 1 | 15 |
| m12 | Correctness, invariant, dan testing | 3 | 0 | 3 | 11 |
| m13 | Arrays dan strings | 6 | 0 | 0 | 25 |
| m14 | Hash map dan hash set | 6 | 0 | 0 | 24 |

## Pedagogical decisions

Lessons explain why the representation or control flow works, show a concrete worked example, identify common errors, and include a four-option checkpoint with an explanation. Checkpoint and trace answer positions vary rather than exposing a constant answer position. Sources support the underlying concepts; wording, examples, problem settings, and reference programs were authored for this curriculum.

The bridge makes numeric bounds, string mutability, token versus line input, ordered versus hash iteration, and vector reference invalidation explicit. Text-processing exercises specify ASCII rather than incorrectly treating UTF-8 bytes as user-visible Unicode characters. Math and complexity activities use actual trace or explanation tasks with no fabricated runtime verdict. Explanation exercises provide expected sample responses and substantive self-review rubrics.

Recursion inputs are bounded: linear sum recursion uses n<=200; digit recursion has at most 19 frames of data; divide-and-conquer array sum passes indices and has logarithmic stack depth. Technique-specific rubrics distinguish output correctness from evidence that a learner actually used recursion or read/write compaction. Output tests alone cannot enforce a required technique.

Hashing lessons distinguish expected lookup cost from worst-case collision behavior, membership from multiplicity, stable ordering from set iteration, and complement lookup before insertion. Pair counts and row sums use long long in C++ where 32-bit accumulation is insufficient. Empty cases are represented by real input such as 0 followed by newline, or an explicit empty text line; none uses an undocumented zero-character stdin shortcut.

## Transfer reasoning

Transfer variants change a decision or invariant rather than only changing numeric input:

| Exercise | Distinct reasoning required |
| --- | --- |
| m08-e5 | Replace a previous value per key instead of counting records; preserve sorted key output. |
| m08-e6 | Reason about reference lifetime after guaranteed successful vector reallocation, rather than predict a fabricated value. |
| m09-e2 | Find a truth assignment that separates two access-control expressions and repair grouping. |
| m09-e4 | Use an explicit universe for complement and distinguish symmetric difference from union. |
| m09-e5 | Count directed messages, so reversing sender/receiver creates a different pair. |
| m10-e3 | Account for copying inside a single visible loop, and separate total historical allocation from peak space. |
| m10-e5 | Bound an entire resize sequence without a random-input assumption. |
| m10-e6 | Separate total recursion-tree nodes from simultaneously active stack frames. |
| m11-e2 | Diagnose unreachable base case through parity and repair the termination contract. |
| m11-e5 | Preserve common divisors under remainder transformation, not simple decrement recursion. |
| m11-e6 | Partition a half-open array interval into two smaller subproblems without slicing. |
| m12-e2 | Preserve the earliest index under a maximum-value tie, including all-negative input. |
| m12-e4 | Find the earliest invalid adjacent relation and justify the valid prefix. |
| m12-e5 | Design tests that distinguish an endpoint shortcut from full ordering, equality, and size boundaries. |
| m13-e2 | Derive cyclic index mapping and normalize a large rotation count, unlike interval reversal. |
| m13-e4 | Optimize over contiguous runs and apply earliest-start tie-breaking, unlike merely encoding runs. |
| m14-e2 | Combine membership with a separate ordered output, unlike stopping at the first repeated ID. |
| m14-e5 | Compare all multiplicities using signed differences, unlike choosing one highest-frequency key. |
| m14-e6 | Consume available units in request order while preserving nonnegative inventory state. |

These are introductory variants across a broad topic set. Six exercises per module do not establish mastery of every STL operation, proof technique, or hashing pattern. Exposure, independence, delayed review, and evidence per language remain application responsibilities; this content does not mark any learner Retained.

## Local verification evidence

Interpreter used exactly as required: C:/Users/Afif/AppData/Roaming/uv/python/cpython-3.11-windows-x86_64-none/python.exe. Reported version: CPython 3.11.16. Trusted references were invoked with -I -c, input passed through stdin, captured stdout/stderr, and a five-second timeout per case. No user submissions were run.

Final author check passed for:

- Valid UTF-8 JSON with exactly modules, lessons, exercises at the top level.
- Unique IDs, m08–m14 module ownership, exact counts, forward-safe prerequisites, module-to-lesson/exercise references, and reciprocal lesson-to-exercise links.
- Exact exercise schema fields, three hints each, nonempty rubrics/sources, version 1, and complete Python/C++ solutions for coding.
- Three substantive text blocks per lesson, worked code, four checkpoint options, and in-range correctIndex values.
- Python syntax for all lesson snippets and coding starters; all 26 Python worked lesson programs also executed and matched independently stated expected output. Two C++ lesson examples remain uncompiled.
- All 103 declared coding cases passed against authored Python references.
- All 27 worked exercise examples passed against their declared output.
- Eight supplemental boundary/large-input cases passed, listed below.
- All seven trace answer keys were independently re-derived and checked after answer-position variation.

The final run reported no reference output failures. An earlier stricter authoring assertion flagged three concise trace explanations below the local 150-character rationale check (m09-e5, m10-e4, m11-e3); those explanations were expanded with actual reasoning, and the full check was rerun successfully. There were no solution failures requiring algorithm changes. Python solutions were formatted through the standard-library AST printer and all cases were rerun afterward.

| Supplemental exercise | Input risk | Verified result |
| --- | --- | --- |
| m08-e1 | 100000 values of 10^9; overflow beyond 32-bit | total 100000000000000; positive count 100000 |
| m09-e6 | n=2^59 within 10^18 | 59 floor-halving steps |
| m11-e6 | 10000 values of -10^9 | sum -10000000000000 with balanced recursion |
| m12-e2 | 100000 equal negative maxima | -1 at earliest index 0 |
| m13-e2 | n=7, k=10^18 | left rotation by 1 |
| m13-e6 | 100 rows x 1000 columns of 10^9 | each row total 1000000000000 |
| m14-e3 | 100000 entries tied between -1 and 4 | -1 with frequency 50000 |
| m14-e4 | 100000 copies of 2, target 4 | 4999950000 index pairs |

Trace derivations: vector reserve beyond prior capacity invalidates references after successful reallocation; range rejection uses De Morgan; four directed senders have three recipients each; scan best/worst comparisons are 1/n; doubling from 1 to at least 17 takes five steps; a balanced two-call recursion uses logarithmic active stack despite linear total nodes; before/after recursive print unwinds as 3 2 1 -1 -2 -3.

## Exercise inventory

| ID | Title | Kind | Variant | Declared coding cases |
| --- | --- | --- | --- | ---: |
| m08-e1 | Jumlah dan banyak positif | coding | practice | 4 |
| m08-e2 | Sensor vokal satu baris | coding | practice | 4 |
| m08-e3 | Katalog angka unik terurut | coding | practice | 3 |
| m08-e4 | Frekuensi tag alfabetis | coding | practice | 3 |
| m08-e5 | Ringkasan pembacaan terakhir | coding | transfer | 3 |
| m08-e6 | Reference setelah vector tumbuh | trace | transfer | 0 |
| m09-e1 | Negasi validasi usia | trace | practice | 0 |
| m09-e2 | Counterexample aturan akses | explanation | transfer | 0 |
| m09-e3 | Peserta dua workshop | coding | practice | 3 |
| m09-e4 | Universe ruang tes | explanation | transfer | 0 |
| m09-e5 | Pasangan dan arah pesan | trace | transfer | 0 |
| m09-e6 | Jumlah penyusutan integer | coding | practice | 4 |
| m10-e1 | Best dan worst pada scan | trace | practice | 0 |
| m10-e2 | Counter loop pasangan tanpa menjalankan loop | coding | practice | 4 |
| m10-e3 | Satu loop dengan slicing | explanation | transfer | 0 |
| m10-e4 | Doubling tanpa reset | trace | practice | 0 |
| m10-e5 | Biaya resize bukan probabilitas | explanation | transfer | 0 |
| m10-e6 | Dua pemanggilan, satu jalur stack | trace | transfer | 0 |
| m11-e1 | Jumlah rekursif bertahap | coding | guided | 3 |
| m11-e2 | Base case yang tidak tercapai | explanation | transfer | 0 |
| m11-e3 | Print saat turun dan naik | trace | practice | 0 |
| m11-e4 | Jumlah digit rekursif | coding | practice | 4 |
| m11-e5 | FPB rekursif dua ukuran | coding | transfer | 4 |
| m11-e6 | Jumlah melalui pemisahan interval | coding | transfer | 4 |
| m12-e1 | Maksimum palsu nol | explanation | practice | 0 |
| m12-e2 | Maksimum dengan tie paling awal | coding | transfer | 3 |
| m12-e3 | Bukti penghitung nilai positif | explanation | practice | 0 |
| m12-e4 | Pelanggaran urutan pertama | coding | transfer | 4 |
| m12-e5 | Tes untuk equality dan pasangan tengah | explanation | transfer | 0 |
| m12-e6 | Compact nol dengan urutan stabil | coding | practice | 4 |
| m13-e1 | Balik satu interval | coding | practice | 4 |
| m13-e2 | Rotasi kiri dengan langkah besar | coding | transfer | 4 |
| m13-e3 | Run-length baris huruf | coding | practice | 4 |
| m13-e4 | Plateau terpanjang paling awal | coding | transfer | 4 |
| m13-e5 | Palindrome pesan ASCII | coding | practice | 4 |
| m13-e6 | Jumlah tiap baris matrix | coding | practice | 5 |
| m14-e1 | Posisi duplikat pertama saat datang | coding | practice | 4 |
| m14-e2 | Dedup stabil ID event | coding | transfer | 4 |
| m14-e3 | Mode dengan tie nilai terkecil | coding | practice | 4 |
| m14-e4 | Banyak pasangan jumlah target | coding | practice | 4 |
| m14-e5 | Apakah kedua daftar multiset sama? | coding | transfer | 4 |
| m14-e6 | Permintaan inventory berurutan | coding | transfer | 4 |

## Sources and limits

Concept references checked during authoring:

- Python 3.11 Tutorial, Data Structures: https://docs.python.org/3.11/tutorial/datastructures.html
- Python 3.11 Tutorial, Defining Functions: https://docs.python.org/3.11/tutorial/controlflow.html#defining-functions
- C++ standard draft, Containers library: https://eel.is/c++draft/containers
- MIT OCW 6.006 lecture notes: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/pages/lecture-notes/
- MIT OCW Mathematics for Computer Science: https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/

C++ references were manually reviewed for standard headers, C++17 features, numeric bounds, empty input contracts, tie rules, and output order. Neither g++ nor clang++ was present in PATH, so no compilation or C++ execution is claimed. The draft reference is current and includes later standards; authored code only uses C++17-or-earlier facilities.

This batch does not verify browser rendering, Pyodide integration, the optional C++ provider, automatic grading integration, or learner independence. No fake tests were attached to explanation tasks. Overall catalog checks and application integration belong to the parent integration task. No other batch or source file was modified.
