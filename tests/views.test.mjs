import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shell} from '../dist/views.js';
import {emptyState,buildTrace,INTERLEAVED} from '../dist/core.js';
const parts=await Promise.all([1,2,3,4].map(n=>readFile(new URL(`../dist/content/part-0${n}.json`,import.meta.url),'utf8').then(JSON.parse)));
const catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};
const ui={dueCount:0,labTab:'problem',mobileTab:'problem',language:'python',trace:buildTrace('loop'),visualType:'loop',visualStep:0};
const render=(page,id,state=emptyState())=>shell({page,id,query:new URLSearchParams(page==='videos'?'view=videos':'')},{state,catalog,ui});

test('course library is the default with language topic evidence filters and bounded pages',()=>{
 const html=shell({page:'videos',query:new URLSearchParams()},{state:emptyState(),catalog,ui});assert.match(html,/61 course/);assert.match(html,/name="language"/);assert.match(html,/name="topic"/);assert.match(html,/name="evidence"/);assert.equal((html.match(/class="panel course-card"/g)||[]).length,12);assert.match(html,/Halaman course/);
 const id=shell({page:'videos',query:new URLSearchParams('language=Indonesian&topic=architecture')},{state:emptyState(),catalog,ui});assert.match(id,/PZN|Programmer Zaman Now|Microservices/);assert.doesNotMatch(id,/CS50's Introduction/);
 const pending=shell({page:'videos',query:new URLSearchParams('evidence=search-only')},{state:emptyState(),catalog,ui});assert.match(pending,/Provisional/);assert.equal((pending.match(/class="panel course-card"/g)||[]).length,6);
});
test('course details distinguish series from full video and keep saved notes escaped',()=>{
 const state=emptyState();state.courseProgress['en-cs50p']={notes:'</textarea><script>bad()</script>',resumeSeconds:0,watched:false,updatedAt:0};
 const html=render('courses','en-cs50p',state);assert.match(html,/data-action="load-course"/);assert.match(html,/data-form="course-progress"/);assert.match(html,/episode/i);assert.match(html,/self-report/);assert.doesNotMatch(html,/<iframe/);assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;\/textarea&gt;/);
 const video=render('courses','en-fcc-cpp20');assert.match(video,/max="172800"/);assert.match(render('courses','missing'),/Course tidak ditemukan/);
});
test('course return link preserves language topic and result page',()=>{
 const query=new URLSearchParams({return:'language=Indonesian&topic=oop&page=2'}),html=shell({page:'courses',id:'id-kt-python-oop',query},{state:emptyState(),catalog,ui});
 assert.match(html,/href="#videos\?language=Indonesian&amp;topic=oop&amp;page=2"/);
});

