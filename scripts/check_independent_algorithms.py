"""Independent oracles for trusted authored references only; never learner code."""
import json, pathlib, sys, io, contextlib, random, itertools, collections
root=pathlib.Path(__file__).resolve().parents[1]
E={e['id']:e for p in (root/'dist/content').glob('part-*.json') for e in json.loads(p.read_text(encoding='utf-8'))['exercises']}
counts=collections.Counter()
def check(id,s,expected):
 old=sys.stdin; sys.stdin=io.TextIOWrapper(io.BytesIO(s.encode())); out=io.StringIO()
 try:
  with contextlib.redirect_stdout(out):exec(compile(E[id]['solutions']['python'],id,'exec'),{'__name__':'__main__'})
 finally:sys.stdin=old
 assert out.getvalue().split()==str(expected).split(),(id,s,expected,out.getvalue())
 counts[id]+=1
check('m01-e2','Senior QA Lead\nA B C\n','A B C - Senior QA Lead')
check('m10-e2','999999999\n',499999998500000001)
check('m14-e4','100000 0\n'+'0 '*100000,4999950000)
R=random.Random(314159)
for z in range(60):
 n=R.randrange(9); a=[R.randrange(-5,6) for _ in range(n)]; t=R.randrange(-6,7)
 check('m16-e1',f'{n} {t}\n'+ ' '.join(map(str,sorted(a))),next((i for i,x in enumerate(sorted(a)) if x>=t),n))
 check('m16-e2',f'{n} {t}\n'+ ' '.join(map(str,a)),sum(a[i]+a[j]<=t for i in range(n) for j in range(i+1,n)))
 a=[abs(x) for x in a]; b=R.randrange(12)
 check('m16-e3',f'{n} {b}\n'+' '.join(map(str,a)),max([0]+[j-i for i in range(n) for j in range(i+1,n+1) if sum(a[i:j])<=b]))
 n=R.randrange(1,8); edges=[(R.randrange(n),R.randrange(n),R.randrange(8)) for _ in range(R.randrange(16))]; d=[[10**12]*n for _ in range(n)]
 for i in range(n):d[i][i]=0
 for u,v,w in edges:d[u][v]=min(d[u][v],w)
 for k in range(n):
  for i in range(n):
   for j in range(n):d[i][j]=min(d[i][j],d[i][k]+d[k][j])
 s=R.randrange(n)
 check('m21-e3',f'{n} {len(edges)} {s}\n'+''.join(f'{u} {v} {w}\n' for u,v,w in edges),' '.join(str(x if x<10**12 else -1) for x in d[s]))
 reach=[[False]*n for _ in range(n)]
 for u,v,w in edges:reach[u][v]=True
 for k in range(n):
  for i in range(n):
   for j in range(n):reach[i][j]|=reach[i][k] and reach[k][j]
 check('m20-e4',f'{n} {len(edges)}\n'+''.join(f'{u} {v}\n' for u,v,w in edges),'YES' if any(reach[i][i] for i in range(n)) else 'NO')
 n=R.randrange(1,9); c=[R.randrange(9) for _ in range(n)]
 def paths(i):
  if i==n-1:return [0]
  return [c[j]+v for j in (i+1,i+2) if j<n for v in paths(j)]
 check('m23-e1',str(n)+'\n'+' '.join(map(str,c)),min(paths(-1)))
 coins=[R.randrange(1,8) for _ in range(R.randrange(1,5))]; t=R.randrange(15); q=collections.deque([(0,0)]); seen={0}; ans=-1
 while q:
  x,depth=q.popleft()
  if x==t:ans=depth;break
  for c in coins:
   if x+c<=t and x+c not in seen:seen.add(x+c);q.append((x+c,depth+1))
 check('m23-e2',f'{len(coins)} {t}\n'+' '.join(map(str,coins)),ans)
 n=R.randrange(9);a=[R.randrange(-8,9) for _ in range(n)]
 check('m23-e4',str(n)+'\n'+' '.join(map(str,a)),max(sum(a[i] for i in range(n) if mask>>i&1) for mask in range(1<<n) if not(mask&(mask<<1))))
print(json.dumps({'additionalIndependentChecks':sum(counts.values()),'perExercise':dict(counts),'failures':0}))
