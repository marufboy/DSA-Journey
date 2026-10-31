let active;
window.addEventListener('message',event=>{
 if(event.source!==parent||event.data?.type!=='execute'||active)return;
 const {nonce,source,stdin}=event.data;const reply=data=>parent.postMessage({...data,nonce},event.origin==='null'?'*':event.origin);
 try{
  // Chromium rejects module workers with blob:null URLs in an opaque sandbox.
  // A classic worker retains that isolation; load the module before forwarding input.
  const workerSource=event.data.workerSource||`self.onmessage=async event=>{try{await import(${JSON.stringify(new URL('./python-worker.js',location.href).href)});self.onmessage(event);}catch(e){self.postMessage({type:'error',error:e.message});}};`;
  const blob=new Blob([workerSource],{type:'text/javascript'});const objectURL=URL.createObjectURL(blob);
  active=new Worker(objectURL);URL.revokeObjectURL(objectURL);
  active.onmessage=e=>{reply(e.data);if(e.data.type==='result'||e.data.type==='error'){active.terminate();active=null;}};
  active.onerror=e=>{reply({type:'error',error:`Python worker tidak dapat dimulai: ${e.message||'periksa koneksi/CDN.'}`});active?.terminate();};
  active.postMessage({source,stdin});
 }catch(e){reply({type:'error',error:e.message});}
});
