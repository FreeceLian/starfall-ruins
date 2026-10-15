# 素材来源与许可

除3.0骑士、术士外，游戏图像由本项目编写SVG或Canvas代码生成。3.0骑士与术士采用用户提供的ChatGPT生成PNG，用户明确批准接入；本轮未调用图像生成服务。SVG容器仅裁去透明留白并内嵌原图，加载时栅格化为192像素高的贴图，不是重新仿画。

| 文件 / 代码 | 用途 | 来源 | 许可 |
| --- | --- | --- | --- |
| `public/assets/knight.svg` | 骑士王立绘与精灵 | 用户提供：ChatGPT Image 2026年9月19日 01_32_52.png | 用户授权用于本项目；不自动归为原创SVG的MIT许可 |
| `public/assets/crawler.svg` | 蚀星兽精灵 | 本项目原创 SVG 路径 | 项目 MIT |
| `public/assets/column.svg` | 遗迹石柱 | 本项目原创 SVG 路径 | 项目 MIT |
| `public/assets/cover.svg` | 营地封面插画 | 本项目原创 SVG 路径 | 项目 MIT |
| `public/assets/sigil.svg` | 星徽与浏览器图标 | 本项目原创 SVG 路径 | 项目 MIT |
| `public/assets/mage.svg` | 虚空术士 | 用户提供：ChatGPT Image 2026年9月19日 01_38_43.png | 用户授权用于本项目；生成素材的来源权利未独立核验 |
| `public/assets/engineer.svg` | 悬浮机械核心 | 本项目原创SVG路径 | 项目MIT |
| `public/assets/shot-knight.svg`、`shot-mage.svg`、`shot-engineer.svg` | 光剑、紫色法球、芯片弹 | 本项目原创SVG路径 | 项目MIT |
| `public/assets/wisp.svg`、`archer.svg`、`guardian.svg`、`oracle.svg`、`boss.svg` | 游魂、弩卫、两种精英和守望者 | 本项目原创 SVG 路径 | 项目 MIT |
| `public/assets/*-run-*.svg`、`knight-attack-*.svg` | 爬行动作帧；骑士旧动作帧保留但3.0不加载 | `scripts/animate-art.mjs` 从本项目原创图稿生成 | 项目 MIT |
| `src/render/scene.ts` | 地砖、裂纹、星盘、星屑、飞刃和粒子 | 本项目原创程序绘制 | 项目 MIT |
| `src/style.css`、`src/ui/interface.ts` | 界面与闪避符号 | 本项目原创 CSS/SVG | 项目 MIT |
| `src/game/audio.ts` | 拾取、受击、闪避、击败和升级提示音 | 本项目 Web Audio 合成，无采样素材 | 项目 MIT |

字体仅调用设备已有中文字体（微软雅黑、苹方、宋体或系统回退），不分发任何字体文件，不访问网络字体服务。系统字体的许可属于其原权利人。

## 开源软件

- Phaser 3.90.0：MIT；实际安装包 `node_modules/phaser/LICENSE.md`。官网 https://phaser.io/ ，文档 https://docs.phaser.io/ 。
- Phaser 内含的 EventEmitter3：MIT；Matter.js：MIT；Earcut：ISC。相应许可证原文随 `THIRD_PARTY_NOTICES.txt` 保留。项目没有使用或分发 Spine 插件资源。
- Vite 7.1.12：MIT，构建工具。生产包含 Vite 生成的少量模块加载辅助代码，许可一并保留。
- TypeScript 5.9.3、Playwright 1.56.1：Apache-2.0，开发与测试工具，不包含在游戏运行包。
- tsx 4.20.6：MIT，开发测试工具，不包含在游戏运行包。

依赖版本由 `pnpm-lock.yaml` 锁定。已安装主要开源依赖的许可证原文另收集在 `licenses/` 中，便于审阅。独立 HTML 内也嵌入运行依赖许可通知。

背景配乐同样由 `src/game/audio.ts` 的原创音符序列在本机合成；无外部录音、采样或网络音频。当前美术覆盖完整版本；商业品质这一主观目标仍需更多真人体验评价。
