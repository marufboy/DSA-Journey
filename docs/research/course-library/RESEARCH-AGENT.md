# Course Library Research Agent

Project-local reusable agent brief · 2026-11-09 · no global installation or recurring automation.

## Mission

Research free-to-watch English and Indonesian YouTube courses or coherent teaching series for DSA Journey. Include programming/DSA foundations and a separate software engineering route through principles (SOLID, DRY, KISS, YAGNI), design patterns, testing/refactoring, software architecture and system design. Produce a reviewable catalog before modifying the app. The user explicitly selected **Research catalog first**.

## Run a batch

Give one agent a bounded subject/language, an output JSON filename and 10–20 courses to investigate. Independent agents may research English foundations, English design/architecture and Indonesian content concurrently, writing different files. A coordinator reviews all files and deduplicates them; do not allow workers to overwrite one another or edit app code.

For each candidate:

1. Search current primary creator, university or publisher sources. Find a specific course, coherent playlist or long-form full course. A channel homepage is insufficient.
2. Open the primary source and follow its exact YouTube link. Record a direct course/playlist/full-video URL, publisher, language, level and prerequisites. Never invent IDs, duration, episode count or a completed watch review.
3. Count a course once. Do not count its episodes, mirrors, semesters or translated copies as new subject courses merely to reach a numerical target. Different independent courses on the same topic can be alternatives.
4. Distinguish structured courses/series from one-off talks, short tutorials, articles and paid previews. Keep supplements outside the course count. Identify partial series or older technology versions explicitly.
5. Record why it fits the learner, and propose an original practice task that tests the idea. Do not copy exercises, solutions or transcripts from the creator. Watching never proves mastery.
6. If a primary page is blocked/empty, use a successfully opened publisher syllabus that links the course; otherwise mark the entry `search-only` and keep it out of the verified-source count. Metadata/source verification is different from testing playback or reviewing the whole course.
7. Return gaps as gaps. Do not inflate topic tags, invent course coverage or assume Indonesian audio just because the channel is Indonesian.

## Record contract

Each batch is a JSON array of records with these fields:

```json
{
  "id": "en-or-id-stable-kebab-case",
  "title": "Specific course or structured series",
  "publisher": "Original publisher / creator",
  "language": "English",
  "format": "course",
  "topics": ["design-patterns"],
  "level": "Intermediate",
  "prerequisites": ["OOP basics"],
  "courseUrl": "https://official.example/course",
  "youtubeUrl": "https://www.youtube.com/playlist?list=EXACT_DISCOVERED_ID",
  "sourceUrl": "https://official.example/page-actually-opened",
  "whyUseful": "Original Indonesian relevance summary",
  "practice": "Original concrete exercise suggestion",
  "verification": "primary-page-opened",
  "checkedAt": "2026-11-09",
  "notes": "Source metadata checked; playback/full-course quality not reviewed."
}
```

Allowed language: English / Indonesian. Format: course / series. Level is a curator recommendation (Beginner / Intermediate / Advanced), not a publisher certification. `checkedAt` is the actual research date in the user's timezone. `primary-page-opened` means source metadata was inspected; it does **not** certify playback, audio, completeness, accuracy or learning outcomes. Supplementary readings use a separate file and do not impersonate course records.

## Coordinator checks

- Validate JSON, required fields, unique IDs and canonical YouTube resource keys. Reject search result URLs, placeholders and channel-only links.
- Reconcile identical courses across publishers/mirrors, and check borderline series against their syllabus.
- Audit primary sources and links; distinguish explicit course coverage from curator-inferred relevance/prerequisites.
- Publish totals by language, subject and evidence status. Show excluded/unresolved candidates separately rather than burying them in the count.
- Supply a short recommended route and a few starting alternatives; the full catalog is a menu, not a requirement to watch everything.
- Keep source-check evidence and playback evidence separate. Do not claim a link is broken just because an automated fetch is blocked.
- Do not purchase courses, sign up, send messages, scrape transcripts, download videos or install global skills.

## Current run

Three requested research agents own `english-foundations.json`, `english-design.json` and `indonesian.json`. The coordinator owns consolidated catalog, topic/principle guide, source audit and final handoff. The app's current five-video library is not modified in this research-only stage.
