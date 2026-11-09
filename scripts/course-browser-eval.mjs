import {createRequire} from 'node:module';
import {mkdir,mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2]||'playwright');
const temp=await mkdtemp(join(tmpdir(),'dsa-course-eval-')),out=new URL('../docs/course-eval/',import.meta.url);await mkdir(out,{recursive:true});
const server=await startServer({port:0,provider:null,dbPath:join(temp,'jobs.sqlite')}),base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/youtube|ytimg|googlevideo/.test(r.url()))requests.push(r.url());});
const report={date:'2026-11-09',checks:{},playlistPlayback:{status:'NOT VERIFIED'}};
const navigate=async hash=>{await page.goto(base+'/#'+hash);await page.locator('main h1').waitFor();};
const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
const progress=page.locator('[data-form=course-progress]');
try{
 await navigate('videos');await page.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();await page.locator('.course-card').first().waitFor();
 assert.equal(await page.locator('.course-card').count(),12);assert.match(await page.locator('.course-summary').innerText(),/61/);assert.equal(requests.length,0);
 const ids=new Set();for(let i=1;i<=6;i++){await navigate('videos?page='+i);await page.getByRole('status').filter({hasText:`Halaman ${i} dari 6`}).waitFor();for(const href of await page.locator('.course-card h2 a').evaluateAll(a=>a.map(x=>x.getAttribute('href').split('?')[0])))ids.add(href);}
 assert.equal(ids.size,61);report.checks.all61AcrossSixPages='PASS';
 await navigate('videos');await page.locator('[name=language]').selectOption('Indonesian');await page.getByRole('button',{name:'Cari course',exact:true}).click();await page.locator('.course-results').filter({hasText:'20 course ditemukan'}).waitFor();
 await page.getByRole('link',{name:'Halaman 2',exact:true}).click();await page.locator('.course-results').filter({hasText:'Halaman 2 dari 2'}).waitFor();assert.equal(await page.locator('.course-card').count(),8);
 await page.locator('.course-card h2 a').first().click();await progress.waitFor();await page.getByRole('link',{name:'Kembali ke hasil pencarian',exact:true}).click();await page.locator('.course-results').filter({hasText:'Halaman 2 dari 2'}).waitFor();assert.equal(await page.locator('[name=language]').inputValue(),'Indonesian');report.checks.indonesianFilterAndPageReturn='PASS';
 await navigate('videos?language=English&topic=principles');await page.locator('.course-card').first().waitFor();assert.equal(await page.locator('.course-card').count(),3);assert.match(await page.locator('.course-grid').innerText(),/SOLID/);report.checks.principlesFilter='PASS';
 await navigate('videos?evidence=search-only');await page.locator('.course-card').first().waitFor();assert.equal(await page.locator('.course-card').count(),6);assert.equal(await page.locator('.course-card').filter({hasText:'Provisional'}).count(),6);report.checks.provisionalLabels='PASS';
 await navigate('videos?search=unlikely-no-course');await page.getByText('Belum ada course cocok.').waitFor();report.checks.emptyFilter='PASS';
 await navigate('videos');await page.screenshot({path:fileURLToPath(new URL('library-desktop.png',out)),fullPage:true});
 await navigate('courses/en-cs50p');assert.equal(await page.locator('#course-player iframe').count(),0);await page.locator('[data-action=load-course]').click();const frame=page.locator('#course-player iframe');await frame.waitFor();assert.match(await frame.getAttribute('src'),/videoseries\?list=PLhQjrBD2T3817j24-GogXmWqO5Q5vYy0V/);
 try{
  await page.frameLocator('#course-player iframe').getByRole('button',{name:/^(Play|Play video|Play all)$/i}).first().click({timeout:15000});
  const playerFrame=page.frames().find(f=>f.url().startsWith('https://www.youtube-nocookie.com/embed/'));
  await playerFrame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>=2;},undefined,{timeout:20000});
  report.playlistPlayback={status:'PASS',...await playerFrame.evaluate(()=>({time:document.querySelector('video').currentTime,title:document.title}))};
 }catch(e){report.playlistPlayback={status:'BLOCKED/NOT VERIFIED',reason:e.message.split('\n')[0]};}
 await progress.locator('[name=notes]').fill('Episode 3: explain return values without watching.');await progress.locator('[name=watched]').check();await progress.locator('[type=submit]').click();await page.getByText('Catatan course tersimpan. Status selesai adalah self-report.',{exact:true}).waitFor();assert.equal(await frame.count(),1);
 await page.locator('[data-action=unload-course]').click();assert.equal(await frame.count(),0);await page.locator('[data-action=load-course]').click();await frame.waitFor();
 await page.screenshot({path:fileURLToPath(new URL('course-desktop.png',out)),fullPage:true});
 await page.reload();await progress.waitFor();assert.equal(await progress.locator('[name=notes]').inputValue(),'Episode 3: explain return values without watching.');assert.equal(await progress.locator('[name=watched]').isChecked(),true);assert.equal(await frame.count(),0);
 assert.equal(await page.locator('main .banner.error').count(),0);report.checks.playlistLifecycleAndNotesReload='PASS';
 await navigate('courses/en-fcc-cpp20');await progress.locator('[name=resumeSeconds]').fill('100000');await progress.locator('[name=notes]').fill('Long course bookmark');await progress.locator('[type=submit]').click();await page.getByText('Catatan course tersimpan. Status selesai adalah self-report.',{exact:true}).waitFor();await page.locator('[data-action=load-course]').click();await frame.waitFor();assert.match(await frame.getAttribute('src'),/start=100000/);report.checks.longFullVideoBookmark='PASS';
 await navigate('settings');const downloading=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await downloading,path=join(temp,'backup.json');await download.saveAs(path);const backup=JSON.parse(await readFile(path,'utf8'));assert.equal(backup.data.attempts.length,0);assert.equal(backup.data.courseProgress['en-fcc-cpp20'].resumeSeconds,100000);
 await navigate('courses/en-fcc-cpp20');await progress.locator('[name=notes]').fill('Temporary replacement');await progress.locator('[type=submit]').click();await page.getByText('Catatan course tersimpan. Status selesai adalah self-report.',{exact:true}).waitFor();
 await navigate('settings');await page.locator('#import-file').setInputFiles(path);await page.getByRole('dialog').waitFor();await page.getByRole('dialog').locator('button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'detached'});
 await navigate('courses/en-fcc-cpp20');assert.equal(await progress.locator('[name=notes]').inputValue(),'Long course bookmark');report.checks.backupRestoreAndEvidenceIsolation='PASS';
 await page.setViewportSize({width:390,height:844});await navigate('videos?language=Indonesian');await page.locator('.course-card').first().waitFor();assert.equal(await overflow(),false);await page.screenshot({path:fileURLToPath(new URL('library-mobile.png',out)),fullPage:true});
 await navigate('courses/en-dan-adams-csharp-patterns-solid');await progress.waitFor();assert.equal(await overflow(),false);await page.screenshot({path:fileURLToPath(new URL('course-mobile.png',out)),fullPage:true});
 await page.setViewportSize({width:320,height:800});assert.equal(await overflow(),false);await navigate('videos');assert.equal(await overflow(),false);report.checks.mobile390And320='PASS';
 await navigate('videos?view=videos');await page.locator('[data-form=add-video]').waitFor();assert.equal(await page.locator('.video-card').count(),5);report.checks.legacyVideosAccessible='PASS';
 await page.goto(pathToFileURL(fileURLToPath(new URL('../artifacts/DSA-Journey.html',import.meta.url))).href+'#videos');await page.locator('.course-card').first().waitFor();if(await page.getByRole('dialog').count())await page.getByRole('button',{name:'Mulai perjalanan',exact:true}).click();assert.equal(await page.locator('.course-card').count(),12);
 await page.locator('.course-card h2 a').first().click();await page.locator('[data-action=load-course]').click();await page.getByRole('heading',{name:'Buka melalui localhost'}).waitFor();report.checks.standaloneCatalogAndFallback='PASS';
 assert.deepEqual(errors,[]);report.checks.pageErrors='NONE';await writeFile(new URL('report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(e){await page.screenshot({path:fileURLToPath(new URL('failure.png',out)),fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
