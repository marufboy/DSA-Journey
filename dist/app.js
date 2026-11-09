import {emptyState,uid,DAY,recordExposure,recordAttempt,importState,checkOutput,buildTrace} from './core.js';
import {openStore} from './storage.js';
import {runPython,runCpp} from './runner.js';
import {shell} from './views.js';
import {resultView} from './views-lab.js';
import {traceStage} from './views-extra.js';
import {esc,icon} from './ui.js';
import {allVideos,addVideo,saveVideoProgress,removeVideo} from './videos.js';
import {courseCatalog,courseEmbedUrl,saveCourseProgress} from './courses.js';

let state=emptyState(),catalog={modules:[],lessons:[],exercises:[]},store,lastRevision=0,lastSavedFingerprint='',queue=Promise.resolve(),saveTimer,toastTimer,controller,runSequence=0,visualTimer,timerTicker;
const ui={saveStatus:'Memuat progres…',storageWarning:'',dueCount:0,language:'python',labTab:'problem',mobileTab:'problem',results:[],runStatus:'',busy:false,visualType:'loop',visualStep:0,trace:buildTrace('loop'),vizInput:{}};
const root=document.getElementById('app');
function route(){const [path,query='']=location.hash.slice(1).split('?'),[page='today',id]=path.split('/');return {page:page||'today',id:decodeURIComponent(id||''),query:new URLSearchParams(query)};}
const exercise=()=>catalog.exercises.find(e=>e.id===route().id);
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),5000);}
function applyPreferences(){document.body.dataset.theme=state.settings.theme;document.documentElement.style.setProperty('--body',`${state.settings.fontSize}px`);}
function saveStatus(text){ui.saveStatus=text;const el=document.getElementById('save-status');if(el)el.textContent=text;}
function stateFingerprint(value){return JSON.stringify({...value,revision:0,settings:{...value.settings,cppAvailable:false}});}
function persist(){
 saveStatus('Menyimpan…');queue=queue.then(async()=>{if(!store){saveStatus('Sesi sementara · export untuk backup');return false;}const snapshot=structuredClone(state),fingerprint=stateFingerprint(snapshot);if(fingerprint!==lastSavedFingerprint){snapshot.revision=lastRevision;const saved=await store.write(snapshot);lastRevision=saved.revision;state.revision=saved.revision;lastSavedFingerprint=fingerprint;}saveStatus('Tersimpan di perangkat ini');return true;}).catch(e=>{ui.storageWarning=e.message||'Penyimpanan gagal. Export atau salin draft sebelum menutup.';saveStatus('Belum tersimpan');toast(ui.storageWarning);return false;});return queue;
}
function replaceStoredState(candidate){
 const work=queue.then(async()=>{candidate.revision=lastRevision;const saved=await store.write(candidate);state=saved;lastRevision=saved.revision;lastSavedFingerprint=stateFingerprint(saved);return saved;});
 queue=work.catch(()=>{});return work;
}
function update(change,{renderNow=false}={}){state=typeof change==='function'?change(state):change;persist();if(renderNow)render();}
function render({focus=false}={}){const scroll=window.scrollY;applyPreferences();ui.dueCount=Object.values(state.reviews).filter(r=>r.dueAt<=Date.now()).length;root.innerHTML=shell(route(),{state,catalog,ui});if(focus){window.scrollTo(0,0);document.querySelector('h1')?.focus({preventScroll:true});}else window.scrollTo(0,scroll);updateTimerDisplay();}
function captureDraft(){const editor=document.getElementById('code-editor'),e=catalog.exercises.find(x=>x.id===editor?.dataset.exerciseId);if(!e||!editor)return;state.drafts[e.id]||={};state.drafts[e.id][ui.language]=editor.value;const input=document.getElementById('custom-input');if(input)state.drafts[e.id].stdin=input.value;}
function renderResults(){const el=document.getElementById('run-results');if(el)el.innerHTML=resultView(ui);}
function videoFeedback(message){const el=document.getElementById('video-feedback');if(el)el.textContent=message;}
function courseFeedback(message){const el=document.getElementById('course-feedback');if(el)el.textContent=message;}
function loadCourse(id){
 const c=courseCatalog.find(c=>c.id===id),host=document.getElementById('course-player');if(!c||!host||route().page!=='courses'||route().id!==id)return;
 if(!['http:','https:'].includes(location.protocol)){host.innerHTML='<div class="video-placeholder"><h2>Buka melalui localhost</h2><p>Gunakan HTTP/HTTPS untuk pemutar YouTube. Jalankan npm start dan buka http://127.0.0.1:5174, atau gunakan link YouTube di bawah.</p></div>';return;}
 host.innerHTML=`<iframe title="YouTube course: ${esc(c.title)}" src="${esc(courseEmbedUrl(c,state.courseProgress?.[id]?.resumeSeconds||0))}" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
function unloadCourse(id){const host=document.getElementById('course-player');if(host)host.innerHTML=`<div class="video-placeholder"><h2>Pemutar ditutup</h2><p>Catatan course tetap tersedia.</p><button type="button" class="btn" data-action="load-course" data-id="${esc(id)}">Muat course</button></div>`;}
function loadVideo(id){
 const v=allVideos(state).find(v=>v.id===id),host=document.getElementById('video-player');if(!v||!host||route().page!=='videos'||route().id!==id)return;
 if(!['http:','https:'].includes(location.protocol)){host.innerHTML='<div class="video-placeholder"><h2>Buka melalui localhost</h2><p>Pemutar YouTube membutuhkan halaman HTTP/HTTPS. Jalankan npm start dan buka http://127.0.0.1:5174, atau gunakan tombol Buka di YouTube di bawah.</p></div>';return;}
 const seconds=state.videoProgress?.[id]?.resumeSeconds||0;
 host.innerHTML=`<iframe title="YouTube: ${esc(v.title)}" src="https://www.youtube-nocookie.com/embed/${v.videoId}?start=${seconds}&amp;playsinline=1" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
function unloadVideo(id){const host=document.getElementById('video-player');if(host)host.innerHTML=`<div class="video-placeholder"><h2>Pemutar ditutup</h2><p>Catatan dan bookmark tetap tersedia.</p><button type="button" class="btn" data-action="load-video" data-id="${esc(id)}">Muat video</button></div>`;}
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

async function checkCpp({announce=false}={}){try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(4000)});const data=await response.json();state.settings.cppAvailable=response.ok&&data.configured===true;if(announce)toast(state.settings.cppAvailable?'C++ API dikonfigurasi. Compile nyata masih bergantung pada provider.':'C++ provider belum dikonfigurasi; tidak ada compiler palsu.');}catch{state.settings.cppAvailable=false;if(announce)toast('C++ API tidak tersedia. Materi tetap bisa dipelajari dan kode diekspor.');}if(announce)persist();if(!['videos','courses'].includes(route().page))render();}

