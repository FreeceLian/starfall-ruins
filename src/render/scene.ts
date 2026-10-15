import { REACTIONS, type ReactionId } from '../game/elements';
import Phaser from 'phaser';
import { World, randomSource, type GameEvent } from '../game/model';
import { RULES } from '../data/config';
import type { Controls } from '../game/input';
import { POSES } from './art';
// 85 CSS pixels at the 390px-wide portrait reference; camera scaling remains shared.
const HERO_HEIGHT = 85 * 430 / 390;
const HERO_ART = {
  knight: { width: 126, center: 338 / 726 },
  mage: { width: 140, center: 360 / 809 },
  engineer: { width: 162, center: .5 },
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: number; size: number };
export class RuinsScene extends Phaser.Scene {
  world: World = new World(); controls?: Controls;
  onTick: () => void = () => {}; onEvent: (event: GameEvent) => void = () => {};
  reducedMotion = false;
  private hero!: Phaser.GameObjects.Image; private aura!: Phaser.GameObjects.Graphics; private effects!: Phaser.GameObjects.Graphics;
  private enemies = new Map<number, Phaser.GameObjects.Image>(); private gems = new Map<number, Phaser.GameObjects.Image>(); private shots = new Map<number, Phaser.GameObjects.Image>();
  private props: Phaser.GameObjects.Image[] = []; private particles: Particle[] = []; private floaters: { text: Phaser.GameObjects.Text; life: number; y: number }[] = [];
  private accumulator = 0; private uiTimer = 0; private initialized = false;
  private atmosphere!: Phaser.GameObjects.Graphics;
  private afterimages: { image: Phaser.GameObjects.Image; life: number }[] = [];
  private lastTrail = 0;
  private reactionFx: {x:number;y:number;radius:number;id:ReactionId;life:number;targetId?:number;sprite:Phaser.GameObjects.Image}[]=[];
  private lastLabels=new Map<string,number>(); private lastSparks=-1;

