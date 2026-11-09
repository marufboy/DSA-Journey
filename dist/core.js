import {validateCourseProgress} from './courses.js';
import {validateVideoState} from './videos.js';
export const DAY=86400000;
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const copy=x=>structuredClone(x);
export function emptyState(){return {schemaVersion:1,revision:0,settings:{name:'Reydian',sessionMinutes:45,route:'interleaved',theme:'light',fontSize:18,primaryLanguage:'python',role:'Software Engineer',targetRegion:'',cppAvailable:false,lastMissionType:'lesson',cppApiUrl:''},completedLessons:{},checkpointScores:{},checkpointVersions:{},historicalCheckpoints:{},explanations:{},drafts:{},attempts:[],exposures:[],reviews:{},notes:[],career:[],reflections:{},videos:[],videoProgress:{},courseProgress:{}};}
export function recordExposure(state,exercise,at=Date.now(),afterAttemptId=null){
 const s=copy(state);if(!s.exposures.some(x=>x.exerciseId===exercise.id&&x.version===exercise.version))s.exposures.push({exerciseId:exercise.id,version:exercise.version,family:exercise.family||exercise.id,at,afterAttemptId});return s;
}
export function recordAttempt(state,exercise,options={}){
 const s=copy(state),at=options.at??Date.now();
 const exposed=s.exposures.some(x=>x.at<=at&&(x.exerciseId===exercise.id||x.family===(exercise.family||exercise.id)));
 const alreadyPassed=s.attempts.some(x=>x.exerciseId===exercise.id&&x.passed===true);
 const passed=options.passed===true?true:options.passed===false?false:null;
 const automated=['coding','trace'].includes(exercise.kind)&&options.evidenceMethod!=='self_report';
 const assisted=Boolean(options.hintsUsed||options.assisted);
 const status=options.status||(passed===true?'passed':passed===false?'failed':'unknown');
 s.attempts.push({id:uid(),exerciseId:exercise.id,exerciseVersion:exercise.version,moduleId:exercise.moduleId,lessonId:exercise.lessonId,kind:exercise.kind,concepts:[...(exercise.concepts||[])],family:exercise.family||exercise.id,language:options.language||'python',source:options.source||'',at,passed,status,hintsUsed:options.hintsUsed||0,assisted,exposed,review:Boolean(options.review),evidenceMethod:automated?'automated':options.evidenceMethod||'self_report',novelTransfer:automated&&passed===true&&!assisted&&!exposed&&!alreadyPassed&&exercise.variant==='transfer',stale:false});
 if(automated&&passed!==null){
  for(const concept of exercise.concepts||[]){
   const old=s.reviews[concept],intervals=[1,3,7,14,30];
   const interval=passed&&!assisted?intervals[Math.min(old?Math.max(0,intervals.indexOf(old.intervalDays)+1):0,4)]:1;
   s.reviews[concept]={conceptId:concept,dueAt:at+interval*DAY,intervalDays:interval,lastResult:passed,updatedAt:at};
  }
  s.settings.lastMissionType=options.review?'review':'practice';
 }
 return s;
}
export function deriveConcept(state,conceptId,exercises,now=Date.now()){
 const current=new Map(exercises.map(x=>[x.id,x]));
 const all=state.attempts.filter(a=>a.concepts?.includes(conceptId)&&a.at<=now&&!a.stale&&current.get(a.exerciseId)?.version===a.exerciseVersion);
 const evidence=all.filter(a=>a.evidenceMethod==='automated'&&a.passed===true&&!a.assisted);
 const distinct=new Set(evidence.map(a=>a.exerciseId)),transfer=new Set(evidence.filter(a=>a.novelTransfer).map(a=>a.exerciseId));
 const languageEvidence={};for(const a of evidence)languageEvidence[a.language]=(languageEvidence[a.language]||0)+1;
 const checkpoint=evidence.some(a=>(state.checkpointScores[a.lessonId]||0)>=0.8);
 const firstTransfer=evidence.filter(a=>a.novelTransfer).reduce((t,a)=>Math.min(t,a.at),Infinity);
 const lastReview=all.filter(a=>a.review&&a.evidenceMethod==='automated'&&a.passed!==null).sort((a,b)=>b.at-a.at)[0];
 let level=all.length?'Practicing':'Not started',reason='Belum ada bukti latihan otomatis.';
 const explanation=state.explanations?.[conceptId]?.complete===true;
 if(distinct.size>=2&&transfer.size&&checkpoint&&explanation){level='Provisionally mastered';reason='Latihan berbeda, transfer baru, checkpoint, dan rubrik penjelasan (self-review) terpenuhi; tunggu review tertunda.';
  if(lastReview?.passed===true&&!lastReview.assisted&&lastReview.at-firstTransfer>=7*DAY){level='Retained';reason='Bukti transfer, penjelasan self-review, dan review mandiri minimal tujuh hari setelah transfer.';}
 }
 if(evidence.length&&level==='Practicing')reason='Masih perlu variasi transfer, checkpoint, atau rubrik penjelasan. Recall bukan bukti transfer baru.';
 if(lastReview?.passed===false){level='Practicing';reason='Review terakhir belum berhasil. Coba remedial sebelum melanjutkan.';}
 return {state:level,recallCount:distinct.size,transferCount:transfer.size,languageEvidence,reason};
}
function assertRecords(items,name){if(!Array.isArray(items)||items.length>20000)throw new Error(`${name}: format/ukuran tidak valid.`);const ids=new Set();for(const x of items){if(!x||typeof x!=='object'||typeof x.id!=='string'||ids.has(x.id))throw new Error(`${name}: ID tidak valid/duplikat.`);ids.add(x.id);}}
function safeTree(value,depth=0){if(depth>14)throw new Error('Backup terlalu dalam.');if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw new Error('Backup memiliki key yang tidak aman.');safeTree(v,depth+1);}}}
export function importState(current,backup,catalog){
 if(!backup||backup.schemaVersion!==1||!backup.data||backup.data.schemaVersion!==1)throw new Error('Versi backup tidak didukung; data lama tetap utuh.');
 if(JSON.stringify(backup).length>20*1024*1024)throw new Error('Backup melebihi 20 MiB.');safeTree(backup);
 const incoming=copy(backup.data);validateVideoState(incoming);validateCourseProgress(incoming.courseProgress);assertRecords(incoming.attempts,'Attempts');assertRecords(incoming.notes,'Notes');assertRecords(incoming.career,'Career');
 if(!Array.isArray(incoming.exposures)||incoming.exposures.some(x=>typeof x.exerciseId!=='string'||typeof x.family!=='string'||!Number.isFinite(x.at)))throw new Error('Exposure history tidak valid.');
 for(const k of ['settings','completedLessons','checkpointScores','drafts','reviews'])if(!incoming[k]||Array.isArray(incoming[k])||typeof incoming[k]!=='object')throw new Error(`${k} tidak valid.`);
 const exposureMap=new Map();for(const x of [...(current.exposures||[]),...incoming.exposures]){const key=`${x.exerciseId}:${x.version}:${x.family}`;if(!exposureMap.has(key)||exposureMap.get(key).at>x.at)exposureMap.set(key,copy(x));}incoming.exposures=[...exposureMap.values()];
 for(const [id,completion] of Object.entries(incoming.completedLessons))if(!completion||typeof completion!=='object'||!Number.isFinite(completion.at)||!Number.isInteger(completion.version))throw new Error(`Completion ${id} tidak valid.`);
 for(const [key,allowed] of Object.entries({primaryLanguage:['python','cpp'],route:['interleaved','sequential'],theme:['light','dark'],sessionMinutes:[15,45,90]}))if(incoming.settings[key]!==undefined&&!allowed.includes(incoming.settings[key]))throw new Error(`Pengaturan ${key} tidak valid.`);
 if(typeof incoming.settings.name!=='string'||incoming.settings.name.length>80||typeof incoming.settings.cppAvailable!=='boolean')throw new Error('Pengaturan profil tidak valid.');
 const index=new Map(catalog.exercises.map(x=>[x.id,x]));const priorPassed=new Set();
 incoming.attempts.sort((a,b)=>a.at-b.at);
 for(const a of incoming.attempts){
  if(typeof a.exerciseId!=='string'||!Number.isInteger(a.exerciseVersion)||!Number.isFinite(a.at)||![true,false,null].includes(a.passed)||!Array.isArray(a.concepts)||a.concepts.some(x=>typeof x!=='string'))throw new Error('Attempt tidak valid.');
  if(!['python','cpp'].includes(a.language)||!['automated','self_report','rubric','manual'].includes(a.evidenceMethod)||!['passed','failed','unknown','unavailable','cancelled','self-reviewed'].includes(a.status)||[a.assisted,a.exposed,a.review,a.novelTransfer].some(v=>typeof v!=='boolean')||!Number.isInteger(a.hintsUsed)||a.hintsUsed<0)throw new Error('Tipe/label evidence tidak valid.');
  const ex=index.get(a.exerciseId);a.stale=!ex||ex.version!==a.exerciseVersion;a.historical=!ex;
  if(a.stale){a.novelTransfer=false;a.staleReason=ex?'Kriteria materi berubah; perlu evaluasi ulang.':'Materi historis tidak tersedia; riwayat tetap disimpan.';}
  if(ex&&ex.version===a.exerciseVersion){
   const mismatch=a.family!==(ex.family||ex.id)||a.lessonId!==ex.lessonId||a.kind!==ex.kind||a.concepts.length!==ex.concepts.length||a.concepts.some(c=>!ex.concepts.includes(c));
   if(mismatch){a.stale=true;a.staleReason='Asosiasi evidence tidak cocok dengan konten saat ini.';}
   a.novelTransfer=Boolean(a.novelTransfer&&!a.stale&&ex.variant==='transfer'&&['coding','trace'].includes(ex.kind)&&a.evidenceMethod==='automated'&&a.passed===true&&!a.assisted&&!priorPassed.has(a.exerciseId));
  }
  if(incoming.exposures.some(x=>x.afterAttemptId!==a.id&&x.at<=a.at&&(x.exerciseId===a.exerciseId||x.family===a.family)))a.novelTransfer=false;
  if(a.passed===true)priorPassed.add(a.exerciseId);
 }
 for(const [id,draft] of Object.entries(incoming.drafts))if(typeof id!=='string'||!draft||typeof draft!=='object'||Object.values(draft).some(x=>typeof x!=='string'||x.length>100000))throw new Error('Draft tidak valid.');
 for(const score of Object.values(incoming.checkpointScores))if(typeof score!=='number'||score<0||score>1)throw new Error('Checkpoint score tidak valid.');
 incoming.historicalCheckpoints=incoming.historicalCheckpoints||{};incoming.checkpointVersions=incoming.checkpointVersions||{};
 const lessons=new Map((catalog.lessons||[]).map(l=>[l.id,l]));
 for(const [id,score] of Object.entries(incoming.checkpointScores)){const version=incoming.checkpointVersions[id];if(!lessons.has(id)||version!==lessons.get(id).version){incoming.historicalCheckpoints[id]={score,version:version??null};delete incoming.checkpointScores[id];delete incoming.checkpointVersions[id];}}
 for(const [id,completion] of Object.entries(incoming.completedLessons))completion.stale=!lessons.has(id)||completion.version!==lessons.get(id).version;
 if(incoming.explanations!==undefined){if(!incoming.explanations||typeof incoming.explanations!=='object'||Array.isArray(incoming.explanations))throw new Error('Explanation evidence tidak valid.');for(const x of Object.values(incoming.explanations))if(!x||typeof x.complete!=='boolean'||!['self_review','manual'].includes(x.evidenceMethod)||!Number.isFinite(x.at))throw new Error('Explanation rubric tidak valid.');}
 const timestamp=x=>Number.isFinite(x)&&x>=0&&x<=8640000000000000;
 const text=(x,max=20000)=>typeof x==='string'&&x.length<=max;
 const objectMap=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!Number.isInteger(incoming.revision)||incoming.revision<0)throw new Error('Revision tidak valid.');
 for(const n of incoming.notes)if(!text(n.title,200)||!text(n.body)||!text(n.category,100)||!timestamp(n.at)||n.exerciseId!==undefined&&!text(n.exerciseId,200))throw new Error('Metadata note tidak valid.');
 for(const c of incoming.career)if(!text(c.title,200)||!text(c.body,20000)||!['project','story','application','gap'].includes(c.type)||!['Planned','In progress','Complete'].includes(c.status)||!timestamp(c.at))throw new Error('Metadata career tidak valid.');
 for(const key of ['reflections','assistance','checkpointVersions','historicalCheckpoints','explanations'])if(incoming[key]!==undefined&&!objectMap(incoming[key]))throw new Error(`Map ${key} tidak valid.`);
 for(const value of Object.values(incoming.reflections||{}))if(typeof value!=='boolean'&&!text(value))throw new Error('Reflection tidak valid.');
 for(const value of Object.values(incoming.assistance||{}))if(!Number.isInteger(value)||value<0||value>100)throw new Error('Assistance tidak valid.');
 if(incoming.interviews!==undefined){assertRecords(incoming.interviews,'Interviews');for(const i of incoming.interviews)if(!text(i.reflection)||!text(i.exerciseId,200)||!timestamp(i.at)||!Number.isInteger(i.checked)||i.checked<0||i.checked>6)throw new Error('Interview review tidak valid.');}
 if(incoming.interview!==undefined){const i=incoming.interview;if(!objectMap(i)||i.pausedSeconds!==undefined&&(!Number.isInteger(i.pausedSeconds)||i.pausedSeconds<0||i.pausedSeconds>86400)||i.deadline!==undefined&&i.deadline!==null&&!timestamp(i.deadline)||i.exerciseId!==undefined&&!text(i.exerciseId,200))throw new Error('Interview session tidak valid.');}
 if(incoming.pendingRun!==undefined){const p=incoming.pendingRun;if(!objectMap(p)||!text(p.requestId,128)||!/^[a-zA-Z0-9_-]+$/.test(p.requestId)||!text(p.source,65536)||!text(p.stdin,262144)||p.language!=='cpp'||!text(p.exerciseId,200)||!Number.isInteger(p.exerciseVersion)||!timestamp(p.createdAt))throw new Error('Pending execution tidak valid.');}
 for(const key of ['role','level','targetRegion','roleRequirements'])if(incoming.settings[key]!==undefined&&!text(incoming.settings[key],40000))throw new Error('Role metadata tidak valid.');
 if(incoming.settings.roleReviewedAt!==undefined&&!timestamp(incoming.settings.roleReviewedAt))throw new Error('Role checkpoint date tidak valid.');
 const restored={...emptyState(),...incoming,settings:{...emptyState().settings,...incoming.settings},revision:current.revision};
 if(!['light','dark'].includes(restored.settings.theme))restored.settings.theme='light';
 restored.settings.fontSize=Math.min(24,Math.max(16,Number(restored.settings.fontSize)||18));
 for(const [concept,r] of Object.entries(restored.reviews))if(!r||!Number.isFinite(r.dueAt)||!Number.isFinite(r.intervalDays))delete restored.reviews[concept];
 return restored;
}
export const INTERLEAVED=['m01','m02','m03','m04','m05','m09','m10','m11','m06','m12','m13','m14','m08','m15','m16','m07','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28'];
export function orderedLessons(state,catalog){const order=state.settings.route==='sequential'?catalog.modules.map(x=>x.id):INTERLEAVED;return [...catalog.lessons].sort((a,b)=>order.indexOf(a.moduleId)-order.indexOf(b.moduleId));}
export function makeMissions(state,catalog,minutes=45,now=Date.now()){
 const lesson=orderedLessons(state,catalog).find(x=>!state.completedLessons[x.id]||state.completedLessons[x.id].stale);
 const due=Object.entries(state.reviews).filter(([,r])=>r.dueAt<=now).sort((a,b)=>a[1].dueAt-b[1].dueAt);
 const reviews=due.map(([concept])=>{const ex=catalog.exercises.find(x=>x.concepts?.includes(concept)&&['coding','trace'].includes(x.kind));return ex?{kind:'review',conceptId:concept,exerciseId:ex.id,title:`Review: ${concept.replaceAll('-',' ')}`,language:state.settings.cppAvailable?state.settings.primaryLanguage:'python',requiresCpp:false,minutes:Math.min(minutes,15)}:null;}).filter(Boolean).slice(0,minutes<=15?1:3);
 const pythonHistory=state.attempts.filter(a=>a.language==='python'&&a.evidenceMethod==='automated'&&a.passed!==null&&!a.stale).sort((a,b)=>b.at-a.at);
 const lastPython=pythonHistory[0],retrieval=lastPython&&catalog.exercises.find(e=>e.id===lastPython.exerciseId&&e.version===lastPython.exerciseVersion&&['coding','trace'].includes(e.kind));
 if(retrieval&&now-lastPython.at>=7*DAY){const title=now-lastPython.at>=14*DAY?'Python re-entry check':'Python weekly retrieval';const maintenance={kind:'review',conceptId:retrieval.concepts[0],exerciseId:retrieval.id,title:`${title}: ${retrieval.title||retrieval.id}`,language:'python',requiresCpp:false,minutes:Math.min(minutes,15)};const index=reviews.findIndex(r=>r.exerciseId===retrieval.id);if(index>=0)reviews.splice(index,1);reviews.unshift(maintenance);reviews.splice(minutes<=15?1:3);}
 const next=lesson?{kind:'lesson',lessonId:lesson.id,title:lesson.title,language:/^m0[5-8]$/.test(lesson.moduleId)?'cpp':'python',requiresCpp:false,minutes:Math.min(minutes,lesson.minutes||20)}:null;
 return state.settings.lastMissionType==='review'?[next,...reviews].filter(Boolean):[...reviews,next].filter(Boolean);
}
export function checkOutput(actual,expected,{checker='exact',tolerance=1e-6}={}){
 const normalize=s=>String(s).replaceAll('\r\n','\n').split('\n').map(x=>x.trimEnd()).join('\n').trimEnd(),a=normalize(actual),b=normalize(expected);
 if(checker==='float'){const x=a.trim().split(/\s+/),y=b.trim().split(/\s+/);return a.length>0&&b.length>0&&x.length===y.length&&x.every((v,i)=>Number.isFinite(Number(v))&&Number.isFinite(Number(y[i]))&&Math.abs(Number(v)-Number(y[i]))<=tolerance);}
 if(checker==='unordered')return a.trim().split(/\s+/).sort().join('\n')===b.trim().split(/\s+/).sort().join('\n');
 return a===b;
}
export function buildTrace(type,input={}){
 const values=input.values||[2,4,6,8,10];if(!Array.isArray(values)||values.length>32||values.some(v=>!Number.isFinite(v)))throw new Error('Gunakan maksimal 32 angka valid.');
 if(type==='loop'){let total=0;const steps=[{values:[...values],active:-1,total,text:'Mulai: total = 0.'}];values.forEach((v,i)=>{total+=v;steps.push({values:[...values],active:i,total,text:`Iterasi ${i}: tambah ${v}; total = ${total}.`});});steps.push({values:[...values],active:-1,total,text:`Loop selesai. Jumlah = ${total}.`});return steps;}
 if(type==='reference')return [{values:[7,7],active:0,text:'a = 7; copy menerima salinan nilai a.'},{values:[7,10],active:1,text:'Ubah copy menjadi 10: a tetap 7.'},{values:[10,10],active:0,text:'Reference menunjuk a; ubah reference: a ikut menjadi 10.'},{values:[10,10],active:-1,text:'Copy punya nilai terpisah; reference adalah nama lain untuk object yang sama.'}];
 if(type==='binary'){
  if(values.some((v,i)=>i&&v<values[i-1]))throw new Error('Binary search membutuhkan array terurut naik.');
  const target=Number(input.target??6);if(!Number.isFinite(target))throw new Error('Target tidak valid.');let left=0,right=values.length-1,result=-1;const steps=[];
  while(left<=right){const mid=Math.floor((left+right)/2);steps.push({values:[...values],left,right,mid,active:mid,target,text:`left=${left}, right=${right}, mid=${mid}; bandingkan ${values[mid]} dengan ${target}.`});if(values[mid]===target){result=mid;break;}if(values[mid]<target)left=mid+1;else right=mid-1;}
  steps.push({values:[...values],left,right,active:result,result,target,text:result<0?'Target tidak ditemukan.':`Target ditemukan pada index ${result}. Untuk duplikat, satu posisi yang cocok dikembalikan.`});return steps;
 }
 if(type==='dp'){
  const n=Number(input.n??6);if(!Number.isInteger(n)||n<0||n>12)throw new Error('n harus integer 0–12.');const dp=Array(n+1).fill(null);dp[0]=1;const steps=[{values:[...dp],active:0,text:'dp[0] = 1: satu cara memilih tidak mengambil langkah.'}];
  for(let i=1;i<=n;i++){dp[i]=(dp[i-1]||0)+(i>=2?dp[i-2]||0:0);steps.push({values:[...dp],active:i,text:`dp[${i}] = dp[${i-1}]${i>=2?` + dp[${i-2}]`:''} = ${dp[i]}.`});}return steps;
 }
 if(type==='tree'||type==='graph'){
  let graph,labels,start=0;
  if(type==='tree'){
   labels=input.values??[8,4,12,2,6,10,14];if(labels.length>15)throw new Error('Tree maksimal 15 node.');
   graph=labels.map((_,i)=>[2*i+1,2*i+2].filter(j=>j<labels.length));
  }else{
   const count=input.nodeCount??6;start=input.start??0;
   if(!Number.isInteger(count)||count<1||count>12||!Number.isInteger(start)||start<0||start>=count)throw new Error('Graph: 1–12 nodes dan start harus valid.');
   const edges=input.edges??[[0,1],[0,2],[1,3],[2,3],[2,4],[3,0],[4,5]];
   if(!Array.isArray(edges)||edges.length>24||edges.some(e=>!Array.isArray(e)||e.length!==2||e.some(v=>!Number.isInteger(v)||v<0||v>=count)))throw new Error('Edges harus pasangan node valid, maksimal 24.');
   labels=Array.from({length:count},(_,i)=>i);graph=labels.map(()=>[]);for(const [a,b]of edges)if(!graph[a].includes(b))graph[a].push(b);graph.forEach(row=>row.sort((a,b)=>a-b));
  }
  const method=input.method||'bfs';if(!['bfs','dfs'].includes(method))throw new Error('Pilih BFS atau DFS.');
  const queue=graph.length?[start]:[],visited=new Set(),steps=[{values:labels,edges:graph.flatMap((a,i)=>a.map(j=>[i,j])),active:-1,visited:[],frontier:[...queue],text:graph.length?`Mulai dari node index ${start}. Tetangga diurutkan naik; visited mencegah cycle.`:'Tree kosong; tidak ada node yang dikunjungi.'}];
  while(queue.length){const node=method==='dfs'?queue.pop():queue.shift();if(visited.has(node))continue;visited.add(node);const neighbors=method==='dfs'?[...graph[node]].reverse():graph[node];for(const next of neighbors)if(!visited.has(next))queue.push(next);steps.push({values:labels,edges:steps[0].edges,active:node,visited:[...visited],frontier:[...queue],text:`Kunjungi ${labels[node]}. ${method==='dfs'?'Stack':'Queue'}: [${queue.map(i=>labels[i]).join(', ')}]. Visited mencegah cycle berulang.`});}return steps;
 }
 throw new Error('Visualizer tidak dikenal.');
}