async function execute(mode){
 const e=exercise();if(!e||e.kind!=='coding'||ui.busy)return;captureDraft();clearTimeout(saveTimer);
 const language=ui.language,source=state.drafts[e.id]?.[language]||'';
 if(language==='cpp'&&state.pendingRun){toast('Pulihkan logical job yang masih tersimpan sebelum membuat request baru.');return;}
 if(new TextEncoder().encode(source).length>65536){toast('Source melebihi 64 KiB.');return;}
 if(language==='cpp'&&!state.settings.cppAvailable){toast('Konfigurasi sandbox C++ diperlukan. Lihat Settings untuk compile lokal dan integrasi.');return;}
 const tests=mode==='submit'?e.tests:[{input:state.drafts[e.id]?.stdin||''}];if(!tests?.length){toast('Latihan ini belum memiliki suite yang dapat dijalankan.');return;}
 const context=Object.freeze({exercise:e,language,source,review:route().query.get('review')==='1',hintsUsed:state.assistance?.[e.id]||0,startedAt:Date.now()});
 const token=++runSequence,activeController=new AbortController();controller=activeController;
 ui.busy=true;ui.results=[];ui.resultMode=mode;ui.runStatus='Menyiapkan environment baru; snapshot kode dikunci…';render();
 try{
  await persist();if(token!==runSequence||activeController.signal.aborted)return;
  for(let i=0;i<tests.length;i++){
   const t=tests[i];const onStatus=message=>{if(token!==runSequence)return;ui.runStatus=`Case ${i+1}/${tests.length} · ${message}`;renderResults();};let result;
   if(context.language==='python')result=await runPython(context.source,t.input,{signal:activeController.signal,onStatus});
   else{
    const payload={requestId:uid(),source:context.source,stdin:t.input,language:'cpp'};
    state.pendingRun={...payload,exerciseId:e.id,exerciseVersion:e.version,createdAt:Date.now()};await persist();
    if(token!==runSequence||activeController.signal.aborted)return;
    if(ui.storageWarning)throw new Error('Request ID belum tersimpan. Perbaiki storage sebelum mengirim C++ agar recovery aman.');
    result=await runCpp(payload,{onStatus,signal:activeController.signal});if(token!==runSequence)return;if(!['unknown','submitting','queued','running'].includes(result.status)){if(state.pendingRun?.requestId===payload.requestId)delete state.pendingRun;await persist();}
   }
   if(token!==runSequence)return;
   const conclusive=['completed','failed','timeout'].includes(result.status);
   ui.results.push({...result,expected:mode==='submit'?t.expected:undefined,passed:mode==='submit'&&conclusive?result.status==='completed'&&checkOutput(result.stdout,t.expected,e):undefined});renderResults();
   if(!conclusive){ui.runStatus='Outcome infrastruktur belum pasti. Tidak dihitung sebagai jawaban salah; gunakan Recover untuk job C++.';break;}
  }
  if(token!==runSequence)return;
  const conclusive=mode==='submit'&&ui.results.length===tests.length&&ui.results.every(x=>typeof x.passed==='boolean');
  if(conclusive){const passed=ui.results.every(x=>x.passed);state=recordAttempt(state,context.exercise,{passed,language:context.language,source:context.source,review:context.review,hintsUsed:context.hintsUsed,at:context.startedAt});ui.runStatus=passed?'Semua kasus lolos. Lengkapi penjelasanmu; satu suite tidak otomatis membuktikan mastery.':'Ada kasus yang belum lolos. Periksa perbedaan output dan asumsi input.';
   if(!passed){const failed=ui.results.find(x=>!x.passed);state.notes.push({id:uid(),title:`Tinjau: ${e.title}`,category:'Logic',body:`Hasil pengujian belum cocok.\nExpected: ${failed.expected??''}\nActual: ${(failed.stdout||failed.stderr||'').slice(0,1800)}\nTulis diagnosis setelah memeriksa asumsi.`,exerciseId:e.id,at:Date.now()});}
   await persist();
  }else if(mode==='run'&&ui.results[0]?.status==='completed')ui.runStatus='Custom run selesai. Run bukan Submit dan tidak menambah mastery.';
 }catch(error){if(token!==runSequence)return;ui.runStatus=error.name==='AbortError'?error.message:`Tidak dapat menjalankan: ${error.message}`;toast(ui.runStatus);}
 finally{if(token===runSequence){ui.busy=false;controller=null;render();}}
}
async function recover(){if(ui.busy)return;const pending=state.pendingRun?structuredClone(state.pendingRun):null;if(!pending){toast('Tidak ada job tersimpan.');return;}const token=++runSequence,activeController=new AbortController();controller=activeController;ui.busy=true;ui.results=[];ui.resultMode='run';render();try{const result=await runCpp(pending,{recover:true,signal:activeController.signal,onStatus:m=>{if(token===runSequence){ui.runStatus=m;renderResults();}}});if(token!==runSequence||activeController.signal.aborted)return;ui.results=[result];ui.runStatus='Logical job dipulihkan. Hasil satu case ini tidak otomatis menyelesaikan suite.';if(['completed','failed','unavailable'].includes(result.status)&&state.pendingRun?.requestId===pending.requestId)delete state.pendingRun;await persist();}catch(e){if(token!==runSequence)return;ui.runStatus=e.message;toast(e.message);}finally{if(token===runSequence){ui.busy=false;controller=null;render();}}}

