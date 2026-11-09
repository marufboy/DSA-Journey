import {researchedCourses} from './course-data.js';
export const courseTopics={foundations:'Programming & CS',dsa:'DSA & mathematics',oop:'Object-oriented programming',principles:'SOLID & design principles',patterns:'Design patterns',architecture:'Software architecture',distributed:'System design & distributed systems',testing:'Testing & refactoring',databases:'Databases',backend:'Web & backend',data:'Data science & AI',security:'Security',tooling:'Tools & deployment'};
function categories(c){
 const s=(c.title+' '+c.topics.join(' ')).toLowerCase(),tags=[];
 for(const [key,pattern] of Object.entries({foundations:/programming|computer science|networking|python|c\+\+|java|kotlin/,dsa:/algorithm|data structure|graph theory|dynamic programming|discrete|mathematics|computational thinking/,oop:/\boop\b|object.oriented|inheritance|polymorphism|encapsulation/,principles:/\bsolid\b|dependency inversion|coupling|cohesion|\bdry\b|\byagni\b|\bkiss\b/,patterns:/design pattern|repository pattern|\bmvc\b|strategy pattern|observer pattern/,architecture:/architecture|\bddd\b|domain.driven|microservice|ports.and.adapters/,distributed:/system design|distributed|microservice|event.driven|kafka|consensus|replication|fault tolerance/,testing:/\btests?\b|\btesting\b|\btdd\b|\bpytest\b|\bjest\b|refactor|code smell|clean code/,databases:/sql|database/,backend:/web|backend|http|restful|api|nodejs/,data:/machine learning|data science|artificial intelligence|matplotlib|scikit|visualisasi data/,security:/security|authentication|authorization/,tooling:/\bdocker\b|\bkubernetes\b|\baws\b|\bgit\b|deployment/}))if(pattern.test(s))tags.push(key);
 return tags;
}
function courseMedia(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))throw new Error('URL course YouTube tidak valid.');
 const list=u.searchParams.get('list');if(u.hostname!=='youtu.be'&&u.pathname==='/playlist'&&/^PL[a-zA-Z0-9_-]{8,}$/.test(list||''))return {kind:'playlist',id:list};
 const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):null;
 if(/^[a-zA-Z0-9_-]{11}$/.test(id||''))return {kind:'video',id};throw new Error('Course harus berupa video atau playlist YouTube tertentu.');
}
export const courseCatalog=researchedCourses.map(c=>({...c,categories:categories(c),media:courseMedia(c.youtubeUrl)}));
export function selectCourses(query){
 const search=(query.get('search')||'').trim().toLowerCase(),language=query.get('language'),topic=query.get('topic'),level=query.get('level'),evidence=query.get('evidence');
 const filtered=courseCatalog.filter(c=>(!language||c.language===language)&&(!topic||c.categories.includes(topic))&&(!level||c.level===level)&&(!evidence||c.verification===evidence)&&(!search||[c.title,c.publisher,...c.topics].join(' ').toLowerCase().includes(search)));
 const pageCount=Math.max(1,Math.ceil(filtered.length/12)),requested=Number(query.get('page')||1),page=Math.min(pageCount,Math.max(1,Number.isFinite(requested)?Math.floor(requested):1));
 return {items:filtered.slice((page-1)*12,page*12),total:filtered.length,page,pageCount};
}
export function courseEmbedUrl(course,seconds=0){
 const media=courseMedia(course.youtubeUrl);if(!Number.isInteger(seconds)||seconds<0||seconds>172800)throw new Error('Bookmark course harus 0–172800 detik.');
 return media.kind==='playlist'?`https://www.youtube-nocookie.com/embed/videoseries?list=${media.id}&listType=playlist&playsinline=1`:`https://www.youtube-nocookie.com/embed/${media.id}?start=${seconds}&playsinline=1`;
}
export function validateCourseProgress(progress){
 if(progress===undefined)return;
 if(!progress||typeof progress!=='object'||Array.isArray(progress)||Object.keys(progress).length>500)throw new Error('Progres course tidak valid.');
 for(const [id,p] of Object.entries(progress)){
  const c=courseCatalog.find(c=>c.id===id);
  if(!c||!p||typeof p!=='object'||Array.isArray(p)||typeof p.notes!=='string'||p.notes.length>10000||!Number.isInteger(p.resumeSeconds)||p.resumeSeconds<0||p.resumeSeconds>172800||(c.media.kind==='playlist'&&p.resumeSeconds!==0)||typeof p.watched!=='boolean'||!Number.isFinite(p.updatedAt)||p.updatedAt<0||p.updatedAt>8640000000000000)throw new Error('Catatan/bookmark course tidak valid.');
 }
}
export function saveCourseProgress(state,id,input,now=Date.now()){
 if(!courseCatalog.some(c=>c.id===id))throw new Error('Course tidak ditemukan.');
 const s=structuredClone(state);s.courseProgress||={};s.courseProgress[id]={notes:input.notes,resumeSeconds:input.resumeSeconds,watched:input.watched,updatedAt:now};validateCourseProgress(s.courseProgress);return s;
}
