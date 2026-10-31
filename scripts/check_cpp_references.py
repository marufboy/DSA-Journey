"""Run trusted authored C++ references, once compiled, in the local sandbox."""
import importlib.util
import json
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sandbox', root / 'scripts/cpp-sandbox.py')
helper = importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
health = helper.probe()
errors = []; cases = 0; programs = 0
for filename in sorted((root / 'dist/content').glob('part-*.json')):
    for exercise in json.loads(filename.read_text(encoding='utf-8'))['exercises']:
        if exercise['kind'] != 'coding': continue
        programs += 1
        with tempfile.TemporaryDirectory(prefix='dsa-reference-') as directory:
            work = Path(directory)
            (work / 'main.cpp').write_text(exercise['solutions']['cpp'], encoding='utf-8')
            code, output, reason = helper.compile_program(work)
            if code or reason:
                errors.append({'id': exercise['id'], 'compile': output, 'reason': reason}); continue
            for index, case in enumerate(exercise['tests']):
                cases += 1
                code, output, reason = helper.run_program(work, case['input'])
                actual, expected = output['stdout'], case['expected']
                def norm(value): return '\n'.join(line.rstrip() for line in value.replace('\r\n', '\n').split('\n')).rstrip()
                checker = exercise.get('checker', 'exact')
                try:
                    if checker == 'float':
                        a, b = list(map(float, actual.split())), list(map(float, expected.split()))
                        same = len(a) == len(b) and all(abs(x-y) <= exercise.get('tolerance', 1e-6) for x, y in zip(a,b))
                    elif checker == 'tokens': same = actual.split() == expected.split()
                    elif checker == 'unordered': same = sorted(actual.split()) == sorted(expected.split())
                    else: same = norm(actual) == norm(expected)
                except ValueError: same = False
                if code or reason or not same:
                    errors.append({'id': exercise['id'], 'case': index, 'code': code, 'reason': reason, 'actual': actual, 'expected': expected, 'stderr': output['stderr']})
report = {'compiler': health['compiler'], 'programs': programs, 'cases': cases, 'errors': errors}
print(json.dumps(report)); raise SystemExit(bool(errors))
