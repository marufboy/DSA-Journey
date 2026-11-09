import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../dist/core.js';
import * as videos from '../dist/videos.js';
import * as courses from '../dist/courses.js';
import {esc} from '../dist/ui.js';
const appSource=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/boot\(\);\s*$/,'');
const ex={id:'e',moduleId:'m01',lessonId:'l1',family:'f',variant:'transfer',kind:'coding',version:1,tests:[{input:'',expected:'1'},{input:'',expected:'1'}],concepts:['loop']};
const catalog={modules:[{id:'m01'}],lessons:[{id:'l1',moduleId:'m01',version:1,title:'First lesson'}],exercises:[ex]};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function harness(cat=catalog){
 const listeners={},windowListeners={},calls=[],element={classList:{add(){},remove(){}},textContent:'',innerHTML:''};
 const editor={dataset:{exerciseId:'e'},value:'print(1)'};
 const ctx={...core,...videos,...courses,esc,console,URL,URLSearchParams,TextEncoder,AbortController,AbortSignal,structuredClone,clearTimeout(){},setTimeout(){return 0},clearInterval(){},setInterval(){return 0},
  location:{hash:'#practice/e',protocol:'http:'},window:{addEventListener:(name,fn)=>windowListeners[name]=fn},
  document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>id==='code-editor'?editor:id==='custom-input'?{value:''}:element},
  FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key];}},
  runPython:async()=>{calls.push('python');return {status:'completed',stdout:'1'};},runCpp:async()=>{calls.push('cpp');return {status:'completed',stdout:'1'};}};
 vm.createContext(ctx);vm.runInContext(appSource,ctx);vm.runInContext('globalThis.actualPersist=persist;',ctx);ctx.catalogFixture=cat;
 vm.runInContext('render=()=>{};renderResults=()=>{};persist=async()=>true;catalog=catalogFixture;',ctx);
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


test('video add and notes forms persist without granting evidence or replacing inputs',async()=>{
 const h=await harness();const form={dataset:{form:'add-video'},closest:()=>null,values:{title:'Personal',url:'https://youtu.be/JP7ITIXGpHk',lessonId:'l1',publisher:'Me'}};
 await h.listeners.submit({target:form,preventDefault(){}});assert.equal(h.run('state.videos.length'),1);assert.match(h.ctx.location.hash,/#videos\/user-/);
 const id=h.run('state.videos[0].id');h.ctx.location.hash='#videos/'+id;
 const progress={dataset:{form:'video-progress',id},closest:()=>null,values:{notes:'My explanation',resumeSeconds:'72',watched:'on'}};
 await h.listeners.submit({target:progress,preventDefault(){}});assert.equal(h.run('state.videoProgress[state.videos[0].id].resumeSeconds'),72);assert.equal(h.run('state.attempts.length'),0);
 progress.values.resumeSeconds='-1';await h.listeners.submit({target:progress,preventDefault(){}});assert.equal(h.run('state.videoProgress[state.videos[0].id].resumeSeconds'),72);assert.match(h.element.textContent,/bookmark|detik/);
});

test('video player mounts only on explicit activation with a fixed origin and unload removes it',async()=>{
 const h=await harness();h.ctx.location.hash='#videos/cs50p-functions';h.run('state.videoProgress["cs50p-functions"]={notes:"",resumeSeconds:42,watched:false,updatedAt:0}');
 const click=action=>h.listeners.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action,id:'cs50p-functions'}}:null}});
 await click('load-video');assert.match(h.element.innerHTML,/<iframe/);assert.match(h.element.innerHTML,/https:\/\/www.youtube-nocookie.com\/embed\/JP7ITIXGpHk\?start=42/);assert.match(h.element.innerHTML,/referrerpolicy="strict-origin-when-cross-origin"/);assert.doesNotMatch(h.element.innerHTML,/autoplay=1/);
 await click('unload-video');assert.doesNotMatch(h.element.innerHTML,/<iframe/);
 h.ctx.location.protocol='file:';await click('load-video');assert.doesNotMatch(h.element.innerHTML,/<iframe/);assert.match(h.element.innerHTML,/HTTP|localhost/);
});

test('background compiler status cannot destroy video drafts or the active player',async()=>{
 const h=await harness();h.ctx.location.hash='#videos/cs50p-functions';let renders=0;h.ctx.render=()=>renders++;
 h.ctx.fetch=async()=>({ok:true,json:async()=>({configured:true})});await h.run('checkCpp()');assert.equal(renders,0);assert.equal(h.run('state.settings.cppAvailable'),true);
});

test('guided lesson anchors focus content without changing the application route',async()=>{
 const h=await harness();h.ctx.location.hash='#learn/l1';let focused=false,scrolled=false,prevented=false;
 h.ctx.document.getElementById=()=>({focus(){focused=true;},scrollIntoView(){scrolled=true;}});
 await h.listeners.click({target:{closest:selector=>selector==='[data-lesson-anchor]'?{dataset:{lessonAnchor:'lesson-checkpoint'}}:null},preventDefault(){prevented=true;}});
 assert.equal(h.ctx.location.hash,'#learn/l1');assert.ok(focused&&scrolled&&prevented);
});


