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
