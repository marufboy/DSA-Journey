# Final review package: new DSA Journey source
No prior implementation/base commit exists. Every file below is newly created; content JSON is reviewed separately.


## cpp-broker.mjs
```javascript
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const ACTIVE = new Set(['submitting', 'queued', 'running', 'unknown']);
const STATES = new Set(['queued', 'running', 'completed', 'failed', 'unknown']);
export function brokerError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.requestId) ||
      typeof body.source !== 'string' || typeof body.stdin !== 'string' || body.language !== 'cpp') {
    throw brokerError(400, 'Expected requestId, source, stdin and language cpp.');
  }
  if (Buffer.byteLength(body.source) > 65536 || Buffer.byteLength(body.stdin) > 262144) {
    throw brokerError(413, 'Source or input exceeds the execution limit.');
  }
  return createHash('sha256').update(JSON.stringify([body.language, body.source, body.stdin])).digest('hex');
}

// Output is capped across all three channels, including multibyte UTF-8 characters.
function boundedOutput(result) {
  let remaining = 65536;
  const output = { truncated: false };
  for (const field of ['stdout', 'stderr', 'compileOutput']) {
    const bytes = Buffer.from(typeof result[field] === 'string' ? result[field] : '');
    const length = Math.min(bytes.length, remaining);
    let end = length;
    // Drop a partial final code point instead of emitting replacement characters.
    if (length < bytes.length) while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
    output[field] = bytes.subarray(0, end).toString('utf8');
    remaining -= end;
    if (length < bytes.length) output.truncated = true;
  }
  for (const field of ['time', 'memory']) {
    const value = Number(result[field]);
    if (result[field] != null && Number.isFinite(value) && value >= 0) output[field] = value;
  }
  return output;
}

export function createBroker({ dbPath, provider = null, now = () => new Date().toISOString() }) {
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS jobs (
      request_id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, token TEXT,
      status TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );`);
  const lookup = db.prepare('SELECT * FROM jobs WHERE request_id = ?');
  // Terminal results are immutable across connections. A delayed poll (including an
  // error/unknown response) must not revive a reservation after another poll finishes.
  const update = db.prepare(`UPDATE jobs SET token = ?, status = ?, result = ?, updated_at = ?
    WHERE request_id = ? AND status IN ('submitting','queued','running','unknown')`);
  // A crash after reservation may have occurred before or after provider acceptance.
  db.prepare("UPDATE jobs SET status='unknown', updated_at=? WHERE status='submitting'").run(String(now()));
  const polling = new Map();
  function view(row) {
    return { requestId: row.request_id, status: row.status, ...JSON.parse(row.result), createdAt: row.created_at, updatedAt: row.updated_at };
  }
  function save(id, status, token, result = {}) {
    update.run(token, status, JSON.stringify(result), String(now()), id);
    return view(lookup.get(id));
  }
  return {
    async submit(body) {
      const hash = validate(body);
      let existing;
      // Reservation and active count are atomic even across a second SQLite connection.
      db.exec('BEGIN IMMEDIATE');
      try {
        existing = lookup.get(body.requestId);
        if (existing) {
          if (existing.payload_hash !== hash) throw brokerError(409, 'requestId already belongs to a different submission.');
        } else {
          const active = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('submitting','queued','running','unknown')").get().n;
          if (active) throw brokerError(429, 'One submission is active or awaiting infrastructure reconciliation.');
          const date = String(now());
          db.prepare('INSERT INTO jobs VALUES (?, ?, NULL, ?, ?, ?, ?)').run(body.requestId, hash, provider ? 'submitting' : 'unavailable', '{}', date, date);
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      if (existing) return view(existing);
      if (!provider) return view(lookup.get(body.requestId));
      try {
        const accepted = await provider.submit({ source: body.source, stdin: body.stdin });
        if (typeof accepted?.token !== 'string' || !accepted.token || accepted.token.length > 512) throw new Error('Missing provider token');
        return save(body.requestId, 'queued', accepted.token);
      } catch {
        return save(body.requestId, 'unknown', null, { reason: 'Provider acceptance could not be confirmed. Do not resubmit.' });
      }
    },
    async get(requestId) {
      const row = lookup.get(requestId);
      if (!row) return null;
      if (!provider || !row.token || !ACTIVE.has(row.status)) return view(row);
      if (polling.has(requestId)) return polling.get(requestId);
      const pending = (async () => {
        try {
          const result = await provider.poll(row.token);
          const status = STATES.has(result?.status) ? result.status : 'unknown';
          return save(requestId, status, row.token, boundedOutput(result ?? {}));
        } catch {
          return save(requestId, 'unknown', row.token, { reason: 'Provider status is temporarily unknown. Check this requestId again.' });
        } finally { polling.delete(requestId); }
      })();
      polling.set(requestId, pending);
      return pending;
    },
    close() { db.close(); }
  };
}

```


## dist\app.js
```javascript
import {emptyState,uid,DAY,recordExposure,recordAttempt,importState,checkOutput,buildTrace} from './core.js';
import {openStore} from './storage.js';
import {runPython,runCpp} from './runner.js';
import {shell} from './views.js';
import {resultView} from './views-lab.js';
import {traceStage} from './views-extra.js';
import {esc,icon} from './ui.js';

let state=emptyState(),catalog={modules:[],lessons:[],exercises:[]},store,lastRevision=0,queue=Promise.resolve(),saveTimer,toastTimer,controller,runSequence=0,visualTimer,timerTicker;
const ui={saveStatus:'Memuat progres…',storageWarning:'',dueCount:0,language:'python',labTab:'problem',mobileTab:'problem',results:[],runStatus:'',busy:false,visualType:'loop',visualStep:0,trace:buildTrace('loop'),vizInput:{}};
const root=document.getElementById('app');
function route(){const [path,query='']=location.hash.slice(1).split('?'),[page='today',id]=path.split('/');return {page:page||'today',id:decodeURIComponent(id||''),query:new URLSearchParams(query)};}
const exercise=()=>catalog.exercises.find(e=>e.id===route().id);
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),5000);}
function applyPreferences(){document.body.dataset.theme=state.settings.theme;document.documentElement.style.setProperty('--body',`${state.settings.fontSize}px`);}
function saveStatus(text){ui.saveStatus=text;const el=document.getElementById('save-status');if(el)el.textContent=text;}
function persist(){
 saveStatus('Menyimpan…');queue=queue.then(async()=>{if(!store){saveStatus('Sesi sementara · export untuk backup');return;}const snapshot=structuredClone(state);snapshot.revision=lastRevision;const saved=await store.write(snapshot);lastRevision=saved.revision;state.revision=saved.revision;saveStatus('Tersimpan di perangkat ini');}).catch(e=>{ui.storageWarning=e.message||'Penyimpanan gagal. Export atau salin draft sebelum menutup.';saveStatus('Belum tersimpan');toast(ui.storageWarning);});return queue;
}
function update(change,{renderNow=false}={}){state=typeof change==='function'?change(state):change;persist();if(renderNow)render();}
function render({focus=false}={}){const scroll=window.scrollY;applyPreferences();ui.dueCount=Object.values(state.reviews).filter(r=>r.dueAt<=Date.now()).length;root.innerHTML=shell(route(),{state,catalog,ui});if(focus){window.scrollTo(0,0);document.querySelector('h1')?.focus({preventScroll:true});}else window.scrollTo(0,scroll);updateTimerDisplay();}
function captureDraft(){const editor=document.getElementById('code-editor'),e=catalog.exercises.find(x=>x.id===editor?.dataset.exerciseId);if(!e||!editor)return;state.drafts[e.id]||={};state.drafts[e.id][ui.language]=editor.value;const input=document.getElementById('custom-input');if(input)state.drafts[e.id].stdin=input.value;}
function renderResults(){const el=document.getElementById('run-results');if(el)el.innerHTML=resultView(ui);}
function stopVisual(){clearInterval(visualTimer);visualTimer=null;ui.visualPlaying=false;}
function showDialog(content,onSubmit){
 const trigger=document.activeElement,dialog=document.createElement('dialog');dialog.innerHTML=content;document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-dialog-cancel]'))dialog.close();});
 dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();else document.querySelector('h1')?.focus({preventScroll:true});});
 const form=dialog.querySelector('form');form?.addEventListener('submit',async event=>{event.preventDefault();const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;try{await onSubmit(new FormData(form));dialog.close();}catch(e){let error=dialog.querySelector('[role=alert]');if(!error){error=document.createElement('p');error.setAttribute('role','alert');form.append(error);}error.textContent=e.message;if(submit)submit.disabled=false;}});
 dialog.showModal();return dialog;
}
function confirmDialog(heading,body,label='Lanjutkan'){return new Promise(resolve=>{let answered=false;const dialog=showDialog(`<h2>${esc(heading)}</h2><p>${esc(body)}</p><form><div class="btn-row"><button class="btn" type="submit">${esc(label)}</button><button class="btn secondary" type="button" data-dialog-cancel>Batal</button></div></form>`,()=>{answered=true;resolve(true);});dialog.addEventListener('close',()=>{if(!answered)resolve(false);});});}
function onboarding(){if(state.settings.onboarded)return;showDialog(`<div class="eyebrow">Welcome to your workspace</div><h2 style="margin-top:12px">Mulai dari titikmu sekarang.</h2><p>Program ini bisa dimulai tanpa pengalaman coding. Pilih ritme yang realistis; semuanya dapat diubah nanti.</p><form><label class="field">Nama<input name="name" value="${esc(state.settings.name)}" required maxlength="80"></label><label class="field">Pengalaman<select name="experience"><option value="zero">Mulai dari nol</option><option value="some">Sudah pernah coding, ingin fondasi lebih kuat</option></select></label><label class="field">Waktu sesi<select name="minutes"><option value="15">15 menit</option><option value="45" selected>45 menit</option><option value="90">90 menit</option></select></label><button class="btn" type="submit">Mulai perjalanan</button></form>`,data=>{state.settings={...state.settings,name:String(data.get('name')).trim(),sessionMinutes:Number(data.get('minutes')),experience:String(data.get('experience')),onboarded:true};persist();render();});}

async function checkCpp({announce=false}={}){try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(4000)});const data=await response.json();state.settings.cppAvailable=response.ok&&data.configured===true;if(announce)toast(state.settings.cppAvailable?'C++ API dikonfigurasi. Compile nyata masih bergantung pada provider.':'C++ provider belum dikonfigurasi; tidak ada compiler palsu.');}catch{state.settings.cppAvailable=false;if(announce)toast('C++ API tidak tersedia. Materi tetap bisa dipelajari dan kode diekspor.');}if(announce){persist();render();}}

async function execute(mode){
 const e=exercise();if(!e||e.kind!=='coding'||ui.busy)return;captureDraft();clearTimeout(saveTimer);await persist();
 const source=state.drafts[e.id]?.[ui.language]||'';if(new TextEncoder().encode(source).length>65536){toast('Source melebihi 64 KiB.');return;}
 if(ui.language==='cpp'&&!state.settings.cppAvailable){toast('Konfigurasi sandbox C++ diperlukan. Lihat Settings untuk compile lokal dan integrasi.');return;}
 const tests=mode==='submit'?e.tests:[{input:state.drafts[e.id]?.stdin||''}];if(!tests?.length){toast('Latihan ini belum memiliki suite yang dapat dijalankan.');return;}
 ui.busy=true;ui.results=[];ui.resultMode=mode;ui.runStatus='Menyiapkan environment baru…';const token=++runSequence;controller=new AbortController();render();
 try{
  for(let i=0;i<tests.length;i++){
   const t=tests[i];const onStatus=message=>{if(token!==runSequence)return;ui.runStatus=`Case ${i+1}/${tests.length} · ${message}`;renderResults();};let result;
   if(ui.language==='python')result=await runPython(source,t.input,{signal:controller.signal,onStatus});
   else{
    const payload={requestId:uid(),source,stdin:t.input,language:'cpp'};
    state.pendingRun={...payload,exerciseId:e.id,exerciseVersion:e.version,createdAt:Date.now()};await persist();
    if(ui.storageWarning)throw new Error('Request ID belum tersimpan. Perbaiki storage sebelum mengirim C++ agar recovery aman.');
    result=await runCpp(payload,{onStatus,signal:controller.signal});if(!['unknown','submitting','queued','running'].includes(result.status)){delete state.pendingRun;await persist();}
   }
   if(token!==runSequence)return;
   const conclusive=['completed','failed','timeout'].includes(result.status);
   ui.results.push({...result,expected:mode==='submit'?t.expected:undefined,passed:mode==='submit'&&conclusive?result.status==='completed'&&checkOutput(result.stdout,t.expected,e):undefined});renderResults();
   if(!conclusive){ui.runStatus='Outcome infrastruktur belum pasti. Tidak dihitung sebagai jawaban salah; gunakan Recover untuk job C++.';break;}
  }
  if(token!==runSequence)return;
  const conclusive=mode==='submit'&&ui.results.length===tests.length&&ui.results.every(x=>typeof x.passed==='boolean');
  if(conclusive){const passed=ui.results.every(x=>x.passed);state=recordAttempt(state,e,{passed,language:ui.language,source,review:route().query.get('review')==='1',hintsUsed:state.assistance?.[e.id]||0});ui.runStatus=passed?'Semua kasus lolos. Lengkapi penjelasanmu; satu suite tidak otomatis membuktikan mastery.':'Ada kasus yang belum lolos. Periksa perbedaan output dan asumsi input.';
   if(!passed){const failed=ui.results.find(x=>!x.passed);state.notes.push({id:uid(),title:`Tinjau: ${e.title}`,category:'Logic',body:`Hasil pengujian belum cocok.\nExpected: ${failed.expected??''}\nActual: ${(failed.stdout||failed.stderr||'').slice(0,1800)}\nTulis diagnosis setelah memeriksa asumsi.`,exerciseId:e.id,at:Date.now()});}
   await persist();
  }else if(mode==='run'&&ui.results[0]?.status==='completed')ui.runStatus='Custom run selesai. Run bukan Submit dan tidak menambah mastery.';
 }catch(error){if(token!==runSequence)return;ui.runStatus=error.name==='AbortError'?error.message:`Tidak dapat menjalankan: ${error.message}`;toast(ui.runStatus);}
 finally{if(token===runSequence){ui.busy=false;controller=null;render();}}
}
async function recover(){const pending=state.pendingRun;if(!pending){toast('Tidak ada job tersimpan.');return;}ui.busy=true;ui.results=[];ui.resultMode='run';controller=new AbortController();render();try{const result=await runCpp(pending,{recover:true,signal:controller.signal,onStatus:m=>{ui.runStatus=m;renderResults();}});ui.results=[result];ui.runStatus='Logical job dipulihkan. Hasil satu case ini tidak otomatis menyelesaikan suite.';if(['completed','failed','unavailable'].includes(result.status))delete state.pendingRun;await persist();}catch(e){ui.runStatus=e.message;toast(e.message);}finally{ui.busy=false;controller=null;render();}}

