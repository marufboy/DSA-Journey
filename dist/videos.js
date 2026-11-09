// Video activity is supplementary: this module never writes learning evidence.
export const curatedVideos=[
 {id:'cs50p-functions',videoId:'JP7ITIXGpHk',title:'Functions, Variables',publisher:'CS50 · David J. Malan',language:'English',lessonIds:['m01-l1','m01-l2','m02-l1','m03-l3','m03-l4'],sourceUrl:'https://cs50.harvard.edu/python/weeks/0/',prompt:'Prediksi nilai return dan output sebelum menjalankan contoh. Coba jelaskan perbedaannya.'},
 {id:'cs50p-conditionals',videoId:'_b6NgY_pMdw',title:'Conditionals',publisher:'CS50 · David J. Malan',language:'English',lessonIds:['m02-l2','m02-l3','m02-l4'],sourceUrl:'https://cs50.harvard.edu/python/weeks/1/',prompt:'Pilih satu kondisi batas. Apa yang berubah jika < diganti <=?'},
 {id:'cs50p-loops',videoId:'-7xg8pGcP6w',title:'Loops',publisher:'CS50 · David J. Malan',language:'English',lessonIds:['m03-l1','m03-l2','m04-l1','m04-l2'],sourceUrl:'https://cs50.harvard.edu/python/weeks/2/',prompt:'Pause setelah satu iterasi dan prediksi keadaan berikutnya. Lalu coba latihan terkait.'},
 {id:'mit-algorithms',videoId:'ZA-tUyM_y7s',title:'Algorithms and Computation',publisher:'MIT OpenCourseWare · Jason Ku',language:'English',lessonIds:['m10-l1','m10-l2','m12-l1'],sourceUrl:'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-1-algorithms-and-computation/',prompt:'Jelaskan apa yang membuktikan correctness dan apa yang diperlukan untuk menganalisis efisiensi. Materi tingkat universitas.'},
 {id:'mit-data-structures',videoId:'CHhwJjR0mZA',title:'Data Structures and Dynamic Arrays',publisher:'MIT OpenCourseWare · Erik Demaine',language:'English',lessonIds:['m13-l1','m13-l2'],sourceUrl:'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-2-data-structures-and-dynamic-arrays/',prompt:'Bandingkan interface dengan implementasi. Operasi apa yang ingin kamu optimalkan? Materi tingkat universitas.'}
];
const videoIdPattern=/^[a-zA-Z0-9_-]{11}$/;
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const timestamp=x=>Number.isFinite(x)&&x>=0&&x<=8640000000000000;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const validProgress=p=>object(p)&&text(p.notes,10000)&&Number.isInteger(p.resumeSeconds)&&p.resumeSeconds>=0&&p.resumeSeconds<=86400&&typeof p.watched==='boolean'&&timestamp(p.updatedAt);
export function parseYouTubeUrl(value){
 let u;try{u=new URL(value);}catch{throw new Error('Masukkan URL YouTube HTTPS yang valid.');}
 const hosts=['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'];
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw new Error('Gunakan link HTTPS dari YouTube atau youtu.be tanpa credentials.');
 let id;if(u.hostname==='youtu.be'&&/^\/[\w-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[1];
 else if(u.hostname!=='youtu.be'){
  if(u.pathname==='/watch'&&u.hostname!=='www.youtube-nocookie.com')id=u.searchParams.get('v');
  else if(/^\/(embed|shorts|live)\/[\w-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[2];
 }
 if(!videoIdPattern.test(id||''))throw new Error('Link harus menunjuk satu video YouTube dengan ID valid.');return id;
}
export function allVideos(state){return [...curatedVideos.map(v=>({...v,personal:false})),...(state.videos||[]).map(v=>({...v,personal:true,language:'Pilihan pribadi',lessonIds:v.lessonId?[v.lessonId]:[],prompt:'Pause, rangkum dengan kata-katamu, lalu coba latihan tanpa melihat video.'}))];}
export function validateVideoState(state){
 if(state.videos!==undefined&&(!Array.isArray(state.videos)||state.videos.length>500))throw new Error('Daftar video tidak valid (maksimal 500).');
 const ids=new Set(curatedVideos.map(v=>v.id));
 for(const v of state.videos||[]){
  if(!object(v)||Object.keys(v).some(k=>!['id','videoId','title','publisher','lessonId','addedAt'].includes(k))||!text(v.id,100)||!/^user-[\w-]+$/.test(v.id)||ids.has(v.id)||!text(v.videoId,11)||!videoIdPattern.test(v.videoId)||!text(v.title,200)||!v.title.trim()||!text(v.publisher,200)||!text(v.lessonId,200)||!timestamp(v.addedAt))throw new Error('Metadata video tidak valid atau ID duplikat.');
  ids.add(v.id);
 }
 if(state.videoProgress!==undefined&&(!object(state.videoProgress)||Object.keys(state.videoProgress).length>500))throw new Error('Progres video tidak valid (maksimal 500).');
 for(const [id,p] of Object.entries(state.videoProgress||{}))if(!ids.has(id)||!validProgress(p))throw new Error('Catatan/bookmark video tidak valid.');
}
export function addVideo(state,input,catalog,now=Date.now()){
 const videoId=parseYouTubeUrl(input.url),title=String(input.title||'').trim(),publisher=String(input.publisher||'Pilihan pribadi').trim(),lessonId=String(input.lessonId||'');
 if(!title||title.length>200||publisher.length>200)throw new Error('Judul wajib diisi; judul/penerbit maksimal 200 karakter.');
 if(lessonId&&!catalog.lessons.some(l=>l.id===lessonId))throw new Error('Pelajaran terkait tidak ditemukan.');
 if((state.videos||[]).some(v=>v.videoId===videoId&&v.lessonId===lessonId))throw new Error('Video ini sudah disimpan untuk pelajaran tersebut.');
 const s=structuredClone(state);s.videos||=[];s.videos.push({id:`user-${globalThis.crypto.randomUUID()}`,videoId,title,publisher,lessonId,addedAt:now});validateVideoState(s);return s;
}
export function saveVideoProgress(state,id,input,now=Date.now()){
 if(!allVideos(state).some(v=>v.id===id))throw new Error('Video tidak ditemukan.');
 const p={notes:input.notes,resumeSeconds:input.resumeSeconds,watched:input.watched,updatedAt:now};
 if(!validProgress(p))throw new Error('Catatan maksimal 10000 karakter; bookmark harus bilangan bulat 0–86400 detik.');
 const s=structuredClone(state);s.videoProgress||={};s.videoProgress[id]=p;validateVideoState(s);return s;
}
export function removeVideo(state,id){
 if(!(state.videos||[]).some(v=>v.id===id))throw new Error('Hanya video pribadi yang bisa dihapus.');
 const s=structuredClone(state);s.videos=s.videos.filter(v=>v.id!==id);if(s.videoProgress)delete s.videoProgress[id];return s;
}
