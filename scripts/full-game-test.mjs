import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const dir='test-results/full';await mkdir(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});const snap=()=>page.evaluate(()=>window.__starfall.snapshot());const button=name=>page.getByRole('button',{name,exact:true});
const ensurePlaying=async()=>{for(let i=0;i<8&&(await snap()).mode==='upgrade';i++)await page.locator('[data-action^="upgrade:"]').first().tap();assert.equal((await snap()).mode,'playing');};
try{
 await page.goto('http://localhost:5173/?test=1');await page.waitForFunction(()=>window.__starfall);await page.screenshot({path:`${dir}/menu.png`});
 for(const [name,id] of [['虚空术士','mage'],['机械使徒','engineer'],['星刃骑士','knight']]){
  await button(name).tap();await button('踏入遗迹 →').tap();await page.waitForTimeout(800);assert.equal((await snap()).classId,id);await page.screenshot({path:`${dir}/${id}.png`});await button('暂停游戏').tap();await button('结束本次探索').tap();
 }results.push('三职业选择、真实精灵和可操作战斗');
 await button('踏入遗迹 →').tap();
 for(const id of ['fire','ice']){await page.evaluate(id=>window.__starfall.offer(id),id);await page.locator(`[data-action^="upgrade:${id}:"]`).tap();}await page.waitForFunction(()=>window.__starfall.snapshot().reactions.melt>0,{timeout:15000});results.push('通过升级界面取得火冰并实际触发熔裂');await page.screenshot({path:`${dir}/elements.png`});
 await page.evaluate(()=>window.__starfall.identity());assert.equal(await page.locator('.identity-grid button').count(),8);await page.waitForTimeout(250);await page.screenshot({path:`${dir}/identity.png`});await button('大肥羊').tap();assert.ok((await snap()).gift);assert.equal((await snap()).mode,'playing');results.push('八项身份弹窗、大肥羊奖励和恢复');
 await ensurePlaying();await page.evaluate(()=>window.__starfall.boss());await page.waitForTimeout(1400);await ensurePlaying();assert.equal((await snap()).boss.phase,1);await page.screenshot({path:`${dir}/boss-1.png`});
 await page.evaluate(()=>window.__starfall.bossPhase());assert.equal((await snap()).boss.phase,2);await page.waitForTimeout(1300);await ensurePlaying();await page.screenshot({path:`${dir}/boss-2.png`});
 await page.evaluate(()=>window.__starfall.bossPhase());assert.equal((await snap()).boss.phase,3);await page.waitForTimeout(1100);await ensurePlaying();assert.ok((await snap()).hazards>0);await page.screenshot({path:`${dir}/boss-3.png`});
 await page.evaluate(()=>window.__starfall.bossPhase());assert.equal((await snap()).mode,'won');await page.waitForTimeout(250);await page.screenshot({path:`${dir}/victory.png`});await button('再次踏入遗迹').tap();assert.equal((await snap()).boss,null);results.push('Boss三阶段、攻击预警、胜利及重开清除');
 assert.deepEqual(errors,[]);console.log(results);
}catch(e){results.push({failure:e.stack});await page.screenshot({path:`${dir}/failure.png`});console.error(e);process.exitCode=1;}
finally{await writeFile(`${dir}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
