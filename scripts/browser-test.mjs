import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.GAME_URL || 'http://localhost:5173';
const output = 'test-results'; await mkdir(output, { recursive: true });
const installed = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || installed, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const results = [], errors = [], external = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).host !== new URL(base).host) external.push(r.url()); });
const snap = () => page.evaluate(() => window.__starfall.snapshot());
const check = async (name, fn) => { await fn(); results.push({ name, status: 'passed' }); console.log(`PASS ${name}`); };
const button = name => page.getByRole('button', { name, exact: true });
async function layout() {
  return page.evaluate(() => [...document.querySelectorAll('button,input,#joystick')].filter(el => el.getBoundingClientRect().width > 0 && el.checkVisibility()).map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(), r: el.getBoundingClientRect().toJSON() })).filter(({r}) => r.x < -1 || r.y < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1));
}
try {
  await page.goto(`${base}/?test=1`); await page.waitForFunction(() => window.__starfall && document.querySelector('canvas'));
  await page.screenshot({ path: `${output}/01-menu-390x844.png` });
  await check('手机主菜单、操作指引、设置与音量持久化', async () => {
    assert.deepEqual(await layout(), []);
    await button('初次探索？查看操作指引').tap(); assert.equal(await page.getByText('让星光指引你').isVisible(), true); await button('记住了').tap();
    await button('设置').tap(); await page.getByLabel('音效音量').fill('0.6'); await page.getByLabel('减少屏幕震动').check(); await button('完成').tap();
    await page.reload(); await page.waitForFunction(() => window.__starfall); await button('设置').tap(); assert.equal(await page.getByLabel('音效音量').inputValue(), '0.6'); assert.equal(await page.getByLabel('减少屏幕震动').isChecked(), true); await button('完成').tap();
  });
  await button('踏入遗迹 →').tap();
  await check('键盘移动与手动闪避', async () => {
    const before = await snap(); await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d'); const after = await snap(); assert.ok(after.x > before.x + 30);
    await page.keyboard.press('Space'); assert.ok((await snap()).dash > 0);
  });
  await check('真实触控摇杆与双指同时闪避', async () => {
    await page.waitForTimeout(3600);
    const cdp = await context.newCDPSession(page); const r = await page.locator('#joystick').boundingBox(); const d = await page.locator('#dash').boundingBox();
    const x = r.x + r.width / 2, y = r.y + r.height / 2; const before = await snap();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 34, y, id: 1 }] });
    await page.waitForTimeout(400);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 34, y, id: 1 }, { x: d.x + d.width / 2, y: d.y + d.height / 2, id: 2 }] });
    assert.ok((await snap()).dash > 0); await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok((await snap()).x < before.x - 20); await cdp.detach();
    const stop = await snap(); await page.waitForTimeout(350); assert.ok(Math.abs((await snap()).x - stop.x) < 40);
  });
  await check('自动寻敌攻击确实击败敌人', async () => { await page.waitForFunction(() => window.__starfall.snapshot().kills > 0, { timeout: 15000 }); });
  await page.screenshot({ path: `${output}/02-combat-390x844.png` });
  await check('暂停与恢复冻结计时；升级三选一后继续运行', async () => {
    await button('暂停游戏').tap(); const before = await snap(); await page.waitForTimeout(400); assert.equal((await snap()).time, before.time); await page.screenshot({ path: `${output}/03-pause.png` }); await button('继续探索').tap();
    await page.evaluate(() => window.__starfall.grantXp()); assert.equal((await snap()).mode, 'upgrade'); assert.equal(await page.locator('.upgrade-card').count(), 3); assert.deepEqual(await layout(), []);
    const time = (await snap()).time; await page.waitForTimeout(400); assert.equal((await snap()).time, time);
    await page.screenshot({ path: `${output}/04-upgrade.png` }); await page.locator('[data-action^="upgrade:"]').first().tap(); await page.waitForTimeout(200); assert.equal((await snap()).mode, 'playing'); assert.ok((await snap()).time > time);
  });
  await check('死亡结算、重开、胜利结算与本地记录', async () => {
    await page.evaluate(() => window.__starfall.fatal()); assert.equal(await page.getByText('倒在群星之间').isVisible(), true); await page.screenshot({ path: `${output}/05-death.png` });
    await button('再次踏入遗迹').tap(); const fresh = await snap(); assert.equal(fresh.hp, 100); assert.equal(fresh.level, 1); assert.equal(fresh.kills, 0);
    await page.evaluate(() => window.__starfall.finish()); assert.equal(await page.getByText('带着星光归来').isVisible(), true); await page.screenshot({ path: `${output}/06-win.png` });
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('starfall-ruins-v1'))); assert.equal(save.runs, 2); assert.equal(save.wins, 1); await button('返回营地').tap();
  });
  await check('20次死亡重开无显示对象累积', async () => {
    await button('踏入遗迹 →').tap(); const counts = [];
    for (let i = 0; i < 20; i++) { await page.evaluate(() => window.__starfall.fatal()); await button('再次踏入遗迹').tap(); await page.waitForTimeout(100); const s = await snap(); counts.push(s.render.displayObjects); assert.equal(s.render.enemySprites, 0); assert.equal(s.render.floaters, 0); }
    assert.ok(Math.max(...counts) < 45, JSON.stringify(counts)); results.push({ name: '重开显示对象数量', counts });
    await button('暂停游戏').tap(); await button('结束本次探索').tap();
  });
  await check('手机、横屏及桌面布局无控件裁切', async () => {
    for (const [width,height] of [[320,568],[360,640],[390,844],[412,915],[844,390],[1280,800]]) {
      await page.setViewportSize({ width, height }); assert.deepEqual(await layout(), [], `${width}x${height} menu`);
      await button('踏入遗迹 →').tap(); assert.deepEqual(await layout(), [], `${width}x${height} play`);
      await page.evaluate(() => window.__starfall.grantXp()); assert.deepEqual(await layout(), [], `${width}x${height} upgrade`);
      await page.screenshot({ path: `${output}/layout-${width}x${height}.png` });
      await page.locator('[data-action^="upgrade:"]').first().tap(); await button('暂停游戏').tap(); await button('结束本次探索').tap();
    }
  });
  await check('浏览器失去焦点会自动暂停', async () => { await button('踏入遗迹 →').tap(); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); assert.equal((await snap()).mode, 'paused'); });
  await check('无页面错误、资源404或境外网络请求', async () => { assert.deepEqual(errors, []); assert.deepEqual(external, []); });
} catch (e) { results.push({ name: 'failure', status: 'failed', message: e.stack }); await page.screenshot({ path: `${output}/failure.png` }); process.exitCode = 1; console.error(e); }
finally { await writeFile(`${output}/browser-results.json`, JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), results, errors, external }, null, 2)); await browser.close(); }
