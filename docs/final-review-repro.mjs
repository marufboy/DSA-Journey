// Snapshot reproduction harness, NOT passing regression coverage.
// Run: node docs/final-review-repro.mjs
// Assertions describe the reviewed bugs; invert them when converting to regressions.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as core from '../dist/core.js';
import {extraView} from '../dist/views-extra.js';
const read=name=>fs.readFile(new URL(`../dist/${name}`,import.meta.url),'utf8');
const parts=await Promise.all([1,2,3,4].map(n=>read(`content/part-0${n}.json`).then(JSON.parse)));
const catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};

// I1: srcdoc has an opaque about: URL even when embedded worker source is present.
let listener,workerCreated=false;const replies=[];
const parent={postMessage:m=>replies.push(m)};
vm.runInNewContext(await read('runner-host.js'),{URL,Blob,location:{href:'about:srcdoc'},parent,window:{addEventListener:(type,cb)=>listener=cb},Worker:class{constructor(){workerCreated=true}}});
listener({source:parent,origin:'null',data:{type:'execute',nonce:'demo',source:'print(1)',stdin:'',workerSource:'// embedded'}});
assert.equal(workerCreated,false);assert.match(replies[0].error,/Invalid URL/);
console.log('I1 reproduced: embedded standalone fails before Worker creation');

// I2: app trace handler shows answer.explanation between these two calls but adds no exposure.
const trace=catalog.exercises.find(e=>e.id==='m05-e6');
let traced=core.recordAttempt(core.emptyState(),trace,{passed:false});
traced=core.recordAttempt(traced,trace,{passed:true});
assert.equal(traced.attempts.at(-1).novelTransfer,true);
console.log('I2 reproduced: wrong -> revealed answer -> correct remains novel transfer');

// Actual controller with deferred execution and lightweight DOM boundaries.
let release;const calls=[];const editor={dataset:{exerciseId:'e'},value:'print(1)'};
const element={classList:{add(){},remove(){}},textContent:''};
const ctx={...core,console,URLSearchParams,TextEncoder,AbortController,structuredClone,
 clearTimeout(){},setTimeout(){return 0},clearInterval(){},setInterval(){return 0},
 location:{hash:'#practice/e'},window:{addEventListener(){}},
 document:{addEventListener(){},getElementById(id){return id==='code-editor'?editor:id==='custom-input'?{value:''}:element}},
 runPython:async()=>{calls.push('python');return new Promise(r=>release=r)},
 runCpp:async()=>{calls.push('cpp');return {status:'completed',stdout:'1'}}};
vm.createContext(ctx);
vm.runInContext((await read('app.js')).replace(/^import .*;\r?\n/gm,'').replace(/boot\(\);\s*$/,''),ctx);
vm.runInContext(`render=()=>{};renderResults=()=>{};persist=async()=>{};
 catalog={modules:[],lessons:[],exercises:[{id:'e',kind:'coding',version:1,tests:[{input:'',expected:'1'}],concepts:['loop']}]};
 globalThis.work=execute('submit');`,ctx);
await Promise.resolve();await Promise.resolve();
vm.runInContext(`ui.language='cpp'`,ctx);
release({status:'completed',stdout:'1'});await ctx.work;
assert.deepEqual(calls,['python']);
assert.equal(vm.runInContext('state.attempts[0].language',ctx),'cpp');
console.log('I4 reproduced: Python verdict recorded as passed C++ evidence');

ctx.runCpp=async()=>{throw new Error('One submission is active')};
vm.runInContext(`state.settings.cppAvailable=true;
 state.pendingRun={requestId:'original-accepted-job',source:'old',stdin:'',language:'cpp'};
 globalThis.work=execute('run');`,ctx);
await ctx.work;
assert.notEqual(vm.runInContext('state.pendingRun.requestId',ctx),'original-accepted-job');
console.log('I3 reproduced: new rejected run overwrites original pending request ID');

// I5: acceptance before rendering is insufficiently strict.
const malformed=core.emptyState();malformed.notes=[{id:'note-1',title:'Recover me',body:'valid text'}];
const accepted=core.importState(core.emptyState(),{schemaVersion:1,data:malformed},catalog);
assert.throws(()=>extraView({page:'notes'},{state:accepted,catalog,ui:{}}),/Invalid time value/);
console.log('I5 reproduced: accepted backup crashes Notes after replacement');

// I6: normal boot merges saved state without import/version reconciliation.
const loaded=core.emptyState();loaded.completedLessons.l1={version:1,at:1};
const revised={modules:[{id:'m01'}],lessons:[{id:'l1',moduleId:'m01',version:2,title:'Revised lesson'}],exercises:[]};
assert.equal(core.makeMissions(loaded,revised).length,0);
console.log('I6 reproduced: normal loaded completion skips revised lesson');
