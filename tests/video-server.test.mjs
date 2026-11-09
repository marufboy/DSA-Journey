import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../server.mjs';
test('server permits only privacy-enhanced YouTube frames alongside its existing local frames',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dsa-video-policy-'));let server;
 try{
  server=await startServer({port:0,provider:null,dbPath:join(dir,'jobs.sqlite')});
  const response=await fetch(`http://127.0.0.1:${server.address().port}/`);assert.equal(response.status,200);
  const csp=response.headers.get('content-security-policy'),frames=csp.split(';').find(p=>p.trim().startsWith('frame-src'));
  assert.match(frames,/https:\/\/www.youtube-nocookie.com/);assert.doesNotMatch(frames,/\*|https:\/\/www.youtube.com/);
  for(const directive of ['script-src','connect-src'])assert.doesNotMatch(csp.split(';').find(p=>p.trim().startsWith(directive)),/youtube/);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
