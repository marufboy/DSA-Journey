"""Execute trusted authored reference solutions only. Never a learner-code runner."""
import ast
import json
import subprocess
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
errors=[]
cases=0
allowed={'sys','collections','math','heapq','bisect','itertools','functools','operator','statistics','string'}
for filename in sorted((root/'dist'/'content').glob('part-*.json')):
    part=json.loads(filename.read_text(encoding='utf-8'))
    for exercise in part['exercises']:
        if exercise['kind']!='coding':
            continue
        source=exercise['solutions']['python']
        tree=ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node,(ast.Import,ast.ImportFrom)):
                names=[a.name for a in node.names] if isinstance(node,ast.Import) else [node.module or '']
                if any(name.split('.')[0] not in allowed for name in names):
                    raise ValueError(f"Unreviewed import in trusted reference {exercise['id']}: {names}")
            if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in {'open','eval','exec','__import__','compile'}:
                raise ValueError(f"Unreviewed host operation in reference {exercise['id']}")
        for i,case in enumerate(exercise['tests']):
            cases+=1
            try:
                run=subprocess.run([sys.executable,'-I','-c',source],input=case['input'],text=True,capture_output=True,timeout=4)
                def norm(s):
                    return '\n'.join(line.rstrip() for line in s.replace('\r\n','\n').split('\n')).rstrip()
                if exercise.get('checker')=='float':
                    a=list(map(float,run.stdout.split()));b=list(map(float,case['expected'].split()))
                    same=len(a)==len(b) and all(abs(x-y)<=exercise.get('tolerance',1e-6) for x,y in zip(a,b))
                elif exercise.get('checker')=='unordered':
                    same=sorted(run.stdout.split())==sorted(case['expected'].split())
                else:
                    same=norm(run.stdout)==norm(case['expected'])
                if run.returncode or not same:
                    errors.append({'exercise':exercise['id'],'case':i+1,'expected':case['expected'],'actual':run.stdout,'error':run.stderr[:2000]})
            except Exception as exc:
                errors.append({'exercise':exercise['id'],'case':i+1,'error':str(exc)})
result={'scope':'Trusted authored Python references; declared cases only; C++ and browser runtime not tested','cases':cases,'passed':cases-len(errors),'failed':len(errors),'errors':errors}
(root/'docs'/'reference-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))
raise SystemExit(1 if errors else 0)
