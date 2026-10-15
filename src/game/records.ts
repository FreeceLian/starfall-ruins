import { isElement, ownedElements, type Element } from './elements';
import { CLASSES, DIFFICULTIES, UPGRADES, type ClassId, type Difficulty } from '../data/config';
import type { World } from './model';
export const STAT_LABELS = { maxHp:'生命上限', damage:'基础伤害', interval:'攻击间隔（秒）', speed:'移动速度', armor:'护甲', regen:'每秒恢复', crit:'战斗暴击概率', critPower:'暴击倍率', pickup:'拾取半径', range:'攻击距离', dashCooldown:'闪避冷却（秒）', pierce:'穿透数量', multishot:'额外弹体', area:'范围倍率', thorns:'反伤', lifesteal:'击杀回复', fire:'火焰层级', ice:'寒冰层级', lightning:'雷电层级', void:'虚空层级' } as const;
export type Stat = keyof typeof STAT_LABELS;
export type Build = { elementLock?: Element[]; difficulty: Difficulty; mode:'normal'|'endless'; time:number; kills:number; classId:ClassId; level:number; stats:Record<Stat,number>; upgrades:Record<string,number> };
export type Records = Partial<Record<Difficulty,Build>>;
export function captureBuild(w: World): Build {
  return { elementLock:w.elements.length===2?[...w.elements]:[], difficulty:w.difficulty, mode:w.endless?'endless':'normal', time:w.time, kills:w.kills, classId:w.classId, level:w.level, stats:Object.fromEntries(Object.keys(STAT_LABELS).map(k=>[k,w.player[k as Stat]])) as Record<Stat,number>, upgrades:{...w.upgrades} };
}
export function retainBest(records: Records, w: World) {
  if (w.endless ? w.mode !== 'dead' : w.mode !== 'won') return;
  const old=records[w.difficulty];
  if (!old || (w.endless ? w.time > old.time : w.time < old.time || w.time === old.time && w.kills > old.kills)) records[w.difficulty]=captureBuild(w);
}
export function parseRecords(raw: unknown): Records {
  const records: Records = {};
  if (!raw || typeof raw !== 'object') return records;
  const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12;
  for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
    const b=(raw as Records)[difficulty];
    if (!b || b.difficulty!==difficulty || b.mode!==(difficulty==='endless'?'endless':'normal') || !Object.hasOwn(CLASSES,b.classId) || !valid(b.time) || !valid(b.kills) || !Number.isInteger(b.kills) || !valid(b.level) || b.level<1 || !Number.isInteger(b.level) || !b.stats || !b.upgrades) continue;
    if (!Object.keys(STAT_LABELS).every(k=>valid(b.stats[k as Stat]))) continue;
    const upgrades:Record<string,number>={};
    for (const u of UPGRADES) { const n=b.upgrades[u.id]; if(valid(n)&&Number.isInteger(n)&&n>0)upgrades[u.id]=n; }
    const owned=ownedElements(b.stats);
    const lock=Array.isArray(b.elementLock) && (b.elementLock.length===0&&owned.length<2 || b.elementLock.length===2&&owned.length===2&&new Set(b.elementLock).size===2&&b.elementLock.every(id=>isElement(id)&&owned.includes(id))) ? [...b.elementLock] : undefined;
    records[difficulty]={...(lock?{elementLock:lock}:{}),difficulty,mode:b.mode,time:b.time,kills:b.kills,classId:b.classId,level:b.level,stats:Object.fromEntries(Object.keys(STAT_LABELS).map(k=>[k,b.stats[k as Stat]])) as Record<Stat,number>,upgrades};
  }
  return records;
}