function exportBackup(){const backup={schemaVersion:1,appVersion:'1.0.0',exportedAt:new Date().toISOString(),contentVersions:Object.fromEntries(catalog.exercises.map(e=>[e.id,e.version])),data:state};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dsa-journey-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('File backup dibuat. Periksa unduhan browser.');}
async function importFile(file){if(!file)return;if(file.size>20*1024*1024)throw new Error('Backup melebihi 20 MiB.');const backup=JSON.parse(await file.text());await queue;const candidate=importState(state,backup,catalog);const historical=candidate.attempts.filter(x=>x.stale).length;if(!await confirmDialog('Pulihkan backup?',`${candidate.attempts.length} attempts, ${candidate.notes.length} notes, ${historical} historical/stale records. Progress sekarang diganti. Exposure solusi yang sudah diketahui tetap dipertahankan. Export dahulu bila perlu.`,'Import & replace'))return;if(!store)throw new Error('Storage belum tersedia; import tidak dilakukan.');candidate.revision=lastRevision;const saved=await store.write(candidate);state=saved;lastRevision=saved.revision;ui.language=state.settings.primaryLanguage;render();toast('Backup dipulihkan secara atomik. Riwayat lama dipertahankan.');}
function noteDialog(item={},exerciseId){showDialog(`<h2>${item.id?'Edit insight':'Catat insight'}</h2><form><label class="field">Judul<input name="title" value="${esc(item.title||'')}" required maxlength="100"></label><label class="field">Catatan<textarea name="body" rows="6" required maxlength="12000">${esc(item.body||'')}</textarea></label><button class="btn" type="submit">Simpan</button> <button class="btn secondary" type="button" data-dialog-cancel>Batal</button></form>`,data=>{const entry={id:item.id||uid(),title:String(data.get('title')),body:String(data.get('body')),category:item.category||'Learning insight',exerciseId:item.exerciseId||exerciseId,at:item.at||Date.now(),updatedAt:Date.now()};if(item.id)state.notes=state.notes.map(x=>x.id===item.id?entry:x);else state.notes.push(entry);persist();render();});}
function explanationDialog(e){showDialog(`<div class="eyebrow">Explain your reasoning</div><h2 style="margin-top:10px">Mengapa solusi ini benar?</h2><p>Ini rubrik self-review. Kebenaran penjelasan tidak dinilai otomatis; gunakan contoh dan counterexample yang konkret.</p><form><label class="field">Penjelasan<textarea name="body" rows="6" minlength="30" required placeholder="Invariant / alasan benar; time dan space; edge cases…"></textarea></label><div class="rubric">${['Saya menjelaskan alasan kebenaran, bukan hanya langkah kode.','Saya menjelaskan time dan space complexity.','Saya membahas edge case dan asumsi input.'].map((x,i)=>`<label><input type="checkbox" name="c${i}" required><span>${x}</span></label>`).join('')}</div><button class="btn section-gap" type="submit">Simpan self-review</button></form>`,data=>{state.explanations||={};for(const concept of e.concepts)state.explanations[concept]={complete:true,evidenceMethod:'self_review',at:Date.now(),exerciseId:e.id,body:String(data.get('body'))};persist();toast('Rubrik penjelasan tersimpan sebagai self-review.');});}

function updateTimerDisplay(){const span=document.getElementById('interview-timer'),session=state.interview;if(!span||!session)return;const seconds=session.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):session.pausedSeconds??2700;span.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(session.deadline&&seconds===0){session.deadline=null;session.pausedSeconds=0;persist();toast('Waktu latihan selesai. Simpan refleksi dan tinjau cara berpikirmu.');}}
function visualRender(){const stage=document.getElementById('visual-stage');if(stage)stage.innerHTML=traceStage(ui.trace,ui.visualStep,ui.visualType);}

document.addEventListener('input',event=>{if(['code-editor','custom-input'].includes(event.target.id)){captureDraft();clearTimeout(saveTimer);saveTimer=setTimeout(persist,650);}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&document.getElementById('code-editor')){event.preventDefault();execute('run');}if(event.key==='Escape'){document.getElementById('sidebar')?.classList.remove('open');}});
document.addEventListener('change',async event=>{try{if(event.target.id==='code-language'){captureDraft();ui.language=event.target.value;state.settings.primaryLanguage=ui.language;await persist();render();}else if(event.target.id==='import-file')await importFile(event.target.files[0]);else if(event.target.dataset.careerStatus){const x=state.career.find(x=>x.id===event.target.dataset.careerStatus);if(x){x.status=event.target.value;persist();}}}catch(e){toast(e.message);} });
document.addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,id=button.dataset.id,value=button.dataset.value;try{
 if(action==='toggle-nav'){const open=document.getElementById('sidebar').classList.toggle('open');button.setAttribute('aria-expanded',open);}
 else if(action==='theme'){state.settings.theme=state.settings.theme==='dark'?'light':'dark';persist();applyPreferences();}
 else if(action==='session'){state.settings.sessionMinutes=Number(value);persist();render();}
 else if(action==='complete-lesson'){const l=catalog.lessons.find(x=>x.id===id);state.completedLessons[id]={version:l.version,at:Date.now()};state.reflections[id]=Boolean(document.getElementById('lesson-reflection')?.checked);state.settings.lastMissionType='lesson';persist();render();toast('Pelajaran tersimpan. Latihan dan review menyediakan bukti penguasaan.');}
 else if(action==='copy-code'){const code=button.closest('.code-block').querySelector('code').textContent;await navigator.clipboard.writeText(code);toast('Kode disalin.');}
 else if(action==='lab-tab'){captureDraft();if(value==='solution'){state=recordExposure(state,exercise());await persist();}ui.labTab=value;render();}
 else if(action==='mobile-tab'){captureDraft();ui.mobileTab=value;render();}
 else if(action==='hint'){state.assistance||={};state.assistance[id]=(state.assistance[id]||0)+1;persist();render();}
 else if(action==='new-attempt'){captureDraft();state.assistance||={};state.assistance[exercise().id]=0;ui.labTab='problem';ui.results=[];ui.runStatus='Percobaan baru. Riwayat exposure solusi tetap dipertahankan.';persist();render();}
 else if(action==='run'||action==='submit')await execute(action);
 else if(action==='stop'){controller?.abort();++runSequence;ui.busy=false;controller=null;ui.runStatus='Dihentikan. Draft tersimpan; job C++ server dapat tetap berjalan sampai batasnya.';render();}
 else if(action==='recover')await recover();
 else if(action==='reset-code'){if(await confirmDialog('Reset draft bahasa ini?','Draft dikembalikan ke starter. Kode bahasa lain tetap ada.','Reset code')){const e=exercise();state.drafts[e.id]||={};state.drafts[e.id][ui.language]=e.starter?.[ui.language]||'';persist();render();}}
 else if(action==='note-attempt')noteDialog({},id);
 else if(action==='explain')explanationDialog(exercise());
 else if(action==='edit-note')noteDialog(state.notes.find(x=>x.id===id));
 else if(action==='delete-note'){if(await confirmDialog('Hapus catatan?','Export backup lebih dahulu jika ingin menyimpan salinannya.','Hapus')){state.notes=state.notes.filter(x=>x.id!==id);persist();render();}}
 else if(action==='snooze'){state.reviews[id].dueAt=Date.now()+DAY;persist();render();toast('Review dijadwalkan besok; evidence tetap ada.');}
 else if(action==='export')exportBackup();
 else if(action==='check-cpp')await checkCpp({announce:true});
 else if(action==='clear-data'){if(await confirmDialog('Hapus seluruh progres lokal?','Pastikan backup sudah diekspor. Attempts, notes, dan exposure history di browser ini akan dihapus.','Hapus progres')){const blank=emptyState();blank.revision=lastRevision;if(!store)throw new Error('Storage tidak tersedia.');await queue;blank.revision=lastRevision;const saved=await store.write(blank);state=saved;lastRevision=saved.revision;ui.language='python';render();onboarding();}}
 else if(action==='viz-select'){stopVisual();ui.visualType=value;ui.vizInput={};ui.visualStep=0;ui.trace=buildTrace(value,value==='tree'?{values:[8,4,12,2,6,10,14]}:{});render();}
 else if(action==='viz-prev'||action==='viz-next'){stopVisual();ui.visualStep=Math.max(0,Math.min(ui.trace.length-1,ui.visualStep+(action==='viz-next'?1:-1)));visualRender();}
 else if(action==='viz-reset'){stopVisual();ui.visualStep=0;render();}
 else if(action==='viz-play'){if(ui.visualPlaying){stopVisual();render();}else{ui.visualPlaying=true;if(ui.visualStep>=ui.trace.length-1)ui.visualStep=0;const speed=Number(document.getElementById('viz-speed')?.value)||900;render();visualTimer=setInterval(()=>{if(ui.visualStep>=ui.trace.length-1){stopVisual();render();return;}ui.visualStep++;visualRender();},speed);}}
 else if(action==='timer-toggle'){state.interview||={pausedSeconds:2700};if(state.interview.deadline){state.interview.pausedSeconds=Math.max(0,Math.ceil((state.interview.deadline-Date.now())/1000));state.interview.deadline=null;}else state.interview.deadline=Date.now()+(state.interview.pausedSeconds??2700)*1000;persist();render();}
 else if(action==='timer-reset'){state.interview={...(state.interview||{}),pausedSeconds:2700,deadline:null};persist();render();}
 else if(action==='interview-pick'){const pool=catalog.exercises.filter(e=>e.kind==='coding'&&!state.exposures.some(x=>x.exerciseId===e.id));const e=pool[Math.floor(Math.random()*pool.length)];if(!e){toast('Semua soal coding telah terpapar. Review recall tetap berguna.');return;}state.interview={...(state.interview||{pausedSeconds:2700}),exerciseId:e.id};persist();render();}
 else if(action==='edit-career'){const x=state.career.find(x=>x.id===id);showDialog(`<h2>Edit ${esc(x.type)}</h2><form><label class="field">Judul<input name="title" value="${esc(x.title)}" required></label><label class="field">Bukti / next step<textarea name="body" rows="6" required>${esc(x.body)}</textarea></label><button class="btn" type="submit">Simpan</button></form>`,data=>{x.title=String(data.get('title'));x.body=String(data.get('body'));x.updatedAt=Date.now();persist();render();});}
 else if(action==='delete-career'){if(await confirmDialog('Hapus item workspace?','Item dihapus dari browser ini. Backup yang sudah diekspor tetap ada.','Hapus')){state.career=state.career.filter(x=>x.id!==id);persist();render();}}
 }catch(e){toast(e.message||'Tindakan belum berhasil.');}});

document.addEventListener('submit',async event=>{const form=event.target;if(form.closest('dialog'))return;event.preventDefault();const data=new FormData(form);try{
 if(form.dataset.search){const q=new URLSearchParams();for(const [key,value]of data)if(String(value))q.set(key,String(value));location.hash=`${form.dataset.search}?${q}`;return;}
 const type=form.dataset.form,id=form.dataset.id;
 if(type==='checkpoint'){const l=catalog.lessons.find(x=>x.id===id),correct=Number(data.get('answer'))===l.checkpoint.correctIndex;state.checkpointScores[id]=correct?1:0;state.checkpointVersions||={};state.checkpointVersions[id]=l.version;persist();document.getElementById('checkpoint-feedback').innerHTML=`<div class="banner ${correct?'':'warning'}">${correct?'✓ Benar.':'Belum tepat.'} ${esc(l.checkpoint.explanation)}</div>`;}
 else if(type==='activity'){const e=catalog.exercises.find(x=>x.id===id);if(e.kind==='trace'){const correct=Number(data.get('answer'))===e.answer.correctIndex;state=recordAttempt(state,e,{passed:correct,language:/^m0[5-8]$/.test(e.moduleId)?'cpp':'python',review:route().query.get('review')==='1',hintsUsed:state.assistance?.[id]||0});document.getElementById('activity-feedback').innerHTML=`<div class="banner ${correct?'':'warning'}">${correct?'✓ Prediksi benar.':'Belum tepat.'} ${esc(e.answer.explanation)}</div>`;}else{state.reflections[id]=String(data.get('reflection'));state=recordAttempt(state,e,{passed:null,status:'self-reviewed',evidenceMethod:'self_report',language:state.settings.primaryLanguage});for(const c of e.concepts)if(e.kind==='explanation'){state.explanations||={};state.explanations[c]={complete:true,evidenceMethod:'self_review',at:Date.now(),exerciseId:id,body:String(data.get('reflection'))};}document.getElementById('activity-feedback').innerHTML='<div class="banner">Refleksi tersimpan sebagai self-review. Kebenaran penjelasan belum diverifikasi manusia.</div>';}persist();}
 else if(type==='note'){state.notes.push({id:uid(),title:String(data.get('title')),body:String(data.get('body')),category:String(data.get('category')),at:Date.now()});persist();render();toast('Insight tersimpan.');}
 else if(type==='settings'){state.settings={...state.settings,name:String(data.get('name')).trim(),primaryLanguage:String(data.get('primaryLanguage')),sessionMinutes:Number(data.get('sessionMinutes')),theme:String(data.get('theme')),fontSize:Number(data.get('fontSize')),route:String(data.get('route'))};ui.language=state.settings.primaryLanguage;persist();render();toast('Preferensi disimpan.');}
 else if(type==='role'){state.settings={...state.settings,role:String(data.get('role')),level:String(data.get('level')),targetRegion:String(data.get('region')),roleRequirements:String(data.get('requirements')),roleReviewedAt:Date.now()};persist();render();toast('Target dicatat. Gunakan deskripsi role aktual untuk meninjau gap.');}
 else if(type==='career'){state.career.push({id:uid(),type:String(data.get('type')),title:String(data.get('title')),body:String(data.get('body')),status:'Planned',at:Date.now()});persist();render();toast('Item workspace ditambahkan.');}
 else if(type==='interview-review'){state.interviews||=[];state.interviews.push({id:uid(),exerciseId:state.interview?.exerciseId||'',reflection:String(data.get('reflection')),checked:[...data.keys()].filter(k=>k.startsWith('rubric-')).length,at:Date.now()});state.interview={...(state.interview||{}),deadline:null,pausedSeconds:2700};persist();render();toast('Self-review simulasi disimpan.');}
 else if(type==='visual-input'){stopVisual();const valuesText=String(data.get('values')||''),edgesText=String(data.get('edges')||'');const input={valuesText,edgesText,method:String(data.get('method')||'bfs')};if(data.has('values'))input.values=valuesText.trim()?valuesText.split(',').map(x=>Number(x.trim())):[];for(const key of ['target','n','nodeCount','start'])if(data.has(key))input[key]=Number(data.get(key));if(data.has('edges'))input.edges=edgesText.trim()?edgesText.split(',').map(x=>x.trim().split('-').map(Number)):[];ui.trace=buildTrace(ui.visualType,input);ui.vizInput=input;ui.visualStep=0;render();}
 }catch(e){toast(e.message||'Belum dapat menyimpan.');}});

