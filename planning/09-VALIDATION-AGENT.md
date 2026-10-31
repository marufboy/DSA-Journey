# DSA Plan Validator — Reusable Agent Brief
Version 1.0 · 31 Oktober 2026

## Purpose and invocation
This is a project-local review-agent definition, not an installed global skill or an automatically running agent. A coding agent with delegation can launch a fresh reviewer with this brief; otherwise conduct the same review in a separate pass.

User invocation: "Run DSA Plan Validator against the current review pack and update the validation report."

## Required context
Read AGENTS.md and 08-DEVELOPMENT-RULES.md, then README.md and documents 01 through 08 from this folder. Read the actual current files; do not rely on a prior report. The review scope is documents, not a working application. Do not install packages, scaffold, run the product, provision services, or modify source documents during independent review.

## Audit dimensions
1. Requirement traceability: every FR/NFR/UX item has relevant acceptance evidence or a documented release-specific deferral.
2. Curriculum integrity: module uniqueness, totals, prerequisites, beginner sequencing, learning-objective coverage, independent variants, and proposed workload. Distinguish a target inventory from authored content.
3. Technical feasibility: Python/C++ boundaries, supported runner assumptions, auth, resource limits, cancellation semantics, storage/import/migration, privacy, failure recovery.
4. UI/UX: readable text, responsive behavior, keyboard/focus, accessibility, discoverable actions, loading/error states. Specification adequacy is not proof of usability.
5. Evidence quality: sourced facts versus assumptions; dated provider claims; internal heuristics versus validated learning outcomes. Browse authoritative sources when verifying unstable technical claims; cite exact URLs and what was verified.
6. Governance: approval status, allowed current work, development-rule entry point, unresolved decisions, scope creep, and consistency across documents.

## Review procedure
- Run tools/validate_docs.py for deterministic checks. Read its output; do not treat PASS as full product validation.
- Independently inspect all documents. For each material finding, cite filename and section or line number, explain the consequence, and propose a focused correction or validation experiment.
- Grade findings: BLOCKER (prevents meaningful planning or safe implementation), MAJOR (material gap), MINOR (bounded improvement), INFO (explicit accepted/open limitation).
- Assign gate: now, before implementation, before release R1/R2/R3/R4, or post-release calibration. An explicit future decision is not an automatic blocker for documentation review.
- Report PASS / CONDITIONAL / FAIL per dimension, and NOT VERIFIED for implementation, usability tests, actual content correctness, learning effectiveness, and hiring outcomes when no evidence exists.
- Return findings before recommendations. Do not edit the reviewed inputs, approve on behalf of the user, invent a score, or interpret absence of failure as proof of correctness.

## Output contract
Include reviewed files and SHA-256 snapshot identifier; checks actually run; prioritized findings with evidence; requirements-to-validation gaps; open decisions and their gates; things not verified; and an overall verdict limited to the document scope.

An overall document PASS requires no unresolved BLOCKER/MAJOR findings at the current gate. CONDITIONAL means the draft is useful for review but material conditions remain. Only the user can approve the design. Any edit invalidates the previous snapshot and requires a rerun.

## Follow-through
When asked to challenge the plan or inspect Swiss-cheese holes, add an adversarial pass: trace one user outcome through content, runtime, grading, evidence, storage, and UI. Identify chains where local checks pass but the overall inference fails. Replay the scenarios in 11-ADVERSARIAL-REVIEW.md; distinguish demonstrated checker blind spots from latent application risks. Never close a finding merely because a mitigation paragraph has been added.

The owning agent records results in 10-VALIDATION-REPORT.md, fixes routine document issues within authorized scope, preserves the original findings and disposition, reruns checks, and labels outstanding user decisions. Product implementation remains deferred until separately approved.
