import { REACTIONS, reactionFor, ELEMENTS, isElement, ownedElements, elementSummary } from '../game/elements';
import { captureBuild, STAT_LABELS, type Build, type Stat } from '../game/records';
import type { World } from '../game/model';
import type { Save } from '../game/storage';
import { CLASSES, IDENTITIES, UPGRADES, RULES, DIFFICULTIES, type Difficulty, type ClassId } from '../data/config';
const CLASS_ART = { knight:'./assets/knight.svg', mage:'./assets/mage.svg', engineer:'./assets/engineer.svg' };
export const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
export class Interface {
  selectedClass: ClassId = 'knight'; selectedDifficulty: Difficulty = 'challenge';
  pad: HTMLElement; knob: HTMLElement; dash: HTMLElement; private overlay: HTMLElement; private lastMode = ''; private panel = ''; private origin = 'menu'; private rewardUntil = 0;
  onAction: (action: string) => void = () => {}; onVolume: (value: number) => void = () => {}; onMotion: (checked: boolean) => void = () => {};
  onMusic: (value: number) => void = () => {};
  constructor(private root: HTMLElement, private save: Save) {
    root.innerHTML = `<section id="hud" hidden><div class="topline"><div class="identity"><img src="./assets/sigil.svg" alt=""/><div><span>星刃骑士</span><small id="level">等级 1</small></div></div><div class="clock"><strong id="timer">00:00</strong><small>试炼 · 03:00</small></div><button class="pause-button" data-action="pause" aria-label="暂停游戏"><i></i><i></i></button></div><div class="health"><div id="hpbar"></div><span id="hp">100 / 100</span></div><div class="xp-track"><div id="xpbar"></div></div><div class="subline"><span id="objective">收集星屑，唤醒力量</span><span>击败 <b id="kills">0</b></span></div></section><div id="controls" hidden><div class="control-label">拖动摇杆移动</div><div id="joystick" aria-label="移动摇杆"><span class="pad-cross"></span><div id="knob"></div></div><button id="dash" aria-label="闪避"><svg viewBox="0 0 48 48"><path d="M12 34L25 23 14 23 32 10 26 22 37 22 19 37 23 28"/></svg><strong id="dashlabel">闪避</strong><small id="dashhint">空格</small></button></div><div id="overlay"></div><div id="toast" role="status"></div><div id="blessing" role="status" hidden></div>`;
    this.pad = root.querySelector('#joystick')!; this.knob = root.querySelector('#knob')!; this.dash = root.querySelector('#dash')!; this.overlay = root.querySelector('#overlay')!;
    root.insertAdjacentHTML('afterbegin', '<div id="danger-vignette"></div><div id="arrival"><span>第一章</span><strong>残星回廊</strong><small>坚守星火 · 三分钟试炼</small></div>');
    root.insertAdjacentHTML('beforeend','<div id="boss-hud" hidden><div><strong>终焉守望者</strong><span id="boss-phase"></span></div><div class="boss-track"><i id="boss-fill"></i></div></div><div id="build-traits"></div>');
    root.querySelector('#arrival small')!.textContent=`${formatTime(RULES.bossAt)} · 唤醒守望者`;
    root.querySelector('.clock small')!.textContent=`终焉 · ${formatTime(RULES.bossAt)}`;
    root.addEventListener('input', e => { const input = e.target as HTMLInputElement; if (input.id === 'music-volume') { this.onMusic(Number(input.value)); root.querySelector('#music-value')!.textContent = `${Math.round(Number(input.value) * 100)}%`; } });
    root.addEventListener('click', e => { const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (button && !button.disabled) this.onAction(button.dataset.action!); });
    root.addEventListener('input', e => { const input = e.target as HTMLInputElement; if (input.id === 'volume') { this.onVolume(Number(input.value)); this.root.querySelector('#volume-value')!.textContent = `${Math.round(Number(input.value) * 100)}%`; } if (input.id === 'motion') this.onMotion(input.checked); });
  }
  toast(text: string) { const el=this.root.querySelector('#toast')!;el.className='';el.textContent=text;this.rewardUntil=0; }
  private rewardText(world: World) { const r=world.lastReward;return r ? `${r.kind==='triple'?'命运三连 · 三项已获得':r.kind==='critical'?'暴击兑现 · 获得2层':'赐福已获得'}\n${r.items.map(i=>`${UPGRADES.find(u=>u.id===i.id)!.name}：${i.before} → ${i.after} 层`).join(' · ')}` : ''; }
  showReward(world: World) { this.toast(this.rewardText(world));this.root.querySelector('#toast')!.className='reward-receipt';this.rewardUntil=performance.now()+4000; }
  showSettings(origin: string) {
    this.origin = origin; this.panel = 'settings'; this.draw('settings');
    this.root.querySelector('.toggle')!.insertAdjacentHTML('beforebegin', `<label class="setting-label" for="music-volume">背景音乐 <b id="music-value">${Math.round(this.save.musicVolume * 100)}%</b></label><input id="music-volume" aria-label="背景音乐" type="range" min="0" max="1" step="0.05" value="${this.save.musicVolume}"/>`);
  }
  showHelp(origin: string) { this.origin = origin; this.panel = 'help'; this.draw('help'); }
  private buildHtml(b: Build) {
    const reaction=reactionFor(ownedElements(b.stats));
    return `<p class="muted">${DIFFICULTIES[b.difficulty].name} · ${b.mode==='endless'?'无尽生存':'普通远征'} · ${formatTime(b.time)} · 击败 ${b.kills}<br>${CLASSES[b.classId].name} · 等级 ${b.level}</p><p class="element-status">${b.elementLock===undefined?'历史元素（旧纪录未记录锁定）：':b.elementLock.length===2?'本局已锁定：':'本局元素：'}${elementSummary(ownedElements(b.stats))}${reaction?`<br>${REACTIONS[reaction].description}`:''}</p><div class="build-stats">${Object.entries(STAT_LABELS).map(([k,label])=>`<div><span>${label}</span><b>${k==='crit'?`${(b.stats[k]*100).toFixed(1)}%`:Number(b.stats[k as Stat].toFixed(2))}</b></div>`).join('')}</div><h3>本局赐福</h3><div class="build-upgrades">${UPGRADES.filter(u=>b.upgrades[u.id]).map(u=>`<div>${u.name}<b>×${b.upgrades[u.id]}</b></div>`).join('')||'<p class="muted">尚未获得升级</p>'}</div>`;
  }
  showBuild(world: World) { this.panel='build'; this.overlay.className='veil'; this.overlay.innerHTML=`<section class="dialog"><div class="eyebrow">角色与构筑 · 只读</div><h2>此刻的星光</h2>${this.buildHtml(captureBuild(world))}<button class="primary" data-action="${world.mode==='paused'?'resume':'back'}">${world.mode==='paused'?'继续探索':'返回结算'}</button></section>`; }
  showRecords() { this.panel='records';this.overlay.className='veil';this.overlay.innerHTML=`<section class="dialog"><h2>本地最佳纪录</h2><p class="muted">普通模式保留最快通关；无尽保留最长存活。清除本站数据会丢失纪录，不跨设备同步。旧版成绩没有构筑快照。</p><div class="upgrade-list">${(Object.keys(DIFFICULTIES) as Difficulty[]).map(id=>{const b=this.save.records[id];return `<button class="secondary" data-action="record:${id}" ${b?'':'disabled'}>${DIFFICULTIES[id].name} · ${b?`${formatTime(b.time)} · ${CLASSES[b.classId].name} · 查看构筑`:'暂无纪录'}</button>`;}).join('')}</div><button class="primary full" data-action="back">返回营地</button></section>`; }
  showRecord(id: Difficulty) { const b=this.save.records[id];if(!b)return;this.panel='record';this.overlay.innerHTML=`<section class="dialog"><div class="eyebrow">最佳纪录 · 结束时构筑</div><h2>${DIFFICULTIES[id].name} · ${formatTime(b.time)}</h2>${this.buildHtml(b)}<button class="primary" data-action="records">返回纪录</button></section>`; }
  closePanel() { this.panel = ''; this.lastMode = ''; return this.origin; }
  invalidate() { this.panel = ''; this.lastMode = ''; }
  update(world: World) {
    if(this.rewardUntil && performance.now()>this.rewardUntil)this.toast('');
    const blessing=this.root.querySelector('#blessing') as HTMLElement;
    blessing.textContent=world.eggReward;
    blessing.hidden=world.mode!=='playing'||!world.eggReward||!!this.root.querySelector('#toast')!.textContent;
    const active = world.mode !== 'menu';
    this.root.classList.toggle('low-health', world.mode === 'playing' && world.player.hp / world.player.maxHp < 0.3);
    this.root.classList.toggle('reduced-motion', this.save.reducedMotion);
    (this.root.querySelector('#arrival') as HTMLElement).classList.toggle('visible', world.mode === 'playing' && world.time > 0.3 && world.time < 3.2);
    this.dash.style.setProperty('--charge', `${(1 - world.player.dashLeft / world.player.dashCooldown) * 360}deg`);
    (this.root.querySelector('#hud') as HTMLElement).hidden = !active;
    (this.root.querySelector('#controls') as HTMLElement).hidden = world.mode !== 'playing';
    if (!this.panel && this.lastMode !== world.mode) { this.lastMode = world.mode; this.draw(world.mode, world); if(world.mode==='menu')this.decorateMenu(); }
    const boss=world.boss;(this.root.querySelector('#boss-hud') as HTMLElement).hidden=!boss||world.mode==='menu';
    if(boss){this.root.querySelector('#boss-phase')!.textContent=`阶段 ${boss.phase??1} / 3`;(this.root.querySelector('#boss-fill') as HTMLElement).style.width=`${boss.hp/boss.maxHp*100}%`;}
    this.root.querySelector('.identity span')!.textContent=CLASSES[world.classId].name;
    this.root.querySelector('#build-traits')!.textContent=world.mode==='playing'?world.elements.length===2?elementSummary(world.elements):world.elements.map(id=>ELEMENTS[id]).join(' · '):'';
    this.root.querySelector('.clock small')!.textContent=DIFFICULTIES[world.difficulty].name+(world.endless?' · 无尽':` · ${formatTime(RULES.bossAt)}终焉`);
    this.root.querySelector('#timer')!.textContent = formatTime(world.time);
    this.root.querySelector('#level')!.textContent = `等级 ${world.level}`;
    this.root.querySelector('#hp')!.textContent = `${Math.ceil(world.player.hp)} / ${world.player.maxHp}`;
    (this.root.querySelector('#hpbar') as HTMLElement).style.width = `${world.player.hp / world.player.maxHp * 100}%`;
    (this.root.querySelector('#xpbar') as HTMLElement).style.width = `${world.xp / world.nextXp * 100}%`;
    this.root.querySelector('#kills')!.textContent = String(world.kills);
    this.root.querySelector('#objective')!.textContent = world.endless ? `无尽生存 · 敌人伤害 ×${world.strength.damage.toFixed(2)}` : world.time < 15 ? '靠近蓝色星屑可拾取经验' : world.bossSpawned ? `击败守望者 · ${formatTime(Math.max(0,RULES.duration-world.time))}后遗迹崩塌` : `星屑 ${world.xp} / ${world.nextXp} · ${formatTime(RULES.bossAt)}迎战守望者`;
    const ready = world.player.dashLeft <= 0;
    this.dash.classList.toggle('cooldown', !ready);
    this.dash.setAttribute('aria-disabled', String(!ready));
    this.root.querySelector('#dashlabel')!.textContent = ready ? '闪避' : `${world.player.dashLeft.toFixed(1)}秒`;
    this.root.querySelector('#dashhint')!.textContent = ready ? '短暂无敌' : '恢复中';
  }
  private decorateMenu() {
    const preview=this.root.querySelector('.class-preview')!;preview.querySelector('h2')!.textContent=CLASSES[this.selectedClass].name;
    const img=preview.querySelector('img')!;img.src=CLASS_ART[this.selectedClass];img.alt=CLASSES[this.selectedClass].name;
    preview.querySelector('p')!.textContent={knight:'穿透星刃 · 自动斩击',mage:'初始虚空 · 仅可再选一种元素',engineer:'双无人机 · 追踪弹幕'}[this.selectedClass];
    preview.insertAdjacentHTML('beforebegin',`<div class="class-picker">${(Object.keys(CLASSES) as ClassId[]).map(id=>`<button class="${id===this.selectedClass?'selected':''}" data-action="class:${id}" aria-pressed="${id===this.selectedClass}">${CLASSES[id].name}</button>`).join('')}</div>`);
    preview.insertAdjacentHTML('afterend',`<div class="difficulty-picker">${(Object.keys(DIFFICULTIES) as Difficulty[]).map(id=>`<button data-action="difficulty:${id}" class="${id===this.selectedDifficulty?'selected':''}" aria-pressed="${id===this.selectedDifficulty}">${DIFFICULTIES[id].name}</button>`).join('')}</div>`);
    this.root.querySelector('.build-label')!.textContent='3.0.1 · '+(this.selectedDifficulty==='endless'?'无尽生存 · 直到星火熄灭':'完整远征 · 单局约5分钟');
  }
  private draw(mode: string, world?: World) {
    this.overlay.className = mode === 'menu' ? 'home' : mode === 'playing' ? 'invisible' : 'veil';
    if (mode === 'playing') { this.overlay.innerHTML = ''; return; }
    if(mode==='identity'){
      this.overlay.innerHTML=`<section class="dialog centered"><div class="eyebrow">遗迹中的熟悉声音</div><h2>你是谁？</h2><p class="muted">星光似乎认得你。留下一个名字，或继续做无名旅人。</p><div class="identity-grid">${IDENTITIES.map(name=>`<button class="secondary" data-action="identity:${name}">${name}</button>`).join('')}</div><p class="hint">作出选择后继续战斗</p></section>`;return;
    }
    if (mode === 'menu') {
      this.overlay.innerHTML = `<div class="home-art"></div><div class="home-top"><span class="chapter">第一章 · 残星回廊</span><button class="small-button" data-action="settings">设置</button></div><div class="title-block"><div class="eyebrow">群星沉落之地</div><h1>星渊遗迹</h1><div class="title-rule"><span></span><img src="./assets/sigil.svg" alt=""/><span></span></div><p>循着最后的星光，深入失落的遗迹。</p></div><div class="home-bottom"><div class="class-preview"><img src="./assets/knight.svg" alt="身披青色披风、手持星光之刃的骑士"/><div><span class="eyebrow">本次出战</span><h2>星刃骑士</h2><p>星刃自动攻击 · 灵活移动生存</p></div><span class="class-mark">刃</span></div><button class="primary" data-action="start">踏入遗迹 <span>→</span></button><button class="text-button" data-action="help">初次探索？查看操作指引</button><button class="text-button" data-action="records">最佳纪录与构筑</button><div class="record"><span>最高击败 <b>${this.save.bestKills}</b></span><span>探索记录 <b>${this.save.runs}</b></span></div><div class="build-label">先行试炼 · 星辉焕新 · 单局三分钟</div></div>`; return;
    }
    if (mode === 'settings') {
      this.overlay.innerHTML = `<section class="dialog"><div class="eyebrow">旅途偏好</div><h2>设置</h2><p class="muted">设置保存在这台设备上。</p><label class="setting-label" for="volume">音效音量 <b id="volume-value">${Math.round(this.save.volume * 100)}%</b></label><input id="volume" aria-label="音效音量" type="range" min="0" max="1" step="0.05" value="${this.save.volume}"/><label class="toggle"><span>减少屏幕震动</span><input id="motion" type="checkbox" ${this.save.reducedMotion ? 'checked' : ''}/></label><button class="primary" data-action="back">完成</button></section>`; return;
    }
    if (mode === 'help') {
      this.overlay.innerHTML = `<section class="dialog"><div class="eyebrow">探索者手册</div><h2>让星光指引你</h2><ol class="instructions"><li><b>保持移动</b><p>左下摇杆移动；电脑使用 WASD 或方向键。星刃会自动攻击附近敌人。</p></li><li><b>穿越危险</b><p>右下按钮或空格闪避，短暂无敌。闪避冷却约 3.5 秒。</p></li><li><b>拾取星屑</b><p>靠近敌人掉落的蓝色星屑获取经验。升级时三选一；暴击卡获得两层，命运三连获得全部三项。获得第二种元素后锁定组合，其他元素不再出现；术士初始虚空计入。暂停菜单可查看角色与构筑。</p></li><li><b>活着离开</b><p>第${RULES.bossAt/60}分钟守望者出现，击败它即可胜利；第${RULES.duration/60}分钟遗迹崩塌。无尽模式不受这两个终止条件影响，直到死亡。暂停按钮或 Esc 可暂停；切到后台会自动暂停。</p></li></ol><button class="primary" data-action="back">记住了</button></section>`; return;
    }
    if (mode === 'paused') {
      this.overlay.innerHTML = `<section class="dialog centered"><img class="dialog-sigil" src="./assets/sigil.svg" alt=""/><div class="eyebrow">星光为你驻足</div><h2>旅途暂停</h2><p class="muted">深呼吸，下一道星刃正在等待。</p><button class="primary" data-action="resume">继续探索</button><button class="secondary full" data-action="build">角色与构筑</button><div class="two-buttons"><button class="secondary" data-action="settings">设置</button><button class="secondary" data-action="help">操作指引</button></div><button class="text-button" data-action="leave">结束本次探索</button></section>`; return;
    }
    if (mode === 'upgrade' && world) {
      const triple=world.triple;
      const offeredElements=[...new Set([...world.elements,...world.choices.filter(u=>isElement(u.id)).map(u=>u.id as keyof typeof ELEMENTS)])];
      const willLock=triple&&world.elements.length<2&&offeredElements.length===2;
      const lockReaction=willLock?reactionFor(offeredElements):undefined;
      const lockInfo=willLock?`全部领取后锁定：${elementSummary(offeredElements)}。本局不再出现其他元素。${lockReaction?`<br>${REACTIONS[lockReaction].description}`:''}`:'';
      this.overlay.innerHTML = `<section class="dialog upgrade-dialog ${triple?'triple-dialog':''}"><div class="eyebrow">等级 ${world.level} · 星核共鸣</div><h2>${triple?'命运三连 · 全部获得':'选择你的赐福'}</h2><p class="muted">${triple?'无需选择，三张赐福全部收入构筑。':'暴击卡可获得两层；选择适合你的构筑。'}</p><p class="element-status">${lockInfo}</p><div class="upgrade-list">${world.choices.map((u,i)=>{const crit=world.criticalId===u.id&&!triple;const tag=triple?'article':'button';return `<${tag} class="upgrade-card ${crit?'critical-card':''}" ${triple?'':`data-action="upgrade:${u.id}:${world.offerId}"`}><span class="upgrade-number">0${i+1}</span><span class="upgrade-content"><small>${crit?'<b class="luck-badge">暴击 ×2</b> ':triple?'<b class="luck-badge">命运赠礼</b> ':''}${u.tag} · 已获取 ${world.upgrades[u.id]??0} 层</small><strong>${u.name}</strong><span>${u.description}</span>${!triple&&world.elements.length===1&&isElement(u.id)&&!world.elements.includes(u.id)?`<span class="element-preview">选择后锁定：${elementSummary([...world.elements,u.id])}。本局不再出现其他元素。${reactionFor([...world.elements,u.id])?`<br>${REACTIONS[reactionFor([...world.elements,u.id])!].description}`:''}</span>`:''}${crit||triple?`<span class="layer-gain">${world.upgrades[u.id]??0} → ${(world.upgrades[u.id]??0)+(crit?2:1)} 层 · ${crit?'双层强化':'全部获得'}</span>`:''}</span></${tag}>`;}).join('')}</div>${triple?`<button class="primary full" data-action="upgrade:${world.choices[0].id}:${world.offerId}">全部获得</button>`:''}<p class="hint reward-note">${world.lastReward?this.rewardText(world):''}</p><p class="hint">${triple?'领取':'选择'}后自动继续 · 当前生命 ${Math.ceil(world.player.hp)}</p></section>`; return;
    }
    if ((mode === 'dead' || mode === 'won') && world) {
      const won = mode === 'won';
      this.overlay.innerHTML = `<section class="dialog centered result"><img class="dialog-sigil" src="./assets/sigil.svg" alt=""/><div class="eyebrow">${won ? '星火未熄 · 远征完成' : '此行落幕 · 星火仍在'}</div><h2>${won ? '带着星光归来' : '倒在群星之间'}</h2><p class="muted">${won ? '你击败了终焉守望者，保住了最后的火种。' : '遗迹记住了你的脚步。下一次，再深入一些。'}</p><div class="result-grid"><div><b>${formatTime(world.time)}</b><span>生存时间</span></div><div><b>${world.kills}</b><span>击败敌人</span></div><div><b>${world.level}</b><span>最终等级</span></div></div><button class="primary" data-action="restart">再次踏入遗迹</button><button class="secondary full" data-action="home">返回营地</button><button class="text-button" data-action="build">本局最终构筑</button><p class="hint">${DIFFICULTIES[world.difficulty].name} · 探索记录已保存在本机</p></section>`;
    }
  }
}

