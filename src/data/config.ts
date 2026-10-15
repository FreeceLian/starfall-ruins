export const RULES = { size: 1440, duration: 360, bossAt: 240, eggAt: 120, enemyCap: 90, gemCap: 240, projectileCap: 80, hazardCap: 80, step: 1 / 60 };
export const CLASSES = {
  knight: { name: '星刃骑士', hp: 100, speed: 158, damage: 26, interval: 0.72, range: 300, pickup: 70, description: '以星辉铸刃，向黑暗前行。自动释放星刃，击穿最近的敌人。' },
  mage: { name: '虚空术士', hp: 80, speed: 150, damage: 35, interval: 1.0, range: 340, pickup: 85, description: '虚空法球命中后爆裂，对周围敌人造成范围伤害；初始自带虚空印记。' },
  engineer: { name: '机械使徒', hp: 110, speed: 145, damage: 16, interval: 0.48, range: 330, pickup: 75, description: '两架无人机交替发射追踪弹；近身轨道无人机每秒造成接触伤害。' },
};
export type ClassId = keyof typeof CLASSES;
export const ENEMIES = {
  crawler: { name: '蚀星兽', hp: 36, speed: 45, radius: 16, damage: 12, xp: 4 },
  wisp: { name: '裂隙游魂', hp: 23, speed: 76, radius: 13, damage: 10, xp: 5 },
  archer: { name: '遗迹弩卫', hp: 45, speed: 32, radius: 16, damage: 13, xp: 7 },
  guardian: { name: '精英·铁棘卫', hp: 240, speed: 38, radius: 25, damage: 22, xp: 30 },
  oracle: { name: '精英·星蚀祭司', hp: 170, speed: 35, radius: 21, damage: 18, xp: 30 },
  boss: { name: '终焉守望者', hp: 10500, speed: 44, radius: 46, damage: 32, xp: 0 },
};
export type EnemyKind = keyof typeof ENEMIES;
export type UpgradeStat = 'damage' | 'interval' | 'speed' | 'maxHp' | 'pickup' | 'pierce' | 'dashCooldown' | 'heal' | 'fire' | 'ice' | 'lightning' | 'void' | 'crit' | 'critPower' | 'regen' | 'armor' | 'area' | 'multishot' | 'thorns' | 'lifesteal';
export type Upgrade = { id: string; name: string; description: string; tag: string; stat: UpgradeStat; value: number; max: number };
export const UPGRADES: Upgrade[] = [
  { id: 'edge', name: '星能淬炼', description: '前两层伤害各增加25%，后续每层收益递减。', tag: '锋芒', stat: 'damage', value: 1.25, max: 5 },
  { id: 'pulse', name: '共鸣脉冲', description: '前两层间隔各缩短15%，后续每层收益递减。', tag: '迅击', stat: 'interval', value: 0.85, max: 5 },
  { id: 'stride', name: '逐星步伐', description: '移动速度增加 12%。', tag: '机动', stat: 'speed', value: 1.12, max: 4 },
  { id: 'heart', name: '不灭星核', description: '生命上限增加 25，恢复 25 生命。', tag: '守护', stat: 'maxHp', value: 25, max: 5 },
  { id: 'gravity', name: '引力回响', description: '经验吸取范围增加 40。', tag: '成长', stat: 'pickup', value: 40, max: 4 },
  { id: 'pierce', name: '贯星之刃', description: '每枚攻击弹体可额外穿透 1 个敌人。', tag: '穿透', stat: 'pierce', value: 1, max: 3 },
  { id: 'dash', name: '时隙残影', description: '闪避冷却缩短 20%。', tag: '闪避', stat: 'dashCooldown', value: 0.8, max: 4 },
  { id: 'mend', name: '星泉赐福', description: '立即恢复 40 生命。', tag: '复苏', stat: 'heal', value: 40, max: Infinity },
  { id: 'fire', name: '余烬附魔', description: '命中施加3秒燃烧，每层每秒造成基础伤害的18%。', tag: '火焰', stat: 'fire', value: 1, max: 4 },
  { id: 'ice', name: '霜星之触', description: '命中减速35%，持续2秒；每追加一层延长0.5秒。', tag: '寒冰', stat: 'ice', value: 1, max: 4 },
  { id: 'lightning', name: '雷鸣导体', description: '命中向附近敌人传导45%基础伤害；每层可传导1个目标。', tag: '雷电', stat: 'lightning', value: 1, max: 4 },
  { id: 'void', name: '虚空刻印', description: '命中施加3秒印记，每层使后续直接命中增伤10%；每追加一层延长0.5秒。', tag: '虚空', stat: 'void', value: 1, max: 4 },
  { id: 'crit', name: '洞悉弱点', description: '暴击率增加10个百分点。', tag: '暴击', stat: 'crit', value: .1, max: 5 },
  { id: 'critPower', name: '碎星重击', description: '暴击伤害倍率增加0.4。', tag: '暴击', stat: 'critPower', value: .4, max: 4 },
  { id: 'regen', name: '复苏回路', description: '前两层每秒各恢复0.5生命，后续层数收益递减。', tag: '恢复', stat: 'regen', value: .5, max: 5 },
  { id: 'armor', name: '星钢护甲', description: '前两层各增加2护甲，后续递减；最低受1点伤害。', tag: '防护', stat: 'armor', value: 2, max: 5 },
  { id: 'area', name: '星环扩张', description: '前两层范围各增加20%，后续收益递减。', tag: '范围', stat: 'area', value: 1.2, max: 4 },
  { id: 'multishot', name: '分光棱镜', description: '每次攻击增加一道散射弹体。', tag: '弹幕', stat: 'multishot', value: 1, max: 3 },
  { id: 'thorns', name: '棘光屏障', description: '受伤时对周围100范围敌人造成20点伤害。', tag: '反击', stat: 'thorns', value: 20, max: 4 },
  { id: 'lifesteal', name: '灵能汲取', description: '前两层每层击杀回复1生命，后续递减；共享3点回复额度，每秒补充3点。', tag: '续航', stat: 'lifesteal', value: 1, max: 4 },
];
export const IDENTITIES = ['教皇','小邝','博文','姚C','zzp','一飞','大肥羊','谁也不是'];

