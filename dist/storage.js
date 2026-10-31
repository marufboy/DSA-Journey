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
