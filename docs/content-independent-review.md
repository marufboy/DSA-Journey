# Independent curriculum review

Review date: 2026-10-31. Scope: semantic sample of the four authored content batches, beginner sequencing, checkpoint/trace keys, transfer distinctions, starter scaffolds and C++ reference reasoning. This is an independent sample, not a certification of all content or learner readiness. No application/content edits, learner-code execution, browser use, installations or C++ compilation were performed.

## Evidence and sample

Read CONTENT-CONTRACT.md and content-validation.json. The owner's reported baseline is 112 lessons, 180 activities, 100 coding exercises and 366 passing declared Python cases; the existing report explicitly calls 131/169 concepts introductory. Those totals are context, not independently claimed comprehensive verification here.

Substantive lesson sample: all lessons m01-l1 through m05-l4; m08-l1 through m09-l4; m23-l1 through m23-l4. Read all 28 trace activity statements and keyed explanations across batches. Reviewed every Python coding starter shape: comments/pass/function shell rather than a solution. Inspected C++ starters and trusted solutions for the coding sample below. Compared early transfer activities m01/m02/m03/m04/m08 to their practice family members.

Independent execution used only trusted authored Python reference programs with C:/Users/Afif/AppData/Roaming/uv/python/cpython-3.11-windows-x86_64-none/python.exe. Temporary review harness: C:/Users/Afif/AppData/Local/Temp/dsa_independent_review.py. Seed 314159; no declared-test rerun. Result: **483 additional checks, 0 failures**, across 11 problems and all four batches:

| Activity | Independent oracle or boundary | Checks |
| --- | --- | ---: |
| m01-e2 | Multiword role and name, reversed field mapping | 1 |
| m10-e2 | n=999999999, expected 499999998500000001 | 1 |
| m14-e4 | 100000 zeros, target 0, expected 4999950000 | 1 |
| m16-e1 | Linear first-at-least scan, duplicates/empty/absent | 60 |
| m16-e2 | Enumerate all index pairs, signed values/ties | 60 |
| m16-e3 | Enumerate all subarrays, zeros/empty/small budgets | 60 |
| m20-e4 | Transitive closure and positive-length diagonal reachability | 60 |
| m21-e3 | Floyd-Warshall distances, zero weights/parallel edges/disconnection | 60 |
| m23-e1 | Enumerate every legal one/two-step path from position -1 | 60 |
| m23-e2 | BFS over reachable amounts, impossible/zero targets/duplicates | 60 |
| m23-e4 | Enumerate all nonadjacent subsets, including empty | 60 |

Additional manual coding review: m17-e3 ancestor bounds, m19-e3 per-path visited restoration, m21-e4 duplicate/no facilities and multi-source initialization, m23-e3 blocked start/goal and rolling-array update. These were reasoned about, not additional executed cases.

## Findings

### IR-01 — Overflow checkpoint has multiple defensible answers (medium)

Location: part-01.json, m05-l3 checkpoint, question “Pada platform int 32 bit, mana aman untuk produk a*b bernilai 10^10?” CorrectIndex=2 accepts only `long long z=1LL*a*b;` and rejects `long long z=a*b;`.

Repro: the immediately preceding code declares `long long a = 100000, b = 100000;`. Reuse those visible declarations: `long long z=a*b;` safely produces 10000000000. The question specifies the platform's int width but never says that a and b are int. A beginner applying the displayed code correctly can be marked wrong. This undermines the exact lesson distinction between operand types and destination type; it is not an incorrect overflow rule in the surrounding prose.

Exact correction: change the question to “Anggap a dan b bertipe int signed 32 bit, masing-masing bernilai 100000, dan long long signed 64 bit. Mana aman untuk menghitung produk?” Keep correctIndex=2. Alternatively display the int declarations inside the checkpoint. Add a content regression requiring explicit operand types whenever a choice depends on arithmetic promotion.

### IR-02 — Prerequisite metadata contradicts the default route (medium, navigation/learning contract)

Location: module prerequisites in the content JSON compared with INTERLEAVED in dist/core.js. The default order visits m09 before its declared prerequisite m08, m14 before its declared prerequisite m08, and m08 before its declared prerequisite m07. Thus even a learner completing each mission in order reaches three modules whose declared prerequisite remains incomplete. No runtime execution is needed to reproduce: compare the arrays by their index positions.

This does **not** establish that Python graph/DP problems need prior C++ ownership. Sampled m09 material is self-contained after m04, and m14 Python hashing has the required Python collection foundation. m08 teaches vector invalidation briefly in its own text and m06 references precede it. The confirmed defect is that the app cannot present these prerequisites as unconditional learning requirements while recommending a route that violates them. A learner can incorrectly conclude that the recommended path skipped required work.

Exact correction: express prerequisites by route/language rather than silently discarding the interleaved design. For the interleaved Python route, m09 requires m04, m14 can depend on its Python foundations/complexity/arrays, and m08 can require m05/m06 while linking m07 as a deeper lifetime bridge. Retain the stronger sequential recommendations separately. Add a route check verifying every required prerequisite appears earlier, and distinguish recommended bridges from hard requirements. Do not fix by forcing all C++ modules ahead of Python DSA, which would undo the authorized route.

## Findings not established / boundaries

No sampled algorithm-reference defect, unsafe in-domain array/reference assumption, wrong trace key, or starter that already solves its task was found. The m05-e5 signed-overflow trace explicitly gives operand types and platform widths; m07-e3 dangling-pointer and m08-e6 vector-invalidation traces correctly avoid predicting undefined behavior. m08-e6 assumes reserve succeeds; within the intended ordinary teaching implementation its capacity increment example expresses the reallocation rule clearly.

Early transfer samples change reasoning: field order, preserving identifiers, multistage duration conversion, different boolean shape, first unique versus frequency, and last-write-wins versus counting. They are modest beginner transfer activities, not merely numeric replacements. This does not certify novelty for every transfer item or conceal the fact that reading its lesson can expose a solution pattern.

C++ source arithmetic in the sample uses long long before relevant products/sums: m10-e2 intermediate product is below 10^18; m14-e4 count is below 5*10^9; m16-e3 sum is at most 10^13; m21 distances at most 1999*10^9 along a simple nonnegative shortest path; m23-e1 costs at most 10^10 and m23-e4 rewards at most 5*10^13. Dijkstra infinity 4*10^18 is above all valid distances and adding one bounded weight to a reachable distance cannot overflow signed 64-bit. No C++ compile or live-provider success is claimed.

Introductory electives, sparse explanation practice, compact prose and unmeasured beginner workload remain depth/evaluation limits. They are not classified as correctness failures or evidence that all 169 concepts are mastered. Browser QA and Python browser runtime remain NOT VERIFIED; real C++ provider remains UNCONFIGURED. The checks above do not change those limits.
