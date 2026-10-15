// Fixed scenarios, not a gameplay AI. Compare the same build before/after tuning.
import { World } from '../src/game/model';
import { RULES, UPGRADES, type ClassId } from '../src/data/config';
const build=['fire','ice','edge','pulse','lifesteal','regen','edge','pulse','multishot','heart','armor','lifesteal','regen','area','lightning'];
const mature=build.concat(['edge','edge','pulse','pulse','multishot','multishot','heart','heart','armor','armor','lifesteal','lifesteal','regen','regen','regen','area','area','area','lightning','lightning','void','void','pierce','pierce','fire','fire']);
for(const classId of ['knight','mage','engineer'] as ClassId[])for(const layers of [0,6,15,41]){
 const w=new World(75,classId,false,'endless');w.start();w.eggSeen=true;w.bossSpawned=true;w.time=RULES.bossAt;
 for(const id of mature.slice(0,layers)){w.mode='upgrade';w.choices=[UPGRADES.find(u=>u.id===id)!];w.choose(id);}
 let hits=0,loss=0,minHp=w.player.hp;const start=w.time;
 for(let i=0;i<120*60&&w.mode!=='dead';i++){if(w.mode==='upgrade'){w.mode='playing';w.choices=[];}w.step(1/60,{x:0,y:0});for(const e of w.drainEvents())if(e.type==='hurt'){hits++;loss+=e.amount??0;}minHp=Math.min(minHp,w.player.hp);}
 console.log(JSON.stringify({classId,layers,seconds:Math.round(w.time-start),kills:w.kills,hits,loss:Math.round(loss),minHp:Math.round(minHp),hp:Math.round(w.player.hp)}));
}
