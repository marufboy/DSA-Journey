import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Explicit opt-in: these exercise the installed WSL sandbox and real GCC.
if(process.env.DSA_CPP_INTEGRATION==='1') {
 const {createLocalCppProvider}=await import('../local-cpp-provider.mjs');
 async function fixture(t){
  const resultDir=await mkdtemp(join(tmpdir(),'dsa-local-cpp-'));
  t.after(()=>rm(resultDir,{recursive:true,force:true}));
  const provider=await createLocalCppProvider({resultDir});
  const run=async(source,stdin='')=>{const {token}=await provider.submit({source,stdin});return provider.poll(token);};
  return {provider,resultDir,run};
 }
 test('real C++17 stdin/output and results survive provider recreation',async t=>{
  const f=await fixture(t);
  const {token}=await f.provider.submit({source:'#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}',stdin:'19 23\n'});
  const again=await createLocalCppProvider({resultDir:f.resultDir});
  const result=await again.poll(token);assert.equal(result.status,'completed');assert.equal(result.stdout,'42\n');
  assert.match(f.provider.compiler,/g\+\+/);
  await assert.rejects(again.poll('../escape'));
 });
 test('real compile and runtime failures are learner errors',async t=>{
  const f=await fixture(t);
  const syntax=await f.run('int main( broken');assert.equal(syntax.status,'failed');assert.match(syntax.compileOutput,/error:/);
  const crash=await f.run('#include <cstdlib>\nint main(){std::abort();}');assert.equal(crash.status,'failed');
 });
 test('CPU and output limits terminate real submitted programs',async t=>{
  const f=await fixture(t);
  const loop=await f.run('int main(){for(;;){}}');assert.equal(loop.status,'failed');assert.match(loop.stderr,/limit|signal|time/i);
  const spam=await f.run('#include <iostream>\nint main(){for(;;)std::cout<<"0123456789";}');
  assert.equal(spam.status,'failed');assert.ok(Buffer.byteLength(spam.stdout)<=65536);assert.equal(spam.truncated,true);
 });
 test('sandbox hides host mounts/home, disables external network and enforces memory limit',async t=>{
  const f=await fixture(t);
  const isolation=await f.run(`#include <iostream>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <sys/resource.h>
int main(){
 std::cout<<(access("/mnt/c/Users/Afif",F_OK)==0)<<" "<<(access("/home/afif",F_OK)==0)<<" ";
 int fd=socket(AF_INET,SOCK_STREAM,0);sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(80);inet_pton(AF_INET,"1.1.1.1",&a.sin_addr);
 std::cout<<(connect(fd,(sockaddr*)&a,sizeof(a))==0)<<" ";
 rlimit limit{};getrlimit(RLIMIT_AS,&limit);std::cout<<limit.rlim_cur<<"\\n";
}`);
  assert.equal(isolation.status,'completed');assert.equal(isolation.stdout,'0 0 0 268435456\n');
  const memory=await f.run('#include <cstdlib>\n#include <iostream>\nint main(){void* p=std::malloc(512ULL*1024*1024);std::cout<<(p==nullptr);std::free(p);}');
  assert.equal(memory.status,'completed');assert.equal(memory.stdout,'1');
 });
 test('each C++ execution gets a fresh writable temporary filesystem',async t=>{
  const f=await fixture(t);
  assert.equal((await f.run('#include <fstream>\nint main(){std::ofstream("/tmp/old")<<"secret";}')).status,'completed');
  const fresh=await f.run('#include <iostream>\n#include <unistd.h>\nint main(){std::cout<<(access("/tmp/old",F_OK)==0);}');
  assert.equal(fresh.stdout,'0');
 });
 test('root and device filesystems are read-only and scratch space is bounded',async t=>{
  const f=await fixture(t);
  const result=await f.run(`#include <iostream>
#include <fstream>
#include <sys/statvfs.h>
int main(){struct statvfs s{};statvfs("/tmp",&s);
std::cout<<std::ofstream("/root-probe").good()<<" "<<std::ofstream("/dev/probe").good()<<" "<<std::ofstream("/dev/shm/probe").good()<<" "<<(s.f_blocks*s.f_frsize);}`);
  assert.equal(result.status,'completed');assert.equal(result.stdout,'0 0 0 67108864');
 });
 test('learner stderr resembling launcher diagnostics cannot become infrastructure unknown',async t=>{
  const f=await fixture(t);
  for(const prefix of ['bwrap:','prlimit:'])for(const exit of [0,1]){
   const result=await f.run(`#include <cstdio>\nint main(){fputs("${prefix} learner stderr\\n",stderr);return ${exit};}`);
   assert.equal(result.status,exit?'failed':'completed');assert.match(result.stderr,/learner stderr/);
  }
 });
 test('runtime cannot create a child process',async t=>{
  const f=await fixture(t);
  const result=await f.run('#include <iostream>\n#include <unistd.h>\nint main(){auto p=fork();if(p==0)_exit(0);std::cout<<(p==-1);}');
  assert.equal(result.status,'completed');assert.equal(result.stdout,'1');
 });
 test('sandbox setup and executable launch failures remain infrastructure errors',()=>{
  const path=fileURLToPath(new URL('./test_cpp_sandbox.py',import.meta.url));
  const linux=`/mnt/${path[0].toLowerCase()}/${path.slice(3).replaceAll('\\','/')}`;
  execFileSync('wsl.exe',['-d','Ubuntu','--','python3',linux],{windowsHide:true,stdio:'pipe'});
 });
}
