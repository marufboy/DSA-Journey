# What to study: principles, patterns and architecture

Research notes · 2026-11-09. These are learning subjects requested by the user. They are distinct from the implementation choices previously made for DSA Journey.

## Three scales of decisions

| Area | Question it helps answer | Examples | Suggested evidence of learning |
| --- | --- | --- | --- |
| Principles | What makes this design easier to change, understand or test? | SOLID, DRY, simplicity, separation of concerns, composition | Explain a concrete trade-off; improve a small program without changing its behavior. |
| Design patterns | What recurring collaboration solves this particular problem? | Strategy, Observer, Adapter, Factory, Decorator, Command | Implement two plausible alternatives and explain when the pattern adds unnecessary complexity. |
| Software architecture | Where are the system boundaries, responsibilities and dependencies? | Layered/modular monolith, ports and adapters, event-driven systems, microservices | Draw context/container diagrams; document a decision and test behavior across boundaries. |

This taxonomy is a curator synthesis. Robert C. Martin's [Design Principles and Design Patterns](https://objectmentor.com/resources/articles/Principles_and_Patterns.pdf) distinguishes system-level architecture from module/class design and discusses dependency management. Principles are decision aids, not a mandate to introduce a class or abstraction everywhere.

## Principles route

| Topic | Working interpretation | Practice task |
| --- | --- | --- |
| SRP | Group behavior by the reasons it needs to change. | Separate price calculation from invoice printing, then add a new output format. |
| OCP | Support an expected variation through an appropriate extension boundary. | Add a second discount rule; compare a simple conditional with a Strategy implementation. |
| LSP | A replacement must preserve the behavior its callers rely on. | Write shared contract tests for two repository implementations. |
| ISP | Give clients focused interfaces rather than requirements they cannot use. | Separate read and write capabilities for a reporting client. |
| DIP | Keep core policy independent of concrete infrastructure details. | Run a use case against an in-memory store and a file adapter. |
| DRY | Give a piece of knowledge one authoritative representation. Similar code can represent different knowledge. | Find a duplicated business rule; contrast it with two coincidentally similar validators that should evolve independently. |
| KISS | Prefer an understandable solution proportionate to the current problem. | Compare a direct function with a hierarchy and justify the simpler choice. |
| YAGNI | Avoid building a speculative capability before it is needed. | List present requirements and remove an extension point with no present use. |
| Cohesion, coupling and composition | Keep related behavior together and make dependencies deliberate. | Replace inheritance used only for reuse with composition; assess whether it actually clarifies the code. |

The five SOLID summaries above are adapted from [Martin's primary text](https://objectmentor.com/resources/articles/Principles_and_Patterns.pdf). The DRY interpretation follows the authors' [Pragmatic Programmer excerpt](https://media.pragprog.com/titles/tpp20/dry.pdf). The YAGNI interpretation follows [Martin Fowler](https://martinfowler.com/bliki/Yagni.html). KISS and the practice tasks are curator guidance, not quoted definitions or a claim that each catalog course teaches every acronym.

## Patterns route

Learn OOP/interfaces, functions and testing first. Then group patterns around an actual change:

1. **Strategy / Factory:** vary an algorithm or creation policy.
2. **Adapter / Decorator:** connect incompatible boundaries or add behavior through composition.
3. **Observer / Command:** decouple notifications or represent a requested action.
4. **State / Template Method:** compare explicit state transitions and alternative reuse structures.

For each, write a small working version without the pattern first, introduce one real variation, then compare the design. Preserve tests. Pattern names alone do not demonstrate skill, and a simple conditional may be the better choice for a bounded problem.

## Architecture route

Start with one deployable application and explicit module responsibilities. Microsoft's [architecture styles guide](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/) describes differing shapes and trade-offs; it does not imply one style fits every application. Fowler's [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) explains the operational and boundary-discovery costs behind starting with microservices. Treat it as reasoned guidance, not a universal law.

Next, study [ports and adapters from Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture): isolate the application from UI/database details so its behavior can be exercised through different adapters. Practice by keeping a small service usable from both a CLI and HTTP interface.

Use the creator's [C4 model](https://c4model.com/) for communicating structure at different levels. Start with context and container diagrams, and add detail when it answers a real question. Draw data flow, ownership and external dependencies; do not confuse a C4 container with a requirement to use Docker.

Only then explore distributed trade-offs: retries, idempotency, failure, transactions, queues, event-driven workflows, consistency and observability. Implement one failed-message/retry scenario before designing multiple services. A high-level interview system-design course and a hands-on software-architecture course teach related but different skills; the catalog tags help distinguish them.

Refactor with small behavior-preserving changes, following [Martin Fowler's refactoring guidance](https://refactoring.com/). Design exercises should include tests and reasoning, not a mandatory migration of the existing app to every newly learned pattern.

## Course selection and limits

Choose one primary course at a stage and use a second as an alternative explanation. Start with programming → OOP/testing → principles → patterns → modular architecture → distributed systems. Do not attempt all 50+ catalog options sequentially.

Course levels, prerequisites and practice tasks in this research are curator recommendations. Specific SOLID/DRY/KISS/YAGNI coverage should be claimed only when a source lists it. The supplemental primary readings above fill conceptual gaps; they are not counted as YouTube courses. Sources were opened for research, not subjected to an educational-effectiveness study. No app architecture or curriculum was changed in this catalog-only stage.