  constructor() { super('ruins'); }
  preload() {
    this.load.svg('knight', './assets/knight.svg', { width: 126, height: 192 });
    this.load.svg('mage', './assets/mage.svg', { width: 140, height: 192 });
    this.load.svg('engineer', './assets/engineer.svg', { width: 162, height: 192 });
    this.load.svg('shot-knight', './assets/shot-knight.svg', { width: 80, height: 32 });
    this.load.svg('shot-mage', './assets/shot-mage.svg', { width: 40, height: 40 });
    this.load.svg('shot-engineer', './assets/shot-engineer.svg', { width: 40, height: 32 });
    this.load.svg('crawler', './assets/crawler.svg', { width: 120, height: 110 });
    this.load.svg('column', './assets/column.svg', { width: 120, height: 150 });
    for(const [key,url] of [['wisp','./assets/wisp.svg'],['archer','./assets/archer.svg'],['guardian','./assets/guardian.svg'],['oracle','./assets/oracle.svg'],['boss','./assets/boss.svg']])this.load.svg(key,url,{width:160,height:176});
    for (const [key, url] of POSES) this.load.svg(key, url, { width: 144, height: key.startsWith('knight') ? 168 : 132 });
  }
  create() {
    this.makeFloor(); this.makeEffects();
    this.add.image(0, 0, 'floor').setOrigin(0).setDepth(-100);
    this.aura = this.add.graphics().setDepth(0);
    this.atmosphere = this.add.graphics().setDepth(1900).setBlendMode(Phaser.BlendModes.ADD);
    this.hero = this.add.image(720, 720, 'knight');
    this.effects = this.add.graphics().setDepth(2200);
    this.cameras.main.setBounds(0, 0, RULES.size, RULES.size);
    const resize = () => this.cameras.main.setZoom(Math.min(this.scale.width / 430, this.scale.height / 630));
    this.scale.on('resize', resize); resize();
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.initialized = true; this.rebuildProps(); this.onTick();
  }
  replace(world: World) {
    this.world = world; for(const fx of this.reactionFx)fx.sprite.destroy(); this.reactionFx=[];this.lastLabels.clear();this.lastSparks=-1; this.accumulator = 0; this.particles = [];
    this.lastTrail = 0;

    for (const ghost of this.afterimages) ghost.image.destroy(); this.afterimages = [];
    for (const map of [this.enemies, this.gems, this.shots]) { for (const sprite of map.values()) sprite.destroy(); map.clear(); }
    for (const item of this.floaters) item.text.destroy(); this.floaters = [];
    if (this.initialized) this.rebuildProps();
  }
  private rebuildProps() {
    this.props.forEach(p => p.destroy());
    this.props = this.world.obstacles.map(o => this.add.image(o.x, o.y + 8, 'column').setDisplaySize(o.radius * 2.5, o.radius * 3.12).setOrigin(0.5, 0.86).setDepth(o.y + 10).setTint(o.variant === 1 ? 0x99b4c0 : 0xffffff));
  }
  private makeFloor() {
    const texture = this.textures.createCanvas('floor', RULES.size, RULES.size)!; const ctx = texture.context; const rnd = randomSource(23031);
    ctx.fillStyle = '#101d2b'; ctx.fillRect(0, 0, 1440, 1440);
    for (let y = 0; y < 1440; y += 80) for (let x = 0; x < 1440; x += 80) {
      const variation = Math.floor(rnd() * 7); ctx.fillStyle = `rgb(${19 + variation},${32 + variation},${45 + variation})`;
      const tx = x + (y / 80 % 2) * 40;
      ctx.fillRect(tx + 2, y + 2, 77, 77); ctx.strokeStyle = '#35424b55'; ctx.strokeRect(tx + 3, y + 3, 75, 75);
      if (rnd() < 0.48) { ctx.strokeStyle = '#08132177'; ctx.beginPath(); ctx.moveTo(tx + 3, y + 25); ctx.lineTo(tx + 20, y + 40); ctx.lineTo(tx + 12, y + 54); ctx.lineTo(tx + 34, y + 69); ctx.stroke(); }
      if (rnd() < 0.24) { ctx.fillStyle = '#45636133'; ctx.beginPath(); ctx.ellipse(tx + rnd() * 60, y + 62, 18, 4, 0.4, 0, Math.PI * 2); ctx.fill(); }
    }
    // Inlaid astral navigation dial, etched into the arena floor.
    ctx.save(); ctx.translate(720, 720);
    for (const radius of [112, 118, 151, 158, 274, 280]) { ctx.strokeStyle = radius < 200 ? '#8ba99838' : '#6d829330'; ctx.lineWidth = radius === 151 ? 3 : 1; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate(i / 16 * Math.PI * 2); ctx.strokeStyle = '#86b4a952'; ctx.beginPath(); ctx.moveTo(0, 126); ctx.lineTo(0, 140); ctx.lineTo(5, 134); ctx.moveTo(-5, 134); ctx.lineTo(0, 140); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = '#7b9f9644'; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 45 : 100; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); ctx.restore();
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = rnd() > 0.5 ? '#b6bbab09' : '#040a101a'; ctx.fillRect(rnd() * 1440, rnd() * 1440, rnd() * 3 + 1, 1); }
    ctx.strokeStyle = '#6e8e8b55'; ctx.lineWidth = 3; ctx.strokeRect(49, 49, 1342, 1342); ctx.strokeStyle = '#030b1577'; ctx.lineWidth = 30; ctx.strokeRect(23, 23, 1394, 1394);
    // Weathered stone chips, muted moss and light cast by ancient inscriptions.
    ctx.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const x = 70 + rnd() * 1300, y = 70 + rnd() * 1300, size = 3 + rnd() * 8;
      ctx.fillStyle = i % 4 === 0 ? '#59777244' : '#67758424'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size, y - 3); ctx.lineTo(x + size * 1.4, y + 4); ctx.lineTo(x + 2, y + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#030c1755'; ctx.stroke();
    }
    for (const [x, y] of [[720,720],[220,280],[1180,360],[300,1160],[1120,1170]]) {
      const light = ctx.createRadialGradient(x,y,4,x,y,200); light.addColorStop(0,'#72c5b619'); light.addColorStop(0.45,'#4c9ca40a'); light.addColorStop(1,'#07152500'); ctx.fillStyle = light; ctx.fillRect(x-200,y-200,400,400);
    }
    for (let i = 0; i < 18; i++) { const x=75+i*75; ctx.fillStyle='#263746'; ctx.fillRect(x,24,69,18); ctx.fillRect(x,1399,69,18); ctx.strokeStyle='#69858c44'; ctx.strokeRect(x,24,69,18); ctx.strokeRect(x,1399,69,18); }
    texture.refresh();
  }
  private makeReactionTextures() {
    for(const id of Object.keys(REACTIONS) as ReactionId[]){
      const r=REACTIONS[id],fx={x:128,y:128},radius=105,t=1,progress=0;
      const g=this.add.graphics();
      g.fillStyle(r.color,.07*t).fillCircle(fx.x,fx.y,Math.max(1,radius));
      g.lineStyle(3,r.color,.8*t).strokeCircle(fx.x,fx.y,Math.max(1,radius));
      g.lineStyle(1,r.accent,.85*t).strokeCircle(fx.x,fx.y,Math.max(1,radius*.78));
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4+(r.style==='embers'&&!this.reducedMotion?progress*2:0),dx=Math.cos(a),dy=Math.sin(a);
        g.lineStyle(2,r.accent,t*.85);
        if(r.style==='arcs')g.beginPath().moveTo(fx.x+dx*radius*.3,fx.y+dy*radius*.3).lineTo(fx.x+dx*radius*.6-dy*10,fx.y+dy*radius*.6+dx*10).lineTo(fx.x+dx*radius,fx.y+dy*radius).strokePath();
        else if(r.style==='pull')g.lineBetween(fx.x+dx*radius,fx.y+dy*radius,fx.x+dx*radius*.58-dy*8,fx.y+dy*radius*.58+dx*8);
        else g.fillStyle(r.accent,t).fillEllipse(fx.x+dx*radius,fx.y+dy*radius,3,r.style==='embers'?12:6);
      }
      g.generateTexture(`reaction-${id}`,256,256);g.destroy();
    }
  }
  private makeEffects() {
    this.makeReactionTextures();
    const tex = this.textures.createCanvas('gem', 32, 40)!; const c = tex.context;
    const glow = c.createRadialGradient(16, 20, 1, 16, 20, 18); glow.addColorStop(0, '#66dfff99'); glow.addColorStop(1, '#368bc000'); c.fillStyle = glow; c.fillRect(0, 0, 32, 40);
    c.beginPath(); c.moveTo(16, 7); c.lineTo(22, 19); c.lineTo(16, 31); c.lineTo(10, 19); c.closePath(); c.fillStyle = '#84ddeb'; c.fill(); c.strokeStyle = '#cafff4'; c.stroke(); c.beginPath(); c.moveTo(16, 8); c.lineTo(16, 30); c.lineTo(11, 19); c.fillStyle = '#d9fff4'; c.fill(); tex.refresh();
    const slash = this.textures.createCanvas('slash', 80, 32)!; const s = slash.context; const g = s.createLinearGradient(0, 0, 80, 0); g.addColorStop(0, '#56d2d500'); g.addColorStop(0.65, '#76e7d5aa'); g.addColorStop(1, '#edffe3'); s.fillStyle = g; s.beginPath(); s.moveTo(0, 16); s.quadraticCurveTo(46, 0, 77, 16); s.quadraticCurveTo(46, 33, 0, 16); s.fill(); s.strokeStyle = '#e0ffed'; s.beginPath(); s.moveTo(40, 16); s.lineTo(77, 16); s.stroke(); slash.refresh();
  }
  update(_time: number, delta: number) {
    if (!this.initialized) return;
    const w = this.world; this.accumulator = Math.min(0.1, this.accumulator + delta / 1000);
    while (this.accumulator >= RULES.step) { w.step(RULES.step, this.controls?.vector() ?? { x: 0, y: 0 }); this.accumulator -= RULES.step; }
    const p = w.player, active = w.mode === 'playing', visualDt = active ? Math.min(delta / 1000, 0.05) : 0;
    // One rasterized sprite per hero; gentle float freezes naturally with world time.
    const float = this.reducedMotion ? 0 : Math.sin(w.time * 1.8) * 1.4;
    const art = HERO_ART[w.classId];
    const heroHeight = w.classId === 'engineer' ? 42 : HERO_HEIGHT;
    this.hero.setTexture(w.classId).setDisplaySize(heroHeight * art.width / 192,heroHeight).setOrigin(art.center,w.classId === 'engineer' ? .5 : .86).setRotation(0);
    this.hero.setPosition(p.x, p.y - 2 + float).setDepth(p.y + 3).setFlipX(false);
    this.hero.setAlpha(p.invincible > 0 && Math.floor(w.time * 20) % 2 ? 0.45 : 1);
    this.cameras.main.centerOn(p.x, p.y + 5);
    this.aura.clear();
    this.aura.fillStyle(0x030915,.48).fillEllipse(p.x,p.y+8,38,12);
    if(w.classId==='knight') this.aura.lineStyle(1,0xe4d19d,.5).strokeEllipse(p.x,p.y+8,46,18);
    else if(w.classId==='mage') this.aura.lineStyle(1,0xaa81d4,.25).strokeEllipse(p.x,p.y+8,42,16);
    this.sync(this.enemies, w.enemies, 'crawler', (sprite, e) => { const kind=e.kind??'crawler';sprite.setTexture(kind==='crawler'?`crawler-run-${Math.floor(w.time * 8 + e.id) % 4}`:kind).setDisplaySize(kind==='boss'?112:e.radius*3,kind==='boss'?123:e.radius*3.2).setOrigin(0.5, 0.7).setDepth(e.y).setFlipX(e.x < p.x).setTint(e.flash > 0 ? 0xffdebb : (e.frost??0)>0?0x98dfff:(e.burn??0)>0?0xffb88a:kind==='boss'&&e.phase===3?0xffafbb:0xffffff); });
    this.sync(this.gems, w.gems, 'gem', (sprite, g) => { sprite.setDisplaySize(20, 25).setDepth(1).setAlpha(0.75 + Math.sin(w.time * 3 + g.id) * 0.2); });
    this.sync(this.shots, w.shots, 'shot-knight', (sprite, s) => { const kind=s.kind??'knight'; sprite.setTexture(`shot-${kind}`).setDisplaySize(kind==='knight'?44:kind==='mage'?25:20,kind==='knight'?18:kind==='mage'?25:16).setRotation(Math.atan2(s.vy,s.vx)).setDepth(1800); });
    for (const event of w.drainEvents()) { this.onEvent(event); this.effect(event); }
    this.effects.clear();
    for(const fx of this.reactionFx){
      if(fx.life<=0)continue;
      fx.life=Math.max(0,fx.life-visualDt);const r=REACTIONS[fx.id],t=fx.life/(fx.id==='erosion'?.8:.65),progress=1-t;
      if(fx.id==='erosion'&&fx.targetId!==undefined){const target=this.enemies.get(fx.targetId);if(target){fx.x=target.x;fx.y=target.y-8;}}
      const radius=fx.radius*(this.reducedMotion?1:r.style==='embers'?.85+.15*progress:r.style==='pull'?1-.75*progress:.3+.7*progress);
      fx.sprite.setPosition(fx.x,fx.y).setDisplaySize(radius*256/105,radius*256/105).setAlpha(t).setVisible(fx.life>0).setRotation(r.style==='embers'&&!this.reducedMotion?progress*1.2:0);
    }
    for(const h of w.hazards){
      if(h.type==='blast'){this.effects.lineStyle(2,0xfaa28f,.7).strokeCircle(h.x,h.y,h.radius);this.effects.fillStyle(h.delay>0?0xe57480:0xffb594,h.delay>0?.08:.5).fillCircle(h.x,h.y,h.radius);this.effects.lineStyle(1,0xffc6a5,.6).strokeCircle(h.x,h.y,h.radius*Math.max(0,1-h.delay/1.4));}
      else {this.effects.fillStyle(0xdf7397,h.delay>0?.2:.85).fillCircle(h.x,h.y,h.radius);this.effects.fillStyle(0xffd5ad,h.delay>0?.4:1).fillCircle(h.x,h.y,h.radius*.35);}
    }
    if(w.classId==='engineer')for(let i=0;i<2;i++){const a=w.time*2+i*Math.PI,x=p.x+Math.cos(a)*42*p.area,y=p.y+Math.sin(a)*42*p.area;this.effects.lineStyle(1,0xded0a4,.8).fillStyle(0x304657,1).fillRoundedRect(x-6,y-3,12,6,2).strokeRoundedRect(x-6,y-3,12,6,2);this.effects.fillStyle(0xffd197,.95).fillCircle(x,y,2);this.effects.lineStyle(1,0x8ac4c0,.6).lineBetween(x-7,y,x-6,y).lineBetween(x+6,y,x+7,y);}
    if(w.gift==='shield'&&w.giftTimer<=0)this.effects.lineStyle(2,0xd9d2ff,.55).strokeCircle(p.x,p.y,28);
    this.atmosphere.clear();
    if (!this.reducedMotion) for (let i = 0; i < 38; i++) {
      const x = (i * 173.17 + Math.sin(w.time * 0.13 + i) * 20 + 1440) % 1440;
      const y = (i * 271.31 - w.time * (2 + i % 3) + 14400) % 1440;
      this.atmosphere.fillStyle(i % 3 ? 0x80c6c6 : 0xd8c693, 0.18 + Math.sin(w.time + i) * 0.09).fillCircle(x, y, i % 3 ? 1.3 : 2);
    }
    for (const o of w.obstacles) { const a = 0.07 + Math.sin(w.time * 1.2 + o.x) * 0.02; this.atmosphere.fillStyle(0x60cabe,a).fillEllipse(o.x,o.y-15,25,45); }
    for (const e of w.enemies) if (e.hp < e.maxHp) { this.effects.fillStyle(0x09121d,0.85).fillRoundedRect(e.x-16,e.y-33,32,4,2); this.effects.fillStyle(0xc09abb,0.9).fillRoundedRect(e.x-16,e.y-33,32*Math.max(0,e.hp/e.maxHp),4,2); }
    if (active && p.dashActive > 0 && w.time - this.lastTrail > 0.035 && this.afterimages.length < 6) {
      this.lastTrail = w.time; this.afterimages.push({ image: this.add.image(p.x,p.y,this.hero.texture.key).setOrigin(this.hero.originX,this.hero.originY).setDisplaySize(this.hero.displayWidth,this.hero.displayHeight).setFlipX(false).setTint(0x6beddc).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y-1), life:0.23 });
    }
    this.afterimages = this.afterimages.filter(ghost => { ghost.life -= visualDt; ghost.image.setAlpha(Math.max(0,ghost.life)*1.7); if(ghost.life>0) return true; ghost.image.destroy(); return false; });
    if (active && p.dashActive > 0 && this.particles.length < 150) this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: 0x7af3dc, size: 8 });
    for (const particle of this.particles) {
      particle.life -= visualDt; particle.x += particle.vx * visualDt; particle.y += particle.vy * visualDt;
      this.effects.fillStyle(particle.color, Math.max(0, particle.life / particle.max) * 0.8).fillCircle(particle.x, particle.y, particle.size * Math.max(0, particle.life / particle.max));
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    for (const f of this.floaters) { f.life -= visualDt; f.text.y -= visualDt * 33; f.text.setAlpha(Math.max(0, f.life / 0.6)); }
    this.floaters = this.floaters.filter(f => { if (f.life > 0) return true; f.text.destroy(); return false; });
    this.uiTimer += delta; if (this.uiTimer >= 80) { this.onTick(); this.uiTimer = 0; }
  }
  private sync<T extends { id: number; x: number; y: number }>(map: Map<number, Phaser.GameObjects.Image>, entities: T[], key: string, style: (sprite: Phaser.GameObjects.Image, entity: T) => void) {
    const alive = new Set<number>();
    for (const e of entities) { alive.add(e.id); let sprite = map.get(e.id); if (!sprite) { sprite = this.add.image(e.x, e.y, key); map.set(e.id, sprite); } sprite.setPosition(e.x, e.y); style(sprite, e); }
    for (const [id, sprite] of map) if (!alive.has(id)) { sprite.destroy(); map.delete(id); }
  }
  private effect(e: GameEvent) {
    if(e.reaction){
      let fx=this.reactionFx.find(f=>f.life>0&&f.id===e.reaction&&f.targetId===e.targetId&&e.targetId!==undefined)??this.reactionFx.find(f=>f.life<=0);
      if(!fx&&this.reactionFx.length<16){fx={x:0,y:0,radius:0,id:e.reaction,life:0,sprite:this.add.image(0,0,`reaction-${e.reaction}`).setDepth(2150)};this.reactionFx.push(fx);}
      if(!fx)fx=this.reactionFx.reduce((a,b)=>a.life<b.life?a:b);
      Object.assign(fx,{x:e.x,y:e.y,radius:e.reaction==='erosion'?44:e.radius??70,id:e.reaction,life:e.reaction==='erosion'?.8:.65,targetId:e.targetId});
      fx.sprite.setTexture(`reaction-${e.reaction}`).setVisible(true);
    }
    if (e.type === 'shot') return;
    if (e.type === 'pickup') return;
    const color = e.type === 'hurt' ? 0xf4a0a0 : e.type === 'kill' ? 0xb48dbb : 0xb8ffe0;
    const sparks=e.type==='hurt'||this.world.time-this.lastSparks>.03;if(sparks)this.lastSparks=this.world.time;
    for (let i = 0; i < (sparks?(e.type === 'kill' ? 12 : 4):0) && this.particles.length < 150; i++) { const a = Math.random() * Math.PI * 2; this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * (30 + Math.random() * 80), vy: Math.sin(a) * (30 + Math.random() * 80), life: 0.4, max: 0.4, size: 1 + Math.random() * 3, color }); }
    if (e.type === 'hurt' && !this.reducedMotion) this.cameras.main.shake(95, 0.003);
    const key=e.reaction??e.label??e.type, gap=e.reaction?.15:e.type==='hurt'?0:.08;
    if ((e.amount||e.label) && this.floaters.length < 24 && this.world.time-(this.lastLabels.get(key)??-1)>=gap) {
      this.lastLabels.set(key,this.world.time);
      const text = this.add.text(e.x, e.y - 20, e.label??`${e.type === 'hurt' ? '−' : ''}${Math.round(e.amount??0)}`, { fontFamily: 'sans-serif', fontSize: e.label?'11px':'13px', color: e.type === 'hurt' ? '#ffb0ac' : '#e2f6d8', stroke: '#101c2d', strokeThickness: 3 }).setOrigin(0.5).setDepth(2400);
      this.floaters.push({ text, life: 0.6, y: e.y });
    }
  }
  diagnostics() { return { displayObjects: this.children.length, reactionEffects:this.reactionFx.filter(f=>f.life>0).length, reactionPool:this.reactionFx.length, reactionTargets:this.reactionFx.filter(f=>f.life>0).map(f=>f.targetId), reactionStyles:this.reactionFx.filter(f=>f.life>0).map(f=>f.id), particles: this.particles.length, floaters: this.floaters.length, floaterTexts: this.floaters.map(f=>f.text.text), afterimages: this.afterimages.length, heroPose: this.hero?.texture.key, heroY:this.hero?.y, heroScreenHeight:this.hero?.displayHeight*this.cameras.main.zoom, heroBounds:this.hero?.getBounds(), droneBounds:this.world.classId==='engineer'?[0,1].map(i=>{const a=this.world.time*2+i*Math.PI;return {x:this.world.player.x+Math.cos(a)*42*this.world.player.area-7.5,y:this.world.player.y+Math.sin(a)*42*this.world.player.area-3.5,width:15,height:7};}):[], heroTextureSize:this.hero ? [this.hero.frame.width,this.hero.frame.height] : [], shotTextures:[...new Set([...this.shots.values()].map(s=>s.texture.key))], enemySprites: this.enemies.size, gemSprites: this.gems.size, shotSprites: this.shots.size }; }
}

