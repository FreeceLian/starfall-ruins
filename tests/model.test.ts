import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World as FullWorld, distance } from '../src/game/model';
class World extends FullWorld { constructor(seed?:number){super(seed,'knight',true);} }
import { RULES, UPGRADES } from '../src/data/config';
import { parseSave } from '../src/game/storage';
const idle = { x: 0, y: 0 };
const run = (w: World, seconds: number, input = idle) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) { w.step(1 / 60, input); w.drainEvents(); } };
test('seeded arenas reproduce and leave a safe spawn', () => {
  const a = new World(42), b = new World(42); assert.deepEqual(a.obstacles, b.obstacles); assert.ok(a.obstacles.length > 10);
  assert.ok(a.obstacles.every(o => distance(o, a.player) > 170)); assert.notDeepEqual(a.obstacles, new World(41).obstacles);
});
test('movement normalizes diagonal input and clamps arena boundaries', () => {
  const a = new World(1), b = new World(1); a.obstacles = []; b.obstacles = []; a.start(); b.start(); run(a, .5, { x: 1, y: 0 }); run(b, .5, { x: 1, y: 1 });
  assert.ok(Math.abs(distance(a.player, { x: 720, y: 720 }) - distance(b.player, { x: 720, y: 720 })) < .001);
  run(a, 10, { x: 1, y: 0 }); assert.ok(a.player.x <= RULES.size - 64);
});
test('solid columns block the player', () => { const w = new World(1); w.start(); w.obstacles = [{ x: 780, y: 720, radius: 30, variant: 0 }]; run(w, 1, { x: 1, y: 0 }); assert.ok(w.player.x <= 736.001); });
test('auto attack kills an approaching enemy and creates collectible XP', () => {
  const w = new World(3); w.start(); w.obstacles = []; w.enemies.push({ id: 999, x: 800, y: 720, hp: 30, maxHp: 30, radius: 16, speed: 0, flash: 0 });
  run(w, 1.2); assert.ok(w.kills >= 1); assert.ok(w.gems.length > 0 || w.xp > 0);
  w.addGem(w.player.x, w.player.y, 8); run(w, .05); assert.equal(w.mode, 'upgrade'); assert.equal(w.level, 2);
});
test('upgrade freezes simulation, offers three unique choices, resumes and rejects invalid input', () => {
  const w = new World(5); w.start(); w.xp = 8; w.step(1 / 60, idle); assert.equal(w.mode, 'upgrade');
  assert.equal(w.choices.length, 3); assert.equal(new Set(w.choices.map(u => u.id)).size, 3);
  const time = w.time; run(w, 4); assert.equal(w.time, time); assert.equal(w.choose('invalid'), false); assert.equal(w.mode, 'upgrade');
  assert.equal(w.choose(w.choices[0].id), true); assert.equal(w.mode, 'playing'); run(w, .1); assert.ok(w.time > time);
});
test('all advertised upgrades change the actual player stat', () => {
  for (const u of UPGRADES) { const w = new World(4); w.mode = 'upgrade'; w.choices = [u]; w.player.hp = 20; const before = u.stat === 'heal' ? w.player.hp : w.player[u.stat]; assert.ok(w.choose(u.id)); const after = u.stat === 'heal' ? w.player.hp : w.player[u.stat]; assert.notEqual(after, before, u.id); }
});
test('banked experience chains upgrades without losing XP or softlocking', () => { const w = new World(2); w.start(); w.xp = 40; w.step(1 / 60, idle); let choices = 0; while (w.mode === 'upgrade' && choices < 10) { w.choose(w.choices[0].id); choices++; } assert.equal(choices, 2); assert.equal(w.mode, 'playing'); assert.equal(w.xp, 18); });
test('dash moves faster, grants invulnerability and enforces cooldown', () => {
  const w = new World(9); w.obstacles = []; w.start(); assert.ok(w.dash()); assert.equal(w.dash(), false); w.damagePlayer(12); assert.equal(w.player.hp, 100); run(w, .15); assert.ok(w.player.y - 720 > 90); run(w, .65); w.damagePlayer(12); assert.equal(w.player.hp, 88); assert.ok(w.player.dashLeft > 0);
});
test('contact damage has a grace period; death freezes and a fresh run resets everything', () => {
  const w = new World(2); w.start(); w.player.damage = 0; w.enemies = [{ id: 1, x: 720, y: 720, hp: 1000, maxHp: 1000, radius: 16, speed: 0, flash: 0 }]; run(w, .3); assert.equal(w.player.hp, 88); run(w, 8); assert.equal(w.mode, 'dead'); assert.equal(w.player.hp, 0); const time = w.time; run(w, 3); assert.equal(w.time, time);
  const fresh = new World(); fresh.start(); assert.equal(fresh.player.hp, 100); assert.equal(fresh.kills, 0); assert.equal(fresh.level, 1); assert.equal(fresh.shots.length, 0); assert.equal(fresh.mode, 'playing');
});
test('pause/resume and trial extraction are finite', () => { const w = new World(); w.start(); w.pause(); run(w, 10); assert.equal(w.time, 0); w.resume(); w.time = 180 - .01; w.step(1 / 60, idle); assert.equal(w.mode, 'won'); assert.equal(w.time, 180); run(w, 2); assert.equal(w.time, 180); });
test('full 180-second simulation ends and obeys entity and effect caps', () => {
  const w = new World(234); w.start(); let maxEnemies = 0, maxShots = 0;
  for (let i = 0; i < 10810; i++) { w.player.invincible = 1; if (w.mode === 'upgrade') w.choose(w.choices[0].id); const a = i / 400; w.step(1 / 60, { x: Math.cos(a), y: Math.sin(a) }); maxEnemies = Math.max(maxEnemies, w.enemies.length); maxShots = Math.max(maxShots, w.shots.length); w.drainEvents(); }
  assert.equal(w.mode, 'won'); assert.ok(maxEnemies <= RULES.enemyCap); assert.ok(maxShots <= RULES.projectileCap); assert.ok(w.kills > 10);
});
test('XP cap merges value without silently deleting rewards', () => { const w = new World(1); for (let i = 0; i < 2000; i++) w.addGem(i % 1400, 10, 4); assert.equal(w.gems.length, RULES.gemCap); assert.equal(w.gems.reduce((n, g) => n + g.value, 0), 8000); });
test('corrupt, unavailable and out-of-range saves have safe defaults', () => {
  assert.equal(parseSave('broken').volume, .35); assert.equal(parseSave('null').bestKills, 0); assert.equal(parseSave('{"volume":55,"bestKills":-2}').volume, 1); assert.equal(parseSave('{"volume":55,"bestKills":-2}').bestKills, 0); assert.equal(parseSave('{"volume":0,"reducedMotion":true}').volume, 0); assert.equal(parseSave('{"volume":0,"reducedMotion":true}').reducedMotion, true);
});