function exportBackup(){const backup={schemaVersion:1,appVersion:'1.0.0',exportedAt:new Date().toISOString(),contentVersions:Object.fromEntries(catalog.exercises.map(e=>[e.id,e.version])),data:state};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dsa-journey-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('File backup dibuat. Periksa unduhan browser.');}
async function importFile(file){if(!file)return;if(file.size>20*1024*1024)throw new Error('Backup melebihi 20 MiB.');const backup=JSON.parse(await file.text());await queue;const candidate=importState(state,backup,catalog);const historical=candidate.attempts.filter(x=>x.stale).length;if(!await confirmDialog('Pulihkan backup?',`${candidate.attempts.length} attempts, ${candidate.notes.length} notes, ${historical} historical/stale records. Progress sekarang diganti. Exposure solusi yang sudah diketahui tetap dipertahankan. Export dahulu bila perlu.`,'Import & replace'))return;if(!store)throw new Error('Storage belum tersedia; import tidak dilakukan.');await replaceStoredState(candidate);ui.language=state.settings.primaryLanguage;render();toast('Backup dipulihkan secara atomik. Riwayat lama dipertahankan.');}
function noteDialog(item={},exerciseId){showDialog(`<h2>${item.id?'Edit insight':'Catat insight'}</h2><form><label class="field">Judul<input name="title" value="${esc(item.title||'')}" required maxlength="100"></label><label class="field">Catatan<textarea name="body" rows="6" required maxlength="12000">${esc(item.body||'')}</textarea></label><button class="btn" type="submit">Simpan</button> <button class="btn secondary" type="button" data-dialog-cancel>Batal</button></form>`,data=>{const entry={id:item.id||uid(),title:String(data.get('title')),body:String(data.get('body')),category:item.category||'Learning insight',exerciseId:item.exerciseId||exerciseId,at:item.at||Date.now(),updatedAt:Date.now()};if(item.id)state.notes=state.notes.map(x=>x.id===item.id?entry:x);else state.notes.push(entry);persist();render();});}
function explanationDialog(e){showDialog(`<div class="eyebrow">Explain your reasoning</div><h2 style="margin-top:10px">Mengapa solusi ini benar?</h2><p>Ini rubrik self-review. Kebenaran penjelasan tidak dinilai otomatis; gunakan contoh dan counterexample yang konkret.</p><form><label class="field">Penjelasan<textarea name="body" rows="6" minlength="30" required placeholder="Invariant / alasan benar; time dan space; edge cases…"></textarea></label><div class="rubric">${['Saya menjelaskan alasan kebenaran, bukan hanya langkah kode.','Saya menjelaskan time dan space complexity.','Saya membahas edge case dan asumsi input.'].map((x,i)=>`<label><input type="checkbox" name="c${i}" required><span>${x}</span></label>`).join('')}</div><button class="btn section-gap" type="submit">Simpan self-review</button></form>`,data=>{state.explanations||={};for(const concept of e.concepts)state.explanations[concept]={complete:true,evidenceMethod:'self_review',at:Date.now(),exerciseId:e.id,body:String(data.get('body'))};persist();toast('Rubrik penjelasan tersimpan sebagai self-review.');});}

