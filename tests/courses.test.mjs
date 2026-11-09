import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courseCatalog,courseTopics,selectCourses,courseEmbedUrl,saveCourseProgress} from '../dist/courses.js';
import {emptyState,importState} from '../dist/core.js';
const research=JSON.parse(await readFile(new URL('../docs/research/course-library/catalog.json',import.meta.url),'utf8'));
const cat={lessons:[],exercises:[]};
test('all 61 researched courses are distinct, attributed and faithfully classified',()=>{
 assert.equal(courseCatalog.length,61);assert.equal(new Set(courseCatalog.map(c=>c.id)).size,61);
 assert.equal(courseCatalog.filter(c=>c.language==='Indonesian').length,20);assert.equal(courseCatalog.filter(c=>c.verification==='search-only').length,6);
 for(const c of courseCatalog){const original=research.find(r=>r.id===c.id);for(const k of ['title','language','youtubeUrl','sourceUrl','verification'])assert.equal(c[k],original[k]);assert.ok(c.categories.every(t=>courseTopics[t]));assert.match(courseEmbedUrl(c),/^https:\/\/www.youtube-nocookie.com\/embed\//);}
});
test('language topic search level and evidence filters combine and paginate deterministically',()=>{
 assert.equal(selectCourses(new URLSearchParams()).total,61);assert.equal(selectCourses(new URLSearchParams()).items.length,12);
 const id=selectCourses(new URLSearchParams('language=Indonesian'));assert.equal(id.total,20);assert.ok(id.items.every(c=>c.language==='Indonesian'));
 const principles=selectCourses(new URLSearchParams('topic=principles&language=English'));assert.ok(principles.total>=2);assert.ok(principles.items.every(c=>c.categories.includes('principles')));
 assert.equal(selectCourses(new URLSearchParams('evidence=search-only')).total,6);
 const search=selectCourses(new URLSearchParams('search=SOLID'));assert.ok(search.total>=2);
 const empty=selectCourses(new URLSearchParams('search=not-a-course'));assert.equal(empty.total,0);assert.equal(empty.page,1);
 for(const page of ['NaN','-1','0'])assert.equal(selectCourses(new URLSearchParams('page='+page)).page,1);
 assert.equal(selectCourses(new URLSearchParams('page=999')).page,6);
 assert.ok(selectCourses(new URLSearchParams('level=Advanced')).items.every(c=>c.level==='Advanced'));
 const pages=Array.from({length:6},(_,i)=>selectCourses(new URLSearchParams('page='+(i+1))).items).flat();assert.equal(new Set(pages.map(c=>c.id)).size,61);
});
test('only exact supported video and playlist resources can construct course embeds',()=>{
 const p=courseCatalog.find(c=>c.media.kind==='playlist'),v=courseCatalog.find(c=>c.media.kind==='video');
 assert.match(courseEmbedUrl(p),/\/videoseries\?list=/);assert.match(courseEmbedUrl(v,100000),/start=100000/);
 for(const youtubeUrl of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=JP7ITIXGpHk','https://u:p@youtube.com/watch?v=JP7ITIXGpHk','https://www.youtube.com/channel/test'])assert.throws(()=>courseEmbedUrl({...v,youtubeUrl}));
 for(const time of [-1,NaN,172801])assert.throws(()=>courseEmbedUrl(v,time));
});
test('course notes and long bookmarks survive backups without becoming mastery evidence',()=>{
 const v=courseCatalog.find(c=>c.media.kind==='video'),p=courseCatalog.find(c=>c.media.kind==='playlist');
 const old=emptyState();delete old.courseProgress;assert.deepEqual(importState(emptyState(),{schemaVersion:1,data:old},cat).courseProgress,{});
 const before=emptyState(),s=saveCourseProgress(before,v.id,{notes:'My reasoning',resumeSeconds:100000,watched:true},123);
 assert.equal(before.courseProgress[v.id],undefined);assert.equal(importState(before,{schemaVersion:1,data:s},cat).courseProgress[v.id].resumeSeconds,100000);
 for(const key of ['attempts','checkpointScores','completedLessons','reviews','exposures'])assert.deepEqual(s[key],before[key]);
 assert.throws(()=>saveCourseProgress(s,p.id,{notes:'Episode 3',resumeSeconds:20,watched:false}));
 assert.throws(()=>saveCourseProgress(s,v.id,{notes:'x'.repeat(10001),resumeSeconds:0,watched:false}));
 const bad=structuredClone(s);bad.courseProgress[v.id].watched='true';assert.throws(()=>importState(s,{schemaVersion:1,data:bad},cat));
 const invalid=structuredClone(s);invalid.courseProgress=null;assert.throws(()=>importState(s,{schemaVersion:1,data:invalid},cat));
});
test('topic filters avoid substring matches and every course has a discoverable topic',()=>{
 const testing=selectCourses(new URLSearchParams('topic=testing'));assert.ok(!testing.items.some(c=>c.id==='en-fcc-graph-theory'||c.id==='en-fcc-graph-interviews'));
 for(const c of courseCatalog)assert.ok(c.categories.length>0,c.id+' needs a topic');
 assert.ok(selectCourses(new URLSearchParams('topic=tooling')).items.some(c=>c.id==='id-pzn-docker'));
});
test('course progress rejects unknown and prototype-like resource keys',()=>{
 for(const id of ['missing','__proto__','constructor'])assert.throws(()=>saveCourseProgress(emptyState(),id,{notes:'',resumeSeconds:0,watched:false}));
});