// 2.0 tuning: crit is conditional on not rolling a triple.
export const UPGRADE_LUCK = { triple: 0.03, critical: 0.15 };
export const DIFFICULTIES = {
  explore: { name: '探索', speed: 0.82, hp: 0.8, damage: 0.75, lateHp: 1.35, lateDamage: 1.25 },
  challenge: { name: '挑战', speed: 1, hp: 1, damage: 1, lateHp: 1.5, lateDamage: 1.4 },
  nightmare: { name: '噩梦', speed: 1.3, hp: 1.4, damage: 1.35, lateHp: 1.65, lateDamage: 1.8 },
  endless: { name: '无尽', speed: 1, hp: 1, damage: 1, lateHp: 1.5, lateDamage: 1.4 },
};
export type Difficulty = keyof typeof DIFFICULTIES;
export const ENDLESS = { growthAfter: RULES.bossAt, hpPerMinute: 0.28, damagePerMinute: 0.22, speedPerMinute: 0.06, maxSpeedMultiplier: 1.45 };
export function rollUpgradeBonus(random: () => number, count: number) {
  if (random() < UPGRADE_LUCK.triple) return { triple: true, criticalIndex: -1 };
  return { triple: false, criticalIndex: random() < UPGRADE_LUCK.critical ? Math.floor(random() * count) : -1 };
}

export const BALANCE = { xpStep: 18, lateFrom: 60, killHealPerSecond: 3, stackFalloff: 0.6, bossBlastDamage: 30 };
// Only these compounding/defensive upgrades taper after their first two layers.
export const TAPERED_STATS = new Set<UpgradeStat>(['damage','interval','area','regen','armor','lifesteal']);
export function upgradeValue(u: Upgrade, layer: number) {
  const weight = TAPERED_STATS.has(u.stat) ? 1 / (1 + Math.max(0, layer - 2) * BALANCE.stackFalloff) : 1;
  return ['damage','interval','area'].includes(u.stat) ? 1 + (u.value - 1) * weight : u.value * weight;
}

export const BOSS_CADENCE = [2.3, 2, 1.6] as const;