function updateTimerDisplay(){const span=document.getElementById('interview-timer'),session=state.interview;if(!session)return;const seconds=session.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):session.pausedSeconds??2700;if(span)span.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(session.deadline&&seconds===0){session.deadline=null;session.pausedSeconds=0;persist();toast('Waktu latihan selesai. Simpan refleksi dan tinjau cara berpikirmu.');}}
function visualRender(){const stage=document.getElementById('visual-stage');if(stage)stage.innerHTML=traceStage(ui.trace,ui.visualStep,ui.visualType);}

document.addEventListener('input',event=>{if(['code-editor','custom-input'].includes(event.target.id)){captureDraft();clearTimeout(saveTimer);saveTimer=setTimeout(persist,650);}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&document.getElementById('code-editor')){event.preventDefault();execute('run');}if(event.key==='Escape'){document.getElementById('sidebar')?.classList.remove('open');}});
document.addEventListener('change',async event=>{try{if(event.target.id==='code-language'){if(ui.busy)return;captureDraft();ui.language=event.target.value;state.settings.primaryLanguage=ui.language;await persist();render();}else if(event.target.id==='import-file')await importFile(event.target.files[0]);else if(event.target.dataset.careerStatus){const x=state.career.find(x=>x.id===event.target.dataset.careerStatus);if(x){x.status=event.target.value;persist();}}}catch(e){toast(e.message);} });
document.addEventListener('click',async event=>{if(event.target.closest('.skip-link')){event.preventDefault();document.getElementById('main')?.focus?.();return;}const anchor=event.target.closest('[data-lesson-anchor]');if(anchor){event.preventDefault();const target=document.getElementById(anchor.dataset.lessonAnchor);target?.scrollIntoView?.({block:'start'});target?.focus?.({preventScroll:true});return;}const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,id=button.dataset.id,value=button.dataset.value;try{
 if(action==='toggle-nav'){const open=document.getElementById('sidebar').classList.toggle('open');button.setAttribute('aria-expanded',open);}
 else if(action==='load-course')loadCourse(id);
 else if(action==='unload-course')unloadCourse(id);
 else if(action==='load-video')loadVideo(id);
 else if(action==='unload-video')unloadVideo(id);
 else if(action==='delete-video'){if(await confirmDialog('Hapus video pribadi?','Link, catatan, dan bookmark video ini akan dihapus. Export backup jika ingin menyimpan salinan.','Hapus video')){state=removeVideo(state,id);await persist();location.hash='#videos';}}
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
 else if(action==='clear-data'){if(await confirmDialog('Hapus seluruh progres lokal?','Pastikan backup sudah diekspor. Attempts, notes, dan exposure history di browser ini akan dihapus.','Hapus progres')){const blank=emptyState();blank.revision=lastRevision;if(!store)throw new Error('Storage tidak tersedia.');await queue;blank.revision=lastRevision;const saved=await store.write(blank);state=saved;lastRevision=saved.revision;lastSavedFingerprint=stateFingerprint(state);ui.language='python';render();onboarding();}}
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
 if(type==='add-video'){
  const originHash=location.hash,originSequence=runSequence;state=addVideo(state,{title:data.get('title'),url:data.get('url'),publisher:data.get('publisher'),lessonId:data.get('lessonId')},catalog);const addedId=state.videos.at(-1).id,saved=await persist();
  if(!saved){videoFeedback('Link ada di sesi ini, tetapi belum tersimpan. Export backup sebelum menutup.');return;}
  if(location.hash===originHash&&runSequence===originSequence&&form.isConnected!==false)location.hash='#videos/'+addedId;
 }
 else if(type==='course-progress'){
  const raw=String(data.get('resumeSeconds')??'').trim();if(!raw)throw new Error('Isi bookmark course dalam detik.');
  state=saveCourseProgress(state,id,{notes:String(data.get('notes')??''),resumeSeconds:Number(raw),watched:data.get('watched')==='on'});const saved=await persist();
  if(route().page==='courses'&&route().id===id)courseFeedback(!saved?'Catatan ada di sesi ini, tetapi belum tersimpan. Export backup sebelum menutup.':'Catatan course tersimpan. Status selesai adalah self-report.');
 }
 else if(type==='video-progress'){
  const raw=String(data.get('resumeSeconds')??'').trim();if(!raw)throw new Error('Isi bookmark dalam detik (0–86400).');
  state=saveVideoProgress(state,id,{notes:String(data.get('notes')??''),resumeSeconds:Number(raw),watched:data.get('watched')==='on'});const saved=await persist();
  videoFeedback(!saved?'Catatan ada di sesi ini, tetapi belum tersimpan. Export backup sebelum menutup.':'Catatan & bookmark tersimpan. Progres menonton adalah self-report.');
 }
 else if(type==='checkpoint'){const l=catalog.lessons.find(x=>x.id===id),correct=Number(data.get('answer'))===l.checkpoint.correctIndex;state.checkpointScores[id]=correct?1:0;state.checkpointVersions||={};state.checkpointVersions[id]=l.version;persist();document.getElementById('checkpoint-feedback').innerHTML=`<div class="banner ${correct?'':'warning'}">${correct?'✓ Benar.':'Belum tepat.'} ${esc(l.checkpoint.explanation)}</div>`;}
 else if(type==='activity'){const e=catalog.exercises.find(x=>x.id===id);if(e.kind==='trace'){const correct=Number(data.get('answer'))===e.answer.correctIndex;state=recordAttempt(state,e,{passed:correct,language:/^m0[5-8]$/.test(e.moduleId)?'cpp':'python',review:route().query.get('review')==='1',hintsUsed:state.assistance?.[id]||0});state=recordExposure(state,e,Date.now(),state.attempts.at(-1).id);document.getElementById('activity-feedback').innerHTML=`<div class="banner ${correct?'':'warning'}">${correct?'✓ Prediksi benar.':'Belum tepat.'} ${esc(e.answer.explanation)}</div>`;}else{state.reflections[id]=String(data.get('reflection'));state=recordAttempt(state,e,{passed:null,status:'self-reviewed',evidenceMethod:'self_report',language:state.settings.primaryLanguage});for(const c of e.concepts)if(e.kind==='explanation'){state.explanations||={};state.explanations[c]={complete:true,evidenceMethod:'self_review',at:Date.now(),exerciseId:id,body:String(data.get('reflection'))};}document.getElementById('activity-feedback').innerHTML='<div class="banner">Refleksi tersimpan sebagai self-review. Kebenaran penjelasan belum diverifikasi manusia.</div>';}persist();}
 else if(type==='note'){state.notes.push({id:uid(),title:String(data.get('title')),body:String(data.get('body')),category:String(data.get('category')),at:Date.now()});persist();render();toast('Insight tersimpan.');}
 else if(type==='settings'){state.settings={...state.settings,name:String(data.get('name')).trim(),primaryLanguage:String(data.get('primaryLanguage')),sessionMinutes:Number(data.get('sessionMinutes')),theme:String(data.get('theme')),fontSize:Number(data.get('fontSize')),route:String(data.get('route'))};ui.language=state.settings.primaryLanguage;persist();render();toast('Preferensi disimpan.');}
 else if(type==='role'){state.settings={...state.settings,role:String(data.get('role')),level:String(data.get('level')),targetRegion:String(data.get('region')),roleRequirements:String(data.get('requirements')),roleReviewedAt:Date.now()};persist();render();toast('Target dicatat. Gunakan deskripsi role aktual untuk meninjau gap.');}
 else if(type==='career'){state.career.push({id:uid(),type:String(data.get('type')),title:String(data.get('title')),body:String(data.get('body')),status:'Planned',at:Date.now()});persist();render();toast('Item workspace ditambahkan.');}
 else if(type==='interview-review'){state.interviews||=[];state.interviews.push({id:uid(),exerciseId:state.interview?.exerciseId||'',reflection:String(data.get('reflection')),checked:[...data.keys()].filter(k=>k.startsWith('rubric-')).length,at:Date.now()});state.interview={...(state.interview||{}),deadline:null,pausedSeconds:2700};persist();render();toast('Self-review simulasi disimpan.');}
 else if(type==='visual-input'){stopVisual();const valuesText=String(data.get('values')||''),edgesText=String(data.get('edges')||'');const input={valuesText,edgesText,method:String(data.get('method')||'bfs')};if(data.has('values'))input.values=valuesText.trim()?valuesText.split(',').map(x=>Number(x.trim())):[];for(const key of ['target','n','nodeCount','start'])if(data.has(key))input[key]=Number(data.get(key));if(data.has('edges'))input.edges=edgesText.trim()?edgesText.split(',').map(x=>x.trim().split('-').map(Number)):[];ui.trace=buildTrace(ui.visualType,input);ui.vizInput=input;ui.visualStep=0;render();}
 }catch(e){courseFeedback(e.message||'Belum dapat menyimpan.');videoFeedback(e.message||'Belum dapat menyimpan.');toast(e.message||'Belum dapat menyimpan.');}});

