import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World,type Enemy,distance} from '../src/game/model';
import {CLASSES,ENEMIES,IDENTITIES,RULES,UPGRADES,type ClassId} from '../src/data/config';
const idle={x:0,y:0};
function enemy(w:World,x=800,y=720,hp=1000):Enemy{const e:Enemy={id:9000+w.enemies.length,x,y,hp,maxHp:hp,radius:16,speed:0,flash:0};w.enemies.push(e);return e;}
function run(w:World,seconds:number){for(let i=0;i<seconds*60;i++){w.step(1/60,idle);w.drainEvents();}}
test('three classes use different health, projectile behavior and starting void',()=>{
 for(const id of Object.keys(CLASSES) as ClassId[]){const w=new World(4,id);w.start();w.obstacles=[];enemy(w);run(w,.05);assert.equal(w.player.maxHp,CLASSES[id].hp);assert.equal(w.shots[0].kind,id);if(id==='mage')assert.equal(w.player.void,1);}
 const w=new World(5,'mage');w.start();w.obstacles=[];const e=enemy(w,765),adjacent=enemy(w,785);run(w,.3);assert.ok(e.hp<1000);assert.ok(adjacent.hp<1000,'mage splash reaches adjacent target');
 const m=new World(4,'engineer');m.start();m.obstacles=[];const near=enemy(m,770);run(m,.02);assert.ok(near.hp<1000,'orbit contact damage');
});
test('all twenty upgrade stats have real values and unique ids',()=>{
 assert.ok(UPGRADES.length>=18);assert.equal(new Set(UPGRADES.map(u=>u.id)).size,UPGRADES.length);
 for(const u of UPGRADES){const w=new World(1);w.mode='upgrade';w.choices=[u];w.player.hp=1;const key=u.stat==='heal'?'hp':u.stat;const before=w.player[key];assert.ok(w.choose(u.id));assert.notEqual(w.player[key],before,u.id);}
});
test('fire damages over time and ice actually reduces travel',()=>{
 const fire=new World(1);fire.start();fire.player.damage=10;fire.player.fire=2;const e=enemy(fire,950);fire.hitEnemy(e,10);const hp=e.hp;run(fire,.5);assert.ok(e.hp<hp);
 const a=new World(3),b=new World(3);a.start();b.start();a.obstacles=[];b.obstacles=[];a.player.damage=0;b.player.damage=0;const ea=enemy(a,900),eb=enemy(b,900);ea.speed=50;eb.speed=50;eb.frost=2;run(a,1);run(b,1);assert.ok(distance(eb,b.player)>distance(ea,a.player)+10);
});
test('melt and collapse cause AoE, pull and respect reaction cooldown',()=>{
 const w=new World(1);w.start();w.obstacles=[];w.player.fire=1;w.player.ice=1;const e=enemy(w,850),other=enemy(w,890);w.hitEnemy(e,1);assert.equal(w.reactionCounts.melt,1);assert.ok(other.hp<1000);w.hitEnemy(e,1);assert.equal(w.reactionCounts.melt,1);
 const v=new World(2);v.start();v.obstacles=[];v.player.void=1;v.player.lightning=1;const target=enemy(v,850),pulled=enemy(v,960);const before=distance(target,pulled);v.hitEnemy(target,1);assert.equal(v.reactionCounts.collapse,1);assert.ok(distance(target,pulled)<before);assert.ok(pulled.hp<1000);
});
test('AoE kills counted once even when the original target dies inside reaction',()=>{const w=new World(1);w.start();w.player.fire=w.player.ice=1;const e=enemy(w,850,720,20);w.hitEnemy(e,1);assert.equal(w.kills,1);assert.equal(w.gems.reduce((sum,g)=>sum+g.value,0),4);});
test('five enemies have distinct ranged, fast and elite behaviors',()=>{
 const w=new World(8);w.start();w.obstacles=[];for(const kind of ['crawler','wisp','archer','guardian','oracle'] as const)w.spawnEnemy(kind);assert.equal(new Set(w.enemies.map(e=>e.kind)).size,5);assert.ok(ENEMIES.wisp.speed>ENEMIES.crawler.speed);run(w,2);assert.ok(w.hazards.some(h=>h.type==='blast'));assert.ok(w.hazards.some(h=>h.type==='orb'));
});
test('identity appears once at configured identity time and all eight choices resume',()=>{
 for(const name of IDENTITIES){const w=new World(7);w.start();w.time=RULES.eggAt;w.step(1/60,idle);assert.equal(w.mode,'identity');const p={...w.player};assert.equal(w.chooseIdentity(name),true);assert.equal(w.mode,'playing');assert.ok(w.eggReward.length>0);if(name==='谁也不是')assert.deepEqual(w.player,p);if(name==='大肥羊')assert.ok(['shield','magnet','echo'].includes(w.gift));w.step(1/60,idle);assert.notEqual(w.mode,'identity');}
});
test('all three unique sheep gifts have gameplay effects',()=>{
 const w=new World(3);w.start();w.gift='shield';w.damagePlayer(20);assert.equal(w.player.hp,100);w.player.invincible=0;w.damagePlayer(20);assert.equal(w.player.hp,80);
 w.gift='magnet';w.giftTimer=0;w.addGem(1200,720,4);const x=w.gems[0].x;w.step(1/60,idle);assert.ok(w.gems[0].x<x);
 const e=new World(3);e.start();e.obstacles=[];e.gift='echo';e.player.damage=0;enemy(e,950);run(e,1.6);assert.ok(e.shots.length>=2,'third volley includes echo');
});
test('boss spawns at configured boss time, gates damage through all three phases and ends game',()=>{
 const w=new World(12);w.start();w.eggSeen=true;w.time=RULES.bossAt-.01;w.step(1/60,idle);assert.ok(w.boss);const b=w.boss!;assert.equal(b.phase,1);w.hitEnemy(b,1e6,false);assert.equal(w.mode,'playing');assert.equal(b.hp,b.maxHp*2/3);w.step(1/60,idle);assert.equal(b.phase,2);w.hitEnemy(b,1e6,false);w.step(1/60,idle);assert.equal(b.phase,3);w.hitEnemy(b,1e6,false);assert.equal(w.mode,'won');
});
test('boss phase three emits more hazards; final collapse cannot softlock',()=>{
 const w=new World(4);w.start();w.eggSeen=true;w.spawnBoss();const b=w.boss!;b.phase=3;b.attack=0;w.step(1/60,idle);assert.ok(w.hazards.length>=13);w.time=RULES.duration-.01;w.step(1/60,idle);assert.equal(w.mode,'dead');assert.equal(w.player.hp,0);
});
test('full full-length simulation maintains caps and ends without indefinite combat',()=>{
 const w=new World(67,'engineer');w.start();let maxHazards=0,maxEnemies=0;
 for(let i=0;i<RULES.duration*60+10;i++){if(w.mode==='identity')w.chooseIdentity('谁也不是');if(w.mode==='upgrade')w.choose(w.choices[0].id);w.player.invincible=1;w.step(1/60,{x:Math.cos(i/400),y:Math.sin(i/400)});w.drainEvents();maxHazards=Math.max(maxHazards,w.hazards.length);maxEnemies=Math.max(maxEnemies,w.enemies.length);}
 assert.ok(w.mode==='won'||w.mode==='dead');assert.ok(w.bossSpawned);assert.ok(maxHazards<=RULES.hazardCap);assert.ok(maxEnemies<=RULES.enemyCap);
});
