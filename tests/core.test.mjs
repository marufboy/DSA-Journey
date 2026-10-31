import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,recordExposure,recordAttempt,deriveConcept,importState,makeMissions,checkOutput,buildTrace} from '../dist/core.js';

const day=86400000, DAY=day, now=Date.UTC(2026,9,31,8);
const a={id:'a',version:1,moduleId:'m01',lessonId:'l1',kind:'coding',concepts:['loops'],family:'loop-sum',variant:'practice'};
const b={...a,id:'b',family:'loop-streak',variant:'transfer'};
const catalog={exercises:[a,b],lessons:[{id:'l1',moduleId:'m01',version:1},{id:'l2',moduleId:'m02',version:1}],modules:[{id:'m01'},{id:'m02'}]};
const ready=()=>({...emptyState(),checkpointScores:{l1:1},checkpointVersions:{l1:1},explanations:{loops:{complete:true,evidenceMethod:'self_review',at:now}}});

test('new attempt after solution exposure cannot launder transfer',()=>{
 let s=ready();s=recordExposure(s,b,now);s=recordAttempt(s,b,{passed:true,at:now+8*day,language:'python'});
 assert.equal(s.attempts[0].novelTransfer,false);assert.equal(s.exposures.length,1);
 assert.notEqual(deriveConcept(s,'loops',catalog.exercises,now+8*day).state,'Retained');
});
test('unexposed distinct transfer plus a practice yields provisional evidence',()=>{
 let s=ready();s=recordAttempt(s,a,{passed:true,at:now,language:'python'});
 s=recordAttempt(s,b,{passed:true,at:now+day,language:'python'});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+day).state,'Provisionally mastered');
});
test('retention requires actual delayed review not merely elapsed time',()=>{
 let s=ready();s=recordAttempt(s,a,{passed:true,at:now,language:'python'});s=recordAttempt(s,b,{passed:true,at:now+day,language:'python'});
 assert.notEqual(deriveConcept(s,'loops',catalog.exercises,now+10*day).state,'Retained');
 s=recordAttempt(s,a,{passed:true,at:now+8*day,language:'python',review:true});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+8*day).state,'Retained');
});
test('hints and self-reported project success are not independent automated evidence',()=>{
 let s=ready();s=recordAttempt(s,a,{passed:true,at:now,hintsUsed:1,language:'python'});
 s=recordAttempt(s,{...b,kind:'project'},{passed:true,at:now+day,language:'python',evidenceMethod:'self_report'});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+day).transferCount,0);
});
test('infrastructure unknown does not record a wrong solution',()=>{
 const s=recordAttempt(ready(),a,{status:'unknown',passed:null,at:now,language:'cpp'});
 assert.equal(s.attempts[0].passed,null);assert.equal(s.attempts[0].status,'unknown');
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now).recallCount,0);
});
test('same-schema backup preserves retired evidence and marks changed evidence stale',()=>{
 let s=recordAttempt(ready(),a,{passed:true,at:now,language:'python'});
 s=recordAttempt(s,b,{passed:true,at:now+day,language:'python'});s.drafts.a={python:'print(1)'};
 const newer={...catalog,exercises:[{...a,version:2}]};
 const restored=importState(emptyState(),{schemaVersion:1,data:s},newer);
 assert.equal(restored.attempts.length,2);assert.ok(restored.attempts.every(x=>x.stale));
 assert.equal(restored.drafts.a.python,'print(1)');assert.equal(deriveConcept(restored,'loops',newer.exercises,now+day).recallCount,0);
});
test('backup exposure survives retry and import',()=>{
 let s=recordExposure(ready(),b,now);s=importState(emptyState(),{schemaVersion:1,data:s},catalog);
 s=recordAttempt(s,b,{passed:true,at:now+8*day,language:'cpp'});
 assert.equal(s.attempts[0].novelTransfer,false);
});
test('invalid/newer backup rejected without mutating current state',()=>{
 const s=ready(), before=JSON.stringify(s);
 assert.throws(()=>importState(s,{schemaVersion:99,data:{}},catalog));
 assert.throws(()=>importState(s,{schemaVersion:1,data:{...s,attempts:[{id:'x'},{id:'x'}]}},catalog));
 assert.equal(JSON.stringify(s),before);
});
test('failed delayed review reduces mastery even after prior retention',()=>{
 let s=ready();s=recordAttempt(s,a,{passed:true,at:now,language:'python'});s=recordAttempt(s,b,{passed:true,at:now+day,language:'python'});
 s=recordAttempt(s,a,{passed:true,review:true,at:now+8*day,language:'python'});
 s=recordAttempt(s,a,{passed:false,review:true,at:now+10*day,language:'python'});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+10*day).state,'Practicing');
});
test('review-heavy short session offers a new lesson and preserves backlog',()=>{
 const s=ready();s.settings.lastMissionType='review';s.reviews={loops:{dueAt:now-day,intervalDays:1}};
 const missions=makeMissions(s,catalog,15,now);assert.equal(missions[0].kind,'lesson');assert.ok(missions.some(x=>x.kind==='review'));
 assert.equal(Object.keys(s.reviews).length,1);
});
test('C++ outage recommends available Python work instead of a blocked runner',()=>{
 const s=ready();s.settings.primaryLanguage='cpp';s.settings.cppAvailable=false;
 const missions=makeMissions(s,catalog,15,now);assert.ok(missions.some(x=>x.language==='python'));
 assert.ok(missions.every(x=>!x.requiresCpp));
});
test('exact checker tolerates trailing whitespace but preserves significant order',()=>{
 assert.equal(checkOutput('a  \r\nb\n','a\nb',{checker:'exact'}),true);
 assert.equal(checkOutput('2 1','1 2',{checker:'exact'}),false);
 assert.equal(checkOutput('','0',{checker:'exact'}),false);
});
test('float checker rejects non-numbers and uses explicit tolerance',()=>{
 assert.equal(checkOutput('0.333333','0.333334',{checker:'float',tolerance:0.00001}),true);
 assert.equal(checkOutput('NaN','NaN',{checker:'float',tolerance:0.1}),false);
});
test('binary-search trace finds absent/boundary targets and rejects unsorted input',()=>{
 const trace=buildTrace('binary',{values:[1,3,5,7],target:7});assert.equal(trace.at(-1).result,3);
 assert.equal(buildTrace('binary',{values:[1,3],target:2}).at(-1).result,-1);
 assert.throws(()=>buildTrace('binary',{values:[3,1],target:1}));
});
test('loop trace handles empty list and cumulative state',()=>{
 assert.equal(buildTrace('loop',{values:[]}).at(-1).total,0);
 assert.equal(buildTrace('loop',{values:[2,-1,4]}).at(-1).total,5);
});