window.addEventListener('hashchange',()=>{captureDraft();clearTimeout(saveTimer);persist();controller?.abort();++runSequence;ui.busy=false;controller=null;stopVisual();ui.labTab='problem';ui.mobileTab='problem';ui.language=['python','cpp'].includes(route().query.get('language'))?route().query.get('language'):state.settings.primaryLanguage;ui.results=[];ui.runStatus='';render({focus:true});});
window.addEventListener('pagehide',()=>{captureDraft();clearTimeout(saveTimer);persist();});
async function boot(){
 try{
  const parts=globalThis.__DSA_CONTENT__||await Promise.all([1,2,3,4].map(async n=>{const r=await fetch(`./content/part-${String(n).padStart(2,'0')}.json`);if(!r.ok)throw new Error(`Materi bagian ${n} belum dapat dimuat.`);return r.json();}));
  catalog={modules:parts.flatMap(x=>x.modules),lessons:parts.flatMap(x=>x.lessons),exercises:parts.flatMap(x=>x.exercises)};catalog.modules.sort((a,b)=>a.id.localeCompare(b.id));catalog.lessons.sort((a,b)=>a.id.localeCompare(b.id));
  try{store=await openStore();const loaded=await store.read();state=importState(emptyState(),{schemaVersion:1,data:loaded},catalog);state.revision=loaded.revision;lastRevision=state.revision;lastSavedFingerprint=stateFingerprint(state);store.subscribe(({revision})=>{if(revision>lastRevision){ui.storageWarning='Tab lain memperbarui progres. Export draft jika perlu, lalu muat ulang sebelum menyimpan perubahan.';saveStatus('Perubahan dari tab lain');toast(ui.storageWarning);}});}catch(e){store?.close();store=null;ui.storageWarning=`Penyimpanan tidak tersedia: ${e.message}. Progres hanya di sesi ini; gunakan export.`;}
  ui.language=state.settings.primaryLanguage;state.settings.cppAvailable=false;saveStatus(store?'Progres di perangkat ini':'Sesi sementara · belum tersimpan');render();timerTicker=setInterval(updateTimerDisplay,1000);onboarding();checkCpp();
 }catch(e){root.innerHTML=`<main class="boot"><span class="brand-mark">d.</span><h1>Workspace belum dapat dimuat.</h1><p>${esc(e.message)}</p><p>Jalankan aplikasi melalui server HTTP, bukan membuka file langsung.</p><button class="btn" id="retry-boot">Coba lagi</button></main>`;document.getElementById('retry-boot').onclick=()=>location.reload();}
}
boot();
