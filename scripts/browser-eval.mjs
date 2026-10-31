// Optional browser evaluation; pass an installed Playwright package path. No install required.
import {createRequire} from 'node:module';
import {mkdir, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {startServer} from '../server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});
const temporary=await mkdtemp(join(tmpdir(),'dsa-browser-eval-'));
const provider=process.env.DSA_CPP_BROWSER_EVAL==='1' ? await (await import('../local-cpp-provider.mjs')).createLocalCppProvider({resultDir:join(temporary,'results')}) : null;
const server=await startServer({port:0,provider,dbPath:join(temporary,'jobs.sqlite')});
const base=`http://127.0.0.1:${server.address().port}`;
const context=await browser.newContext();
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base);
 await page.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();
 await page.goto(`${base}/#practice/m01-e1`);
 await page.locator('#code-editor').waitFor();
 await page.locator('#code-editor').fill("name = input()\nprint(f'Halo, {name}!')\n");
 await page.locator('[data-action=run]').click();
 await page.locator('[data-action=run]').waitFor({state:'attached'});
 await page.waitForFunction(()=>!document.querySelector('[data-action=run]').disabled,{},{timeout:100000});
 const output=await page.locator('#run-results').innerText();
 assert.match(output,/Halo, Rani!/,output);
 assert.match(output,/completed/);
 await page.locator('[data-action=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-action=run]').disabled,{},{timeout:100000});
 const submitted=await page.locator('#run-results').innerText();
 assert.equal(await page.locator('.test-row .passed').count(),3,submitted);
 await page.reload();await page.locator('#code-editor').waitFor();
 assert.equal(await page.locator('#code-editor').inputValue(),"name = input()\nprint(f'Halo, {name}!')\n");
 const runtime=await page.evaluate(async()=>{
  const {runPython}=await import('/runner.js');
  const normal=await runPython('print(input())','two words\n');
  const error=await runPython('raise ValueError("evaluation-error")','');
  await runPython('marker=42\nopen("state.txt","w").write("old")','');
  const fresh=await runPython('import os\nprint("marker" in globals(), os.path.exists("state.txt"))','');
  const timeout=await runPython('while True: pass','',{executionTimeout:200});
  const controller=new AbortController();
  const stopped=runPython('while True: pass','',{signal:controller.signal,onStatus:s=>{if(s.startsWith('Python siap'))controller.abort();}}).then(()=> 'unexpected',e=>e.name);
  return {normal,error,fresh,timeout,stopped:await stopped,frames:document.querySelectorAll('iframe').length};
 });
 assert.equal(runtime.normal.stdout,'two words\n');
 assert.equal(runtime.error.status,'failed');assert.match(runtime.error.stderr,/evaluation-error/);
 assert.equal(runtime.fresh.stdout,'False False\n');assert.equal(runtime.timeout.status,'timeout');
 assert.equal(runtime.stopped,'AbortError');assert.equal(runtime.frames,0);
 let cpp=null;
 if(provider){
  await page.locator('#code-language').selectOption('cpp');
  await page.locator('#code-editor').fill('#include <iostream>\n#include <string>\nint main(){std::string name;std::getline(std::cin,name);std::cout<<"Halo, "<<name<<"!\\n";}');
  const run=async action=>{await page.locator(`[data-action=${action}]`).click();await page.waitForFunction(()=>!document.querySelector('[data-action=run]').disabled,{},{timeout:100000});return page.locator('#run-results').innerText();};
  assert.match(await run('run'),/Halo, Rani!/);
  await run('submit');assert.equal(await page.locator('.test-row .passed').count(),3);
  await page.locator('#code-editor').fill('#include <iostream>\nint main(){std::cout<<"wrong answer";}');
  await run('submit');assert.equal(await page.locator('.test-row .failed').count(),3);
  await page.locator('#code-editor').fill('int main( broken');assert.match(await run('run'),/error:/);
  await page.locator('#code-editor').fill('#include <cstdio>\nint main(){fputs("bwrap: learner text\\n",stderr);}');
  const stderrResult=await run('run');assert.match(stderrResult,/completed/);assert.match(stderrResult,/learner text/);
  cpp={compiler:provider.compiler,run:'PASS',submitCases:3,wrongAnswerCases:3,compileError:'PASS',learnerStderr:'PASS'};
  await page.screenshot({path:join(temporary,'cpp.png'),fullPage:true});
 }
 const routes={};
 for(const route of ['today','roadmap','practice','visualizers','review','notes','progress','interview','career','settings']){
  await page.goto(`${base}/#${route}`);await page.locator('main h1').waitFor();
  routes[route]=await page.locator('main h1').innerText();
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(`${base}/#today`);await page.locator('main h1').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile page overflows horizontally');
 const out=new URL('../docs/browser-eval/',import.meta.url);await mkdir(out,{recursive:true});
 await page.screenshot({path:fileURLToPath(new URL('mobile.png',out)),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:fileURLToPath(new URL('desktop.png',out)),fullPage:true});
 const standalone=await context.newPage();
 await standalone.goto(new URL('../artifacts/DSA-Journey.html',import.meta.url).href);
 await standalone.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();
 await standalone.evaluate(()=>location.hash='#practice/m01-e1');
 await standalone.locator('#code-editor').fill("print('standalone-runtime-ok')");
 await standalone.locator('[data-action=run]').click();
 await standalone.waitForFunction(()=>!document.querySelector('[data-action=run]').disabled,{},{timeout:100000});
 const standaloneOutput=await standalone.locator('#run-results').innerText();
 assert.match(standaloneOutput,/standalone-runtime-ok/);assert.match(standaloneOutput,/completed/);
 assert.deepEqual(errors,[]);
 const report={date:'2026-11-01',browser:await browser.version(),pythonRun:'PASS',submitCases:3,draftReload:'PASS',runtime,cpp,routes,mobileOverflow:false,standalone:'PASS',pageErrors:errors};
 await writeFile(new URL('results.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} finally {
 await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temporary,{recursive:true,force:true});
}
