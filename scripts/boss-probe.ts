// Isolated damage opportunity: invulnerability is a test fixture, not evidence of skilled play.
import { World } from '../src/game/model';
import { RULES, UPGRADES, type ClassId } from '../src/data/config';
const build=['fire','ice','edge','edge','edge','pulse','pulse','multishot','multishot','heart','regen','armor','crit','crit','lifesteal'];
for(const classId of ['knight','mage','engineer'] as ClassId[])for(const stationary of [true,false]){
 const w=new World(75,classId,false,'nightmare');w.start();w.eggSeen=true;w.time=RULES.bossAt;
 for(const raw of build){const id=classId==='mage'?(raw==='fire'?'lightning':raw==='ice'?'void':raw):raw;w.mode='upgrade';w.choices=[UPGRADES.find(u=>u.id===id)!];w.choose(id);}
 w.obstacles=[];w.spawnBoss();w.boss!.x=w.player.x+150;w.boss!.y=w.player.y;
 for(let i=0;i<120*60&&w.mode==='playing';i++){if(!stationary)w.player.invincible=1;w.enemies=w.enemies.filter(e=>e.kind==='boss');w.step(1/60,{x:0,y:0});w.drainEvents();}
 console.log({classId,stationary,mode:w.mode,time:Math.round(w.time),boss:w.boss?.hp,hp:w.player.hp});
}
