import { REACTIONS, reactionFor, type ReactionId, ownedElements, canReceiveElements, selectElementSafeChoices } from './elements';
import { BOSS_CADENCE, BALANCE, upgradeValue, DIFFICULTIES, ENDLESS, rollUpgradeBonus, type Difficulty, CLASSES, ENEMIES, IDENTITIES, RULES, UPGRADES, type Upgrade, type ClassId, type EnemyKind } from '../data/config';
import { BossNavigation } from './boss-navigation';
export type Vec = { x: number; y: number };
export type Mode = 'menu' | 'playing' | 'paused' | 'upgrade' | 'identity' | 'dead' | 'won';
export type Enemy = Vec & { id: number; hp: number; maxHp: number; radius: number; speed: number; flash: number; kind?: EnemyKind; burn?: number; frost?: number; mark?: number; reactionCd?: number; attack?: number; phase?: number; dead?: boolean };
export type Gem = Vec & { id: number; value: number };
export type Shot = Vec & { id: number; vx: number; vy: number; life: number; remaining: number; hit: Set<number>; kind?: ClassId };
export type Hazard = Vec & { id: number; radius: number; delay: number; life: number; vx: number; vy: number; damage: number; type: 'orb' | 'blast' };
export type Obstacle = Vec & { radius: number; variant: number };
export type GameEvent = Vec & { type: 'hit' | 'kill' | 'hurt' | 'shot' | 'pickup' | 'dash' | 'reaction'; amount?: number; label?: string; reaction?: ReactionId; radius?: number; targetId?: number };
export function randomSource(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export class World {
  mode: Mode = 'menu'; time = 0; level = 1; xp = 0; kills = 0; nextXp = 8;
  enemies: Enemy[] = []; gems: Gem[] = []; shots: Shot[] = []; events: GameEvent[] = []; obstacles: Obstacle[] = [];
  lastReward: { kind: 'normal'|'critical'|'triple'; items: {id:string;before:number;after:number}[] } | null = null;
  triple = false; criticalId = ""; offerId = 0;
  choices: Upgrade[] = []; upgrades: Record<string, number> = {};
  hazards: Hazard[] = []; eggSeen = false; eggReward = ''; gift = ''; giftTimer = 0; vacuum = 0; reactionCounts = { melt: 0, collapse: 0, overload: 0, erosion: 0, storm: 0, prison: 0 }; bossSpawned = false;
  player = { x: 720, y: 720, hp: 100, maxHp: 100, speed: 158, damage: 26, interval: 0.72, range: 300, pickup: 70, pierce: 1, dashCooldown: 3.5, dashLeft: 0, dashActive: 0, invincible: 0, facingX: 0, facingY: 1, fire: 0, ice: 0, lightning: 0, void: 0, crit: .05, critPower: 1.8, regen: 0, armor: 0, area: 1, multishot: 0, thorns: 0, lifesteal: 0 };
  private killHealBudget = BALANCE.killHealPerSecond;
  private bossNavigation?: BossNavigation;
  private droneTimer = 0; private attacks = 0;
  private attackTimer = 0; private spawnTimer = 0.4; private id = 0; private rng: () => number;
  constructor(seed = Date.now(), public classId: ClassId = 'knight', public trial = false, public difficulty: Difficulty = 'challenge') {
    this.rng = randomSource(seed);
    Object.assign(this.player, CLASSES[classId]); this.player.maxHp = this.player.hp;
    if (classId === 'mage') this.player.void = 1;
    for (let i = 0; i < 30; i++) {
      const obstacle = { x: 130 + this.rng() * 1180, y: 130 + this.rng() * 1180, radius: 23 + this.rng() * 12, variant: i % 3 };
      if (distance(obstacle, this.player) > 170 && this.obstacles.every(o => distance(o, obstacle) > 115)) this.obstacles.push(obstacle);
    }
  }
  get elements() { return ownedElements(this.player); }
  get endless() { return this.difficulty === 'endless'; }
  get strength() {
    const d = DIFFICULTIES[this.difficulty], progress = this.trial ? 0 : Math.min(1, Math.max(0, this.time - BALANCE.lateFrom) / (RULES.bossAt - BALANCE.lateFrom));
    const minutes = this.endless ? Math.max(0, this.time - ENDLESS.growthAfter) / 60 : 0;
    return { hp: d.hp * (1 + (d.lateHp - 1) * progress) * Math.pow(1 + ENDLESS.hpPerMinute, minutes), damage: d.damage * (1 + (d.lateDamage - 1) * progress) * Math.pow(1 + ENDLESS.damagePerMinute, minutes) };
  }
  // Applied while moving so enemies already alive also accelerate in endless mode.
  get endlessSpeed() { return this.endless ? Math.min(ENDLESS.maxSpeedMultiplier, 1 + Math.max(0, this.time - ENDLESS.growthAfter) / 60 * ENDLESS.speedPerMinute) : 1; }
  start() { if (this.mode === 'menu') this.mode = 'playing'; }
  pause() { if (this.mode === 'playing') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'playing'; }
  dash() {
    const p = this.player;
    if (this.mode !== 'playing' || p.dashLeft > 0) return false;
    p.dashLeft = p.dashCooldown; p.dashActive = 0.19; p.invincible = 0.32;
    this.emit({ type: 'dash', x: p.x, y: p.y }); return true;
  }
  private emit(event: GameEvent) { if (this.events.length < 160) this.events.push(event); }
  drainEvents() { const events = this.events; this.events = []; return events; }
  private move(body: Vec, dx: number, dy: number, radius: number) {
    body.x = Math.max(50 + radius, Math.min(RULES.size - 50 - radius, body.x + dx));
    body.y = Math.max(50 + radius, Math.min(RULES.size - 50 - radius, body.y + dy));
    for (const o of this.obstacles) {
      const d = distance(body, o), min = o.radius + radius;
      if (d < min) { const nx = d > 0.001 ? (body.x - o.x) / d : 1; const ny = d > 0.001 ? (body.y - o.y) / d : 0; body.x = o.x + nx * min; body.y = o.y + ny * min; }
    }
  }
  spawnEnemy(requested?: EnemyKind) {
    if (this.enemies.length >= RULES.enemyCap) return;
    const a = this.rng() * Math.PI * 2, r = 350 + this.rng() * 80, p = this.player;
    let kind: EnemyKind = requested ?? 'crawler';
    if (!requested && !this.trial) { const roll=this.rng(); if(this.time>105 && roll<.07)kind='oracle'; else if(this.time>60 && roll<.1)kind='guardian'; else if(this.time>30 && roll<.3)kind='archer'; else if(this.time>15 && roll<.55)kind='wisp'; }
    const e = ENEMIES[kind];
    const hp = e.hp * (kind==='boss'?1:1 + this.time / 180) * this.strength.hp;
    const enemy: Enemy = { id: ++this.id, kind, x: Math.max(80, Math.min(1360, p.x + Math.cos(a) * r)), y: Math.max(80, Math.min(1360, p.y + Math.sin(a) * r)), hp, maxHp: hp, radius: e.radius, speed: (e.speed + Math.min(this.time * 2, 660) / 100) * DIFFICULTIES[this.difficulty].speed, flash: 0, attack: 1.5, phase: 1 };
    if (distance(enemy, p) < 180) { enemy.x = p.x < 720 ? p.x + 330 : p.x - 330; }
    if (kind === 'boss') {
      this.bossNavigation = new BossNavigation(this.obstacles, enemy.radius, RULES.size);
      Object.assign(enemy, this.bossNavigation.spawn(enemy, p));
    } else this.move(enemy, 0, 0, enemy.radius);
    this.enemies.push(enemy);
  }
  spawnBoss() { if(this.bossSpawned)return; this.bossSpawned=true; this.enemies=this.enemies.slice(0,30); this.spawnEnemy('boss'); this.emit({type:'reaction',x:this.player.x,y:this.player.y,label:'终焉守望者苏醒'}); }
  get boss() { return this.enemies.find(e=>e.kind==='boss'&&e.hp>0); }
  chooseIdentity(name: string) {
    if(this.mode!=='identity'||!IDENTITIES.includes(name))return false;
    const p=this.player,roll=Math.floor(this.rng()*6);
    if(name==='谁也不是')this.eggReward='无人知晓的旅人，继续前行。';
    else if(name==='大肥羊'){
      this.gift=['shield','magnet','echo'][roll%3]; this.giftTimer=0;
      this.eggReward={shield:'绒星护盾：每12秒抵挡一次伤害。',magnet:'羊群引力：每15秒吸引全场星屑，持续3秒。',echo:'咩咩回响：每第三次攻击额外发射一枚弹体。'}[this.gift]!;
    }else{
      const buffs=[()=>{p.damage*=1.06;return '伤害增加6%';},()=>{p.speed*=1.05;return '移速增加5%';},()=>{p.maxHp+=12;p.hp+=12;return '生命上限增加12';},()=>{p.pickup+=25;return '吸取范围增加25';},()=>{p.armor+=1;return '护甲增加1';},()=>{p.regen+=.25;return '每秒恢复0.25生命';}];
      this.eggReward=`${name}的祝福：${buffs[roll]()}`;
    }
    this.mode='playing';return true;
  }
  hitEnemy(e: Enemy, damage: number, elements = true) {
    if(e.hp<=0)return;
    const p=this.player; let amount=damage*(elements&&(e.mark??0)>0?1+p.void*.1:1);
    if(elements&&this.rng()<p.crit)amount*=p.critPower;
    if(e.kind==='boss') { const gate=e.phase===1?e.maxHp*2/3:e.phase===2?e.maxHp/3:0; e.hp=Math.max(gate,e.hp-amount); } else e.hp-=amount;
    e.flash=.12; if(elements)this.emit({type:'hit',x:e.x,y:e.y,amount:Math.round(amount)});
    if(elements&&e.hp>0){
      if(p.fire)e.burn=Math.max(e.burn??0,3); if(p.ice)e.frost=2+(p.ice-1)*.5; if(p.void)e.mark=Math.max(e.mark??0,3+(p.void-1)*.5);
      if(p.lightning){ let jumps=0;for(const other of this.enemies){if(other!==e&&other.hp>0&&distance(other,e)<130*p.area&&jumps<Math.ceil(p.lightning)){this.hitEnemy(other,p.damage*.45,false);jumps++;this.emit({type:'reaction',x:other.x,y:other.y,label:'雷链'});}} }
      if((e.reactionCd??0)<=0)this.react(e);
    }
    if(e.hp<=0&&!e.dead){e.dead=true;this.kills++;const heal=Math.min(p.lifesteal,this.killHealBudget);p.hp=Math.min(p.maxHp,p.hp+heal);this.killHealBudget-=heal;this.addGem(e.x,e.y,ENEMIES[e.kind??'crawler'].xp);this.emit({type:'kill',x:e.x,y:e.y});if(e.kind==='boss'&&!this.endless)this.mode='won';}
  }
  private react(target: Enemy) {
    const id=reactionFor(this.elements);if(!id)return;
    const p=this.player,r=REACTIONS[id],radius=r.radius*p.area;
    target.reactionCd=r.cooldown;this.reactionCounts[id]++;
    this.emit({type:'reaction',x:target.x,y:target.y,label:r.name,reaction:id,radius,targetId:target.id});
    if(id==='erosion'){target.burn=5;target.mark=Math.max(target.mark??0,5);return;}
    if(id==='melt'){target.burn=0;target.frost=0;}
    if(id==='collapse')target.mark=0;
    for(const other of this.enemies){
      if(other.hp<=0)continue;
      const d=distance(other,target);
      if((id==='collapse'||id==='prison')&&other!==target&&d<(id==='collapse'?140*p.area:radius)){
        const pull=id==='collapse'?.35:.5;this.move(other,(target.x-other.x)*pull,(target.y-other.y)*pull,other.radius);
      }
      if(distance(other,target)>=radius)continue;
      if(id==='overload')other.burn=Math.max(other.burn??0,3);
      if(id==='storm'||id==='prison')other.frost=Math.max(other.frost??0,id==='storm'?2:2.5);
      this.hitEnemy(other,p.damage*r.damage,false);
    }
  }
  private explode(center: Vec, radius: number, damage: number, label: string) { this.emit({type:'reaction',x:center.x,y:center.y,label});for(const e of this.enemies)if(e.hp>0&&distance(e,center)<radius)this.hitEnemy(e,damage,false); }
  private hazard(x: number,y: number,type: 'orb'|'blast',angle=0,radius=10,damage=14,delay=.6){ if(this.hazards.length>=RULES.hazardCap)return;this.hazards.push({id:++this.id,x,y,type,radius,damage,delay,life:type==='orb'?5:.2,vx:Math.cos(angle)*150,vy:Math.sin(angle)*150}); }
  private enemyAttack(e: Enemy, dt: number) {
    const kind=e.kind??'crawler',p=this.player;
    e.attack=(e.attack??1)-dt;
    if(kind==='boss'){
      if(e.phase===1&&e.hp<=e.maxHp*2/3){e.phase=2;e.attack=1;this.emit({type:'reaction',x:e.x,y:e.y,label:'第二阶段 · 星环破碎'});}
      if(e.phase===2&&e.hp<=e.maxHp/3){e.phase=3;e.attack=.8;this.emit({type:'reaction',x:e.x,y:e.y,label:'第三阶段 · 终焉怒潮'});}
    }
    if(e.attack>0)return;
    if(kind==='archer'){this.hazard(e.x,e.y,'orb',Math.atan2(p.y-e.y,p.x-e.x),8,13,.65);e.attack=3;}
    if(kind==='oracle'){for(let i=0;i<6;i++)this.hazard(e.x,e.y,'orb',i*Math.PI/3,9,16,.8);e.attack=4;}
    if(kind==='guardian'){this.hazard(p.x,p.y,'blast',0,48,22,1.2);e.attack=4.5;}
    if(kind==='boss'){
      const phase=e.phase??1;
      this.hazard(p.x,p.y,'blast',0,phase===3?85:60,BALANCE.bossBlastDamage,phase===3?.85:1.25);
      if(phase>=2){for(let i=0;i<10;i++)this.hazard(e.x,e.y,'orb',i*Math.PI/5+this.time*.08,10,18,.7);}
      if(phase===3){this.hazard(p.x+95,p.y,'blast',0,55,20,1.4);this.hazard(p.x-95,p.y,'blast',0,55,20,1.4);}
      e.attack=BOSS_CADENCE[phase-1];
    }
  }
  addGem(x: number, y: number, value: number) {
    if (this.gems.length >= RULES.gemCap) {
      let nearest = this.gems[0]; for (const gem of this.gems) if (Math.hypot(gem.x - x, gem.y - y) < Math.hypot(nearest.x - x, nearest.y - y)) nearest = gem;
      nearest.value += value;
    } else this.gems.push({ id: ++this.id, x, y, value });
  }
  private levelUp() {
    if (this.xp < this.nextXp || this.mode !== 'playing') return;
    this.xp -= this.nextXp; this.level++; this.nextXp = 8 + (this.level - 1) * (this.trial ? 6 : BALANCE.xpStep);
    this.mode = 'upgrade';
    const available = UPGRADES.filter(u => (this.upgrades[u.id] ?? 0) < u.max && canReceiveElements(this.elements,[u]));
    if(available.length<3)for(const id of ['heart','edge']){const u=UPGRADES.find(u=>u.id===id)!;if(!available.includes(u))available.push(u);}
    // Fisher–Yates: reproducible choices, no duplicate cards.
    for (let i = available.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [available[i], available[j]] = [available[j], available[i]]; }
    const bonus = rollUpgradeBonus(this.rng, 3);
    this.choices = selectElementSafeChoices(available, this.elements, bonus.triple);
    // A triple may exhaust its compatible cards even when the unfiltered pool has 3+.
    for (const id of ['heart','edge']) if(this.choices.length<3&&!this.choices.some(u=>u.id===id))this.choices.push(UPGRADES.find(u=>u.id===id)!);
    this.triple = bonus.triple; this.criticalId = this.choices[bonus.criticalIndex]?.id ?? ""; this.offerId++;
  }
  choose(id: string, offerId = this.offerId) {
    if (this.mode !== 'upgrade' || offerId !== this.offerId) return false;
    const u = this.choices.find(c => c.id === id); if (!u) return false;
    const rewards = this.triple ? [...this.choices] : this.criticalId === id ? [u, u] : [u];
    if (!canReceiveElements(this.elements,rewards)) return false;
    const items = [...new Set(rewards.map(r=>r.id))].map(id=>({id,before:this.upgrades[id]??0,after:0}));
    const kind = this.triple ? 'triple' : this.criticalId === id ? 'critical' : 'normal';
    for (const reward of rewards) this.applyUpgrade(reward);
    for (const item of items) item.after=this.upgrades[item.id];
    this.lastReward={kind,items};
    this.choices = []; this.triple = false; this.criticalId = ''; this.mode = 'playing'; this.levelUp(); return true;
  }
  private applyUpgrade(u: Upgrade) {
    this.upgrades[u.id] = (this.upgrades[u.id] ?? 0) + 1;
    const p = this.player, value = upgradeValue(u, this.upgrades[u.id]);
    if (u.stat === 'heal') p.hp = Math.min(p.maxHp, p.hp + value);
    else if (u.stat === 'maxHp') { p.maxHp += value; p.hp = Math.min(p.maxHp, p.hp + value); }
    else if (['damage','interval','speed','dashCooldown','area'].includes(u.stat)) p[u.stat] *= value;
    else p[u.stat] += value;
  }
  damagePlayer(amount: number) {
    const p = this.player;
    if (this.mode !== 'playing' || p.invincible > 0) return;
    if(this.gift==='shield'&&this.giftTimer<=0){this.giftTimer=12;p.invincible=.7;this.emit({type:'reaction',x:p.x,y:p.y,label:'绒星护盾'});return;}
    amount=Math.max(1,amount*this.strength.damage-p.armor);
    p.hp = Math.max(0, p.hp - amount); p.invincible = 0.7;
    this.emit({ type: 'hurt', x: p.x, y: p.y, amount });
    if (p.hp <= 0) this.mode = 'dead';
    else if(p.thorns>0)this.explode(p,100,p.thorns,'棘光反击');
  }
  step(dt: number, input: Vec) {
    if (this.mode !== 'playing') return;
    dt = Math.max(0, Math.min(dt, 0.05));
    this.time += dt;
    this.killHealBudget=Math.min(BALANCE.killHealPerSecond,this.killHealBudget+BALANCE.killHealPerSecond*dt);
    const p = this.player;
    p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);this.giftTimer=Math.max(0,this.giftTimer-dt);this.vacuum=Math.max(0,this.vacuum-dt);
    if(this.gift==='magnet'&&this.giftTimer<=0){this.giftTimer=15;this.vacuum=3;}
    if(!this.trial&&this.time>=RULES.eggAt&&!this.eggSeen){this.eggSeen=true;this.mode='identity';return;}
    if(!this.trial&&this.time>=RULES.bossAt&&!this.bossSpawned)this.spawnBoss();
    p.dashLeft = Math.max(0, p.dashLeft - dt); p.invincible = Math.max(0, p.invincible - dt);
    const n = Math.hypot(input.x, input.y);
    if (n > 0.05) { p.facingX = input.x / n; p.facingY = input.y / n; }
    if (p.dashActive > 0) { this.move(p, p.facingX * 690 * dt, p.facingY * 690 * dt, 14); p.dashActive = Math.max(0, p.dashActive - dt); }
    else if (n > 0.05) this.move(p, input.x / Math.max(1, n) * p.speed * dt, input.y / Math.max(1, n) * p.speed * dt, 14);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnTimer = this.bossSpawned&&(!this.endless||this.boss)?2.5:Math.max(0.3, 1.05 - this.time / 325); }
    this.attackTimer -= dt;
    if (this.attackTimer <= 0 && this.shots.length < RULES.projectileCap) {
      let nearest: Enemy | undefined, dist = p.range;
      for (const e of this.enemies) { const d = distance(e, p); if (d < dist) { nearest = e; dist = d; } }
      if (nearest) {
        this.attacks++;const count=1+p.multishot+(this.gift==='echo'&&this.attacks%3===0?1:0);
        const angle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
        for(let i=0;i<count&&this.shots.length<RULES.projectileCap;i++){
          const a=angle+(i-(count-1)/2)*.14,speed=this.classId==='mage'?310:490;
          const orbit=this.time*2+this.attacks%2*Math.PI;
          this.shots.push({ id: ++this.id, x: p.x+(this.classId==='engineer'?Math.cos(orbit)*42:0), y: p.y+(this.classId==='engineer'?Math.sin(orbit)*42:0), vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, life: this.classId==='mage'?1.4:.9, remaining: p.pierce, hit: new Set(),kind:this.classId });
        }
        this.attackTimer = p.interval; this.emit({ type: 'shot', x: p.x, y: p.y });
      }
    }
    for (const e of this.enemies) {
      if(e.hp<=0)continue;
      e.burn=Math.max(0,(e.burn??0)-dt);e.frost=Math.max(0,(e.frost??0)-dt);e.mark=Math.max(0,(e.mark??0)-dt);e.reactionCd=Math.max(0,(e.reactionCd??0)-dt);
      if(e.burn>0)this.hitEnemy(e,p.damage*.18*p.fire*dt*(p.void>0&&(e.mark??0)>0?2:1),false);
      if(e.hp<=0)continue;
      this.enemyAttack(e,dt);
      const d = Math.max(0.01, distance(e, p));
      // Tangential steering prevents pursuers from sticking behind columns.
      let vx = (p.x - e.x) / d, vy = (p.y - e.y) / d;
      if (e.kind === 'boss' && this.bossNavigation) {
        const next = this.bossNavigation.waypoint(e, p, this.time), length = Math.max(1, distance(e, next));
        vx = (next.x - e.x) / length; vy = (next.y - e.y) / length;
      } else for (const o of this.obstacles) if (Math.hypot(e.x + vx * 35 - o.x, e.y + vy * 35 - o.y) < o.radius + e.radius + 5) { const old = vx; vx = -vy; vy = old; break; }
      const slow=(e.frost??0)>0?.65:1,rangeHold=e.kind==='archer'&&d<210?0:1;
      this.move(e, vx * e.speed * this.endlessSpeed * dt*slow*rangeHold, vy * e.speed * this.endlessSpeed * dt*slow*rangeHold, e.radius);
      e.flash = Math.max(0, e.flash - dt);
      if (distance(e, p) < e.radius + 13) this.damagePlayer(ENEMIES[e.kind??'crawler'].damage);
    }
    if (p.hp <= 0) return;
    for (const s of this.shots) {
      if(s.kind==='engineer'){let target:Enemy|undefined,dist=250;for(const e of this.enemies){const d=distance(e,s);if(e.hp>0&&!s.hit.has(e.id)&&d<dist){target=e;dist=d;}}if(target){const a=Math.atan2(target.y-s.y,target.x-s.x);s.vx=Math.cos(a)*490;s.vy=Math.sin(a)*490;}}
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const e of this.enemies) {
        if (s.remaining <= 0) break;
        if (e.hp > 0 && !s.hit.has(e.id) && distance(s, e) < e.radius + 12) {
          s.remaining--; s.hit.add(e.id);this.hitEnemy(e,p.damage);
          if(s.kind==='mage')this.explode(e,65*p.area,p.damage*.6,'虚空爆裂');
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.droneTimer-=dt;
    if(this.classId==='engineer'&&this.droneTimer<=0){this.droneTimer=1;for(const e of this.enemies)if(distance(e,p)<65*p.area)this.hitEnemy(e,p.damage*.8);}
    for(const h of this.hazards){if(h.delay>0){h.delay-=dt;continue;}h.life-=dt;if(h.type==='orb'){h.x+=h.vx*dt;h.y+=h.vy*dt;}if(distance(h,p)<h.radius+12){this.damagePlayer(h.damage);if(h.type==='orb')h.life=0;}}
    this.hazards=this.hazards.filter(h=>h.life>0&&h.x>0&&h.y>0&&h.x<RULES.size&&h.y<RULES.size);
    this.shots = this.shots.filter(s => s.life > 0 && s.remaining > 0);
    for (const g of this.gems) {
      const d = distance(g, p);
      if (d < p.pickup||this.vacuum>0) { const speed = Math.min(d, dt * 440); g.x += (p.x - g.x) / Math.max(d, 0.01) * speed; g.y += (p.y - g.y) / Math.max(d, 0.01) * speed; }
      if (distance(g, p) < 20) { this.xp += g.value; g.value = 0; this.emit({ type: 'pickup', x: g.x, y: g.y }); }
    }
    this.gems = this.gems.filter(g => g.value > 0);
    if (this.trial&&this.time>=180) { this.time=180;this.mode='won';return; }
    if(!this.trial&&!this.endless&&this.time>=RULES.duration&&this.mode==='playing'){p.hp=0;this.mode='dead';return;}
    this.levelUp();
  }
}
