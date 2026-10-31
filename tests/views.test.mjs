import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shell} from '../dist/views.js';
import {emptyState,buildTrace,INTERLEAVED} from '../dist/core.js';
const parts=await Promise.all([1,2,3,4].map(n=>readFile(new URL(`../dist/content/part-0${n}.json`,import.meta.url),'utf8').then(JSON.parse)));
const catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};
const ui={dueCount:0,labTab:'problem',mobileTab:'problem',language:'python',trace:buildTrace('loop'),visualType:'loop',visualStep:0};
const render=(page,id,state=emptyState())=>shell({page,id,query:new URLSearchParams()},{state,catalog,ui});
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
