import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const helper=fileURLToPath(new URL('./scripts/cpp-sandbox.py',import.meta.url));
function wslPath(path){
 const match=/^([A-Za-z]):[\\/](.*)$/.exec(path);
 if(!match)throw new Error('Local C++ setup requires a Windows workspace path.');
 return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\','/')}`;
}
function execute(distro,args,input='',timeout=45000){
 return new Promise((resolveResult,reject)=>{
  const child=spawn('wsl.exe',['-d',distro,'--','/usr/bin/python3',wslPath(helper),...args],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const chunks=[];let size=0,done=false;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolveResult(result);};
  const timer=setTimeout(()=>{child.kill();finish(new Error('Local C++ bridge timed out; job outcome unknown.'));},timeout);
  child.on('error',e=>finish(e));
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{
   size+=data.length;if(size>1048576){child.kill();finish(new Error('Local C++ bridge response exceeds limit.'));}
   else if(stream===child.stdout)chunks.push(data);
  });
  child.stdin.on('error',e=>finish(e));child.stdin.end(input);
  child.on('close',code=>{
   try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(code!==0||result.infrastructureError)throw new Error(result.infrastructureError||'Local C++ bridge unavailable.');
    finish(null,result);
   }catch(e){finish(e);}
  });
 });
}

export async function createLocalCppProvider({distro='Ubuntu',resultDir=resolve(fileURLToPath(new URL('./data/local-cpp',import.meta.url)))}={}){
 const health=await execute(distro,['--probe'],'',15000);
 if(health.ready!==true)throw new Error('Local C++ sandbox is not ready.');
 await mkdir(resultDir,{recursive:true});
 return {
  ...health,kind:'local-wsl',
  async submit({source,stdin}){
   // Source/input only travel through a JSON pipe, never shell interpolation.
   const result=await execute(distro,[],JSON.stringify({source,stdin}));
   if(!['completed','failed'].includes(result.status))throw new Error('Invalid local C++ result.');
   const token=randomUUID(),path=resolve(resultDir,`${token}.json`);
   await writeFile(`${path}.tmp`,JSON.stringify(result),{flag:'wx'});await rename(`${path}.tmp`,path);
   return {token};
  },
  async poll(token){
   if(!/^[0-9a-f-]{36}$/.test(token))throw new Error('Invalid local job token.');
   return JSON.parse(await readFile(resolve(resultDir,`${token}.json`),'utf8'));
  }
 };
}
