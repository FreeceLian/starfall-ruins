import { REACTIONS, type ReactionId } from './game/elements';
import { retainBest } from './game/records';
import Phaser from 'phaser';
import './style.css';
import './polish.css';
import { World } from './game/model';
import { Controls } from './game/input';
import { AudioBus } from './game/audio';
import { loadSave, writeSave } from './game/storage';
import { Interface } from './ui/interface';
import { RuinsScene } from './render/scene';
import { CLASSES, UPGRADES, RULES, DIFFICULTIES, type Difficulty, type ClassId } from './data/config';

const save = loadSave(), ui = new Interface(document.querySelector('#ui')!, save), audio = new AudioBus(), scene = new RuinsScene();
audio.volume = save.volume; audio.musicVolume = save.musicVolume; scene.reducedMotion = save.reducedMotion;
let world = scene.world, recorded = false, previousMode = world.mode;
const persist = () => { if (!writeSave(save)) ui.toast('浏览器未允许本地存储，记录只保留到本次关闭前。'); };
const record = () => { if (recorded) return; recorded = true; save.runs++; save.bestKills = Math.max(save.bestKills, world.kills); save.bestTime = Math.max(save.bestTime, world.time); if (world.mode === 'won') save.wins++; retainBest(save.records, world); persist(); };
const tick = () => {
  audio.update(world.mode === 'playing');
  if (world.mode === 'dead' || world.mode === 'won') record();
  if (world.mode !== previousMode) { controls.clear(); if (world.mode === 'upgrade') audio.play('upgrade'); previousMode = world.mode; }
  ui.update(world);
};
const start = () => { audio.unlock(); world = new World(Date.now(),ui.selectedClass,false,ui.selectedDifficulty); world.start(); recorded = false; scene.replace(world); controls.clear(); ui.invalidate(); ui.toast(''); (document.activeElement as HTMLElement)?.blur(); tick(); };
const pause = () => { if (world.mode === 'playing') world.pause(); else if (world.mode === 'paused') { ui.closePanel(); world.resume(); } controls.clear(); tick(); };
const controls = new Controls(ui.pad, ui.knob, ui.dash, () => { audio.unlock(); world.dash(); (document.activeElement as HTMLElement)?.blur(); }, pause);
scene.controls = controls; scene.onTick = tick; scene.onEvent = e => audio.play(e.type==='reaction'?'hit':e.type);
ui.onAction = action => {
  audio.unlock();
  if(action.startsWith('difficulty:')) { const id=action.slice(11) as Difficulty; if(Object.hasOwn(DIFFICULTIES,id)){ui.selectedDifficulty=id;ui.invalidate();tick();}return; }
  if(action.startsWith('record:')) {ui.showRecord(action.slice(7) as Difficulty);return;}
  if(action.startsWith('class:')){const id=action.slice(6) as ClassId;if(id in CLASSES){ui.selectedClass=id;ui.invalidate();tick();}return;}
  if(action.startsWith('identity:')){if(world.chooseIdentity(action.slice(9))){ui.invalidate();controls.clear();ui.toast('');tick();}return;}
  if (action === 'start' || action === 'restart') start();
  else if (action === 'pause') { world.pause(); controls.clear(); tick(); }
  else if (action === 'resume') { world.resume(); ui.invalidate(); (document.activeElement as HTMLElement)?.blur(); tick(); }
  else if (action === 'home' || action === 'leave') { if (action === 'leave') record(); world = new World(); scene.replace(world); ui.invalidate(); controls.clear(); tick(); }
  else if (action === 'build') { world.pause(); controls.clear(); tick(); ui.showBuild(world); }
  else if (action === 'records') ui.showRecords();
  else if (action === 'settings') ui.showSettings(world.mode);
  else if (action === 'help') ui.showHelp(world.mode);
  else if (action === 'back') { ui.closePanel(); tick(); }
  else if (action.startsWith('upgrade:')) { const [id,offer]=action.slice(8).split(':'); const awarded=world.choose(id,Number(offer)); ui.invalidate(); (document.activeElement as HTMLElement)?.blur(); tick(); if(awarded){ui.showReward(world);audio.play('upgrade');} }
};
ui.onVolume = volume => { save.volume = audio.volume = volume; audio.unlock(); audio.play('pickup'); persist(); };
ui.onMusic = volume => { save.musicVolume = audio.musicVolume = volume; persist(); };
ui.onMotion = value => { save.reducedMotion = scene.reducedMotion = value; persist(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { world.pause(); controls.clear(); tick(); } });
window.addEventListener('blur', () => { world.pause(); controls.clear(); tick(); });
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#101c2b', scene: [scene], scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, render: { antialias: true, powerPreference: 'low-power' }, fps: { target: 60, forceSetTimeOut: false }, audio: { noAudio: true }, banner: false });
tick();
// Explicit opt-in development harness. Vite removes this entire block from production.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('test')) {
  Object.assign(window, { __starfall: {
    snapshot: () => ({ classId: world.classId, difficulty:world.difficulty, elements:world.elements, upgrades:{...world.upgrades}, triple:world.triple, criticalId:world.criticalId, reactions: world.reactionCounts, boss: world.boss ? { hp:world.boss.hp, phase:world.boss.phase } : null, hazards:world.hazards.length, gift:world.gift, eggReward:world.eggReward, mode: world.mode, time: world.time, level: world.level, xp: world.xp, kills: world.kills, hp: world.player.hp, x: world.player.x, y: world.player.y, dash: world.player.dashLeft, enemies: world.enemies.length, gems: world.gems.length, shots: world.shots.length, choices: world.choices.map(u => u.id), render: scene.diagnostics(), audio: audio.diagnostics() }),
    reaction: (id:ReactionId) => {if(!Object.hasOwn(REACTIONS,id))return;world=new World(75);world.start();recorded=false;scene.replace(world);controls.clear();world.player.damage=20;world.player.crit=0;world.obstacles=[];for(const el of REACTIONS[id].elements)world.player[el]=1;for(let i=0;i<5;i++){world.spawnEnemy('crawler');const e=world.enemies.at(-1)!;e.x=world.player.x+(i===0?0:Math.cos(i*Math.PI/2)*65);e.y=world.player.y-110+(i===0?0:Math.sin(i*Math.PI/2)*65);e.hp=e.maxHp=10000;e.speed=0;e.attack=999;}world.hitEnemy(world.enemies[0],1);ui.invalidate();tick();},
    erosionStress: () => {world=new World(75,'mage');world.start();recorded=false;scene.replace(world);controls.clear();world.obstacles=[];Object.assign(world.player,{fire:4,void:4,pierce:5,multishot:3,interval:.12,damage:5,invincible:100});for(let i=0;i<15;i++){world.spawnEnemy('crawler');const e=world.enemies.at(-1)!;e.x=620+(i%5)*40;e.y=535+Math.floor(i/5)*38;e.hp=e.maxHp=100000;e.speed=0;e.attack=999;}ui.invalidate();tick();},
    reactionBurst: () => {const e=world.enemies[0];if(e)for(let i=0;i<100;i++){e.reactionCd=0;world.hitEnemy(e,1);}},
    grantXp: () => { world.xp += world.nextXp; world.step(1 / 60, { x: 0, y: 0 }); tick(); },
    hurt: (amount:number) => {world.player.invincible=0;world.damagePlayer(amount);tick();},
    fatal: () => { world.player.invincible = 0; world.damagePlayer(1e4); tick(); },
    finish: () => { world.time = RULES.bossAt+1; world.eggSeen=true;world.spawnBoss();const b=world.boss!;b.phase=3;world.hitEnemy(b,99999,false);tick(); },
    identity: () => {world.mode='identity';world.eggSeen=true;tick();},
    boss: () => {world.player.invincible=10;world.time=RULES.bossAt+1;world.eggSeen=true;world.spawnBoss();const b=world.boss!;b.x=world.player.x+80;b.y=world.player.y-150;tick();},
    offer: (id:string, bonus='normal') => {world.offerId++;world.triple=bonus==='triple';world.criticalId=bonus==='critical'?id:'';world.mode='upgrade';world.choices=[UPGRADES.find(u=>u.id===id)!,...UPGRADES.filter(u=>u.id!==id).slice(0,2)];ui.invalidate();tick();},
    advance: (time:number) => {world.time=time;world.eggSeen=true;world.player.invincible=60;world.step(1/60,{x:0,y:0});tick();},
    stress: () => {world.eggSeen=true;world.time=RULES.bossAt+10;world.mode='playing';world.player.invincible=40;world.player.hp=10000;world.player.maxHp=10000;world.spawnBoss();for(let i=0;i<90;i++)world.spawnEnemy(i%8===0?'oracle':'crawler');world.player.damage=0;ui.invalidate();tick();},
    bossPhase: () => {const b=world.boss;if(b){world.hitEnemy(b,99999,false);world.step(1/60,{x:0,y:0});tick();}},
  } });
}
