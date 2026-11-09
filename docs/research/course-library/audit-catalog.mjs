// Research artifact audit only. It does not modify the app or perform network requests.
import {readFile,writeFile} from 'node:fs/promises';
const files=['english-foundations.json','english-design.json','indonesian.json'];
const required=['id','title','publisher','language','format','topics','level','prerequisites','courseUrl','youtubeUrl','sourceUrl','whyUseful','practice','verification','checkedAt','notes'];
const records=[],errors=[],ids=new Set(),keys=new Map();
function https(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/example\.(com|org)|SEARCH_QUERY|EXACT_DISCOVERED_ID/.test(value);}catch{return false;}}
function youtubeKey(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||!['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))return null;
  if(u.pathname==='/playlist'&&/^[a-zA-Z0-9_-]{10,}$/.test(u.searchParams.get('list')||''))return 'playlist:'+u.searchParams.get('list');
  const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):null;
  return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?'video:'+id:null;
 }catch{return null;}
}
for(const file of files){
 const data=JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));if(!Array.isArray(data))throw new Error(`${file}: expected array`);
 for(const r of data){
  const label=`${file}:${r.id||'missing-id'}`;
  for(const field of required)if(r[field]===undefined||r[field]===null)errors.push(`${label}: missing ${field}`);
  if(!/^(en|id)-[a-z0-9-]+$/.test(r.id||''))errors.push(`${label}: invalid ID`);
  if(ids.has(r.id))errors.push(`${label}: duplicate ID`);ids.add(r.id);
  if(!['English','Indonesian'].includes(r.language)||!['course','series'].includes(r.format)||!['Beginner','Intermediate','Advanced'].includes(r.level)||!['primary-page-opened','search-only'].includes(r.verification))errors.push(`${label}: invalid enum`);
  for(const field of ['title','publisher','whyUseful','practice','notes'])if(typeof r[field]!=='string'||!r[field].trim())errors.push(`${label}: invalid ${field}`);
  if(!Array.isArray(r.topics)||!r.topics.length||r.topics.some(x=>typeof x!=='string')||!Array.isArray(r.prerequisites)||r.prerequisites.some(x=>typeof x!=='string'))errors.push(`${label}: invalid tags/prerequisites`);
  if(r.checkedAt!=='2026-11-09')errors.push(`${label}: unexpected research date`);
  for(const field of ['courseUrl','sourceUrl','youtubeUrl'])if(!https(r[field]))errors.push(`${label}: invalid ${field}`);
  const key=youtubeKey(r.youtubeUrl);if(!key)errors.push(`${label}: expected a specific YouTube course video or playlist`);
  else{if(keys.has(key))errors.push(`${label}: duplicate YouTube resource with ${keys.get(key)}`);keys.set(key,r.id);}
  records.push({...r,batch:file.replace('.json','')});
 }
}
const countBy=field=>Object.fromEntries([...new Set(records.map(r=>r[field]))].sort().map(k=>[k,records.filter(r=>r[field]===k).length]));
const report={checkedAt:'2026-11-09',total:records.length,byLanguage:countBy('language'),byFormat:countBy('format'),byVerification:countBy('verification'),byBatch:countBy('batch'),uniqueYouTubeResources:keys.size,errors,limits:'Structural and exact-URL deduplication audit. Does not prove subject uniqueness, source truth, playback, language audio, completeness or quality; curator review is required.'};
await writeFile(new URL('audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(errors.length){console.error(JSON.stringify(report,null,2));process.exitCode=1;}
else{await writeFile(new URL('catalog.json',import.meta.url),JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
