import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];
try {
  for (const [name,url,offline] of [
    ['production','http://localhost:4173',false],
    ['standalone',pathToFileURL(path.resolve('release/星渊遗迹-离线版.html')).href,true],
  ]) {
    const context = await browser.newContext({ viewport:{width:390,height:844},hasTouch:true,isMobile:true,offline });
    const page = await context.newPage(); const errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message)); page.on('requestfailed',r=>errors.push(r.url())); page.on('request',r=>{if(/^https?:/.test(r.url())) requests.push(r.url());});
    await page.goto(url);
    try { await page.waitForSelector('canvas', { timeout: 10000 }); }
    catch (e) { console.error({name,errors,requests}); await page.screenshot({path:`test-results/${name}-failure.png`}); results.push({name,status:'failed',errors,requests}); throw e; }
    assert.equal(await page.evaluate(()=> typeof window.__starfall), 'undefined');
    await page.screenshot({path:`test-results/${name}-menu.png`});
    await page.getByRole('button',{name:'踏入遗迹 →',exact:true}).tap(); await page.waitForTimeout(1200);
    await page.screenshot({path:`test-results/${name}-combat.png`});
    assert.equal(await page.getByRole('button',{name:'暂停游戏'}).isVisible(),true);
    const rendered = await page.evaluate(()=>document.querySelector('canvas').width); assert.ok(rendered>0);
    await page.getByRole('button',{name:'暂停游戏'}).tap(); await page.getByRole('button',{name:'继续探索'}).tap();
    await page.waitForTimeout(500); assert.deepEqual(errors,[]); if(offline) assert.deepEqual(requests,[]);
    results.push({name,status:'passed',errors,httpRequests:requests.length}); console.log('PASS',name);
    await context.close();
  }
} finally { await writeFile('test-results/release-results.json',JSON.stringify(results,null,2)); await browser.close(); }
