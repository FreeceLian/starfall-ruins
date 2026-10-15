import type { Upgrade } from '../data/config';
export const ELEMENTS = { fire:'火焰', ice:'寒冰', lightning:'雷电', void:'虚空' } as const;
export type Element = keyof typeof ELEMENTS;
export const isElement = (id:string):id is Element => Object.hasOwn(ELEMENTS,id);
export const ownedElements = (stats:Record<Element,number>) => (Object.keys(ELEMENTS) as Element[]).filter(id=>stats[id]>0);
export const REACTIONS = {
  melt: { elements:['fire','ice'], name:'熔裂', description:'消耗燃烧与冰霜，近距离爆炸造成120%基础伤害。', cooldown:1, radius:70, damage:1.2, color:0xffba75, accent:0xa5edff, style:'burst' },
  collapse: { elements:['lightning','void'], name:'坍缩', description:'聚拢附近敌人，中心爆炸造成100%基础伤害。', cooldown:1.2, radius:95, damage:1, color:0xb79aff, accent:0xffe59b, style:'pull' },
  overload: { elements:['fire','lightning'], name:'雷焰过载', description:'较大范围电爆造成85%基础伤害，并传播3秒燃烧。', cooldown:1.4, radius:100, damage:.85, color:0xffbc53, accent:0xff7256, style:'arcs' },
  erosion: { elements:['fire','void'], name:'蚀焰', description:'目标燃烧延至5秒；虚空印记期间燃烧伤害翻倍。', cooldown:1.5, radius:30, damage:0, color:0xd779fb, accent:0xff9565, style:'embers' },
  storm: { elements:['ice','lightning'], name:'霜雷脉冲', description:'广域脉冲造成35%基础伤害，范围内敌人减速35%，持续2秒。', cooldown:1.6, radius:150, damage:.35, color:0x85e7ff, accent:0xf6f5b9, style:'arcs' },
  prison: { elements:['ice','void'], name:'寒渊束缚', description:'聚拢敌人并减速35%，持续2.5秒，造成35%基础伤害。', cooldown:1.8, radius:130, damage:.35, color:0x9694ff, accent:0x9bf5e6, style:'pull' },
} as const;
export type ReactionId = keyof typeof REACTIONS;
export const reactionFor = (elements:Element[]) => (Object.keys(REACTIONS) as ReactionId[]).find(id=>REACTIONS[id].elements.every(e=>elements.includes(e)));
export function elementSummary(elements:Element[]) {
  const names=elements.map(id=>ELEMENTS[id]).join('＋');
  if(elements.length<2)return names ? `${names} · 尚可选择一种元素` : '尚未选择元素';
  const id=reactionFor(elements);
  return `${names} · ${id?REACTIONS[id].name:'无协同'}`;
}
export function canReceiveElements(owned:Element[], rewards:Upgrade[]) {
  return new Set([...owned,...rewards.filter(u=>isElement(u.id)).map(u=>u.id)]).size<=2;
}
// Input is already shuffled. Reject conflicting candidates before revealing the offer,
// never remove a reward after the player claims a triple.
export function selectElementSafeChoices(pool:Upgrade[], owned:Element[], triple:boolean) {
  const choices:Upgrade[]=[];
  for(const u of pool){
    if(canReceiveElements(owned,triple?[...choices,u]:[u]))choices.push(u);
    if(choices.length===3)break;
  }
  return choices;
}
