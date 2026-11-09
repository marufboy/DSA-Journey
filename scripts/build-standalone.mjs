import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
const root=new URL('../',import.meta.url),dist=new URL('../dist/',import.meta.url);
const names=['course-data.js','courses.js','videos.js','core.js','ui.js','storage.js','runner.js','dashboard.js','views-lab.js','views-extra.js','views-course.js','views-video.js','views.js','app.js'];
const factories=[];
for(const name of names){let source=await readFile(new URL(name,dist),'utf8');const exports=[...source.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/g)].map(m=>m[1]);
 source=source.replace(/^import\s+\{([^}]+)\}\s+from\s+['"](.+)['"];?\s*$/gm,(_,imports,path)=>`const {${imports}}=__require(${JSON.stringify(basename(path))});`);
 source=source.replace(/export\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'').replaceAll('import.meta.url','document.baseURI');
 if(/^import\s/m.test(source)||/^export\s/m.test(source))throw new Error(`Unsupported module syntax: ${name}`);
 factories.push(`${JSON.stringify(name)}:(__exports,__require)=>{\n${source}\nObject.assign(__exports,{${exports.join(',')}});\n}`);
}
const data=await Promise.all([1,2,3,4].map(n=>readFile(new URL(`content/part-0${n}.json`,dist),'utf8').then(JSON.parse)));
const css=await readFile(new URL('styles.css',dist),'utf8'),rawWorker=await readFile(new URL('python-worker.js',dist),'utf8'),host=await readFile(new URL('runner-host.js',dist),'utf8');
const contract=(await readFile(new URL('runtime-contract.js',dist),'utf8')).replace('export function','function');
const worker=rawWorker.replace("import {stdinLines} from './runtime-contract.js';",contract);
const frame=`<!doctype html><html><head><meta charset="utf-8"><title>Isolated Python</title></head><body><script>${host.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
const literal=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const bundle=`globalThis.__DSA_CONTENT__=${literal(data)};\nglobalThis.__DSA_WORKER_SOURCE__=${literal(worker)};\nglobalThis.__DSA_FRAME_HTML=${literal(frame)};\nconst __factories={${factories.join(',\n')}};const __cache={};function __require(name){if(__cache[name])return __cache[name];const exports={};__cache[name]=exports;__factories[name](exports,__require);return exports;}__require('app.js');`;
// Parse the bundle before delivery without executing browser code.
new Function(bundle);
const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#215c47"><title>DSA Journey — Learn. Trace. Build.</title><style>${css}</style></head><body><a class="skip-link" href="#main">Lewati ke konten</a><div id="app"><main class="boot"><div class="brand-mark">d.</div><h1>Menyiapkan perjalananmu.</h1><p>Memuat kurikulum dan progres lokal…</p></main></div><div id="toast" role="status" aria-live="polite"></div><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
const out=new URL('../artifacts/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('DSA-Journey.html',out),html);await writeFile(new URL('standalone-bundle.js',out),bundle);
console.log(JSON.stringify({artifact:new URL('DSA-Journey.html',out).pathname,bytes:Buffer.byteLength(html),modules:data.flatMap(p=>p.modules).length,lessons:data.flatMap(p=>p.lessons).length,exercises:data.flatMap(p=>p.exercises).length,syntax:'PASS',browserVerification:'NOT VERIFIED'}));
