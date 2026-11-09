# English and Indonesian course research

2026-11-09 · user selected **Research catalog first**. Three research agents investigated independent batches; a coordinator checked the combined records, inspected selected primary sources and removed one overlapping older offering from the count. No app, curriculum, playback, storage or runtime code was changed for this research stage.

Subsequent implementation: the user then requested “Please update it and run for me please.” All 61 entries are now integrated in the app's Courses tab, with language/topic filters and provisional labels. See [integration verification](../../COURSE-VERIFICATION.md). The research records and evidence limits below remain unchanged.

## What is ready

The [full catalog](CATALOG.md) contains **61 course/series options**: **41 English and 20 Indonesian**. Of these, **55 have primary course/publisher pages inspected**, and **6 are clearly provisional search-only candidates**. Formats are 39 courses and 22 structured series. A series is counted once; its videos are not counted as separate courses.

| Research batch | Options | Primary page inspected | Provisional |
| --- | --- | --- | --- |
| English programming / DSA / foundations | 22 | 22 | 0 |
| English design / architecture / testing | 19 | 18 | 1 |
| Indonesian programming / OOP / engineering | 20 | 15 | 5 |
| Total | 61 | 55 | 6 |

The original design batch found 20 entries. The coordinator conservatively moved an older Hayk Simonyan system-design offering into [excluded alternatives](excluded-alternatives.json) because it overlaps his newer introductory course and still needs source corroboration. Distinct independent courses on similar topics remain valid alternatives.

Every counted record has a specific YouTube video or playlist URL, publisher, language, topic tags, suggested level/prerequisites, original practice idea, checked date and limitations. There are no channel-only placeholders, duplicate resource URLs, invented watch-time totals or automatic quality scores.

## Where I would start

This is a menu of alternatives, not a plan to watch 61 courses in sequence. The route below is my recommendation based on the learner's existing Python/C++ DSA direction; it is not a proven personalized assessment.

| Stage | English option | Indonesian option | Produce something before moving on |
| --- | --- | --- | --- |
| Programming foundations | [CS50P](CATALOG.md#en-cs50p) | [Kelas Terbuka Python Dasar](CATALOG.md#id-kt-python-dasar) | Write small programs with input validation and boundary tests. |
| C++ bridge | [Daniel Gakwaya / freeCodeCamp C++](CATALOG.md#en-fcc-cpp20) | [Kelas Terbuka C++ Dasar](CATALOG.md#id-kt-cpp-dasar) | Port one Python solution and explain type/memory differences. |
| OOP and tests | [Jim's Python OOP](CATALOG.md#en-fcc-jim-python-oop) plus [pytest](CATALOG.md#en-fcc-pytest) | [Kelas Terbuka Python OOP](CATALOG.md#id-kt-python-oop) | Implement two interchangeable components and test their contract. |
| DSA | [Aakash's Python DSA](CATALOG.md#en-fcc-python-dsa), then [MIT 6.006](CATALOG.md#en-mit-6006) | Dedicated Indonesian DSA course not established in this batch; use Indonesian foundations with these English alternatives. | Solve fresh variants and explain correctness/complexity without a video. |
| SOLID and practical design | [ArjanCodes Write Better Python Code](CATALOG.md#en-arjancodes-write-better-python) | [WPU PHP MVC](CATALOG.md#id-wpu-php-mvc) gives a concrete separation example; it is not a substitute for a full SOLID course. | Refactor a small app around one genuine variation; justify what you kept simple. |
| Design patterns | [Dan Adams C# patterns + SOLID](CATALOG.md#en-dan-adams-csharp-patterns-solid) | [PZN Design Patterns](CATALOG.md#id-pzn-design-patterns) is provisional; check before relying on it. | Compare Strategy/Adapter/Observer with a straightforward alternative. |
| Software architecture | [Reso Coder clean architecture + TDD](CATALOG.md#en-resocoder-clean-architecture-tdd) | [PZN Microservices](CATALOG.md#id-pzn-microservices), after a working single-service app. | Draw boundaries and keep a use case testable without its database. |
| Distributed/system design | [Cambridge distributed systems](CATALOG.md#en-cambridge-distributed-systems) or [Gaurav system design](CATALOG.md#en-fcc-gaurav-system-design) | Use PZN microservices as an alternative language explanation where appropriate. | Explain failure, retries and idempotency; document a trade-off. |

The **[principles, patterns and architecture guide](PRINCIPLES-AND-ARCHITECTURE.md)** covers SOLID, DRY, KISS, YAGNI, cohesion/coupling, composition, common design patterns, ports/adapters, modular monoliths, C4 and distributed trade-offs. It links primary conceptual readings separately; readings and short talks do not inflate the course count. Arjan's [official series repository](https://github.com/ArjanCodes/betterpython) explicitly includes SOLID and patterns, and Dan Adams' [course repository](https://github.com/DoableDanny/Design-Patterns-in-C-Sharp) explicitly identifies OOP/SOLID/patterns coverage.

## Evidence limits and gaps

- **Source inspection is not playback certification.** Official pages/repositories were opened. Some repository sources confirm a course's subject but do not directly link the exact YouTube URL; per-entry notes say so. Language is based on publisher/course metadata, not listening to every audio track. No full course was watched for this research.
- **Provisional items stay visible as provisional.** They are Christopher Okhravi's patterns playlist and five Indonesian series: WPU advanced JavaScript/NodeJS and PZN design patterns/Kafka/Docker. Automated YouTube requests sometimes exposed only metadata/footer content. That does not establish a broken link.
- **Direct coverage has gaps.** This batch did not establish a substantial dedicated Indonesian SOLID/DRY, refactoring, clean-architecture or DSA course with adequate primary evidence. Dedicated DRY/KISS/YAGNI and hexagonal courses were not established in either batch; primary readings are provided instead. Generic system-design videos are not relabelled as SOLID courses.
- **Versions and environments differ.** Older Flutter/BLoC examples may require adaptation. The C++20 course uses features beyond DSA Journey's C++17 runtime contract. Java/C#/Dart/JavaScript courses are conceptual alternatives; their code is not executable in the app's Python/C++ runner without adaptation.
- **Free viewing does not make every lab free.** Some material mentions AWS, Firebase, Boot.dev, KaneAI, paid books or certificates. No account, subscription or infrastructure was provisioned. Check cost before attempting those specific labs; local practice suggestions can be used instead.
- **No course completion or hiring promise.** Suggested levels/prerequisites and practice tasks are curator judgments. Watching is not mastery, and the catalog does not change learning evidence.

## Reuse or extend the research

The [research agent brief](RESEARCH-AGENT.md) is saved locally for repeatable batches of 10–20 courses. It is not a global skill, permanent background agent or scheduled job. Batch source files and the consolidated [catalog.json](catalog.json) preserve the machine-readable metadata.

Run the documentation-only audit and rebuild the readable catalog from the app root:

```text
node docs/research/course-library/audit-catalog.mjs
node docs/research/course-library/build-catalog.mjs
```

The [audit report](audit.json) checks schema, exact resource uniqueness, counts, date and URL shape. It does not prove factual truth or educational quality. The coordinator additionally inspected primary CS50, freeCodeCamp, MIT, ArjanCodes, Dan Adams, Reso Coder, Kelas Terbuka and PZN pages; evidence clarifications and conservative deduplication are recorded in the notes above.

The initial research-only stage preserved the original five individual videos. The subsequently authorized app integration adds course/playlist grouping and language/topic filters while keeping those videos and personal notes in a separate tab.