test('guided lessons link to checkpoint practice review and optional video resources',()=>{
 const html=render('learn','m01-l1');assert.match(html,/aria-label="Langkah belajar"/);assert.match(html,/href="#lesson-checkpoint"/);assert.match(html,/id="lesson-checkpoint"/);assert.match(html,/href="#practice\/m01-e1"/);assert.match(html,/href="#videos\/cs50p-functions"/);
 const emptyLesson=render('learn','m28-l4');assert.match(emptyLesson,/Belum ada video terkait/);assert.match(emptyLesson,/#videos\?lesson=m28-l4/);
});
test('video catalog filters curated personal and lesson resources with honest empty states',()=>{
 assert.match(render('videos'),/Video library/);assert.match(render('videos'),/data-form="add-video"/);
 const html=shell({page:'videos',query:new URLSearchParams('source=personal&search=no-such-video')},{state:emptyState(),catalog,ui});assert.match(html,/Belum ada video cocok/);assert.doesNotMatch(html,/class="video-card"/);
 const filtered=shell({page:'videos',query:new URLSearchParams('lesson=m02-l2')},{state:emptyState(),catalog,ui});assert.match(filtered,/href="#videos\/cs50p-conditionals"/);assert.doesNotMatch(filtered,/href="#videos\/mit-data-structures"/);
});
test('watch page is click-to-load and escapes video and note metadata',()=>{
 const state=emptyState();state.videos=[{id:'user-1',videoId:'JP7ITIXGpHk',title:'<img src=x>',publisher:'<script>x</script>',lessonId:'m01-l1',addedAt:0}];state.videoProgress['user-1']={notes:'</textarea><script>x</script>',resumeSeconds:20,watched:true,updatedAt:0};
 const html=render('videos','user-1',state);assert.match(html,/data-action="load-video"/);assert.match(html,/data-form="video-progress"/);assert.match(html,/self-report/);assert.match(html,/href="#practice\/m01-e1"/);assert.doesNotMatch(html,/<iframe/);assert.doesNotMatch(html,/<img src=x>/);assert.doesNotMatch(html,/<script>x/);assert.match(html,/&lt;\/textarea&gt;/);
 assert.match(render('videos','missing'),/Video tidak ditemukan/);
});
test('all workspace routes render actual content rather than throwing',()=>{for(const page of ['today','roadmap','practice','review','notes','progress','visualizers','interview','career','settings']){const html=render(page);assert.match(html,/<main id="main"/);assert.match(html,/<h1/);assert.ok(!html.includes('undefined'));}});
test('each authored lesson renders objectives checkpoint source and exercises',()=>{for(const lesson of catalog.lessons){const html=render('learn',lesson.id);assert.ok(html.includes(lesson.title.replaceAll('&','&amp;')));assert.match(html,/data-form="checkpoint"/);assert.match(html,/Content v1/);assert.match(html,/Sumber pendalaman/);}});
test('every exercise kind has an actionable coding or structured-answer interface',()=>{for(const e of catalog.exercises){const html=render('practice',e.id);assert.match(html,e.kind==='coding'?/id="code-editor"/:/data-form="activity"/);assert.match(html,/data-action="explain"/);}});
test('solution source is not rendered before exposure action',()=>{const e=catalog.exercises.find(x=>x.kind==='coding');const html=render('practice',e.id);assert.ok(!html.includes('Exposure solusi tersimpan'));assert.ok(!html.includes('Time:'));});
test('imported note and profile text cannot become active HTML',()=>{const state=emptyState();state.settings.name='<img src=x onerror=alert(1)>';state.notes=[{id:'n',title:'<script>bad()</script>',body:'<img src=x onerror=bad()>',category:'Logic',at:Date.now()}];const html=render('notes',undefined,state);assert.ok(!html.includes('<script>bad()'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;script&gt;'));});

test('interleaved route reaches every required prerequisite before its consumer',()=>{
 for(const m of catalog.modules)for(const p of m.prerequisitesByRoute?.interleaved||m.prerequisites)assert.ok(INTERLEAVED.indexOf(p)<INTERLEAVED.indexOf(m.id),`${m.id} requires ${p} too early`);
});

test('practice filters difficulty and activity status using real learner evidence',()=>{
 const state=emptyState(),first=catalog.exercises.find(e=>e.kind==='coding');state.attempts=[{exerciseId:first.id,passed:true,at:Date.now(),stale:false}];
 const filtered=shell({page:'practice',query:new URLSearchParams('kind=coding&status=not-started')},{state,catalog,ui});
 assert.ok(!filtered.includes(`href="#practice/${first.id}"`));
 const hard=shell({page:'practice',query:new URLSearchParams('difficulty=Hard&kind=coding')},{state,catalog,ui});
 for(const e of catalog.exercises.filter(e=>e.kind==='coding'&&e.difficulty!=='Hard'))assert.ok(!hard.includes(`href="#practice/${e.id}"`));
});
test('lesson next action follows the selected interleaved route',()=>{
 const html=render('learn','m05-l4');assert.match(html,/href="#learn\/m09-l1"/);
});
test('foundation milestone surfaces an early role-fit checkpoint',()=>{
 const state=emptyState();for(const id of catalog.modules.find(m=>m.id==='m04').lessonIds)state.completedLessons[id]={version:1,at:1};
 assert.ok(render('today',undefined,state).includes('Fondasi selesai'));
});