test('restoring an older backup cannot erase already known solution exposure',()=>{
 const backup={schemaVersion:1,data:ready()};const current=recordExposure(ready(),b,now);
 let s=importState(current,backup,catalog);s=recordAttempt(s,b,{passed:true,at:now+DAY,language:'python'});
 assert.equal(s.exposures.length,1);assert.equal(s.attempts[0].novelTransfer,false);
});
test('unknown review cannot erase the last conclusive failed review',()=>{
 let s=recordAttempt(ready(),a,{passed:true,at:now});s=recordAttempt(s,b,{passed:true,at:now+DAY});
 s=recordAttempt(s,a,{passed:false,review:true,at:now+8*DAY});
 s=recordAttempt(s,a,{passed:null,status:'unknown',review:true,at:now+9*DAY});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+10*DAY).state,'Practicing');
});
test('correct coding without explanation evidence cannot promote mastery',()=>{
 let s=ready();s.explanations={};s=recordAttempt(s,a,{passed:true,at:now});s=recordAttempt(s,b,{passed:true,at:now+DAY});
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now+DAY).state,'Practicing');
});
test('corrupted completion and boolean fields reject atomically',()=>{
 const s=ready();const broken=structuredClone(s);broken.completedLessons.l1='false';
 assert.throws(()=>importState(s,{schemaVersion:1,data:broken},catalog));
 let x=recordAttempt(s,a,{passed:true,at:now});x.attempts[0].assisted='false';
 assert.throws(()=>importState(s,{schemaVersion:1,data:x},catalog));
});
test('import does not trust transfer flag contradicting current exercise kind',()=>{
 let s=recordAttempt(ready(),a,{passed:true,at:now});s.attempts[0].novelTransfer=true;
 s=importState(emptyState(),{schemaVersion:1,data:s},catalog);
 assert.equal(deriveConcept(s,'loops',catalog.exercises,now).transferCount,0);
});
test('checkpoint version change preserves history without qualifying new criteria',()=>{
 const s=importState(emptyState(),{schemaVersion:1,data:ready()},{...catalog,lessons:[{id:'l1',version:2}]});
 assert.equal(s.checkpointScores.l1,undefined);assert.equal(s.historicalCheckpoints.l1.score,1);
});
test('orphaned review does not hide an actionable review in a short session',()=>{
 const s=ready();s.reviews={retired:{dueAt:1,intervalDays:1},loops:{dueAt:2,intervalDays:1}};
 assert.ok(makeMissions(s,catalog,15,now).some(m=>m.kind==='review'&&m.conceptId==='loops'));
});
test('retention delay starts from qualifying transfer rather than an old practice',()=>{
 let s=recordAttempt(ready(),a,{passed:true,at:now-30*DAY});s=recordAttempt(s,b,{passed:true,at:now});s=recordAttempt(s,a,{passed:true,review:true,at:now});
 assert.notEqual(deriveConcept(s,'loops',catalog.exercises,now).state,'Retained');
});
test('DP visualizer rejects invalid bounds instead of silently changing input',()=>{
 assert.throws(()=>buildTrace('dp',{n:-1}));assert.throws(()=>buildTrace('dp',{n:13}));
});

test('graph studio respects edited edges and terminates a directed cycle',()=>{
 const steps=buildTrace('graph',{nodeCount:3,edges:[[0,1],[1,0]],start:0,method:'bfs'});
 assert.deepEqual(steps.at(-1).visited,[0,1]);assert.deepEqual(steps[0].edges,[[0,1],[1,0]]);
 assert.throws(()=>buildTrace('graph',{nodeCount:3,edges:[[0,3]]}));
});
test('complete-tree studio uses user values and accepts an empty tree',()=>{
 const steps=buildTrace('tree',{values:[9,4,12],method:'bfs'});
 assert.deepEqual(steps.at(-1).values,[9,4,12]);assert.deepEqual(steps.at(-1).visited,[0,1,2]);
 assert.deepEqual(buildTrace('tree',{values:[]}).at(-1).visited,[]);
});

test('a long language gap offers a concrete Python re-entry exercise',()=>{
 const s=recordAttempt(ready(),a,{passed:true,at:now-15*DAY,language:'python'});s.settings.primaryLanguage='cpp';s.settings.cppAvailable=false;
 const missions=makeMissions(s,catalog,15,now);assert.match(missions[0].title,/Python re-entry/);assert.equal(missions[0].exerciseId,'a');assert.equal(missions[0].language,'python');
});
