# Content report — batch 03

Date: 2026-10-31. Scope: `dist/content/part-03.json`, modules m15–m21 only.

## Authored inventory

| Module | Topic | Lessons | Coding | Trace | Explanation | Declared coding cases |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| m15 | Linked list, stack, queue | 4 | 4 | 1 | 1 | 13 |
| m16 | Sorting/search, two pointers, window, prefix | 4 | 4 | 1 | 1 | 12 |
| m17 | Trees and BST | 4 | 4 | 1 | 1 | 13 |
| m18 | Heap, top-k, merge, scheduling | 4 | 4 | 1 | 1 | 13 |
| m19 | Backtracking, pruning, undo | 4 | 4 | 1 | 1 | 15 |
| m20 | Graph representation, BFS, DFS | 4 | 4 | 1 | 1 | 14 |
| m21 | Topological sort, DSU, Dijkstra | 4 | 4 | 1 | 1 | 13 |
| Total | | 28 | 28 | 7 | 7 | 93 |

Each module has exactly six activities. Every lesson has three explanatory text blocks, a Python example, a reflection callout, objectives, a four-option checkpoint with explanation, summary, source links, and linked activities. The shortest lesson has 894 body characters across its explanatory/callout blocks. Explanations are original Indonesian prose with English technical terms. All 28 coding activities have original single-file Python and standard C++17 reference programs, non-solving starters, three incremental hints, reasoning, and explicit complexity.

## Coverage and reasoning differences

- m15: reversal changes actual node links; delimiter checking uses LIFO; queue simulation defines empty behavior; next-greater transfer uses unresolved indices and a push/pop accounting proof. C++ reversal uses an index-linked node vector with clear ownership, not a reversed value array.
- m16: lower bound uses half-open invariants and duplicate boundaries; pair counting eliminates a block after sorting; nonnegative window states its monotonicity precondition; prefix queries define zero-based, exclusive-right intervals and support negative values. The explanation activity exposes failure on `[5,-4]`, budget 1, and supplies a correct quadratic alternative.
- m17: iterative traversal avoids Python recursion depth; BST insertion specifies duplicate rejection and quadratic worst case; validation transfer carries ancestor bounds; height defines empty=0, leaf=1. A local-check counterexample and a wide-tree/chain memory comparison are explicit.
- m18: min-heap maintains the weakest retained top-k candidate, including negatives/duplicates; optimal merging distinguishes the strategy proof from heap efficiency; resource scheduling transfer handles half-open interval reuse; deterministic job scheduling defines duration/ID ties. A valid unsorted heap challenges the false sorted-array assumption.
- m19: subset counting supports negative values and zero duplicates; parentheses prune only impossible prefixes; grid simple-path transfer requires path-local visited and undo; fixed-cardinality transfer adds safe capacity pruning. Trace rejects unsafe total-based pruning with negative residual values.
- m20: adjacency and components include isolated vertices, loops and parallel edges; BFS discovers shortest edge-count distance; bipartite transfer checks constraints in every component; directed cycle detection uses iterative three-color frames and distinguishes active from finished vertices. Reflection separates reachability, shortest path, and enumeration.
- m21: lexicographic Kahn uses a ready min-heap and detects cycles; DSU uses path compression plus size and redundant union guards; lazy Dijkstra skips stale entries and supports zero weight; multi-source transfer changes initialization and supports repeated/absent facilities. Reflection states deletion and negative-edge limitations.

## Verification evidence

Executed with the contract interpreter:

`C:/Users/Afif/AppData/Roaming/uv/python/cpython-3.11-windows-x86_64-none/python.exe`

Final validation parsed the UTF-8 JSON and checked module counts/IDs, global uniqueness, four lessons/six exercises per module, bidirectional module/lesson/exercise references, version fields, source presence, three hints, four-option checkpoint/trace bounds, substantive lesson text, noncoding tests empty, and Python/C++ references plus at least three cases for every coding activity.

All **93/93 declared coding cases passed**. Each authored Python reference was syntax-compiled and then executed using a fresh isolated interpreter invocation (`-I -c`), stdin from its declared case, captured stdout/stderr, a four-second timeout, and exact output comparison after trailing whitespace normalization. No learner-submitted code was executed. Boundary coverage includes empty structures, singleton structures, all-equal values, duplicates, negatives where allowed, zero budget/weight, unreachable vertices, self-loops, parallel edges, cyclic dependency, blocked grid endpoints, and absent/repeated facilities.

Initial validation caught a generation escaping error: newline literals inside a few Python/C++ reference source strings became actual line breaks inside quoted literals. Those literals were corrected in the JSON; the complete 93-case run then passed with zero failures. No algorithm/output-case failures occurred in the passing run. All seven trace answer indices and worked transitions were reviewed manually against their explanations.

## Limits

C++ references were reviewed as standard-library C++17 source but were not compiled or executed by this author. Browser runtime, rendering, integrated catalog checks across other batches, and mastery policy are outside this batch's verification. Source links support concepts; all problem statements, teaching prose and reference code are authored here. The broad modules explicitly provide introductory coverage, not a claim of comprehensive mastery from six activities.