window.addEventListener('hashchange',()=>{captureDraft();clearTimeout(saveTimer);persist();controller?.abort();++runSequence;ui.busy=false;controller=null;stopVisual();ui.labTab='problem';ui.mobileTab='problem';ui.results=[];ui.runStatus='';render({focus:true});});
window.addEventListener('pagehide',()=>{captureDraft();clearTimeout(saveTimer);persist();});
async function boot(){
 try{
  const parts=globalThis.__DSA_CONTENT__||await Promise.all([1,2,3,4].map(async n=>{const r=await fetch(`./content/part-${String(n).padStart(2,'0')}.json`);if(!r.ok)throw new Error(`Materi bagian ${n} belum dapat dimuat.`);return r.json();}));
  catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};catalog.modules.sort((a,b)=>a.id.localeCompare(b.id));catalog.lessons.sort((a,b)=>a.id.localeCompare(b.id));
  try{store=await openStore();const loaded=await store.read();state={...emptyState(),...loaded,settings:{...emptyState().settings,...loaded.settings}};lastRevision=state.revision;store.subscribe(({revision})=>{if(revision>lastRevision){ui.storageWarning='Tab lain memperbarui progres. Export draft jika perlu, lalu muat ulang sebelum menyimpan perubahan.';saveStatus('Perubahan dari tab lain');toast(ui.storageWarning);}});}catch(e){ui.storageWarning=`Penyimpanan tidak tersedia: ${e.message}. Progres hanya di sesi ini; gunakan export.`;}
  ui.language=state.settings.primaryLanguage;state.settings.cppAvailable=false;saveStatus(store?'Progres di perangkat ini':'Sesi sementara · belum tersimpan');render();timerTicker=setInterval(updateTimerDisplay,1000);onboarding();checkCpp();
 }catch(e){root.innerHTML=`<main class="boot"><span class="brand-mark">d.</span><h1>Workspace belum dapat dimuat.</h1><p>${esc(e.message)}</p><p>Jalankan aplikasi melalui server HTTP, bukan membuka file langsung.</p><button class="btn" id="retry-boot">Coba lagi</button></main>`;document.getElementById('retry-boot').onclick=()=>location.reload();}
}
boot();

```


## dist\core.js
```javascript
export const DAY=86400000;
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const copy=x=>structuredClone(x);
export function emptyState(){return {schemaVersion:1,revision:0,settings:{name:'Reydian',sessionMinutes:45,route:'interleaved',theme:'light',fontSize:18,primaryLanguage:'python',role:'Software Engineer',targetRegion:'',cppAvailable:false,lastMissionType:'lesson',cppApiUrl:''},completedLessons:{},checkpointScores:{},checkpointVersions:{},historicalCheckpoints:{},explanations:{},drafts:{},attempts:[],exposures:[],reviews:{},notes:[],career:[],reflections:{}};}
export function recordExposure(state,exercise,at=Date.now()){
 const s=copy(state);if(!s.exposures.some(x=>x.exerciseId===exercise.id&&x.version===exercise.version))s.exposures.push({exerciseId:exercise.id,version:exercise.version,family:exercise.family||exercise.id,at});return s;
}
export function recordAttempt(state,exercise,options={}){
 const s=copy(state),at=options.at??Date.now();
 const exposed=s.exposures.some(x=>x.at<=at&&(x.exerciseId===exercise.id||x.family===(exercise.family||exercise.id)));
 const alreadyPassed=s.attempts.some(x=>x.exerciseId===exercise.id&&x.passed===true);
 const passed=options.passed===true?true:options.passed===false?false:null;
 const automated=['coding','trace'].includes(exercise.kind)&&options.evidenceMethod!=='self_report';
 const assisted=Boolean(options.hintsUsed||options.assisted);
 const status=options.status||(passed===true?'passed':passed===false?'failed':'unknown');
 s.attempts.push({id:uid(),exerciseId:exercise.id,exerciseVersion:exercise.version,moduleId:exercise.moduleId,lessonId:exercise.lessonId,kind:exercise.kind,concepts:[...(exercise.concepts||[])],family:exercise.family||exercise.id,language:options.language||'python',source:options.source||'',at,passed,status,hintsUsed:options.hintsUsed||0,assisted,exposed,review:Boolean(options.review),evidenceMethod:automated?'automated':options.evidenceMethod||'self_report',novelTransfer:automated&&passed===true&&!assisted&&!exposed&&!alreadyPassed&&exercise.variant==='transfer',stale:false});
 if(automated&&passed!==null){
  for(const concept of exercise.concepts||[]){
   const old=s.reviews[concept],intervals=[1,3,7,14,30];
   const interval=passed&&!assisted?intervals[Math.min(old?Math.max(0,intervals.indexOf(old.intervalDays)+1):0,4)]:1;
   s.reviews[concept]={conceptId:concept,dueAt:at+interval*DAY,intervalDays:interval,lastResult:passed,updatedAt:at};
  }
  s.settings.lastMissionType=options.review?'review':'practice';
 }
 return s;
}
export function deriveConcept(state,conceptId,exercises,now=Date.now()){
 const current=new Map(exercises.map(x=>[x.id,x]));
 const all=state.attempts.filter(a=>a.concepts?.includes(conceptId)&&a.at<=now&&!a.stale&&current.get(a.exerciseId)?.version===a.exerciseVersion);
 const evidence=all.filter(a=>a.evidenceMethod==='automated'&&a.passed===true&&!a.assisted);
 const distinct=new Set(evidence.map(a=>a.exerciseId)),transfer=new Set(evidence.filter(a=>a.novelTransfer).map(a=>a.exerciseId));
 const languageEvidence={};for(const a of evidence)languageEvidence[a.language]=(languageEvidence[a.language]||0)+1;
 const checkpoint=evidence.some(a=>(state.checkpointScores[a.lessonId]||0)>=0.8);
 const firstTransfer=evidence.filter(a=>a.novelTransfer).reduce((t,a)=>Math.min(t,a.at),Infinity);
 const lastReview=all.filter(a=>a.review&&a.evidenceMethod==='automated'&&a.passed!==null).sort((a,b)=>b.at-a.at)[0];
 let level=all.length?'Practicing':'Not started',reason='Belum ada bukti latihan otomatis.';
 const explanation=state.explanations?.[conceptId]?.complete===true;
 if(distinct.size>=2&&transfer.size&&checkpoint&&explanation){level='Provisionally mastered';reason='Latihan berbeda, transfer baru, checkpoint, dan rubrik penjelasan (self-review) terpenuhi; tunggu review tertunda.';
  if(lastReview?.passed===true&&!lastReview.assisted&&lastReview.at-firstTransfer>=7*DAY){level='Retained';reason='Bukti transfer, penjelasan self-review, dan review mandiri minimal tujuh hari setelah transfer.';}
 }
 if(evidence.length&&level==='Practicing')reason='Masih perlu variasi transfer, checkpoint, atau rubrik penjelasan. Recall bukan bukti transfer baru.';
 if(lastReview?.passed===false){level='Practicing';reason='Review terakhir belum berhasil. Coba remedial sebelum melanjutkan.';}
 return {state:level,recallCount:distinct.size,transferCount:transfer.size,languageEvidence,reason};
}
function assertRecords(items,name){if(!Array.isArray(items)||items.length>20000)throw new Error(`${name}: format/ukuran tidak valid.`);const ids=new Set();for(const x of items){if(!x||typeof x!=='object'||typeof x.id!=='string'||ids.has(x.id))throw new Error(`${name}: ID tidak valid/duplikat.`);ids.add(x.id);}}
function safeTree(value,depth=0){if(depth>14)throw new Error('Backup terlalu dalam.');if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw new Error('Backup memiliki key yang tidak aman.');safeTree(v,depth+1);}}}
export function importState(current,backup,catalog){
 if(!backup||backup.schemaVersion!==1||!backup.data||backup.data.schemaVersion!==1)throw new Error('Versi backup tidak didukung; data lama tetap utuh.');
 if(JSON.stringify(backup).length>20*1024*1024)throw new Error('Backup melebihi 20 MiB.');safeTree(backup);
 const incoming=copy(backup.data);assertRecords(incoming.attempts,'Attempts');assertRecords(incoming.notes,'Notes');assertRecords(incoming.career,'Career');
 if(!Array.isArray(incoming.exposures)||incoming.exposures.some(x=>typeof x.exerciseId!=='string'||typeof x.family!=='string'||!Number.isFinite(x.at)))throw new Error('Exposure history tidak valid.');
 for(const k of ['settings','completedLessons','checkpointScores','drafts','reviews'])if(!incoming[k]||Array.isArray(incoming[k])||typeof incoming[k]!=='object')throw new Error(`${k} tidak valid.`);
 const exposureMap=new Map();for(const x of [...(current.exposures||[]),...incoming.exposures]){const key=`${x.exerciseId}:${x.version}:${x.family}`;if(!exposureMap.has(key)||exposureMap.get(key).at>x.at)exposureMap.set(key,copy(x));}incoming.exposures=[...exposureMap.values()];
 for(const [id,completion] of Object.entries(incoming.completedLessons))if(!completion||typeof completion!=='object'||!Number.isFinite(completion.at)||!Number.isInteger(completion.version))throw new Error(`Completion ${id} tidak valid.`);
 for(const [key,allowed] of Object.entries({primaryLanguage:['python','cpp'],route:['interleaved','sequential'],theme:['light','dark'],sessionMinutes:[15,45,90]}))if(incoming.settings[key]!==undefined&&!allowed.includes(incoming.settings[key]))throw new Error(`Pengaturan ${key} tidak valid.`);
 if(typeof incoming.settings.name!=='string'||incoming.settings.name.length>80||typeof incoming.settings.cppAvailable!=='boolean')throw new Error('Pengaturan profil tidak valid.');
 const index=new Map(catalog.exercises.map(x=>[x.id,x]));const priorPassed=new Set();
 incoming.attempts.sort((a,b)=>a.at-b.at);
 for(const a of incoming.attempts){
  if(typeof a.exerciseId!=='string'||!Number.isInteger(a.exerciseVersion)||!Number.isFinite(a.at)||![true,false,null].includes(a.passed)||!Array.isArray(a.concepts)||a.concepts.some(x=>typeof x!=='string'))throw new Error('Attempt tidak valid.');
  if(!['python','cpp'].includes(a.language)||!['automated','self_report','rubric','manual'].includes(a.evidenceMethod)||!['passed','failed','unknown','unavailable','cancelled','self-reviewed'].includes(a.status)||[a.assisted,a.exposed,a.review,a.novelTransfer].some(v=>typeof v!=='boolean')||!Number.isInteger(a.hintsUsed)||a.hintsUsed<0)throw new Error('Tipe/label evidence tidak valid.');
  const ex=index.get(a.exerciseId);a.stale=!ex||ex.version!==a.exerciseVersion;a.historical=!ex;
  if(a.stale){a.novelTransfer=false;a.staleReason=ex?'Kriteria materi berubah; perlu evaluasi ulang.':'Materi historis tidak tersedia; riwayat tetap disimpan.';}
  if(ex&&ex.version===a.exerciseVersion){
   const mismatch=a.family!==(ex.family||ex.id)||a.lessonId!==ex.lessonId||a.kind!==ex.kind||a.concepts.length!==ex.concepts.length||a.concepts.some(c=>!ex.concepts.includes(c));
   if(mismatch){a.stale=true;a.staleReason='Asosiasi evidence tidak cocok dengan konten saat ini.';}
   a.novelTransfer=Boolean(a.novelTransfer&&!a.stale&&ex.variant==='transfer'&&['coding','trace'].includes(ex.kind)&&a.evidenceMethod==='automated'&&a.passed===true&&!a.assisted&&!priorPassed.has(a.exerciseId));
  }
  if(incoming.exposures.some(x=>x.at<=a.at&&(x.exerciseId===a.exerciseId||x.family===a.family)))a.novelTransfer=false;
  if(a.passed===true)priorPassed.add(a.exerciseId);
 }
 for(const [id,draft] of Object.entries(incoming.drafts))if(typeof id!=='string'||!draft||typeof draft!=='object'||Object.values(draft).some(x=>typeof x!=='string'||x.length>100000))throw new Error('Draft tidak valid.');
 for(const score of Object.values(incoming.checkpointScores))if(typeof score!=='number'||score<0||score>1)throw new Error('Checkpoint score tidak valid.');
 incoming.historicalCheckpoints=incoming.historicalCheckpoints||{};incoming.checkpointVersions=incoming.checkpointVersions||{};
 const lessons=new Map((catalog.lessons||[]).map(l=>[l.id,l]));
 for(const [id,score] of Object.entries(incoming.checkpointScores)){const version=incoming.checkpointVersions[id];if(!lessons.has(id)||version!==lessons.get(id).version){incoming.historicalCheckpoints[id]={score,version:version??null};delete incoming.checkpointScores[id];delete incoming.checkpointVersions[id];}}
 for(const [id,completion] of Object.entries(incoming.completedLessons))completion.stale=!lessons.has(id)||completion.version!==lessons.get(id).version;
 if(incoming.explanations!==undefined){if(!incoming.explanations||typeof incoming.explanations!=='object'||Array.isArray(incoming.explanations))throw new Error('Explanation evidence tidak valid.');for(const x of Object.values(incoming.explanations))if(!x||typeof x.complete!=='boolean'||!['self_review','manual'].includes(x.evidenceMethod)||!Number.isFinite(x.at))throw new Error('Explanation rubric tidak valid.');}
 const restored={...emptyState(),...incoming,settings:{...emptyState().settings,...incoming.settings},revision:current.revision};
 if(!['light','dark'].includes(restored.settings.theme))restored.settings.theme='light';
 restored.settings.fontSize=Math.min(24,Math.max(16,Number(restored.settings.fontSize)||18));
 for(const [concept,r] of Object.entries(restored.reviews))if(!r||!Number.isFinite(r.dueAt)||!Number.isFinite(r.intervalDays))delete restored.reviews[concept];
 return restored;
}
export const INTERLEAVED=['m01','m02','m03','m04','m05','m09','m10','m11','m06','m12','m13','m14','m08','m15','m16','m07','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28'];
export function makeMissions(state,catalog,minutes=45,now=Date.now()){
 const order=state.settings.route==='sequential'?catalog.modules.map(x=>x.id):INTERLEAVED;
 const lesson=[...catalog.lessons].sort((a,b)=>order.indexOf(a.moduleId)-order.indexOf(b.moduleId)).find(x=>!state.completedLessons[x.id]||state.completedLessons[x.id].stale);
 const due=Object.entries(state.reviews).filter(([,r])=>r.dueAt<=now).sort((a,b)=>a[1].dueAt-b[1].dueAt);
 const reviews=due.map(([concept])=>{const ex=catalog.exercises.find(x=>x.concepts?.includes(concept)&&['coding','trace'].includes(x.kind));return ex?{kind:'review',conceptId:concept,exerciseId:ex.id,title:`Review: ${concept.replaceAll('-',' ')}`,language:state.settings.cppAvailable?state.settings.primaryLanguage:'python',requiresCpp:false,minutes:Math.min(minutes,15)}:null;}).filter(Boolean).slice(0,minutes<=15?1:3);
 const next=lesson?{kind:'lesson',lessonId:lesson.id,title:lesson.title,language:/^m0[5-8]$/.test(lesson.moduleId)?'cpp':'python',requiresCpp:false,minutes:Math.min(minutes,lesson.minutes||20)}:null;
 return state.settings.lastMissionType==='review'?[next,...reviews].filter(Boolean):[...reviews,next].filter(Boolean);
}
export function checkOutput(actual,expected,{checker='exact',tolerance=1e-6}={}){
 const normalize=s=>String(s).replaceAll('\r\n','\n').split('\n').map(x=>x.trimEnd()).join('\n').trimEnd(),a=normalize(actual),b=normalize(expected);
 if(checker==='float'){const x=a.trim().split(/\s+/),y=b.trim().split(/\s+/);return a.length>0&&b.length>0&&x.length===y.length&&x.every((v,i)=>Number.isFinite(Number(v))&&Number.isFinite(Number(y[i]))&&Math.abs(Number(v)-Number(y[i]))<=tolerance);}
 if(checker==='unordered')return a.trim().split(/\s+/).sort().join('\n')===b.trim().split(/\s+/).sort().join('\n');
 return a===b;
}
export function buildTrace(type,input={}){
 const values=input.values||[2,4,6,8,10];if(!Array.isArray(values)||values.length>32||values.some(v=>!Number.isFinite(v)))throw new Error('Gunakan maksimal 32 angka valid.');
 if(type==='loop'){let total=0;const steps=[{values:[...values],active:-1,total,text:'Mulai: total = 0.'}];values.forEach((v,i)=>{total+=v;steps.push({values:[...values],active:i,total,text:`Iterasi ${i}: tambah ${v}; total = ${total}.`});});steps.push({values:[...values],active:-1,total,text:`Loop selesai. Jumlah = ${total}.`});return steps;}
 if(type==='reference')return [{values:[7,7],active:0,text:'a = 7; copy menerima salinan nilai a.'},{values:[7,10],active:1,text:'Ubah copy menjadi 10: a tetap 7.'},{values:[10,10],active:0,text:'Reference menunjuk a; ubah reference: a ikut menjadi 10.'},{values:[10,10],active:-1,text:'Copy punya nilai terpisah; reference adalah nama lain untuk object yang sama.'}];
 if(type==='binary'){
  if(values.some((v,i)=>i&&v<values[i-1]))throw new Error('Binary search membutuhkan array terurut naik.');
  const target=Number(input.target??6);if(!Number.isFinite(target))throw new Error('Target tidak valid.');let left=0,right=values.length-1,result=-1;const steps=[];
  while(left<=right){const mid=Math.floor((left+right)/2);steps.push({values:[...values],left,right,mid,active:mid,target,text:`left=${left}, right=${right}, mid=${mid}; bandingkan ${values[mid]} dengan ${target}.`});if(values[mid]===target){result=mid;break;}if(values[mid]<target)left=mid+1;else right=mid-1;}
  steps.push({values:[...values],left,right,active:result,result,target,text:result<0?'Target tidak ditemukan.':`Target ditemukan pada index ${result}. Untuk duplikat, satu posisi yang cocok dikembalikan.`});return steps;
 }
 if(type==='dp'){
  const n=Number(input.n??6);if(!Number.isInteger(n)||n<0||n>12)throw new Error('n harus integer 0–12.');const dp=Array(n+1).fill(null);dp[0]=1;const steps=[{values:[...dp],active:0,text:'dp[0] = 1: satu cara memilih tidak mengambil langkah.'}];
  for(let i=1;i<=n;i++){dp[i]=(dp[i-1]||0)+(i>=2?dp[i-2]||0:0);steps.push({values:[...dp],active:i,text:`dp[${i}] = dp[${i-1}]${i>=2?` + dp[${i-2}]`:''} = ${dp[i]}.`});}return steps;
 }
 if(type==='tree'||type==='graph'){
  let graph,labels,start=0;
  if(type==='tree'){
   labels=input.values??[8,4,12,2,6,10,14];if(labels.length>15)throw new Error('Tree maksimal 15 node.');
   graph=labels.map((_,i)=>[2*i+1,2*i+2].filter(j=>j<labels.length));
  }else{
   const count=input.nodeCount??6;start=input.start??0;
   if(!Number.isInteger(count)||count<1||count>12||!Number.isInteger(start)||start<0||start>=count)throw new Error('Graph: 1–12 nodes dan start harus valid.');
   const edges=input.edges??[[0,1],[0,2],[1,3],[2,3],[2,4],[3,0],[4,5]];
   if(!Array.isArray(edges)||edges.length>24||edges.some(e=>!Array.isArray(e)||e.length!==2||e.some(v=>!Number.isInteger(v)||v<0||v>=count)))throw new Error('Edges harus pasangan node valid, maksimal 24.');
   labels=Array.from({length:count},(_,i)=>i);graph=labels.map(()=>[]);for(const [a,b]of edges)if(!graph[a].includes(b))graph[a].push(b);graph.forEach(row=>row.sort((a,b)=>a-b));
  }
  const method=input.method||'bfs';if(!['bfs','dfs'].includes(method))throw new Error('Pilih BFS atau DFS.');
  const queue=graph.length?[start]:[],visited=new Set(),steps=[{values:labels,edges:graph.flatMap((a,i)=>a.map(j=>[i,j])),active:-1,visited:[],frontier:[...queue],text:graph.length?`Mulai dari node index ${start}. Tetangga diurutkan naik; visited mencegah cycle.`:'Tree kosong; tidak ada node yang dikunjungi.'}];
  while(queue.length){const node=method==='dfs'?queue.pop():queue.shift();if(visited.has(node))continue;visited.add(node);const neighbors=method==='dfs'?[...graph[node]].reverse():graph[node];for(const next of neighbors)if(!visited.has(next))queue.push(next);steps.push({values:labels,edges:steps[0].edges,active:node,visited:[...visited],frontier:[...queue],text:`Kunjungi ${labels[node]}. ${method==='dfs'?'Stack':'Queue'}: [${queue.map(i=>labels[i]).join(', ')}]. Visited mencegah cycle berulang.`});}return steps;
 }
 throw new Error('Visualizer tidak dikenal.');
}

