import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../dist/core.js';
const appSource=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/boot\(\);\s*$/,'');
const ex={id:'e',moduleId:'m01',lessonId:'l1',family:'f',variant:'transfer',kind:'coding',version:1,tests:[{input:'',expected:'1'},{input:'',expected:'1'}],concepts:['loop']};
const catalog={modules:[{id:'m01'}],lessons:[{id:'l1',moduleId:'m01',version:1,title:'First lesson'}],exercises:[ex]};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function harness(cat=catalog){
 const listeners={},windowListeners={},calls=[],element={classList:{add(){},remove(){}},textContent:'',innerHTML:''};
 const editor={dataset:{exerciseId:'e'},value:'print(1)'};
 const ctx={...core,console,URLSearchParams,TextEncoder,AbortController,structuredClone,clearTimeout(){},setTimeout(){return 0},clearInterval(){},setInterval(){return 0},
  location:{hash:'#practice/e'},window:{addEventListener:(name,fn)=>windowListeners[name]=fn},
  document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>id==='code-editor'?editor:id==='custom-input'?{value:''}:element},
  FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key];}},
  runPython:async()=>{calls.push('python');return {status:'completed',stdout:'1'};},runCpp:async()=>{calls.push('cpp');return {status:'completed',stdout:'1'};}};
 vm.createContext(ctx);vm.runInContext(appSource,ctx);ctx.catalogFixture=cat;
 vm.runInContext('render=()=>{};renderResults=()=>{};persist=async()=>{};catalog=catalogFixture;',ctx);
 return {ctx,listeners,windowListeners,calls,element,editor,run:code=>vm.runInContext(code,ctx)};
}
test('standalone srcdoc runtime chooses embedded worker before resolving an external URL',async()=>{
 const source=await readFile(new URL('../dist/runner-host.js',import.meta.url),'utf8');let listener,created=0;const replies=[];const parent={postMessage:m=>replies.push(m)};
 vm.runInNewContext(source,{URL,Blob,location:{href:'about:srcdoc'},parent,window:{addEventListener:(_,fn)=>listener=fn},Worker:class{constructor(){created++;}postMessage(){}terminate(){}}});
 listener({source:parent,origin:'null',data:{type:'execute',nonce:'n',source:'print(1)',stdin:'',workerSource:'// embedded'}});
 assert.equal(created,1);assert.equal(replies.some(m=>m.type==='error'),false);
});
test('trace answer feedback persists exposure before a corrected retry',async()=>{
 const trace={...ex,kind:'trace',answer:{options:['wrong','right'],correctIndex:1,explanation:'The correct output is right.'}};
 const h=await harness({...catalog,exercises:[trace]});const form={dataset:{form:'activity',id:'e'},closest:()=>null,values:{answer:'0'}};
 await h.listeners.submit({target:form,preventDefault(){}});form.values.answer='1';await h.listeners.submit({target:form,preventDefault(){}});
 assert.equal(h.run('state.attempts.at(-1).novelTransfer'),false);assert.equal(h.run('state.exposures.length'),1);
});
test('correct first trace transfer keeps evidence after feedback and import',async()=>{
 const trace={...ex,kind:'trace',answer:{options:['wrong','right'],correctIndex:1,explanation:'Answer right.'}};const cat={...catalog,exercises:[trace]};
 const h=await harness(cat);await h.listeners.submit({target:{dataset:{form:'activity',id:'e'},closest:()=>null,values:{answer:'1'}},preventDefault(){}});
 const s=h.run('state');assert.equal(s.attempts[0].novelTransfer,true);
 const restored=core.importState(core.emptyState(),{schemaVersion:1,data:s},cat);assert.equal(restored.attempts[0].novelTransfer,true);
});
test('new C++ run cannot overwrite an outstanding recovery ID',async()=>{
 const h=await harness();h.ctx.runCpp=async()=>{throw new Error('One submission is active');};
 h.run("ui.language='cpp';state.settings.cppAvailable=true;state.pendingRun={requestId:'original-accepted-job',source:'old',stdin:'',language:'cpp'};globalThis.work=execute('run');");await h.ctx.work;
 assert.equal(h.run('state.pendingRun.requestId'),'original-accepted-job');
});
test('execution language is immutable across every case and recorded evidence',async()=>{
 const h=await harness();let release;let first=true;h.ctx.runPython=async()=>{h.calls.push('python');if(first){first=false;return new Promise(r=>release=r);}return {status:'completed',stdout:'1'};};
 h.run("globalThis.work=execute('submit');");await flush();h.run("ui.language='cpp';");release({status:'completed',stdout:'1'});await h.ctx.work;
 assert.deepEqual(h.calls,['python','python']);assert.equal(h.run('state.attempts[0].language'),'python');
});
test('double activation reserves only one execution before awaiting persistence',async()=>{
 const h=await harness();const releases=[];h.ctx.releases=releases;h.run('persist=()=>new Promise(resolve=>releases.push(resolve));globalThis.work1=execute("run");globalThis.work2=execute("run");');
 assert.equal(releases.length,1);releases[0]();await h.ctx.work1;await h.ctx.work2;assert.deepEqual(h.calls,['python']);
});
test('navigation while saving prevents an old execution from starting afterward',async()=>{
 const h=await harness();const releases=[];h.ctx.releases=releases;h.run('persist=()=>new Promise(resolve=>releases.push(resolve));globalThis.work=execute("run");');
 h.ctx.location.hash='#today';h.windowListeners.hashchange();releases[0]();await h.ctx.work;assert.deepEqual(h.calls,[]);
});
test('malformed optional records reject before destructive replacement',()=>{
 for(const mutate of [s=>s.notes.push({id:'n',title:'text',body:'text'}),s=>s.interviews={},s=>s.interview={pausedSeconds:'bad'},s=>s.reflections=null,s=>s.pendingRun={},s=>s.settings.roleReviewedAt='yesterday']){
  const current=core.emptyState(),bad=core.emptyState();mutate(bad);const before=JSON.stringify(current);assert.throws(()=>core.importState(current,{schemaVersion:1,data:bad},catalog));assert.equal(JSON.stringify(current),before);
 }
});
test('normal boot reconciles stored content versions just like manual import',async()=>{
 const cat={...catalog,lessons:[{...catalog.lessons[0],version:2}]};const h=await harness(cat),loaded=core.emptyState();loaded.settings.onboarded=true;loaded.completedLessons.l1={version:1,at:1};loaded.checkpointScores.l1=1;loaded.checkpointVersions.l1=1;
 h.ctx.openStore=async()=>({read:async()=>loaded,subscribe(){},close(){}});
 h.ctx.fetch=async path=>({ok:true,json:async()=>String(path).includes('part-01')?cat:String(path).includes('part-')?{modules:[],lessons:[],exercises:[]}:{configured:false}});
 h.run('globalThis.work=boot();');await h.ctx.work;
 assert.equal(h.run('state.completedLessons.l1.stale'),true);assert.equal(h.run('state.checkpointScores.l1'),undefined);
 assert.equal(core.makeMissions(h.run('state'),cat)[0].lessonId,'l1');
});

