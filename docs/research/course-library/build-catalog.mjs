import {readFile,writeFile} from 'node:fs/promises';
const courses=JSON.parse(await readFile(new URL('catalog.json',import.meta.url),'utf8'));
const excluded=JSON.parse(await readFile(new URL('excluded-alternatives.json',import.meta.url),'utf8'));
const clean=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const link=(label,url)=>`[${clean(label)}](<${url}>)`;
const groups=[['English foundations / DSA','english-foundations'],['English design / architecture / testing','english-design'],['Indonesian courses and series','indonesian']];
const verified=courses.filter(c=>c.verification==='primary-page-opened'),pending=courses.filter(c=>c.verification==='search-only');
let md=`# Course library research catalog\n\n2026-11-09 · ${courses.length} distinct course/series options: ${verified.length} with primary course/publisher pages inspected, ${pending.length} provisional search-only candidates. This is a research catalog, not an app update. Playback and full-course educational quality have not been tested.\n\nOne course/series is counted once; individual episodes and known mirrors are not additional courses. Levels and prerequisites are curator recommendations. Overlap is intentional when different courses are alternatives, not mandatory consecutive stages.\n\nSee [starting route and evidence limits](README.md), [principles/patterns/architecture guide](PRINCIPLES-AND-ARCHITECTURE.md), [machine-readable catalog](catalog.json), and [structural audit](audit.json).\n\n## Source-supported course inventory\n\n“Source-supported” means an official course/publisher page was opened. Some creator repositories confirm the course subject but do not directly link its YouTube URL; the per-entry notes disclose this. It does not mean all links play or every episode is free/complete.\n\n`;
for(const [name,batch] of groups){
 const rows=verified.filter(c=>c.batch===batch);md+=`### ${name} (${rows.length})\n\n| Course / series | Publisher | Level | Main topics | Links |\n| --- | --- | --- | --- | --- |\n`;
 for(const c of rows)md+=`| [${clean(c.title)}](#${c.id}) · ${c.format} | ${clean(c.publisher)} | ${c.level} | ${clean(c.topics.join(', '))} | ${link('YouTube',c.youtubeUrl)} · ${link('Source',c.sourceUrl)} |\n`;
 md+='\n';
}
md+='## Provisional candidates — keep separate from the source-supported count\n\nThese may be useful, but automated primary-page access did not expose enough content. Do not describe them as verified courses or mark their links broken on that basis.\n\n| Candidate | Language | Topics | Evidence |\n| --- | --- | --- | --- |\n';
for(const c of pending)md+=`| ${link(c.title,c.youtubeUrl)} | ${c.language} | ${clean(c.topics.join(', '))} | search-only; see [details](#${c.id}) |\n`;
md+='\n## Selection notes and practice tasks\n\nPractice tasks below are original curator suggestions. They are not copied publisher assignments and do not certify mastery.\n\n';
for(const c of courses){
 md+=`<a id="${c.id}"></a>\n\n### ${c.title}\n\n${c.publisher} · ${c.language} · ${c.format} · ${c.level} · ${c.verification}\n\n- **Prerequisites:** ${c.prerequisites.length?c.prerequisites.join('; '):'No specific prior knowledge recommended.'}\n- **Why consider it:** ${c.whyUseful}\n- **Try after watching:** ${c.practice}\n- **Limits/evidence:** ${c.notes}\n- **Links:** ${link('Course',c.courseUrl)} · ${link('YouTube',c.youtubeUrl)} · ${link('Inspected source',c.sourceUrl)}\n\n`;
}
md+='## Alternatives excluded from the count\n\n';
for(const c of excluded)md+=`- ${link(c.title,c.youtubeUrl)}: ${c.exclusionReason}\n`;
await writeFile(new URL('CATALOG.md',import.meta.url),md);
console.log(JSON.stringify({catalogEntries:courses.length,sourceSupported:verified.length,provisional:pending.length,excludedAlternatives:excluded.length,output:'CATALOG.md'}));