```


## dist\dashboard.js
```javascript
import {esc,icon,badge,btn,title,dateString} from './ui.js';
import {makeMissions,DAY} from './core.js';
export function today({state,catalog,ui}){
 const missions=makeMissions(state,catalog,state.settings.sessionMinutes),mission=missions[0],completed=Object.keys(state.completedLessons).length;
 const nextLesson=mission?.kind==='lesson'?catalog.lessons.find(l=>l.id===mission.lessonId):null;
 const module=catalog.modules.find(m=>m.id===nextLesson?.moduleId)||catalog.modules[0];
 const missionLink=mission?.kind==='review'?`#practice/${mission.exerciseId}?review=1`:`#learn/${mission?.lessonId||catalog.lessons[0]?.id}`;
 const practiceCount=new Set(state.attempts.filter(a=>a.passed===true&&!a.stale).map(a=>a.exerciseId)).size;
 const activeDays=new Set(state.attempts.filter(a=>a.at>Date.now()-7*DAY).map(a=>new Date(a.at).toDateString())).size;
 const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);const n=state.attempts.filter(a=>a.at>=d.getTime()&&a.at<d.getTime()+DAY).length;return `<div class="day"><div class="day-bar"><span style="height:${Math.min(100,n*20)}%"></span></div>${new Intl.DateTimeFormat('id-ID',{weekday:'narrow'}).format(d)}</div>`;}).join('');
 const nearLessons=catalog.lessons.filter(l=>!state.completedLessons[l.id]).slice(0,3);
 return `${title('A little progress, every day',`Selamat belajar, ${(state.settings.name||'Reydian').split(' ')[0]}.`,'Satu konsep yang dipahami dengan baik adalah satu langkah maju.',`<span class="date-label">${dateString(Date.now())}</span>`)}<div class="dashboard-grid"><section><div class="mission-hero"><div class="hero-top"><span class="eyebrow">Your next small step</span><div class="segmented" aria-label="Durasi sesi">${[15,45,90].map(n=>`<button type="button" data-action="session" data-value="${n}" class="${state.settings.sessionMinutes===n?'selected':''}" aria-pressed="${state.settings.sessionMinutes===n}">${n} min</button>`).join('')}</div></div><div class="mission-body">${badge(mission?.kind==='review'?'TIME TO RECALL':`MODULE ${module?.id.slice(1)||'01'} · ${module?.stage||'FOUNDATIONS'}`,'lime')}<h2>${esc(mission?.title||'Mulai perjalananmu.')}</h2><p>${mission?.kind==='review'?'Tarik kembali idenya dari ingatan. Review hari ini tidak harus menghabiskan seluruh sesi.':'Pahami konsepnya, lihat contoh, lalu coba sendiri. Kamu tidak perlu terburu-buru.'}</p><div class="mission-meta"><span>${icon('clock')} ${mission?.minutes||20} menit</span><span>${icon('book')} ${mission?.kind==='review'?'Active recall':'Baca · pahami · praktik'}</span></div>${btn(mission?.kind==='review'?'Mulai review':completed?'Lanjutkan belajar':'Mulai pelajaran pertama',missionLink)}</div><svg class="mission-art" viewBox="0 0 200 220" aria-hidden="true"><path d="M24 190V130H75V80H126V30H177" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M24 190H177" stroke="currentColor" opacity=".15"/><circle cx="24" cy="130" r="13" fill="#e8f3ad" stroke="currentColor"/><circle cx="75" cy="80" r="13" fill="#e8f3ad" stroke="currentColor"/><circle cx="126" cy="30" r="13" fill="#215c47"/><path d="m120 30 4 4 8-8" stroke="#fff" stroke-width="2" fill="none"/><rect x="129" y="128" width="47" height="47" rx="12" fill="#fff" opacity=".7"/><text x="152" y="158" text-anchor="middle" font-family="monospace" font-size="20" fill="#215c47">{ }</text></svg><div class="hero-footer"><span>${icon('shield')} Penguasaan dibangun dari bukti, bukan streak.</span><span>${completed} / ${catalog.lessons.length} pelajaran dipelajari</span></div></div><div class="stats-row"><div class="stat"><div class="stat-label">${icon('book')} Pelajaran</div><strong>${completed}<span class="muted" style="font-size:15px"> / ${catalog.lessons.length}</span></strong><small>Ditandai sudah dipelajari</small></div><div class="stat"><div class="stat-label">${icon('code')} Latihan benar</div><strong>${practiceCount}<span class="muted" style="font-size:15px"> / ${catalog.exercises.length}</span></strong><small>Unik, bukan jumlah percobaan</small></div><div class="stat"><div class="stat-label">${icon('review')} Review due</div><strong>${ui.dueCount}</strong><small>Boleh dijadwalkan ulang</small></div></div><div class="panel"><div class="panel-heading"><h2>Berikutnya di jalurmu</h2><a href="#roadmap">Lihat learning path ↗</a></div>${nearLessons.map((l,i)=>`<a class="lesson-row" href="#learn/${esc(l.id)}"><span class="row-number">${String(i+1).padStart(2,'0')}</span><div class="row-text"><h3>${esc(l.title)}</h3><p>${esc(catalog.modules.find(m=>m.id===l.moduleId)?.title)} · ${l.minutes} menit</p></div><span class="arrow">${icon('arrow')}</span></a>`).join('')||'<p class="muted">Semua pelajaran dipelajari. Review dan proyek adalah langkah berikutnya.</p>'}</div></section><aside class="dashboard-aside"><div class="panel"><div class="panel-heading"><h3>Ritme belajarmu</h3>${badge('7 hari','outline')}</div><p class="muted" style="font-size:12px">Sedikit dan konsisten, dengan ruang untuk istirahat.</p><div class="activity-week">${week}</div><div class="week-footer"><strong>${activeDays} hari aktif</strong> minggu ini.<br>Aktivitas ditampilkan dari percobaan nyata.</div><div class="path-progress"><span>Perjalanan belajar</span><strong>${Math.round(completed/catalog.lessons.length*100)||0}%</strong></div><div class="progress-track"><span style="width:${completed/catalog.lessons.length*100||0}%"></span></div></div><div class="quote-panel"><div class="eyebrow">A mindset to keep</div><p>“Bisakah aku menjelaskan mengapa solusi ini benar, dan kapan ia bisa gagal?”</p><small>Pertanyaan yang lebih berguna daripada sekadar “sudah selesai”.</small></div><div class="panel section-gap"><div class="panel-heading"><h3>Kenali arahmu</h3>${icon('briefcase')}</div><p class="muted" style="font-size:13px">Periksa target role sejak awal. DSA, proyek, testing, dan komunikasi perlu tumbuh bersama.</p><div class="section-gap">${btn('Buka career checkpoint','#career','secondary small')}</div></div></aside></div>`;
}

```


## dist\index.html
```javascript
<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#215c47"><meta name="description" content="Learn programming and algorithms, one clear step at a time. An interactive Python and C++ learning workspace."><title>DSA Journey — Learn. Trace. Build.</title><link rel="stylesheet" href="./styles.css"></head>
<body><a class="skip-link" href="#main">Lewati ke konten</a><div id="app"><main class="boot"><div class="brand-mark">d.</div><h1>Menyiapkan perjalananmu.</h1><p>Memuat kurikulum dan progres lokal…</p></main></div><div id="toast" role="status" aria-live="polite"></div><script type="module" src="./app.js"></script></body></html>

