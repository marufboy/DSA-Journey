import test from 'node:test';
import assert from 'node:assert/strict';
import {parseYouTubeUrl,curatedVideos,allVideos,addVideo,saveVideoProgress,removeVideo} from '../dist/videos.js';
import {emptyState,importState,deriveConcept} from '../dist/core.js';
const cat={lessons:[{id:'m01-l1',version:1}],exercises:[]};
const input={title:'My lesson',url:'https://youtu.be/JP7ITIXGpHk?t=10',lessonId:'m01-l1'};
test('normalizes supported YouTube forms without preserving arbitrary parameters',()=>{
 for(const url of ['https://www.youtube.com/watch?v=JP7ITIXGpHk&list=anything','https://youtu.be/JP7ITIXGpHk?t=9','https://m.youtube.com/shorts/JP7ITIXGpHk','https://youtube.com/live/JP7ITIXGpHk','https://www.youtube-nocookie.com/embed/JP7ITIXGpHk'])assert.equal(parseYouTubeUrl(url),'JP7ITIXGpHk');
});
test('rejects unsafe URLs and invalid IDs',()=>{
 for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=JP7ITIXGpHk','https://youtube.com.evil.test/watch?v=JP7ITIXGpHk','https://evil.test/youtube.com/JP7ITIXGpHk','https://u:p@youtube.com/watch?v=JP7ITIXGpHk','https://youtu.be/short','https://youtube.com/embed/JP7ITIXGpHk/extra','https://youtube.com:444/watch?v=JP7ITIXGpHk','JP7ITIXGpHk'])assert.throws(()=>parseYouTubeUrl(url),url);
});
test('curated resources have stable IDs, attribution and valid source-linked IDs',()=>{
 assert.equal(curatedVideos.length,5);assert.equal(new Set(curatedVideos.map(v=>v.id)).size,5);
 for(const v of curatedVideos){assert.match(v.videoId,/^[\w-]{11}$/);assert.ok(v.publisher&&v.sourceUrl&&v.prompt&&v.lessonIds.length);}
});
test('personal add and progress are immutable, bounded and unrelated to mastery evidence',()=>{
 const initial=emptyState(),added=addVideo(initial,input,cat,100);assert.equal(initial.videos.length,0);assert.equal(added.videos.length,1);
 const id=added.videos[0].id,saved=saveVideoProgress(added,id,{notes:'Explain it myself',resumeSeconds:123,watched:true},200);
 assert.deepEqual(saved.videoProgress[id],{notes:'Explain it myself',resumeSeconds:123,watched:true,updatedAt:200});assert.equal(added.videoProgress[id],undefined);
 for(const key of ['attempts','completedLessons','checkpointScores','reviews','exposures'])assert.deepEqual(saved[key],initial[key]);
 assert.equal(deriveConcept(saved,'python-io',[]).state,'Not started');
 assert.throws(()=>addVideo(saved,input,cat));assert.throws(()=>addVideo(saved,{...input,lessonId:'missing'},cat));
 for(const p of [{resumeSeconds:-1},{resumeSeconds:86401},{resumeSeconds:1.5},{resumeSeconds:NaN},{notes:'x'.repeat(10001)},{watched:'yes'}])assert.throws(()=>saveVideoProgress(saved,id,{notes:'',resumeSeconds:0,watched:false,...p}));
 assert.throws(()=>saveVideoProgress(saved,'missing',{notes:'',resumeSeconds:0,watched:false}));
 assert.throws(()=>removeVideo(saved,curatedVideos[0].id));assert.equal(removeVideo(saved,id).videoProgress[id],undefined);
});
test('legacy and current backups round trip videos while rejecting malformed data atomically',()=>{
 const legacy=emptyState();delete legacy.videos;delete legacy.videoProgress;
 assert.deepEqual(importState(emptyState(),{schemaVersion:1,data:legacy},cat).videos,[]);
 let state=addVideo(emptyState(),input,cat,100);state=saveVideoProgress(state,state.videos[0].id,{notes:'<script>text</script>',resumeSeconds:30,watched:true},200);
 assert.deepEqual(importState(emptyState(),{schemaVersion:1,data:state},cat).videoProgress,state.videoProgress);
 const historical=structuredClone(state);historical.videos[0].lessonId='removed-lesson';assert.equal(importState(emptyState(),{schemaVersion:1,data:historical},cat).videos[0].lessonId,'removed-lesson');
 const before=JSON.stringify(state);
 for(const mutate of [s=>s.videos=null,s=>s.videos.push(s.videos[0]),s=>s.videos[0].videoId='bad',s=>s.videos[0].title='x'.repeat(201),s=>s.videoProgress.noSuchResource={notes:'',resumeSeconds:0,watched:false,updatedAt:0},s=>s.videoProgress=null,s=>s.videoProgress[s.videos[0].id].watched='true']){
  const bad=structuredClone(state);mutate(bad);assert.throws(()=>importState(state,{schemaVersion:1,data:bad},cat));assert.equal(JSON.stringify(state),before);
 }
});
test('curated progress round trips independently and collection limits apply',()=>{
 const state=saveVideoProgress(emptyState(),curatedVideos[0].id,{notes:'Review later',resumeSeconds:86400,watched:false},123);
 assert.equal(importState(emptyState(),{schemaVersion:1,data:state},cat).videoProgress[curatedVideos[0].id].resumeSeconds,86400);
 const full=emptyState();full.videos=Array.from({length:500},(_,i)=>({id:`user-${i}`,title:'x',publisher:'Personal',videoId:'JP7ITIXGpHk',lessonId:'',addedAt:0}));assert.throws(()=>addVideo(full,input,cat));
 assert.equal(allVideos(state).length,5);
});
test('import rejects extra personal metadata that could spoof a publisher or embed source',()=>{
 const state=addVideo(emptyState(),input,cat,100);
 for(const extra of [{sourceUrl:'javascript:alert(1)'},{personal:false},{lessonIds:['m01-l1']},{prompt:'Injected'}]){
  const bad=structuredClone(state);Object.assign(bad.videos[0],extra);assert.throws(()=>importState(state,{schemaVersion:1,data:bad},cat));
 }
});
test('import requires a string video ID rather than coercing numbers or arrays',()=>{
 for(const videoId of [12345678901,['JP7ITIXGpHk']]){const state=addVideo(emptyState(),input,cat,100);state.videos[0].videoId=videoId;assert.throws(()=>importState(emptyState(),{schemaVersion:1,data:state},cat));}
});
