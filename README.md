# 星渊遗迹 · Starfall Ruins

当前版本 **3.0.1**。

[在线游玩](https://starfall-ruins-cn-20260917.freecelian.chatgpt.site) · [最终开发交接说明](交接说明-从这里开始.md) · [素材与许可](docs/ASSETS.md)

## 接手与贡献

建议Node.js 24.19.0、pnpm 11.19.0。运行 `pnpm install --frozen-lockfile` 后用 `pnpm dev` 启动开发，`pnpm test` 运行核心测试，`pnpm build` 构建正式版，`pnpm build:offline` 生成单文件HTML。

欢迎Fork后提交Pull Request，或通过Issue反馈问题。请说明修改范围和测试结果。用户要求先验收本地版本，再明确授权公网发布。

2026-10-15重跑60项核心逻辑测试全部通过。安卓真机长期表现尚未验证。以下保留原项目文档，含历史信息；最终状态以交接说明和docs/V3.0.1.md为准。生成目录、依赖缓存、临时文件不纳入源码仓库，相关截图和构建产物在开发交接ZIP中提供。

---

# 星渊遗迹 · Starfall Ruins

版本：3.0.1，可玩完整远征版。三职业、20种升级、四元素、五类敌人与三阶段Boss；单局目标约5分钟，最终时限6分钟。实体安卓与真人体验验收尚待进行。

## 直接游玩

无需安装、无需账号：用 Chrome 或 Edge 打开 `release/星渊遗迹-离线版.html`。游戏代码、图像和样式均已内嵌，音效在设备上合成，运行不连接 AI 或 CDN。

本次已在桌面 Chrome 完全断网状态下验证单文件运行。安卓浏览器通过 HTTP 游玩的布局与触控已用手机模拟环境验证；安卓真机及其文件管理器打开 HTML 的方式尚未验证。

开发预览：http://localhost:5173/ 。生产预览：http://localhost:4173/ 。这些是本机服务地址，不是公网部署。

同一 Wi-Fi 的安卓手机可尝试访问 http://192.168.31.142:4173/ 。电脑需要保持服务运行；该 IP 可能随网络变化。尚未从实体手机验证局域网连接，不保证防火墙已允许访问。

## 操作

- 手机：左下摇杆移动，右下按钮闪避；两根手指可同时操作。
- 电脑：WASD / 方向键移动，空格闪避，Esc 暂停或继续。
- 星刃自动瞄准附近敌人。靠近蓝色星屑拾取经验。
- 升级时战斗冻结，普通三选一；暴击卡获得两层，命运三连点击“全部获得”。暂停菜单中可查看只读构筑。
- 闪避提供短暂无敌，初始冷却 3.5 秒。
- 第4分钟迎战守望者，击败即胜利；第6分钟遗迹崩塌；无尽不受这两项终止规则影响，直到死亡。死亡后可立即重新开始。
- 切换到后台或窗口失焦会暂停。返回后点击“继续探索”。

本地存档保存音量、减少震动设置、最高击败数、生存纪录、探索次数与完成次数；新增三档难度最快通关与无尽最长存活的独立构筑快照；不保存尚未结束的对局，不跨设备同步。浏览器清除站点数据会删除这些记录。

## 开发与构建

建议使用 Node.js 22.12+ 或本项目已验证的 24.19.0，以及 pnpm。本次环境使用 pnpm 11.19.0。

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm serve
```

生产文件输出至 `dist/`，可部署到静态 HTTP 服务，无后端要求。资源使用相对路径。

```sh
pnpm build:offline
pnpm test:browser
node scripts/release-test.mjs
```

`test:browser` 需要开发服务器 5173 已运行；`release-test.mjs` 需要生产服务器 4173 已运行及离线文件已生成。Windows 测试脚本自动寻找 Chrome/Edge；可用环境变量 `CHROME_PATH` 指定浏览器路径，`GAME_URL` 指定开发地址。其他系统先安装 Playwright Chromium，再调整交付测试的浏览器路径。

本次环境的 pnpm 不在 PATH，可使用：

```powershell
& 'C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd' dev
```

## 架构

- `src/data/config.ts`：职业、敌人、升级和实体上限配置。
- `src/game/model.ts`：无渲染依赖的固定步长战斗模型、随机地图、碰撞、AI、伤害、经验、状态机。
- `src/game/input.ts`：键盘与多指 Pointer Events 输入。
- `src/game/storage.ts`：存档验证与容错。
- `src/game/audio.ts`：Web Audio 合成音效与音量。
- `src/render/scene.ts`：Phaser 显示对象、原创地面纹理和限量特效；实体消失时销毁对应显示对象。
- `src/ui/interface.ts`、`src/style.css`：中文菜单、HUD、升级和移动端布局。
- `tests/`：核心逻辑测试。`scripts/`：浏览器测试与打包工具。

采用 Phaser 3.90.0 + TypeScript 5.9.3 + Vite 7.1.12。沿用用户建议；纯逻辑模型独立于 Phaser，便于后续增加职业、元素反应和 Boss，并在不启动浏览器的情况下测试。

开发版的 `?test=1` 提供显式测试接口；生产构建会移除该接口。自动化测试中的强制升级、致死和到达终点仅用于验证状态流转，不会出现在正式交付包。

## 阶段范围与记录

完整清单见 `docs/FINAL_STATUS.md`；实际测试结果、局限和截图见 `docs/FINAL_TEST_REPORT.md` 与 `test-results/`。素材来源和许可见 `docs/ASSETS.md`、`LICENSE`、`THIRD_PARTY_NOTICES.txt`。

本次已完成四阶段的开发与本机验收，公网状态见最终交付说明，安卓真机与真人验收仍待完成。首轮构建的 Phaser 引擎分块约 1.48 MB，gzip 约 340 KB；Vite 大分块提示已记录，后续移动端性能优化时再评估裁剪引擎模块。

2.0 参数、交付清单和实际测试详见 [docs/V2.md](docs/V2.md)。

2.1 本地验收说明、平衡证据与限制见 [docs/V2.1.md](docs/V2.1.md)。公网仍为此前版本，等待本地验收后再处理。

第三批六种协同验收版：2.3.0，说明见 [docs/BATCH3.md](docs/BATCH3.md)。双元素锁定、六种反应与轻量特效已实装，仅本地验收。