```


## dist\python-worker.js
```javascript
import {loadPyodide} from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';
import {stdinLines} from './runtime-contract.js';
self.onmessage=async event=>{
 let stdout='',stderr='';const cap=65536;
 const output=(which,text)=>{if(which==='out'){stdout+=text+'\n';if(stdout.length>cap)throw new Error('Output melebihi 64 KiB.');}else{stderr+=text+'\n';if(stderr.length>cap)throw new Error('Error output melebihi 64 KiB.');}};
 try{
  const py=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
  const lines=stdinLines(event.data.stdin);let index=0;
  py.setStdin({stdin:()=>index<lines.length?lines[index++]:null,isatty:false});
  py.setStdout({batched:text=>output('out',text)});py.setStderr({batched:text=>output('err',text)});
  self.postMessage({type:'ready'});
  try{await py.runPythonAsync(String(event.data.source));py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()');self.postMessage({type:'result',result:{status:'completed',stdout:stdout.slice(0,cap),stderr:stderr.slice(0,cap),runtime:'Python 3.12 · Pyodide 0.27.7'}});}
  catch(e){self.postMessage({type:'result',result:{status:'failed',stdout:stdout.slice(0,cap),stderr:(stderr+'\n'+e.message).slice(0,cap)}});}
 }catch(e){self.postMessage({type:'error',error:`Runtime gagal dimuat: ${e.message}`});}
};

```


## dist\runner-host.js
```javascript
let active;
window.addEventListener('message',event=>{
 if(event.source!==parent||event.data?.type!=='execute'||active)return;
 const {nonce,source,stdin}=event.data;const reply=data=>parent.postMessage({...data,nonce},event.origin==='null'?'*':event.origin);
 try{
  const workerUrl=new URL('./python-worker.js',location.href).href;
  const blob=new Blob([event.data.workerSource||`import ${JSON.stringify(workerUrl)};`],{type:'text/javascript'});const objectURL=URL.createObjectURL(blob);
  active=new Worker(objectURL,{type:'module'});URL.revokeObjectURL(objectURL);
  active.onmessage=e=>{reply(e.data);if(e.data.type==='result'||e.data.type==='error'){active.terminate();active=null;}};
  active.onerror=e=>{reply({type:'error',error:`Python worker tidak dapat dimulai: ${e.message||'periksa koneksi/CDN.'}`});active?.terminate();};
  active.postMessage({source,stdin});
 }catch(e){reply({type:'error',error:e.message});}
});

```


## dist\runner.js
```javascript
// Each case receives a new opaque-origin iframe and fresh worker. No user code runs on the host.
export function runPython(source,stdin,{onStatus=()=>{},signal,startupTimeout=90000,executionTimeout=6000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Dihentikan','AbortError'));return;}
  const frame=document.createElement('iframe');frame.hidden=true;frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('title','Isolated Python runtime');
  const nonce=crypto.randomUUID();let timer,finished=false;
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',listener);signal?.removeEventListener('abort',abort);frame.remove();};
  const finish=(error,result)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve(result);};
  const abort=()=>finish(new DOMException('Eksekusi dihentikan; draft tetap tersimpan.','AbortError'));
  const listener=e=>{if(e.source!==frame.contentWindow||e.data?.nonce!==nonce)return;const m=e.data;
   if(m.type==='ready'){clearTimeout(timer);onStatus('Python siap. Menjalankan dalam environment baru…');timer=setTimeout(()=>finish(null,{status:'timeout',stdout:'',stderr:'Batas eksekusi 6 detik tercapai.'}),executionTimeout);}
   if(m.type==='result')finish(null,m.result);
   if(m.type==='error')finish(new Error(m.error||'Runtime tidak tersedia.'));
  };
  window.addEventListener('message',listener);signal?.addEventListener('abort',abort,{once:true});
  frame.onload=()=>{onStatus('Memuat Python 3.12 / Pyodide 0.27.7. Unduhan pertama memerlukan internet…');frame.contentWindow.postMessage({type:'execute',nonce,source,stdin,workerSource:globalThis.__DSA_WORKER_SOURCE__},'*');};
  if(globalThis.__DSA_FRAME_HTML)frame.srcdoc=globalThis.__DSA_FRAME_HTML;else frame.src=new URL('./runner-frame.html',import.meta.url).href;document.body.append(frame);
  timer=setTimeout(()=>finish(new Error('Python belum dapat dimuat. Periksa koneksi ke CDN lalu coba lagi; tidak ada hasil belajar yang dicatat.')),startupTimeout);
 });
}