test('delayed video save cannot redirect away from the learner new route',async()=>{
 const h=await harness();h.ctx.location.hash='#videos';let release;h.ctx.delay=()=>new Promise(r=>release=r);h.run('persist=delay;');
 const form={dataset:{form:'add-video'},closest:()=>null,values:{title:'Personal',url:'https://youtu.be/JP7ITIXGpHk',lessonId:'l1',publisher:''}};
 const saving=h.listeners.submit({target:form,preventDefault(){}});await flush();h.ctx.location.hash='#learn/l1';release(true);await saving;assert.equal(h.ctx.location.hash,'#learn/l1');
});

test('repeated unchanged saves including pagehide do not create a stale revision after reload',async()=>{
 const h=await harness();let writes=0;h.ctx.fakeStore={write:async s=>{writes++;return {...s,revision:s.revision+1};}};
 h.ctx.document.getElementById=id=>id==='code-editor'?null:h.element;
 h.run('store=fakeStore;persist=actualPersist;');await h.run('persist()');await h.run('persist()');h.windowListeners.pagehide();await h.run('queue');
 assert.equal(writes,1);
 h.run('state.settings.name="Changed";');await h.run('persist()');assert.equal(writes,2);
});

test('backup replacement waits behind pending writes and uses the committed revision',async()=>{
 const h=await harness();const writes=[];let release;h.ctx.fakeStore={write:async s=>{writes.push(structuredClone(s));if(writes.length===1)await new Promise(r=>release=r);return {...s,revision:s.revision+1};}};
 h.run('store=fakeStore;persist=actualPersist;globalThis.first=persist();');await flush();
 h.ctx.candidate=core.emptyState();h.ctx.candidate.settings.name='Restored';h.run('globalThis.replacing=replaceStoredState(candidate);');await flush();assert.equal(writes.length,1);
 release();await h.ctx.first;await h.ctx.replacing;assert.equal(writes.length,2);assert.equal(writes[1].revision,1);assert.equal(h.run('state.settings.name'),'Restored');
});


test('course playlist and full-video players use fixed privacy-enhanced embeds and unload',async()=>{
 const h=await harness();h.ctx.location.hash='#courses/en-cs50p';
 const click=(action,id)=>h.listeners.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action,id}}:null}});
 await click('load-course','en-cs50p');assert.match(h.element.innerHTML,/youtube-nocookie.com\/embed\/videoseries/);assert.match(h.element.innerHTML,/listType=playlist/);await click('unload-course','en-cs50p');assert.doesNotMatch(h.element.innerHTML,/<iframe/);
 h.ctx.location.hash='#courses/en-fcc-cpp20';h.run('state.courseProgress["en-fcc-cpp20"]={notes:"",resumeSeconds:100000,watched:false,updatedAt:0}');await click('load-course','en-fcc-cpp20');assert.match(h.element.innerHTML,/start=100000/);
 h.ctx.location.protocol='file:';await click('load-course','en-fcc-cpp20');assert.doesNotMatch(h.element.innerHTML,/<iframe/);assert.match(h.element.innerHTML,/localhost/);
});

test('course form saves manual notes without rerendering the active player or granting evidence',async()=>{
 const h=await harness();h.ctx.location.hash='#courses/en-cs50p';h.ctx.render=()=>{throw new Error('Must preserve mounted player and notes form');};
 const form={dataset:{form:'course-progress',id:'en-cs50p'},closest:()=>null,values:{notes:'Episode 3, explain it myself',resumeSeconds:'0',watched:'on'}};
 await h.listeners.submit({target:form,preventDefault(){}});assert.equal(h.run('state.courseProgress["en-cs50p"].notes'),'Episode 3, explain it myself');assert.equal(h.run('state.attempts.length'),0);
 form.values.resumeSeconds='42';await h.listeners.submit({target:form,preventDefault(){}});assert.equal(h.run('state.courseProgress["en-cs50p"].resumeSeconds'),0);assert.match(h.element.textContent,/tidak valid/);
});

test('background compiler status leaves course notes and playback mounted',async()=>{
 const h=await harness();h.ctx.location.hash='#courses/en-cs50p';let renders=0;h.ctx.render=()=>renders++;h.ctx.fetch=async()=>({ok:true,json:async()=>({configured:true})});await h.run('checkCpp()');assert.equal(renders,0);
});

test('successful video and course saves report recovery after a transient write failure',async()=>{
 for(const type of ['add-video','video-progress','course-progress']){
  const h=await harness();let writes=0;h.ctx.fakeStore={write:async s=>{if(++writes===1)throw new Error('Temporary write failure');return {...s,revision:s.revision+1};}};
  h.run('store=fakeStore;persist=actualPersist;');await h.run('persist()');assert.match(h.run('ui.storageWarning'),/Temporary/);
  const id=type==='course-progress'?'en-cs50p':'cs50p-functions';h.ctx.location.hash=type==='course-progress'?'#courses/'+id:'#videos/'+id;
  const form={dataset:{form:type,id},closest:()=>null,values:{title:'Personal',url:'https://youtu.be/JP7ITIXGpHk',publisher:'',lessonId:'l1',notes:'Recovered',resumeSeconds:'0'}};
  await h.listeners.submit({target:form,preventDefault(){}});
  assert.equal(writes,2);
  if(type==='add-video')assert.match(h.ctx.location.hash,/#videos\/user-/);
  else {assert.match(h.element.textContent,/tersimpan/);assert.doesNotMatch(h.element.textContent,/belum tersimpan/);}
 }
});
