import {World,distance} from '../src/game/model';
import { RULES, type Difficulty, type ClassId } from '../src/data/config';
const priorities=(process.env.PRIORITIES??'regen,lifesteal,fire,ice,pulse,edge,multishot,heart,armor,lightning,void,pierce,gravity,dash').split(',');
const difficulty=(process.env.DIFFICULTY??'challenge') as Difficulty;
const seed=Number(process.env.SEED??75);
for(const classId of ['knight','mage','engineer'] as ClassId[]){
 const w=new World(seed,classId,false,difficulty);w.start();let bossLevel=0;
 for(let i=0;i<40000&&w.mode!=='dead'&&w.mode!=='won';i++){
  if(w.mode==='upgrade'){const choice=[...w.choices].sort((a,b)=>{const rank=(id:string)=>{const j=priorities.indexOf(id);return j<0?99:j+(w.upgrades[id]??0)*4;};return rank(a.id)-rank(b.id);})[0];if(process.env.NO_LUCK==='1'){w.triple=false;w.criticalId='';}w.choose(choice.id);}
  if(w.mode==='identity')w.chooseIdentity('大肥羊');
  const p=w.player;let target=w.gems.filter(g=>distance(g,p)<450).sort((a,b)=>distance(a,p)-distance(b,p))[0]??w.boss;
  let x=target?(target.x-p.x)/Math.max(1,distance(target,p)):Math.cos(i/500),y=target?(target.y-p.y)/Math.max(1,distance(target,p)):Math.sin(i/500);
  for(const e of w.enemies){const d=Math.max(1,distance(e,p));if(d<110){x+=(p.x-e.x)/d*(110-d)/20;y+=(p.y-e.y)/d*(110-d)/20;if(d<45)w.dash();}}
  for(const h of w.hazards){const d=Math.max(1,distance(h,p));if(d<h.radius+65){x+=(p.x-h.x)/d*3;y+=(p.y-h.y)/d*3;if(d<h.radius+20)w.dash();}}
  if(p.x<180)x+=2;if(p.x>1260)x-=2;if(p.y<180)y+=2;if(p.y>1260)y-=2;
  if(!bossLevel&&w.time>=RULES.bossAt)bossLevel=w.level;w.step(1/60,{x,y});w.drainEvents();
 }
 console.log(JSON.stringify({classId,difficulty,seed,bossLevel,mode:w.mode,time:Math.round(w.time),kills:w.kills,level:w.level,hp:w.player.hp,boss:w.boss?.hp,reactions:w.reactionCounts,upgrades:w.upgrades}));
}
