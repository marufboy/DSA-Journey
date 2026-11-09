// Uses an already-installed Playwright package; installs nothing.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2]||'playwright');
const temporary=await mkdtemp(join(tmpdir(),'dsa-video-eval-')),out=new URL('../docs/video-eval/',import.meta.url);
await mkdir(out,{recursive:true});
const server=await startServer({port:0,provider:null,dbPath:join(temporary,'jobs.sqlite')}),base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors=[],youtubeRequests=[];page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/youtube|ytimg|googlevideo/.test(r.url()))youtubeRequests.push(r.url());});
const report={date:'2026-11-09',checks:{},playback:{status:'NOT VERIFIED'}};
const saved=()=>page.getByText('Tersimpan di perangkat ini',{exact:true}).waitFor({state:'attached'});
const storageHealthy=async()=>{assert.equal(await page.locator('main .banner.error').count(),0,'Unexpected storage-conflict warning');assert.notEqual(await page.locator('#save-status').textContent(),'Belum tersimpan');};
const navigate=async hash=>{await page.goto(`${base}/#${hash==='videos'?'videos?view=videos':hash}`);await page.locator('main h1').waitFor();await storageHealthy();};
try{
 await page.goto(base);await page.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();await saved();
 await navigate('learn/m01-l1');
 await page.locator('[data-lesson-anchor=lesson-checkpoint]').click();assert.equal(new URL(page.url()).hash,'#learn/m01-l1');
 assert.equal(await page.locator('#lesson-checkpoint').evaluate(el=>el===document.activeElement),true);
 await page.getByRole('link',{name:'Tonton',exact:true}).first().click();await page.locator('[data-action=load-video]').waitFor();
 assert.equal(await page.locator('#video-player iframe').count(),0);assert.equal(youtubeRequests.length,0);
 report.checks.noThirdPartyBeforeActivation='PASS';
 await page.locator('[data-action=load-video]').click();const frame=page.locator('#video-player iframe');await frame.waitFor();
 assert.match(await frame.getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\/JP7ITIXGpHk/);
 assert.equal(await frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
 // Try real playback. A mounted iframe alone is not playback evidence.
 try{
  const yt=page.frameLocator('#video-player iframe');await yt.getByRole('button',{name:/^(Play|Play video)$/i}).first().click({timeout:15000});
  const playerFrame=page.frames().find(f=>f.url().startsWith('https://www.youtube-nocookie.com/embed/'));
  await playerFrame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>=2;},undefined,{timeout:20000}).catch(()=>{});
  const status=await playerFrame.evaluate(()=>{const v=document.querySelector('video');return {time:v?.currentTime||0,paused:v?.paused,error:document.querySelector('.ytp-error-content-wrap')?.textContent||'',title:document.title};});
  if(!status.paused&&status.time>=2)report.playback={status:'PASS',...status};else report.playback={status:'BLOCKED/NOT VERIFIED',...status};
 }catch(e){const playerFrame=page.frames().find(f=>f.url().startsWith('https://www.youtube-nocookie.com/embed/'));report.playback={status:'BLOCKED/NOT VERIFIED',reason:e.message.split('\n')[0],detail:await playerFrame?.locator('body').innerText({timeout:2000}).catch(()=> 'Unavailable'),buttons:await playerFrame?.locator('button').evaluateAll(els=>els.map(e=>({label:e.getAttribute('aria-label'),class:e.className}))).catch(()=>[])};}
 await page.screenshot({path:fileURLToPath(new URL('watch-desktop.png',out)),fullPage:true});
 await page.locator('[data-action=unload-video]').click();assert.equal(await frame.count(),0);
 await page.locator('[data-action=load-video]').click();await frame.waitFor();await page.getByRole('link',{name:'Coba latihan',exact:true}).first().click();
 await page.locator('#code-editor').waitFor();assert.equal(await page.locator('#video-player iframe').count(),0);report.checks.lessonVideoPracticeAndCleanup='PASS';
 await page.locator('#code-editor').fill("name = input()\nprint(f'Halo, {name}!')\n");await page.locator('[data-action=run]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-action=run]').disabled,undefined,{timeout:100000});
 const output=await page.locator('#run-results').innerText();assert.match(output,/Halo, Rani!/);assert.match(output,/completed/);report.checks.pythonPracticeRun='PASS';
 await navigate('videos');await page.screenshot({path:fileURLToPath(new URL('library-desktop.png',out)),fullPage:true});
 const add=page.locator('[data-form=add-video]');await add.locator('[name=title]').fill('My <video> notes');await add.locator('[name=url]').fill('https://youtube.com.evil.test/watch?v=JP7ITIXGpHk');
 await add.locator('[type=submit]').click();await page.locator('#video-feedback').getByText(/HTTPS/).waitFor();assert.equal(await add.locator('[name=title]').inputValue(),'My <video> notes');
 await add.locator('[name=url]').fill('https://youtu.be/JP7ITIXGpHk');await add.locator('[name=publisher]').fill('My channel');await add.locator('[name=lessonId]').selectOption('m01-l1');
 await add.locator('[type=submit]').click();await page.waitForURL(/#videos\/user-/);const personalHash=new URL(page.url()).hash;
 const progress=page.locator('[data-form=video-progress]');await progress.locator('[name=notes]').fill('Explain return values myself. <script>text only</script>');await progress.locator('[name=resumeSeconds]').fill('73');await progress.locator('[name=watched]').check();await progress.locator('[type=submit]').click();await page.getByText('Catatan & bookmark tersimpan. Progres menonton adalah self-report.',{exact:true}).waitFor();
 await page.reload();await progress.waitFor();await storageHealthy();assert.equal(await progress.locator('[name=notes]').inputValue(),'Explain return values myself. <script>text only</script>');assert.equal(await progress.locator('[name=resumeSeconds]').inputValue(),'73');assert.equal(await progress.locator('[name=watched]').isChecked(),true);
 await page.locator('[data-action=load-video]').click();assert.match(await frame.getAttribute('src'),/start=73/);
 await progress.locator('[name=notes]').fill('Unfinished input survives active playback and save');await progress.locator('[type=submit]').click();await saved();assert.equal(await frame.count(),1);
 report.checks.personalAddNotesBookmarkReload='PASS';
 // Export through the UI, then restore after deleting the personal video.
 await navigate('settings');const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await downloadPromise,backupPath=join(temporary,'backup.json');await download.saveAs(backupPath);
 const backup=JSON.parse(await readFile(backupPath,'utf8'));assert.equal(backup.data.attempts.length,0);assert.equal(backup.data.videos.length,1);
 report.checks.videoIsNotMasteryEvidence='PASS';
 await navigate(personalHash.slice(1));await page.locator('[data-action=delete-video]').click();await page.getByRole('button',{name:'Hapus video',exact:true}).click();await page.waitForURL(/#videos$/);
 await navigate('settings');await page.locator('#import-file').setInputFiles(backupPath);await page.getByRole('dialog').waitFor();await page.getByRole('dialog').locator('button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'detached'});
 await navigate(personalHash.slice(1));assert.equal(await progress.locator('[name=resumeSeconds]').inputValue(),'73');assert.equal(await progress.locator('[name=notes]').inputValue(),'Unfinished input survives active playback and save');
 report.checks.exportDeleteRestore='PASS';
 await navigate('videos');await page.locator('[name=source]').selectOption('personal');await page.getByRole('button',{name:'Cari video',exact:true}).click();await page.waitForURL(/source=personal/);await page.waitForFunction(()=>document.querySelectorAll('.video-card').length===1);assert.equal(await page.locator('.video-card').count(),1);
 await page.locator('[name=search]').fill('missing-needle');await page.getByRole('button',{name:'Cari video',exact:true}).click();await page.getByText('Belum ada video cocok.').waitFor();report.checks.searchAndSourceFilter='PASS';
 await page.setViewportSize({width:390,height:844});await navigate('videos');await page.screenshot({path:fileURLToPath(new URL('library-mobile.png',out)),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await navigate(personalHash.slice(1));await page.locator('[data-action=load-video]').click();await frame.waitFor();
 const box=await frame.boundingBox();assert.ok(box.width>=200&&box.height>=200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('watch-mobile.png',out)),fullPage:true});report.checks.mobileLayoutAndPlayerMinimum='PASS';
 await context.setOffline(true);await progress.locator('[name=notes]').fill('Offline reflection');await progress.locator('[type=submit]').click();await page.getByText('Catatan & bookmark tersimpan. Progres menonton adalah self-report.',{exact:true}).waitFor();await saved();await storageHealthy();assert.match(await page.getByRole('link',{name:'Buka di YouTube ↗'}).getAttribute('href'),/youtube.com/);await context.setOffline(false);
 await page.reload();await progress.waitFor();assert.equal(await progress.locator('[name=notes]').inputValue(),'Offline reflection');await storageHealthy();report.checks.offlineNotesAndFallbackLink='PASS';
 // Maximum-length user metadata must wrap rather than push controls off screen.
 await navigate('videos');await add.locator('[name=title]').fill('X'.repeat(200));await add.locator('[name=publisher]').fill('Y'.repeat(200));await add.locator('[name=url]').fill('https://youtu.be/JP7ITIXGpHk');await add.locator('[type=submit]').click();await page.waitForURL(/#videos\/user-/);await progress.waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.longPersonalMetadataMobile='PASS';
 await page.locator('[data-action=delete-video]').click();await page.getByRole('button',{name:'Hapus video',exact:true}).click();await page.waitForURL(/#videos$/);
 report.checks.noStorageWarnings='PASS';
 await page.goto(pathToFileURL(fileURLToPath(new URL('../artifacts/DSA-Journey.html',import.meta.url))).href+'#videos/cs50p-functions');
 if(await page.getByRole('dialog').count())await page.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();
 await page.locator('[data-action=load-video]').click();await page.getByRole('heading',{name:'Buka melalui localhost'}).waitFor();assert.equal(await page.locator('#video-player iframe').count(),0);report.checks.standaloneFallback='PASS';
 assert.deepEqual(errors,[]);report.checks.pageErrors='NONE';
 await writeFile(new URL('report.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){await page.screenshot({path:fileURLToPath(new URL('failure.png',out)),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temporary,{recursive:true,force:true});}
