"""Read-only structural checks. PASS does not certify curriculum or application."""
import argparse
import hashlib
import json
import re
from pathlib import Path

CORE = ['README.md', 'AGENTS.md'] + [
    '01-PRD.md', '02-UI-UX.md', '03-CURRICULUM.md',
    '04-TECHNICAL-ARCHITECTURE.md', '05-ACCEPTANCE-AND-VALIDATION.md',
    '06-DECISIONS-AND-REVIEW.md', '07-SOURCES.md',
    '08-DEVELOPMENT-RULES.md', '09-VALIDATION-AGENT.md',
    '11-ADVERSARIAL-REVIEW.md', '12-IMPLEMENTATION-ADDENDUM.md',
]


def validate(root):
    checks, texts, hashes = [], {}, {}

    def record(name, passed, detail):
        checks.append({'check': name, 'result': 'PASS' if passed else 'FAIL', 'detail': detail})

    for name in CORE:
        path = root / name
        record('required:' + name, path.is_file(), name)
        if not path.is_file():
            continue
        raw = path.read_bytes()
        hashes[name] = hashlib.sha256(raw).hexdigest()
        try:
            content = raw.decode('utf-8').replace('\r\n', '\n')
        except UnicodeDecodeError:
            record('encoding:' + name, False, 'Not UTF-8')
            continue
        texts[name] = content
        bad = '\ufffd' in content or any(ord(c) < 32 and c not in '\n\r\t' for c in content)
        record('readable:' + name, content.startswith('# ') and not bad, 'Heading, UTF-8 and control characters')
        missing = []
        for target in re.findall(r'\]\(([^)]+)\)', content):
            if re.match(r'^[a-z]+://', target) or target.startswith('#'):
                continue
            if not (path.parent / target.split('#')[0]).exists():
                missing.append(target)
        record('local-links:' + name, not missing, missing)

    prd = texts.get('01-PRD.md', '')
    ux = texts.get('02-UI-UX.md', '')
    acceptance = texts.get('05-ACCEPTANCE-AND-VALIDATION.md', '')
    for prefix, text, count, pattern in [
        ('FR', prd, 18, r'^\| (FR-\d{2}) \|'),
        ('NFR', prd, 9, r'^- (NFR-\d{2}):'),
        ('UX', ux, 7, r'^- (UX-\d{2}):'),
        ('AT', acceptance, 16, r'^\| (AT-\d{2}) \|'),
    ]:
        ids = re.findall(pattern, text, re.M)
        expected = [f'{prefix}-{i:02d}' for i in range(1, count + 1)]
        record(prefix + '-inventory', sorted(ids) == expected, {'actual': ids, 'expected_count': count})

    curriculum = texts.get('03-CURRICULUM.md', '')
    rows = re.findall(r'^\| (\d{2}) \|.*\| (\d+) / (\d+) \|$', curriculum, re.M)
    record('module-sequence', [int(x[0]) for x in rows] == list(range(1, 29)), len(rows))
    lessons, exercises = sum(int(r[1]) for r in rows), sum(int(r[2]) for r in rows)
    record('content-total', (lessons, exercises) == (112, 180), {'lessons': lessons, 'exercises': exercises})
    release_counts = [tuple(map(int, x)) for x in re.findall(r'^\| R[1-4] \|.*?: (\d+) lesson/(\d+) (?:exercise|lab)', prd, re.M)]
    record('release-counts', release_counts == [(16, 32), (16, 24), (64, 96), (16, 28)], release_counts)
    hour_rows = re.findall(r'^\| (?!Total)([^|]+) \| (\d{2}[–-]\d{2}) \| (\d+)[–-](\d+) \|$', curriculum, re.M)
    bounds = (sum(int(r[2]) for r in hour_rows), sum(int(r[3]) for r in hour_rows))
    record('hour-total', len(hour_rows) == 7 and bounds == (600, 800), bounds)
    entry = texts.get('AGENTS.md', '')
    record('rules-entry', '08-DEVELOPMENT-RULES.md' in entry, 'Agent entry references rules')
    decisions = texts.get('06-DECISIONS-AND-REVIEW.md', '')
    addendum = texts.get('12-IMPLEMENTATION-ADDENDUM.md', '')
    approved = ('Outcome: IMPLEMENTATION AUTHORIZED' in decisions
                and 'Authorization: IMPLEMENTATION AUTHORIZED.' in addendum
                and 'Oke go for it all and create them' in addendum
                and '2026-10-31' in addendum)
    pending = 'Outcome: NOT REVIEWED.' in decisions
    record('approval-recorded', approved or pending,
           'Explicit recorded authorization or pending review; not product verification')

    # Traceability checks require explicit individual rows, not substring coincidence.
    trace_ids = set(re.findall(r'^\| ((?:FR|NFR|UX)-\d{2}) \|', acceptance, re.M))
    expected_ids = {f'{p}-{i:02d}' for p, n in [('FR', 18), ('NFR', 9), ('UX', 7)] for i in range(1, n + 1)}
    record('traceability-row-coverage', expected_ids <= trace_ids, {'missing': sorted(expected_ids - trace_ids)})
    placeholder_rows = []
    for req, evidence, gate in re.findall(r'^\| ((?:FR|NFR|UX)-\d{2}) \| ([^|]*) \| ([^|]*) \|$', acceptance, re.M):
        if not evidence.strip() or re.search(r'\b(?:TODO|TBD|FIXME)\b', evidence, re.I) or not gate.strip():
            placeholder_rows.append(req)
    record('traceability-no-placeholders', not placeholder_rows, placeholder_rows)
    # Narrow demonstrated inconsistency: adjacent narrative counts, not all prose semantics.
    narrative_counts = []
    for name, content in texts.items():
        if name in ('09-VALIDATION-AGENT.md', '11-ADVERSARIAL-REVIEW.md'):
            continue  # Historical mutants/examples intentionally contain incorrect counts.
        for line in content.splitlines():
            if line.startswith('|'):
                continue
            for match in re.finditer(r'\b(\d+)\s+lessons?\b', line, re.I):
                narrative_counts.append({'file': name, 'count': int(match.group(1))})
    record('narrative-lesson-total', bool(narrative_counts) and all(x['count'] == lessons for x in narrative_counts), narrative_counts)
    snapshot = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()
    return {
        'scope': 'Document structure and declared inventories only; no implementation or learning-effectiveness verification',
        'snapshot_sha256': snapshot, 'file_sha256': hashes,
        'validator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'result': 'PASS' if all(c['result'] == 'PASS' for c in checks) else 'FAIL',
        'passed': sum(c['result'] == 'PASS' for c in checks),
        'failed': sum(c['result'] == 'FAIL' for c in checks), 'checks': checks,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    result = validate(args.root.resolve())
    print(json.dumps(result, ensure_ascii=True, indent=2))
    raise SystemExit(0 if result['result'] == 'PASS' else 1)
