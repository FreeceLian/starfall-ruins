import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?test=1');await page.waitForFunction(()=>window.__starfall);const snap=()=>page.evaluate(()=>window.__starfall.snapshot());
 for(const [name,id] of [['星刃骑士','knight'],['虚空术士','mage'],['机械使徒','engineer']]){
  await page.getByRole('button',{name,exact:true}).tap();await page.locator('[data-action="start"]').tap();await page.waitForTimeout(400);
  let s=await snap();assert.ok(Math.abs(s.render.heroScreenHeight-(id==='engineer'?42*390/430:85))<.01);assert.equal(s.render.heroTextureSize[1],192);assert.equal(s.render.heroPose,id);
  await page.waitForFunction(id=>window.__starfall.snapshot().render.shotTextures.includes('shot-'+id),id,{timeout:15000});await page.screenshot({path:`test-results/hero-preview/in-game-${id}.png`});
  await page.locator('[data-action="pause"]').tap();await page.waitForTimeout(80);const paused=await snap();await page.waitForTimeout(200);assert.equal((await snap()).render.heroY,paused.render.heroY);assert.equal((await snap()).time,paused.time);
  await page.locator('[data-action="resume"]').tap();await page.keyboard.press('Space');await page.waitForTimeout(60);assert.ok((await snap()).dash>0);await page.waitForTimeout(500);assert.equal((await snap()).render.afterimages,0);
  await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="leave"]').tap();
 }
 await page.locator('[data-action="settings"]').tap();await page.locator('#motion').check();await page.locator('[data-action="back"]').tap();await page.locator('[data-action="start"]').tap();await page.waitForTimeout(120);const still=(await snap()).render.heroY;await page.waitForTimeout(250);assert.equal((await snap()).render.heroY,still);
 await page.evaluate(()=>window.__starfall.erosionStress());await page.waitForTimeout(3000);await page.screenshot({path:'test-results/hero-preview/in-game-pressure.png'});const r=(await snap()).render;assert.ok(r.reactionPool<=16&&r.particles<=150&&r.floaters<=24);assert.deepEqual(errors,[]);
 console.log('PASS heroes: knight/mage 85px, compact engineer at 390px viewport, 192px textures, real class projectiles, paused float, dash cleanup, reduced motion, dense erosion caps, no page errors');
}finally{await browser.close();}