test('stale recovery completion cannot overwrite a newer run UI or recovery identity',async()=>{
 const h=await harness();let release;h.ctx.runCpp=()=>new Promise(resolve=>release=resolve);
 h.run("state.pendingRun={requestId:'old-job',source:'x',stdin:'',language:'cpp'};globalThis.work=recover();");await flush();
 h.run("++runSequence;ui.busy=true;ui.runStatus='newer session';state.pendingRun={requestId:'newer-job'};");release({status:'completed',stdout:'old'});await h.ctx.work;
 assert.equal(h.run('ui.runStatus'),'newer session');assert.equal(h.run('ui.busy'),true);assert.equal(h.run('state.pendingRun.requestId'),'newer-job');
});
test('skip link focuses main content without changing the application route',async()=>{
 const h=await harness();let prevented=false;await h.listeners.click({target:{closest:selector=>selector==='.skip-link'?{}:null},preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.ctx.location.hash,'#practice/e');
});

test('interview expiry is processed while the user is on the coding page',async()=>{
 const h=await harness();h.ctx.document.getElementById=id=>id==='interview-timer'?null:h.element;
 h.run('state.interview={pausedSeconds:1,deadline:Date.now()-1000};updateTimerDisplay();');
 assert.equal(h.run('state.interview.deadline'),null);assert.equal(h.run('state.interview.pausedSeconds'),0);
});

test('background C++ availability refresh updates the initial unavailable view',async()=>{
 const h=await harness();h.ctx.AbortSignal=AbortSignal;h.ctx.fetch=async()=>({ok:true,json:async()=>({configured:true})});
 h.run('ui.renderCount=0;render=()=>{ui.renderCount++};globalThis.work=checkCpp();');await h.ctx.work;
 assert.equal(h.run('state.settings.cppAvailable'),true);assert.equal(h.run('ui.renderCount'),1);
});
