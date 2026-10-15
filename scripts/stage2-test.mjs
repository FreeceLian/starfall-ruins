import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const dir='test-results/stage2';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
const snap=()=>page.evaluate(()=>window.__starfall.snapshot());
try{
 await page.goto('http://localhost:5173/?test=1');await page.waitForFunction(()=>window.__starfall);
 await page.getByRole('button',{name:'设置',exact:true}).tap();await page.getByLabel('背景音乐',{exact:true}).fill('0.4');await page.getByRole('button',{name:'完成',exact:true}).tap();await page.reload();await page.getByRole('button',{name:'设置',exact:true}).tap();assert.equal(await page.getByLabel('背景音乐',{exact:true}).inputValue(),'0.4');await page.waitForTimeout(250);await page.screenshot({path:`${dir}/settings.png`});await page.getByRole('button',{name:'完成',exact:true}).tap();results.push('音乐独立设置持久化');
 await page.getByRole('button',{name:'踏入遗迹 →',exact:true}).tap();await page.waitForTimeout(500);assert.equal((await snap()).audio.state,'running');assert.equal((await snap()).audio.musicPlaying,true);
 const positions=[];await page.keyboard.down('a');for(let i=0;i<9;i++){await page.waitForTimeout(70);const r=(await snap()).render;assert.equal(r.heroPose,'knight');positions.push(r.heroY);}await page.keyboard.up('a');assert.ok(Math.max(...positions)-Math.min(...positions)>0.1);assert.ok(Math.max(...positions)-Math.min(...positions)<3);results.push('骑士王单贴图移动与轻微浮动');
 let sword=false,maxVoices=0;for(let i=0;i<60;i++){await page.waitForTimeout(100);const s=await snap();if(s.render.shotTextures.includes('shot-knight'))sword=true;maxVoices=Math.max(maxVoices,s.audio.voices);}assert.ok(sword);assert.ok(maxVoices>0&&maxVoices<=32);results.push({name:'实际光剑弹道与音频节点上限',maxVoices});
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results,null,2));
}catch(e){await page.screenshot({path:`dir/failure.png`.replace('dir',dir)});results.push({failure:e.stack});process.exitCode=1;console.error(e);}
finally{await writeFile(`${dir}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
