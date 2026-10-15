import test from 'node:test';
import assert from 'node:assert/strict';
import { World, distance } from '../src/game/model';
import { RULES } from '../src/data/config';
const safe=(w:World)=>{const b=w.boss!;assert.ok(b.x>=50+b.radius&&b.x<=RULES.size-50-b.radius);assert.ok(b.y>=50+b.radius&&b.y<=RULES.size-50-b.radius);for(const o of w.obstacles)assert.ok(distance(b,o)>=b.radius+o.radius-.01);};
test('Boss spawns safely and reaches players across seeded maps and corners',()=>{
 for(let seed=1;seed<=40;seed++)for(const p of [{x:720,y:720},{x:1280,y:160},{x:160,y:1280}]){
  const w=new World(seed);w.start();Object.assign(w.player,p,{damage:0,invincible:999});w.spawnBoss();safe(w);
  for(let i=0;i<60*45&&distance(w.boss!,w.player)>75;i++){w.enemies=[w.boss!];w.step(1/60,{x:0,y:0});w.drainEvents();safe(w);}
  assert.ok(distance(w.boss!,w.player)<110,`seed ${seed} at ${p.x},${p.y}`);
 }
});
test('Boss routes around an upper-right wall instead of wedging into the narrow gaps',()=>{
 const w=new World(3);w.start();w.obstacles=[{x:1120,y:220,radius:34,variant:0},{x:1120,y:335,radius:34,variant:0},{x:1120,y:450,radius:34,variant:0}];
 Object.assign(w.player,{x:900,y:335,damage:0,invincible:999});w.spawnBoss();Object.assign(w.boss!,{x:1270,y:335});
 for(let i=0;i<60*25;i++){w.enemies=[w.boss!];w.step(1/60,{x:0,y:0});w.drainEvents();safe(w);}
 assert.ok(distance(w.boss!,w.player)<75);
});