const pause=(ms,signal)=>new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal?.addEventListener('abort',()=>{clearTimeout(t);reject(new DOMException('Polling dihentikan; job server mungkin masih berjalan.','AbortError'));},{once:true});});
export async function runCpp(payload,{base='',onStatus=()=>{},signal,recover=false}={}){
 const endpoint=base.replace(/\/$/,'');let response;
 const read=async r=>{let data;try{data=await r.json();}catch{throw new Error('C++ API tidak tersedia pada alamat ini.');}if(!r.ok)throw new Error(data.error||data.message||`C++ API: ${r.status}`);return data;};
 if(recover)response=await read(await fetch(`${endpoint}/api/submissions/${encodeURIComponent(payload.requestId)}`,{signal}));
 else response=await read(await fetch(`${endpoint}/api/submissions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal}));
 for(let i=0;i<90;i++){
  onStatus(`C++: ${response.status}. Request ${payload.requestId.slice(0,8)}…`);
  if(['completed','failed','unavailable','unknown'].includes(response.status))return response;
  await pause(1000,signal);response=await read(await fetch(`${endpoint}/api/submissions/${encodeURIComponent(payload.requestId)}`,{signal}));
 }
 return {...response,status:'unknown',stderr:'Polling berakhir; gunakan Recover untuk memeriksa logical job yang sama.'};
}

```


## dist\runtime-contract.js
```javascript
export function stdinLines(text){
 const value=String(text??'').replaceAll('\r\n','\n');
 if(!value)return [];
 const lines=value.split('\n');if(value.endsWith('\n'))lines.pop();return lines;
}

```


## dist\storage.js
```javascript
import {emptyState} from './core.js';
export async function openStore(){
 const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('dsa-journey',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Tutup tab lama untuk memperbarui penyimpanan.'));});
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('dsa-journey-updates'):null;
 return {
  async read(){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('current');req.onsuccess=()=>resolve(req.result||emptyState());req.onerror=()=>reject(req.error);});},
  async write(state){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),object=tx.objectStore('state');let result,error;
   const req=object.get('current');req.onsuccess=()=>{const current=req.result;if((current?.revision||0)!==state.revision){error=new Error('Data diperbarui tab lain. Export perubahan ini, lalu muat ulang.');error.code='CONFLICT';tx.abort();return;}result=structuredClone(state);result.revision=(current?.revision||0)+1;object.put(result,'current');};
   tx.oncomplete=()=>{channel?.postMessage({revision:result.revision});resolve(result);};tx.onerror=()=>reject(tx.error||new Error('Tidak dapat menyimpan.'));tx.onabort=()=>reject(error||tx.error||new Error('Penyimpanan dibatalkan.'));
  });},
  subscribe(fn){if(channel)channel.onmessage=e=>fn(e.data);},
  close(){channel?.close();db.close();}
 };
}

```


## dist\ui.js
```javascript
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?esc(u.href):'#';}catch{return '#';}}
const paths={home:'M3 10 12 3l9 7v10H3z M9 20v-7h6v7',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',code:'m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',review:'M3 10a9 9 0 1 1 2 8 M3 4v6h6 M12 7v5l3 2',note:'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',chart:'M4 3v18h17 M8 17v-5 M13 17V8 M18 17V4',play:'m8 4 12 8-12 8z',briefcase:'M3 7h18v13H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',arrow:'M4 12h15 M13 5l7 7-7 7',check:'m5 12 4 4L20 5',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',book:'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3z M12 6v15',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',menu:'M3 6h18 M3 12h18 M3 18h18',left:'m15 5-7 7 7 7',pause:'M8 5v14 M16 5v14',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',target:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 10v4 M10 12h4',shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6'};
export const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.book}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const badge=(text,cls='outline')=>`<span class="pill ${cls}">${esc(text)}</span>`;
export const btn=(text,href,cls='')=>`<a class="btn ${cls}" href="${esc(href)}">${esc(text)} ${icon('arrow')}</a>`;
export const title=(over,heading,description,extra='')=>`<div class="page-title"><div><div class="eyebrow">${esc(over)}</div><h1 tabindex="-1">${esc(heading)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>${extra}</div>`;
export const empty=(heading,body,action='')=>`<div class="empty-state"><h3>${esc(heading)}</h3><p>${esc(body)}</p>${action?`<div class="section-gap">${action}</div>`:''}</div>`;
export const codeBlock=(code,language='python')=>`<div class="code-block"><div class="code-label"><span>${esc(language)}</span><button type="button" data-action="copy-code">Salin kode</button></div><pre><code>${esc(code)}</code></pre></div>`;
export const sourceLinks=sources=>`<div class="sources"><strong>Sumber pendalaman</strong>${(sources||[]).map(s=>`<a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('')}</div>`;
export const kindLabel={coding:'Coding',trace:'Trace & predict',explanation:'Reflection',project:'Project',career:'Career'};
export const dateString=t=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(t));

export function exerciseCard(ex,state,hideTags=false){const done=state.attempts.some(a=>a.exerciseId===ex.id&&a.passed===true&&!a.stale);return `<a class="exercise-card" href="#practice/${esc(ex.id)}"><div class="row-number">${done?icon('check'):icon(ex.kind==='coding'?'code':'book')}</div><div class="body"><h3>${esc(ex.title)}</h3><p>${esc(kindLabel[ex.kind])} · ${ex.estimatedMinutes||15} min${hideTags?'':` · ${esc(ex.difficulty)}`}</p></div>${done?badge('Practiced','green'):icon('arrow')}</a>`;}

```


## dist\views-extra.js
```javascript
import {esc,safeUrl,icon,badge,btn,title,empty,dateString,codeBlock} from './ui.js';
import {deriveConcept,buildTrace,DAY} from './core.js';
export function extraView(route,ctx){switch(route.page){case 'review':return reviews(ctx);case 'notes':return notes(ctx);case 'progress':return progress(ctx);case 'visualizers':return visualizers(ctx);case 'interview':return interview(ctx);case 'career':return career(ctx);case 'settings':return settings(ctx);default:return empty('Halaman tidak ditemukan.','Kembali ke workspace.',btn('Today','#today'));}}
function reviews({state,catalog}){
 const items=Object.entries(state.reviews).sort((a,b)=>a[1].dueAt-b[1].dueAt),due=items.filter(([,r])=>r.dueAt<=Date.now());
 return `${title('Keep what you learn','Kembali sebelum lupa.','Review adalah latihan mengambil kembali ide dari ingatan. Backlog dapat diatur ulang tanpa menghapus riwayat.')}<div class="banner">${due.length} konsep jatuh tempo. Sesi singkat menawarkan maksimal satu review prioritas dan satu langkah belajar berikutnya. ${btn('Today','#today','secondary small')}</div>${items.length?items.map(([concept,r])=>{const ex=catalog.exercises.find(e=>e.concepts.includes(concept)&&['coding','trace'].includes(e.kind));return `<section class="note-card"><div class="panel-heading"><div><div class="eyebrow">${r.dueAt<=Date.now()?'Ready to recall':'Upcoming review'}</div><h3 style="margin-top:7px">${esc(concept.replaceAll('-',' '))}</h3></div>${badge(ex?dateString(r.dueAt):'Historical','outline')}</div><p class="muted" style="font-size:13px">${ex?'Recall berguna; transfer membutuhkan variasi baru. Review gagal mendapat remedial, bukan hukuman.':'Materi terkait sudah berubah/tidak tersedia. Riwayat dipertahankan dan tidak menghalangi review lain.'}</p><div class="btn-row">${ex?btn('Mulai review',`#practice/${ex.id}?review=1`,'small'):''}<button class="btn secondary small" type="button" data-action="snooze" data-id="${esc(concept)}">Jadwalkan besok</button></div></section>`;}).join(''):empty('Belum ada review due.','Selesaikan satu latihan otomatis. Review berikutnya akan disusun dari bukti belajarmu.',btn('Pilih latihan','#practice','secondary'))}`;
}
function notes({state}){return `${title('Your thinking, made visible','Mistake notebook.','Catat asumsi yang keliru, edge case yang terlewat, dan apa yang akan kamu coba berikutnya.')}<section class="panel"><form data-form="note"><div class="form-grid"><label class="field">Judul<input name="title" maxlength="100" required placeholder="Contoh: batas kanan binary search"></label><label class="field">Kategori<select name="category"><option>Logic</option><option>Boundary</option><option>Input assumption</option><option>Complexity</option><option>Language syntax</option><option>Learning insight</option></select></label><label class="field wide">Apa yang terjadi, dan apa pelajarannya?<textarea name="body" rows="4" maxlength="12000" required placeholder="Saya mengira… Ternyata… Berikutnya saya akan…"></textarea></label></div><button class="btn" type="submit">Simpan insight</button></form></section><div class="section-title"><h2>Catatanmu</h2>${badge(`${state.notes.length} notes`)}</div>${state.notes.slice().reverse().map(n=>`<article class="note-card"><div class="panel-heading"><h3>${esc(n.title)}</h3>${badge(n.category)}</div><p>${esc(n.body)}</p><small>${dateString(n.at)}${n.exerciseId?` · <a href="#practice/${esc(n.exerciseId)}">${esc(n.exerciseId)}</a>`:''}</small><div class="btn-row section-gap"><button class="btn secondary small" data-action="edit-note" data-id="${esc(n.id)}">Edit</button><button class="btn danger small" data-action="delete-note" data-id="${esc(n.id)}">Hapus</button></div></article>`).join('')||empty('Ruang untuk belajar dari kesalahan.','Catatan pertama tidak perlu sempurna. Satu kalimat yang spesifik sudah berguna.')}`;}
function progress({state,catalog}){
 const concepts=[...new Set(catalog.exercises.flatMap(e=>e.concepts))];const items=concepts.map(c=>({concept:c,...deriveConcept(state,c,catalog.exercises)}));
 const retained=items.filter(x=>x.state==='Retained').length,independent=state.attempts.filter(a=>a.passed===true&&!a.assisted&&!a.stale).length;
 return `${title('Evidence over impressions','Lihat apa yang benar-benar tumbuh.','Completion, correctness, recall, transfer, dan retention adalah bukti yang berbeda. Tidak ada skor peluang diterima kerja.')}<div class="stats-row"><div class="stat"><div class="stat-label">Pelajaran dipelajari</div><strong>${Object.values(state.completedLessons).filter(x=>!x.stale).length}</strong><small>Bukan bukti penguasaan otomatis</small></div><div class="stat"><div class="stat-label">Percobaan mandiri benar</div><strong>${independent}</strong><small>Label bantuan dipisahkan</small></div><div class="stat"><div class="stat-label">Konsep retained</div><strong>${retained}</strong><small>Termasuk review tertunda nyata</small></div></div><div class="banner">Retained membutuhkan latihan berbeda, transfer baru, checkpoint, rubrik penjelasan self-review, dan review mandiri minimal tujuh hari setelah transfer. Konsep dengan cakupan variasi terbatas tetap introductory.</div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Konsep</th><th>Status</th><th>Recall / transfer</th><th>Bukti per bahasa</th></tr></thead><tbody>${items.map(x=>{const coverage=catalog.exercises.filter(e=>e.concepts.includes(x.concept)&&['coding','trace'].includes(e.kind));return `<tr><td><strong>${esc(x.concept.replaceAll('-',' '))}</strong><p>${coverage.length} aktivitas otomatis · ${coverage.some(e=>e.variant==='transfer')?'Transfer variant tersedia':'Cakupan introductory'}</p></td><td>${badge(x.state,x.state==='Retained'?'green':'outline')}<p>${esc(x.reason)}</p></td><td>${x.recallCount} / ${x.transferCount}</td><td>Python: ${x.languageEvidence.python||0}<br>C++: ${x.languageEvidence.cpp||0}</td></tr>`;}).join('')}</tbody></table></div></section><section class="panel section-gap"><h2>Riwayat percobaan</h2>${state.attempts.length?`<div class="table-wrap"><table><thead><tr><th>Aktivitas</th><th>Hasil</th><th>Evidence</th><th>Tanggal</th></tr></thead><tbody>${state.attempts.slice(-30).reverse().map(a=>`<tr><td><a href="#practice/${esc(a.exerciseId)}">${esc(a.exerciseId)}</a> · ${esc(a.language)}</td><td>${esc(a.status)}${a.stale?' · historical/stale':''}</td><td>${esc(a.evidenceMethod)}${a.assisted?' · assisted':''}${a.novelTransfer?' · novel transfer':''}${a.exposed?' · prior exposure':''}</td><td>${dateString(a.at)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted" style="margin-top:15px;font-size:14px">Belum ada percobaan. Mulai dengan pelajaran pertama.</p>'}</section>`;
}
export const VIZ={loop:['Loop & list trace','Lihat nilai berubah satu iterasi setiap langkah.'],reference:['Value vs reference','Bandingkan salinan nilai dan perubahan melalui reference C++.'],binary:['Binary search','Satu invariant, area pencarian yang semakin kecil.'],tree:['Tree traversal','Jelajahi complete binary tree dengan BFS atau DFS.'],graph:['Graph BFS / DFS','Ikuti frontier dan visited agar cycle tidak diulang.'],dp:['Dynamic programming','Bangun tabel jumlah cara menaiki tangga, satu transisi setiap langkah.']};
export function traceStage(trace,index,type){const step=trace[Math.max(0,Math.min(trace.length-1,index))];if(!step)return '';let body;
 if(step.edges){const n=step.values.length,coords=step.values.map((_,i)=>{if(type==='tree'){const d=Math.floor(Math.log2(i+1)),start=2**d-1;return [(i-start+1)*600/(2**d+1),28+d*60];}const angle=i*2*Math.PI/n-Math.PI/2;return [300+Math.cos(angle)*170,120+Math.sin(angle)*90];});body=`<svg class="graph-svg" viewBox="0 0 600 250" role="img" aria-label="Traversal state: ${esc(step.text)}">${step.edges.map(([a,b])=>`<line x1="${coords[a][0]}" y1="${coords[a][1]}" x2="${coords[b][0]}" y2="${coords[b][1]}"/>`).join('')}${step.values.map((v,i)=>`<g class="${step.active===i?'active':step.visited?.includes(i)?'visited':''}"><circle cx="${coords[i][0]}" cy="${coords[i][1]}" r="18"/><text x="${coords[i][0]}" y="${coords[i][1]}">${esc(v)}</text></g>`).join('')}</svg>`;
 }else body=`<div class="array-view">${step.values.map((v,i)=>`<div class="array-cell ${step.active===i?'active':''} ${step.left!==undefined&&(i<step.left||i>step.right)?'outside':''}"><div class="value">${v===null?'?':esc(v)}</div><small>${type==='reference'?(i===0?'original':'copy'):`[${i}]`}${step.left===i?' · L':''}${step.right===i?' · R':''}${step.mid===i?' · M':''}</small></div>`).join('')||'<p class="muted">Input kosong</p>'}</div>`;
 return `<div class="visual-stage">${body}</div><div class="visual-explanation" aria-live="polite"><strong>Langkah ${index+1} / ${trace.length}</strong><p>${esc(step.text)}</p>${step.frontier?`<small>Frontier: [${esc(step.frontier.join(', '))}] · Visited: [${esc(step.visited.join(', '))}]</small>`:''}</div>`;
}
function visualizers({ui}){const type=ui.visualType||'loop',input=ui.vizInput||{},trace=ui.trace||buildTrace(type);return `${title('Algorithm studio','Jalankan idenya, satu langkah.','Visualizer menggunakan algoritma referensi yang diuji, bukan debugger untuk sembarang kode pengguna.')}<div class="grid grid-3">${Object.entries(VIZ).map(([key,[name,description]])=>`<button type="button" class="module-card ${type===key?'selected':''}" data-action="viz-select" data-value="${key}" aria-pressed="${type===key}"><div class="eyebrow">${type===key?'Selected':'Reference visualizer'}</div><h3>${name}</h3><p style="min-height:0">${description}</p></button>`).join('')}</div><section class="panel section-gap"><div class="panel-heading"><h2>${VIZ[type][0]}</h2>${badge('Reference algorithm','green')}</div><form class="filter-bar" data-form="visual-input">${['loop','binary','tree'].includes(type)?`<label class="field" style="flex:1">${type==='tree'?'Nilai complete binary tree (maks. 15)':'Array angka, dipisah koma'}<input name="values" value="${esc(input.valuesText??(type==='tree'?'8,4,12,2,6,10,14':'2,4,6,8,10'))}" placeholder="2,4,6,8,10"></label>`:''}${type==='binary'?`<label class="field">Target<input type="number" name="target" value="${input.target??6}"></label>`:''}${['tree','graph'].includes(type)?`<label class="field">Traversal<select name="method"><option value="bfs" ${input.method==='bfs'?'selected':''}>BFS</option><option value="dfs" ${input.method==='dfs'?'selected':''}>DFS</option></select></label>`:''}${type==='graph'?`<label class="field">Nodes (1–12)<input name="nodeCount" type="number" min="1" max="12" value="${input.nodeCount??6}"></label><label class="field" style="flex:1">Directed edges a-b, dipisah koma<input name="edges" value="${esc(input.edgesText??'0-1,0-2,1-3,2-3,2-4,3-0,4-5')}"></label><label class="field">Start<input name="start" type="number" min="0" max="11" value="${input.start??0}"></label>`:''}${type==='dp'?`<label class="field">Jumlah anak tangga (0–12)<input name="n" type="number" min="0" max="12" value="${input.n??6}"></label>`:''}${type!=='reference'?'<button class="btn secondary" type="submit">Terapkan input</button>':''}</form><div id="visual-stage">${traceStage(trace,ui.visualStep||0,type)}</div><div class="visual-controls"><button class="btn secondary small" data-action="viz-prev" aria-label="Langkah sebelumnya">${icon('left')}</button><button class="btn small" data-action="viz-play">${icon(ui.visualPlaying?'pause':'play')} ${ui.visualPlaying?'Pause':'Play'}</button><button class="btn secondary small" data-action="viz-next" aria-label="Langkah berikutnya">${icon('arrow')}</button><button class="btn secondary small" data-action="viz-reset">Reset</button><label class="inline-label">Kecepatan <select id="viz-speed" aria-label="Kecepatan animasi"><option value="1500">Pelan</option><option value="900" selected>Normal</option><option value="400">Cepat</option></select></label></div><div class="footer-note">Teks state tersedia pada setiap langkah. Dengan reduced motion, pergantian state tetap dapat dikontrol tanpa transisi.</div></section>`;}
function interview({state,ui,catalog}){const session=state.interview||{},seconds=session.pausedSeconds??2700;const ex=catalog.exercises.find(e=>e.id===session.exerciseId);return `${title('Practice the conversation','Berpikir jelas, di bawah tekanan.','Latihan mandiri dengan timer opsional dan rubrik. Tidak ada evaluator AI atau skor peluang lolos.')}<div class="grid grid-2"><section class="panel"><div class="eyebrow">Coding round · optional timer</div><div class="timer" id="interview-timer">${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}</div><div class="btn-row"><button class="btn" data-action="timer-toggle">${session.deadline?'Pause':'Start'} timer</button><button class="btn secondary" data-action="timer-reset">Reset 45 min</button></div><div class="divider"></div><p class="muted" style="font-size:14px">Minta klarifikasi, jelaskan pendekatan awal, lalu implementasikan. Uji edge cases sebelum menyatakan selesai.</p><div class="section-gap">${ex?`<h3>${esc(ex.title)}</h3><div class="section-gap">${btn('Buka interview problem',`#practice/${ex.id}?interview=1`)}</div>`:'<p class="muted">Pilih satu soal coding tanpa label pola.</p>'}<button class="btn secondary section-gap" data-action="interview-pick">Pilih problem baru</button></div></section><section class="panel"><div class="eyebrow">After the round</div><h2 style="margin:12px 0 18px">Review caramu berpikir.</h2><form data-form="interview-review"><div class="rubric">${['Saya mengklarifikasi input, batasan, dan expected output.','Saya menjelaskan brute force dan alasan optimasi.','Saya menulis implementasi yang dapat diuji.','Saya menguji normal, boundary, dan counterexample.','Saya menjelaskan correctness serta time/space complexity.','Saya mengkomunikasikan keputusan dengan jelas.'].map((x,i)=>`<label><input type="checkbox" name="rubric-${i}"><span>${esc(x)}</span></label>`).join('')}</div><label class="field section-gap">Apa satu perbaikan terpenting?<textarea name="reflection" rows="3" required minlength="10"></textarea></label><button class="btn" type="submit">Simpan self-review</button></form></section></div><div class="section-title"><h2>Simulasi sebelumnya</h2></div>${(state.interviews||[]).slice().reverse().map(x=>`<div class="note-card"><h3>${dateString(x.at)} · ${esc(x.exerciseId||'General practice')}</h3><p>${esc(x.reflection)}</p><small>Self-review: ${x.checked}/6 kriteria dicentang; bukan penilaian pewawancara.</small></div>`).join('')||empty('Belum ada simulasi tersimpan.','Mulai dari sesi pendek. Kamu boleh pause timer untuk kebutuhan aksesibilitas.')}`;}
function career({state,catalog}){
 const checkpoint=state.settings.roleReviewedAt,foundation=catalog.lessons.filter(l=>['m01','m02','m03','m04'].includes(l.moduleId)).filter(l=>state.completedLessons[l.id]).length;
 const mapping=[['Programming foundation','Python dan C++ dasar',`${foundation}/16 foundation lessons`,'#module/m01'],['Problem solving','DSA, testing, explanation','Lihat evidence, bukan hanya jumlah soal','#progress'],['Engineering project','README, tests, trade-offs','Minimal satu proyek lengkap','#module/m25'],['Systems and data','DB, HTTP, OS, desain sesuai level','Fondasi, bukan seluruh tuntutan senior role','#module/m26'],['Communication','English explanation dan STAR stories','Self-review + mock dengan manusia bila tersedia','#module/m28']];
 return `${title('Direction before distance','Bangun bukti untuk langkah berikutnya.','Periksa target role lebih awal dan setelah core patterns. Aplikasi mendukung persiapan; eligibility dan keputusan hiring tetap terpisah.')}<div class="banner">${checkpoint?`Target terakhir ditinjau ${dateString(checkpoint)}. Tinjau ulang setelah fondasi, setelah core patterns, atau ketika arah berubah.`:'Checkpoint awal: pilih role, level, dan pasar sebelum mengunci seluruh rencana belajar.'}</div><div class="grid grid-2"><section class="panel"><h2>Role-fit checkpoint</h2><form data-form="role" class="section-gap"><div class="form-grid"><label class="field">Role<select name="role">${['Software Engineer','Backend Engineer','Frontend Engineer','SDET'].map(r=>`<option ${state.settings.role===r?'selected':''}>${r}</option>`).join('')}</select></label><label class="field">Level<select name="level">${['Entry / junior','Mid-level','Exploring'].map(x=>`<option ${state.settings.level===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field wide">Lokasi / preferensi kerja<input name="region" value="${esc(state.settings.targetRegion||'')}" placeholder="Indonesia, remote, atau relocation"></label><label class="field wide">Kebutuhan role yang ingin dipetakan<textarea name="requirements" rows="4" placeholder="Dari deskripsi pekerjaan: skills, pengalaman, bahasa, project evidence…">${esc(state.settings.roleRequirements||'')}</textarea></label></div><button class="btn" type="submit">Simpan checkpoint</button></form></section><section class="panel"><div class="eyebrow">Your evidence map</div><h2 style="margin:10px 0 20px">Dari belajar ke bukti.</h2>${mapping.map(([name,need,status,link])=>`<a class="lesson-row" href="${link}"><div class="row-text"><h3>${name}</h3><p>${need}<br>${status}</p></div>${icon('arrow')}</a>`).join('')}<div class="footer-note">Gunakan deskripsi role aktual untuk menemukan gap di luar scope. Jalur SDET menambah bukti test strategy/automation; backend menambah API/data/design. Checklist ini advisory, bukan bukti memenuhi semua syarat perusahaan.</div></section></div><div class="section-title"><h2>Project, story, dan lamaran</h2>${badge('Manual workspace')}</div><section class="panel"><form data-form="career"><div class="form-grid"><label class="field">Jenis<select name="type"><option value="project">Project</option><option value="story">STAR story</option><option value="application">Application</option><option value="gap">Skill gap</option></select></label><label class="field">Judul<input name="title" required maxlength="150" placeholder="Contoh: Test dependency scheduler"></label><label class="field wide">Catatan / bukti / next step<textarea name="body" rows="3" required maxlength="16000"></textarea></label></div><button class="btn" type="submit">Tambah ke workspace</button></form></section>${state.career.slice().reverse().map(x=>`<article class="note-card"><div class="panel-heading"><h3>${esc(x.title)}</h3>${badge(x.type)}</div><p>${esc(x.body)}</p><div class="btn-row"><label class="inline-label">Status <select data-career-status="${esc(x.id)}">${['Planned','In progress','Complete'].map(y=>`<option ${x.status===y?'selected':''}>${y}</option>`).join('')}</select></label><button class="btn secondary small" data-action="edit-career" data-id="${esc(x.id)}">Edit</button><button class="btn danger small" data-action="delete-career" data-id="${esc(x.id)}">Hapus</button><span class="inline-label">Self-reported · ${dateString(x.at)}</span></div></article>`).join('')}<div class="footer-note">Tracker ini tidak mengirim lamaran atau pesan. Referensi: <a href="https://amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics" target="_blank" rel="noopener noreferrer">Amazon interview topics ↗</a> · <a href="https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing" target="_blank" rel="noopener noreferrer">Microsoft technical interviewing ↗</a></div>`;
}
function settings({state,ui}){return `${title('Make room for learning','Workspace settings.','Atur kenyamanan membaca, urutan belajar, serta backup progresmu.')}<div class="grid grid-2"><section class="panel"><h2>Preferensi belajar</h2><form data-form="settings" class="section-gap"><label class="field">Nama<input name="name" value="${esc(state.settings.name)}" maxlength="80" required></label><div class="form-grid"><label class="field">Bahasa utama latihan<select name="primaryLanguage"><option value="python" ${state.settings.primaryLanguage==='python'?'selected':''}>Python</option><option value="cpp" ${state.settings.primaryLanguage==='cpp'?'selected':''}>C++</option></select></label><label class="field">Sesi default<select name="sessionMinutes">${[15,45,90].map(n=>`<option value="${n}" ${state.settings.sessionMinutes===n?'selected':''}>${n} menit</option>`).join('')}</select></label><label class="field">Tema<select name="theme"><option value="light" ${state.settings.theme==='light'?'selected':''}>Light</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dark</option></select></label><label class="field">Ukuran teks<select name="fontSize">${[16,18,20,22,24].map(n=>`<option value="${n}" ${state.settings.fontSize===n?'selected':''}>${n} px</option>`).join('')}</select></label><label class="field wide">Urutan belajar<select name="route"><option value="interleaved" ${state.settings.route==='interleaved'?'selected':''}>Python dasar → orientasi C++ → DSA + bridge bertahap</option><option value="sequential" ${state.settings.route==='sequential'?'selected':''}>Python → seluruh fondasi C++ → DSA berurutan</option></select></label></div><button class="btn" type="submit">Simpan preferensi</button></form></section><section><div class="panel"><h2>Backup & recovery</h2><p class="muted" style="font-size:14px;margin:14px 0 20px">Progres berada di browser/perangkat ini. Membersihkan browser atau mengubah alamat aplikasi dapat menghilangkan data. Export secara berkala.</p><div class="btn-row"><button class="btn" data-action="export">${icon('download')} Export JSON</button><label class="btn secondary" for="import-file">Import backup</label><input id="import-file" type="file" accept="application/json,.json" class="hidden"></div><div class="footer-note">Backup schema 1. Import memakai replace setelah preview; exposure solusi yang sudah diketahui dipertahankan. Riwayat konten lama tidak dibuang, tetapi evidence yang tidak cocok ditandai stale.</div></div><div class="panel section-gap"><h3>Execution availability</h3><div class="tag-row">${badge('Python · browser / CDN','green')}${badge(state.settings.cppAvailable?'C++ · API configured':'C++ · not configured')}</div><p class="muted" style="font-size:13px">Python memerlukan koneksi untuk unduhan runtime pertama. Tiap case memakai environment baru; Run tidak mewariskan state ke Submit. C++ membutuhkan sandbox backend nyata.</p><button class="btn secondary small section-gap" data-action="check-cpp">Periksa C++ API</button><details class="section-gap"><summary style="font-size:13px">C++ lokal dan integrasi</summary><p class="muted" style="font-size:12px;margin-top:12px">Gunakan compiler C++17 di mesinmu. Simpan sebagai main.cpp, compile dan uji dengan input contoh. Hasil lokal tetap self-reported sampai diuji runner.</p>${codeBlock('g++ -std=c++17 -Wall -Wextra main.cpp -o main\n./main','shell')}<p class="muted" style="font-size:12px">Node backend proyek menyediakan /api/submissions. Operator mengatur JUDGE0_URL, JUDGE0_LANGUAGE_ID dan token hanya di server; tidak ada API secret di aplikasi. Hosting static tidak menyediakan compiler otomatis.</p></details></div><div class="panel danger-zone section-gap"><h3>Hapus progres lokal</h3><p class="muted" style="font-size:13px;margin:12px 0">Export dulu. Tindakan ini hanya menghapus data aplikasi pada browser ini.</p><button class="btn danger small" data-action="clear-data">Hapus dengan konfirmasi</button></div></section></div><div class="footer-note">DSA Journey · Original learning content · No third-party analytics. Durasi 600–800 jam adalah estimasi scope, bukan jaminan pribadi. Reference code C++ harus divalidasi melalui compiler sebelum dianggap teruji.</div>`;}

```


## dist\views-lab.js
```javascript
import {esc,icon,badge,btn,title,empty,codeBlock,sourceLinks,kindLabel,exerciseCard} from './ui.js';
export function practiceList({state,catalog},query){const term=(query.get('search')||'').toLowerCase(),kind=query.get('kind')||'';const items=catalog.exercises.filter(e=>(!kind||e.kind===kind)&&(e.title+' '+e.concepts.join(' ')).toLowerCase().includes(term));return `${title('Practice with intention','Pahami pola. Uji kemampuan.','Latihan coding, tracing, dan refleksi. Gunakan hint saat perlu, kemudian kembali ke variasi mandiri.')}<form class="filter-bar" data-search="practice"><input type="search" name="search" aria-label="Cari latihan" value="${esc(query.get('search')||'')}" placeholder="Cari judul atau konsep…"><select name="kind" aria-label="Jenis aktivitas"><option value="">Semua aktivitas</option>${Object.entries(kindLabel).map(([k,v])=>`<option value="${k}" ${kind===k?'selected':''}>${v}</option>`).join('')}</select><button class="btn secondary" type="submit">Terapkan</button></form><div class="panel-heading"><span class="muted" style="font-size:12px">${items.length} aktivitas · ${catalog.exercises.filter(e=>e.kind==='coding').length} coding problems</span><a href="#interview" style="font-size:12px">Coba tanpa label pola ↗</a></div>${items.map(e=>exerciseCard(e,state)).join('')||empty('Belum ada hasil.','Ubah pencarian atau reset filter.',btn('Reset','#practice','secondary'))}`;}
function problemBody(e,hideTags){return `${hideTags?'':`<div class="tag-row">${badge(e.difficulty,'green')}${badge(kindLabel[e.kind])}${badge(e.variant==='transfer'?'Transfer variant':'Practice')}</div>`}<h2>${esc(e.title)}</h2><p>${esc(e.statement)}</p>${e.inputDescription?`<h3>Input</h3><p>${esc(e.inputDescription)}</p>`:''}${e.outputDescription?`<h3>Output</h3><p>${esc(e.outputDescription)}</p>`:''}${(e.examples||[]).map((x,i)=>`<h3>Contoh ${i+1}</h3><span class="inline-label">Input</span><pre class="example-pre">${esc(x.input)}</pre><span class="inline-label">Output</span><pre class="example-pre">${esc(x.output)}</pre>${x.explanation?`<p class="muted">${esc(x.explanation)}</p>`:''}`).join('')}${e.constraints?.length?`<h3>Batasan</h3><ul>${e.constraints.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}<div class="footer-note">${esc(e.id)} · Content v${e.version} · ${e.estimatedMinutes||15} menit</div>`;}
export function resultView(ui){if(!ui.results?.length)return `<div class="runtime-status" role="status">${esc(ui.runStatus||'Output dan hasil pengujian akan muncul di sini.')}</div>`;return `<div class="runtime-status" role="status">${esc(ui.runStatus)}</div>${ui.results.map((r,i)=>`<details class="test-row" ${ui.results.length===1?'open':''}><summary class="${r.passed===true?'passed':r.passed===false?'failed':'muted'}">${r.passed===true?'✓':r.passed===false?'×':'○'} ${ui.resultMode==='run'?'Custom run':`Case ${i+1}`} · ${esc(r.status)}</summary><span class="inline-label">stdout</span><pre>${esc(r.stdout||'(kosong)')}</pre>${r.expected!==undefined?`<span class="inline-label">expected</span><pre>${esc(r.expected)}</pre>`:''}${r.stderr?`<span class="inline-label">stderr</span><pre>${esc(r.stderr)}</pre>`:''}${r.compileOutput?`<span class="inline-label">compile output</span><pre>${esc(r.compileOutput)}</pre>`:''}</details>`).join('')}`;}
export function practiceView({state,catalog,ui},id,query){
 const e=catalog.exercises.find(x=>x.id===id);if(!e)return empty('Latihan tidak ditemukan.','Pilih dari katalog.',btn('Practice lab','#practice'));
 const hideTags=query.get('interview')==='1',review=query.get('review')==='1',language=ui.language||state.settings.primaryLanguage,hints=state.assistance?.[id]||0;let left;
 if(ui.labTab==='hints')left=`<h2>Petunjuk bertahap</h2><p class="muted">Bantuan adalah bagian belajar. Percobaan ini akan diberi label assisted.</p>${(e.hints||[]).slice(0,hints).map((h,i)=>`<div class="hint-box"><strong>Hint ${i+1}</strong><p>${esc(h)}</p></div>`).join('')}<button class="btn secondary section-gap" type="button" data-action="hint" data-id="${id}" ${hints>=(e.hints?.length||0)?'disabled':''}>Buka hint berikutnya</button>`;
 else if(ui.labTab==='solution')left=`<h2>Pembahasan</h2><div class="banner">Exposure solusi tersimpan lintas percobaan. Mengulang soal ini dapat melatih recall; transfer membutuhkan variasi yang belum terpapar.</div><p>${esc(e.explanation)}</p>${e.solutions?.[language]?codeBlock(e.solutions[language],language):''}${e.complexity?`<h3>Kompleksitas</h3><p>Time: ${esc(e.complexity.time)}<br>Space: ${esc(e.complexity.space)}</p>`:''}${sourceLinks(e.sources)}`;
 else left=problemBody(e,hideTags);
 const tabButtons=`<div class="tabs"><button type="button" data-action="lab-tab" data-value="problem" class="${ui.labTab==='problem'?'active':''}">Problem</button><button type="button" data-action="lab-tab" data-value="hints" class="${ui.labTab==='hints'?'active':''}" ${hideTags?'disabled':''}>Hints</button><button type="button" data-action="lab-tab" data-value="solution" class="${ui.labTab==='solution'?'active':''}" ${hideTags?'disabled':''}>Explanation</button></div>`;
 const source=state.drafts[id]?.[language]??e.starter?.[language]??(language==='python'?'# Tulis solusi di sini\n':'#include <iostream>\nint main() {\n    // Tulis solusi\n}\n');
 const coding=`<div class="lab-code"><div class="editor-wrap"><div class="editor-toolbar"><label><span class="inline-label">Bahasa </span><select id="code-language" aria-label="Bahasa coding"><option value="python" ${language==='python'?'selected':''}>Python 3.12</option><option value="cpp" ${language==='cpp'?'selected':''}>C++17</option></select></label><small>${language==='python'?'Local · fresh environment':'Remote · sandbox provider'}</small></div>${language==='cpp'&&!state.settings.cppAvailable?`<div class="banner warning" style="margin:12px">C++ runner belum dikonfigurasi. Materi dan kode referensi tetap tersedia. <a href="#settings">Lihat setup dan compile lokal</a>.</div>`:''}<label class="hidden" for="code-editor">Kode solusi</label><textarea id="code-editor" data-exercise-id="${esc(e.id)}" class="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Kode solusi ${language}">${esc(source)}</textarea><div class="editor-help">Tab berpindah fokus · Ctrl+Enter menjalankan contoh · kode tersimpan otomatis</div></div><div class="run-toolbar"><div class="btn-row"><button class="btn secondary small" type="button" data-action="run" ${ui.busy?'disabled':''}>${icon('play')} Run</button><button class="btn small" type="button" data-action="submit" ${ui.busy?'disabled':''}>Submit · ${e.tests?.length||0} cases</button>${ui.busy?'<button class="btn danger small" data-action="stop" type="button">Stop</button>':''}</div><button class="btn secondary small" type="button" data-action="reset-code">Reset code</button></div><div class="result-area"><label class="inline-label" for="custom-input">Custom input (untuk Run)</label><textarea id="custom-input" aria-label="Custom input" spellcheck="false">${esc(state.drafts[id]?.stdin??e.examples?.[0]?.input??'')}</textarea><div id="run-results" class="section-gap" aria-live="polite">${resultView(ui)}</div>${state.pendingRun?'<div class="banner warning section-gap">Ada job C++ yang dapat dipulihkan.<button class="btn secondary small" type="button" data-action="recover">Recover job</button></div>':''}</div></div>`;
 const noncoding=`<div class="lab-code"><form class="panel" data-form="activity" data-id="${id}" style="border:0"><div class="eyebrow">${e.kind==='trace'?'Predict before you run':'Reflect & apply'}</div><h2 style="margin:12px 0 20px">${e.kind==='trace'?'Apa prediksimu?':'Tulis bukti pemahamanmu.'}</h2>${e.kind==='trace'&&e.answer?.options?e.answer.options.map((x,i)=>`<label class="choice"><input type="radio" name="answer" value="${i}" required><span>${esc(x)}</span></label>`).join(''):`<label class="field">Jawaban / catatan implementasi<textarea name="reflection" rows="8" minlength="20" required placeholder="Jelaskan keputusan, contoh, edge case, dan hal yang masih belum jelas…">${esc(typeof state.reflections?.[id]==='string'?state.reflections[id]:'')}</textarea></label><div class="rubric">${(e.rubric||[]).map((r,i)=>`<label><input type="checkbox" name="criterion-${i}" required><span>${esc(r)}</span></label>`).join('')}</div><div class="banner">Aktivitas ini menggunakan rubrik dan self-review, bukan penilaian otomatis atas kebenaran penjelasan.</div>`}<button class="btn section-gap" type="submit">${e.kind==='trace'?'Periksa prediksi':'Simpan refleksi'}</button><div id="activity-feedback" class="section-gap" role="status"></div></form></div>`;
 return `${title(review?'Active recall':hideTags?'Interview practice':'The practice lab',hideTags?'Selesaikan dan jelaskan.':'Dari ide menjadi kode.',hideTags?'Pattern tags dan hints disembunyikan. Timer berada di Interview room.':'Buat solusi yang benar, pahami mengapa, lalu uji batasnya.')}<div class="lab-mobile-tabs tabs"><button data-action="mobile-tab" data-value="problem" class="${ui.mobileTab==='problem'?'active':''}">Problem</button><button data-action="mobile-tab" data-value="code" class="${ui.mobileTab==='code'?'active':''}">${e.kind==='coding'?'Code':'Answer'}</button><button data-action="mobile-tab" data-value="results" class="${ui.mobileTab==='results'?'active':''}">Results</button></div><div class="lab" data-tab="${ui.mobileTab||'problem'}"><section class="lab-problem">${tabButtons}${left}</section>${e.kind==='coding'?coding:noncoding}</div><div class="btn-row section-gap">${btn('Kembali ke modul',`#module/${e.moduleId}`,'secondary small')}<button class="btn secondary small" data-action="new-attempt" type="button">Mulai percobaan baru</button><button class="btn secondary small" data-action="note-attempt" data-id="${id}" type="button">Catat insight</button><button class="btn secondary small" data-action="explain" data-id="${id}" type="button">Jelaskan solusi</button></div>`;
}

```


## dist\views.js
```javascript
import {esc,icon,badge,btn,title,empty,codeBlock,sourceLinks,kindLabel,exerciseCard} from './ui.js';
import {today} from './dashboard.js';
import {practiceView,practiceList} from './views-lab.js';
import {extraView} from './views-extra.js';
export const pageNames={today:'Today',roadmap:'Learning path',module:'Learning path',learn:'Lesson',practice:'Practice lab',review:'Review queue',notes:'Mistake notebook',progress:'Your progress',visualizers:'Algorithm studio',interview:'Interview room',career:'Career workspace',settings:'Settings'};
export const lessonDone=(s,id)=>Boolean(s.completedLessons[id]&&!s.completedLessons[id].stale);
export function shell(route,{state,catalog,ui}){
 const active=['module','learn'].includes(route.page)?'roadmap':route.page;
 const nav=(key,label,i)=>`<a class="nav-link ${active===key?'active':''}" href="#${key}" ${active===key?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${key==='review'&&ui.dueCount?`<span class="count">${ui.dueCount}</span>`:''}</a>`;
 return `<aside class="sidebar" id="sidebar" aria-label="Navigasi utama"><a href="#today" class="brand"><span class="brand-mark">d.</span><span>DSA Journey<small>LEARN. TRACE. BUILD.</small></span></a><nav><div class="nav-group"><p class="eyebrow">Your workspace</p>${nav('today','Today','home')}${nav('roadmap','Learning path','map')}${nav('practice','Practice lab','code')}${nav('visualizers','Algorithm studio','play')}</div><div class="nav-group"><p class="eyebrow">Build understanding</p>${nav('review','Review queue','review')}${nav('notes','Mistake notebook','note')}${nav('progress','Your progress','chart')}</div><div class="nav-group"><p class="eyebrow">The next chapter</p>${nav('interview','Interview room','target')}${nav('career','Career workspace','briefcase')}${nav('settings','Settings','settings')}</div></nav><div class="sidebar-bottom"><div class="path-note"><strong>Python + C++</strong>Pahami idenya.<br>Tulis. Uji. Ulangi.</div><div class="sidebar-footer"><span class="dot"></span> Your pace. Real understanding.</div></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-toggle" type="button" data-action="toggle-nav" aria-label="Buka navigasi" aria-expanded="false">${icon('menu')}</button><span>Your workspace</span><span>/</span><strong>${esc(pageNames[route.page]||'Today')}</strong></div><div class="top-actions"><span id="save-status" class="save-status">${esc(ui.saveStatus||'Progres disimpan di perangkat ini')}</span><button class="icon-btn" type="button" data-action="theme" aria-label="Ubah tema">${icon('sun')}</button><a class="avatar" href="#settings" aria-label="Pengaturan profil">${esc((state.settings.name||'R').slice(0,2).toUpperCase())}</a></div></header><main id="main" class="main">${ui.storageWarning?`<div class="banner error" role="alert">${esc(ui.storageWarning)} ${btn('Export backup','#settings','small secondary')}</div>`:''}${renderPage(route,{state,catalog,ui})}</main></div>`;
}
function renderPage(route,ctx){if(route.page==='today')return today(ctx);if(route.page==='roadmap')return roadmap(ctx,route.query);if(route.page==='module')return modulePage(ctx,route.id);if(route.page==='learn')return lesson(ctx,route.id);if(route.page==='practice')return route.id?practiceView(ctx,route.id,route.query):practiceList(ctx,route.query);return extraView(route,ctx);}
function roadmap({state,catalog},query){const search=(query.get('search')||'').toLowerCase(),modules=catalog.modules.filter(m=>(m.title+' '+m.description+' '+m.stage).toLowerCase().includes(search)),groups=[...new Set(modules.map(m=>m.stage))];return `${title('The learning path','Dari nol, menuju pemahaman.','28 modul. Python dan C++. Fondasi dulu, kedalaman menyusul. Jelajahi materi dan gunakan prasyarat sebagai panduan.')}<form class="filter-bar" data-search="roadmap"><input type="search" name="search" placeholder="Cari topik: array, Python, graph…" aria-label="Cari modul" value="${esc(query.get('search')||'')}"><button class="btn secondary" type="submit">Cari modul</button></form><div class="banner">Jalur aktif: <strong>${state.settings.route==='interleaved'?'Python + C++ bertahap':'Berurutan'}</strong>. Ubah di <a href="#settings">Settings</a>. Python tetap dilatih selama bridge C++.</div>${groups.map((stage,i)=>`<div class="stage-header"><span class="stage-number">${String(i+1).padStart(2,'0')}</span><h2>${esc(stage)}</h2></div><div class="grid grid-3">${modules.filter(m=>m.stage===stage).map(m=>{const done=m.lessonIds.filter(id=>lessonDone(state,id)).length;return `<a class="module-card" href="#module/${m.id}"><div class="eyebrow">Module ${m.id.slice(1)} ${done===m.lessonIds.length?'· STUDIED':''}</div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><div class="meta"><span>${m.lessonIds.length} pelajaran · ${m.exerciseIds.length} latihan</span><span>${done}/${m.lessonIds.length}</span></div><div class="progress-track"><span style="width:${done/m.lessonIds.length*100}%"></span></div></a>`;}).join('')}</div>`).join('')||empty('Tidak ada modul cocok.','Coba kata yang lebih umum.',btn('Reset pencarian','#roadmap','secondary'))}`;}
function modulePage({state,catalog},id){const m=catalog.modules.find(x=>x.id===id);if(!m)return empty('Modul tidak ditemukan.','Pilih modul dari learning path.',btn('Learning path','#roadmap'));return `${title(`Module ${m.id.slice(1)} · ${m.stage}`,m.title,m.description)}<div class="grid grid-2"><section class="panel"><div class="panel-heading"><h2>Empat langkah belajar</h2>${badge(`${m.estimatedHours?.join('–')||'15–20'} jam`,'outline')}</div>${m.lessonIds.map((id,i)=>{const l=catalog.lessons.find(x=>x.id===id);return `<a class="lesson-row" href="#learn/${id}"><span class="row-number">${lessonDone(state,id)?icon('check'):i+1}</span><div class="row-text"><h3>${esc(l?.title||id)}</h3><p>${l?.minutes||20} menit · ${lessonDone(state,id)?'Sudah dipelajari':'Lesson + checkpoint'}</p></div>${icon('arrow')}</a>`;}).join('')}<div class="footer-note">${(m.prerequisites||[]).length?'Prasyarat yang disarankan: '+m.prerequisites.map(x=>`<a href="#module/${esc(x)}">${esc(x.toUpperCase())}</a>`).join(', '):'Tidak memerlukan pengalaman programming sebelumnya.'}</div></section><section><div class="panel-heading"><h2>Latihan penerapan</h2><span class="muted" style="font-size:12px">${m.exerciseIds.length} aktivitas</span></div>${m.exerciseIds.map(id=>exerciseCard(catalog.exercises.find(x=>x.id===id),state)).join('')}</section></div>`;}
function lesson({state,catalog},id){const l=catalog.lessons.find(x=>x.id===id);if(!l)return empty('Pelajaran tidak ditemukan.','Kembali ke learning path.',btn('Learning path','#roadmap'));const m=catalog.modules.find(x=>x.id===l.moduleId),next=catalog.lessons[catalog.lessons.indexOf(l)+1],cp=l.checkpoint;return `${title(`Module ${l.moduleId.slice(1)} · ${l.minutes} min`,l.title,'Baca, prediksi, lalu coba. Menandai pelajaran selesai tidak otomatis berarti menguasai.')}<div class="lesson-layout"><article class="reading"><div class="objectives"><h3>Setelah pelajaran ini, kamu bisa…</h3><ul>${l.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></div>${l.blocks.map(b=>b.type==='code'?codeBlock(b.code,b.language):b.type==='callout'?`<aside class="callout"><h3>${esc(b.title||'Perhatikan')}</h3><p>${esc(b.body)}</p></aside>`:`<section>${b.title?`<h2>${esc(b.title)}</h2>`:''}<p>${esc(b.body)}</p></section>`).join('')}<form class="checkpoint" data-form="checkpoint" data-id="${l.id}"><div class="eyebrow">Check your understanding</div><h3>${esc(cp.question)}</h3>${cp.options.map((o,i)=>`<label class="choice"><input type="radio" name="answer" value="${i}" required><span>${esc(o)}</span></label>`).join('')}<div class="btn-row section-gap"><button class="btn" type="submit">Periksa pemahaman</button>${state.checkpointScores[l.id]===1?badge('Checkpoint passed','green'):''}</div><div id="checkpoint-feedback" class="section-gap" role="status"></div></form><div class="panel"><h3>Rangkum dengan kata-katamu</h3><ul>${l.summary.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><label class="choice"><input type="checkbox" id="lesson-reflection" ${state.reflections?.[l.id]?'checked':''}><span>Saya sudah mencoba menjelaskan kembali tanpa membaca.</span></label><button class="btn" data-action="complete-lesson" data-id="${l.id}" type="button">${lessonDone(state,l.id)?'Sudah dipelajari ✓':'Tandai dipelajari'}</button></div><div class="section-title"><h2>Coba terapkan</h2></div>${l.exerciseIds.map(eid=>catalog.exercises.find(e=>e.id===eid)).filter(Boolean).map(e=>exerciseCard(e,state)).join('')||'<p class="muted">Latihan terkait ada di halaman modul.</p>'}${sourceLinks(l.sources)}<div class="footer-note">Content v${l.version} · ${esc(l.id)} · Materi orisinal; sumber untuk pendalaman.</div><div class="btn-row section-gap">${btn('Kembali ke modul',`#module/${m.id}`,'secondary')}${next?btn('Pelajaran berikutnya',`#learn/${next.id}`):btn('Mulai review','#review')}</div></article><aside class="lesson-side"><div class="panel"><h3>Dalam modul ini</h3>${m.lessonIds.map((eid,i)=>{const item=catalog.lessons.find(x=>x.id===eid);return `<a class="lesson-row" href="#learn/${eid}" ${id===eid?'aria-current="page"':''}><span class="row-number">${lessonDone(state,eid)?'✓':i+1}</span><h3 class="row-title">${esc(item.title)}</h3></a>`;}).join('')}<div class="footer-note">${btn('Algorithm studio','#visualizers','secondary small')}</div></div></aside></div>`;}

```


## scripts\build-standalone.mjs
```javascript
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
const root=new URL('../',import.meta.url),dist=new URL('../dist/',import.meta.url);
const names=['core.js','ui.js','storage.js','runner.js','dashboard.js','views-lab.js','views-extra.js','views.js','app.js'];
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

```


## server.mjs
```javascript
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBroker, brokerError } from './cpp-broker.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSP = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'self'";
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };

export function createJudge0Provider(env = process.env, fetcher = fetch) {
  if (!env.JUDGE0_URL) return null;
  const base = new URL(env.JUDGE0_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !/^[1-9]\d*$/.test(env.JUDGE0_LANGUAGE_ID ?? '')) {
    throw new Error('Judge0 requires an HTTPS URL without credentials/query and a positive JUDGE0_LANGUAGE_ID.');
  }
  const languageId = Number(env.JUDGE0_LANGUAGE_ID);
  if (!Number.isSafeInteger(languageId)) throw new Error('Invalid JUDGE0_LANGUAGE_ID.');
  const headers = { 'Content-Type': 'application/json' };
  if (env.JUDGE0_TOKEN) headers[env.JUDGE0_TOKEN_HEADER || 'X-Auth-Token'] = env.JUDGE0_TOKEN;
  const endpoint = `${base.href.replace(/\/$/, '')}/submissions`;
  async function send(url, options) {
    const response = await fetcher(url, { ...options, headers, signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) throw new Error('Provider unavailable');
    // Bound received HTTP data before parsing. The injected test boundary may only expose json().
    if (!response.body) return response.json();
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 1_048_576) { await reader.cancel(); throw new Error('Provider response too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const decode = value => typeof value === 'string' ? Buffer.from(value, 'base64').toString('utf8') : '';
  return {
    async submit({ source, stdin }) {
      const data = await send(`${endpoint}?base64_encoded=true&wait=false`, { method: 'POST', body: JSON.stringify({
        source_code: Buffer.from(source).toString('base64'), stdin: Buffer.from(stdin).toString('base64'), language_id: languageId, compiler_options: '-std=c++17',
        enable_network: false, cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 131072,
        max_processes_and_or_threads: 16, max_file_size: 64, number_of_runs: 1
      }) });
      return { token: data.token };
    },
    async poll(token) {
      const data = await send(`${endpoint}/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`, { method: 'GET' });
      const id = data.status?.id;
      const status = id === 1 ? 'queued' : id === 2 ? 'running' : id === 3 ? 'completed' : [4, 5, 6, 7, 8, 9, 10, 11, 12].includes(id) ? 'failed' : 'unknown';
      return { status, stdout: decode(data.stdout), stderr: decode(data.stderr), compileOutput: decode(data.compile_output), time: data.time, memory: data.memory };
    }
  };
}

async function jsonBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 393216) throw brokerError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw brokerError(400, 'Invalid JSON request.'); }
}

export async function startServer({ port = 5173, provider = createJudge0Provider(), broker, dbPath = resolve(ROOT, 'data', 'cpp-jobs.sqlite'), staticRoot = resolve(ROOT, 'dist') } = {}) {
  let ownsBroker = false;
  if (!broker) {
    await mkdir(dirname(dbPath), { recursive: true });
    broker = createBroker({ dbPath, provider });
    ownsBroker = true;
  }
  const server = createServer(async (req, res) => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    try {
      const host = req.headers.host;
      const expectedPort = server.address()?.port;
      const allowedHosts = new Set([`127.0.0.1:${expectedPort}`, `localhost:${expectedPort}`]);
      if (!allowedHosts.has(host)) throw brokerError(403, 'Unexpected Host.');
      const url = new URL(req.url, `http://${host}`);
      const path = decodeURIComponent(url.pathname);
      if (path.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) throw brokerError(403, 'Unexpected Origin.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw brokerError(403, 'Cross-site API request rejected.');
        if (req.method === 'GET' && path === '/api/status') return json(200, { configured: Boolean(provider) });
        if (req.method === 'POST' && path === '/api/submissions') return json(200, await broker.submit(await jsonBody(req)));
        if (req.method === 'GET' && /^\/api\/submissions\/[a-zA-Z0-9_-]{1,128}$/.test(path)) {
          const result = await broker.get(path.split('/').at(-1));
          return json(result ? 200 : 404, result ?? { error: 'Submission not found.' });
        }
        return json(404, { error: 'API route not found.' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw brokerError(405, 'Method not allowed.');
      if (path.includes('\\') || path.split('/').includes('..') || path.includes('\0')) throw brokerError(403, 'Invalid asset path.');
      const asset = resolve(staticRoot, `.${path === '/' ? '/index.html' : path}`);
      if (!asset.startsWith(resolve(staticRoot) + sep)) throw brokerError(403, 'Invalid asset path.');
      let body;
      try { body = await readFile(asset); } catch { throw brokerError(404, 'Asset not found.'); }
      // Explicit document host also permits module imports from an opaque sandbox origin.
      const policy = CSP.replaceAll("'self'", `'self' http://${host}`);
      res.writeHead(200, { 'Content-Type': TYPES[extname(asset)] ?? 'application/octet-stream', 'Content-Security-Policy': policy, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      json(error.statusCode ?? (error instanceof URIError ? 400 : 500), { error: error.statusCode ? error.message : 'Request could not be processed.' });
    }
  });
  if (ownsBroker) server.once('close', () => broker.close());
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolveListen); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer().then(() => console.log('DSA Journey: http://localhost:5173')).catch(() => { console.error('Server could not start. Check port, database and Judge0 configuration.'); process.exitCode = 1; });
}

```
