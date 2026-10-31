import {stdinLines} from './runtime-contract.js';
self.onmessage=async event=>{
 let stdout='',stderr='';const cap=65536;
 const output=(which,text)=>{if(which==='out'){stdout+=text+'\n';if(stdout.length>cap)throw new Error('Output melebihi 64 KiB.');}else{stderr+=text+'\n';if(stderr.length>cap)throw new Error('Error output melebihi 64 KiB.');}};
 try{
  const {loadPyodide}=await import('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs');
  const py=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
  const lines=stdinLines(event.data.stdin);let index=0;
  py.setStdin({stdin:()=>index<lines.length?lines[index++]:null,isatty:false});
  py.setStdout({batched:text=>output('out',text)});py.setStderr({batched:text=>output('err',text)});
  self.postMessage({type:'ready'});
  try{await py.runPythonAsync(String(event.data.source));py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()');self.postMessage({type:'result',result:{status:'completed',stdout:stdout.slice(0,cap),stderr:stderr.slice(0,cap),runtime:'Python 3.12 · Pyodide 0.27.7'}});}
  catch(e){self.postMessage({type:'result',result:{status:'failed',stdout:stdout.slice(0,cap),stderr:(stderr+'\n'+e.message).slice(0,cap)}});}
 }catch(e){self.postMessage({type:'error',error:`Runtime gagal dimuat: ${e.message}`});}
};
