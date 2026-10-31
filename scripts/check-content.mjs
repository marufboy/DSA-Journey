import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const parts=await Promise.all([1,2,3,4].map(n=>readFile(new URL(`../dist/content/part-0${n}.json`,import.meta.url),'utf8').then(JSON.parse)));
const catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};
const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
const indexes={};for(const key of Object.keys(catalog)){const rows=catalog[key];indexes[key]=new Map(rows.map(x=>[x.id,x]));check(rows.length===indexes[key].size,`${key}: duplicate IDs`);}
check(catalog.modules.length===28,'28 modules required');check(catalog.lessons.length===112,'112 authored lessons required');check(catalog.exercises.length===180,'180 exercises required');
for(let i=1;i<=28;i++){
 const id=`m${String(i).padStart(2,'0')}`,m=indexes.modules.get(id);check(Boolean(m),`Missing ${id}`);if(!m)continue;
 check(m.lessonIds.length===4,`${id}: four lessons required`);check(m.exerciseIds.length===(i<=4?8:i<=24?6:7),`${id}: exercise count`);
 for(const x of m.prerequisites)check(indexes.modules.has(x)&&x!==id,`${id}: prerequisite ${x}`);
 for(const x of m.lessonIds)check(indexes.lessons.get(x)?.moduleId===id,`${id}: lesson backlink ${x}`);
 for(const x of m.exerciseIds)check(indexes.exercises.get(x)?.moduleId===id,`${id}: exercise backlink ${x}`);
}
const visit=(id,stack=[])=>{if(stack.includes(id)){errors.push(`Prerequisite cycle ${[...stack,id].join(' -> ')}`);return;}for(const p of indexes.modules.get(id)?.prerequisites||[])if(indexes.modules.has(p))visit(p,[...stack,id]);};catalog.modules.forEach(m=>visit(m.id));
for(const l of catalog.lessons){
 check(l.version===1&&typeof l.title==='string',`${l.id}: metadata`);check(Array.isArray(l.objectives)&&l.objectives.length>=2,`${l.id}: objectives`);
 check(l.blocks?.length>=3,`${l.id}: substantive blocks`);check(l.blocks?.filter(b=>b.body).reduce((n,b)=>n+b.body.length,0)>=500,`${l.id}: insufficient explanation`);
 check(l.checkpoint?.options?.length>=3&&Number.isInteger(l.checkpoint.correctIndex)&&l.checkpoint.correctIndex>=0&&l.checkpoint.correctIndex<l.checkpoint.options.length,`${l.id}: checkpoint`);
 check(l.checkpoint?.explanation?.length>20,`${l.id}: explain checkpoint`);check(l.summary?.length>=2,`${l.id}: summary`);check(l.sources?.length>0,`${l.id}: sources`);
 for(const id of l.exerciseIds)check(indexes.exercises.get(id)?.lessonId===l.id,`${l.id}: exercise association ${id}`);
}
let cases=0,coding=0;const concepts=new Map();
for(const e of catalog.exercises){
 check(indexes.lessons.has(e.lessonId)&&indexes.modules.has(e.moduleId),`${e.id}: references`);
 check(['coding','trace','explanation','project','career'].includes(e.kind),`${e.id}: kind`);check(['guided','practice','transfer'].includes(e.variant),`${e.id}: variant`);
 check(e.statement?.length>=50,`${e.id}: statement`);check(e.hints?.length>=3&&e.hints.every(h=>typeof h==='string'&&h.length>10),`${e.id}: hints`);
 check(e.explanation?.length>60&&e.sources?.length>0,`${e.id}: explanation/sources`);
 check(e.concepts?.length>0&&typeof e.family==='string',`${e.id}: concept/family`);
 if(e.kind==='coding'){coding++;check(e.tests?.length>=3,`${e.id}: three cases`);check(typeof e.solutions?.python==='string'&&e.solutions.python.length>10,`${e.id}: Python reference`);check(e.starter?.python?.length>0,`${e.id}: starter`);cases+=e.tests.length;for(const t of e.tests)check(typeof t.input==='string'&&typeof t.expected==='string',`${e.id}: test text contract`);}
 if(e.kind==='trace')check(e.answer?.options?.length>=3&&Number.isInteger(e.answer.correctIndex)&&e.answer.correctIndex>=0&&e.answer.correctIndex<e.answer.options.length,`${e.id}: trace answer`);
 if(['explanation','project','career'].includes(e.kind))check(e.rubric?.length>=2,`${e.id}: rubric`);
 for(const c of e.concepts){const list=concepts.get(c)||[];list.push(e);concepts.set(c,list);}
}
const coverage=[...concepts].map(([concept,items])=>({concept,activityCount:items.length,automatedCount:items.filter(e=>['coding','trace'].includes(e.kind)).length,transferCount:items.filter(e=>['coding','trace'].includes(e.kind)&&e.variant==='transfer').length}));
const result={modules:catalog.modules.length,lessons:catalog.lessons.length,exercises:catalog.exercises.length,codingExercises:coding,declaredPythonCases:cases,concepts:coverage.length,introductoryConcepts:coverage.filter(c=>c.automatedCount<2||c.transferCount===0).length,errors};
await writeFile(new URL('../docs/content-validation.json',import.meta.url),JSON.stringify({...result,coverage},null,2));
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
