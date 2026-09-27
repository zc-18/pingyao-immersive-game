# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

完整的目录说明、状态/任务/存档约束、Three.js 与 renderjs 规则、编码与视觉约定统一维护在 [AGENTS.md](AGENTS.md)，本文件不重复这些内容，只补充命令速查、必须多文件才能看懂的架构脉络和已验证的工作方式。

@AGENTS.md

## 命令速查

仓库根目录执行（当前 Node 24.9，H5 脚手架依赖已装在根目录 `node_modules/`）：

```sh
npm run dev:h5                         # http://localhost:5219/#/pages_game/splash/splash，strictPort，被占用直接报错
npm run build:h5                       # 产物在 .cache/pingyao-h5-harness/dist/build/h5
node --test test/*.test.mjs            # 全量 Node 回归（30 个文件 121 用例，约 1 分钟）
node --test test/street-controls.test.mjs   # 单个测试文件
node --test --test-name-pattern="计步" test/street-controls.test.mjs   # 单个用例
python test/mobile-visual-audit.py     # 需先跑 dev:h5；输出 test/artifacts/mobile-ui/
python test/app-gameplay-audit.py      # 生产 UI 经济/行旅册/音频闭环检查，依赖 enclosed-courtyard-audit.py
node scripts/build-pingyao-character.mjs    # 重新生成 static/models/pingyao-hanfu-courtyard.glb
```

- 没有 lint、类型检查或 `npm test`。`test/*.test.mjs` 绝大多数是**静态源码断言**（读 `street.vue` 文本做正则匹配）加少量纯逻辑单测（`game-economy`、`street-world-layout`、`phase-transition`），跑通不代表 3D 画面正确。
- `test/*-audit.py` / `*-workflow.py` 是 Playwright 视觉审计脚本，固定访问 5219，截图和 JSON 落在 `test/artifacts/<name>/`（已 gitignore）。`test/*-report.md` 是历史验收记录，不是当前待办。
- 用户明确要求**只用浏览器调试**，不启用 HBuilderX 模拟器或真机。H5 下街景 renderjs 与逻辑层共用一个 `window`，APP 下不共用，写桥接代码时仍按 APP 约束来。
- `scripts/` 是素材生成器（角色 GLB、程序合成音频、imagegen 贴图裁切），运行后会直接写入 `static/`；`output/imagegen/` 是贴图脚本的输入源，不要删。`deploy/` 与 `scripts/package-pingyao-release.mjs` 是静态部署打包，读取项目内 `.cache/pingyao-h5-harness/dist/build/h5`；发布与回滚流程见 `deploy/README.md`。

## 架构脉络（多文件才能看懂的部分）

### H5 脚手架为什么绕一圈

`run-h5.mjs` 把 `src/平遥古城沉浸式游戏/` 的代码**实体复制**到 `.cache/pingyao-h5-harness/app/`，`static/` 与 `node_modules/` 用 junction 指回仓库，再在镜像目录里写出 `vite.config.js`（必须调用 `uni()` 插件）和 `package.json`，最后以镜像目录为 `UNI_INPUT_DIR` 启动 `uni`。原因是 uni 的 vite 插件把 root 钉死在 cwd，而 HBuilderX 源码目录没有 `package.json`。开发模式用 `fs.watch` 把源码改动实时镜像过去。永远改仓库源码；清理镜像时不要递归删 junction。

### 存档 → 快照 → 页面

- 存档只有 6 个 `uni.setStorageSync` key（`storage.js` 的 `STORAGE_KEYS`：runtime、profile、progress、gameSettings、mockFlags、redeemOrders）。所有写入走 `patchStorageObject()`，读取走各自的 getter 以保留规范化。
- 页面不直接拼存档，统一读 `game-state.js` 的 `getGameSnapshot()`；街景切换、POI 到访、NPC 对话、启动路由（`resolveLaunchRoute()`）也在该模块。
- 任务是事件驱动：页面产生游戏事件后调用 `quest-manager.js` 的 `advanceQuestByEvent(EVENT_TYPES.xxx, payload)`，由它推进 objective、发微奖励、判完成；步数用 `recordSteps()`。街景移动的步数先进 `step-buffer.js` 缓冲再批量落盘。
- 存档不是响应式。页面写完存档后靠 `onShow` 或页面内 tick 重新取快照。

### 街景页 `pages_game/street/street.vue`（约 6000 行）

三段结构：`<template>`、逻辑层 `<script setup>`（约 1000 行，负责 uni API、存档、任务、HUD 状态）、`<script module="render" lang="renderjs">`（约 4300 行，负责 Three.js、输入、动画）。

- **逻辑层 → renderjs**：改响应式 `sceneCmd`，模板上 `:change:sceneCmd="render.onSceneCmd"` 触发。命令有队列（`renderCommandQueue`），页面挂载前的命令会被缓存。`onSceneCmd` 支持的 action：`init` / `reinit` / `loadScene` / `highlightPoi` / `applyPhase` / `applySettings` / `reskinPlayer` / `blockInput` / `sceneControl` / `pause` / `resume`。观察器内 `this` 不可靠，必须用带 `bootScene` 的那个实例作为方法上下文（APP 挂在第 4 参、H5 挂在 `this`）。
- **renderjs → 逻辑层**：`emit(name, detail)` 走 `$ownerInstance.callMethod('handleRenderMsg', {detail:{type,data}})`。事件类型：`view-ready`、`render-stage`、`render-progress`、`render-ready`、`render-error`、`player-move`、`poi-near` / `poi-enter` / `poi-leave`。ownerInstance 未就绪时消息入队，`flushEmits()` 在 `onSceneCmd` 拿到实例后冲刷。
- **H5 特有修复**：uni-h5 的 `callMethod` 在页面公共代理上找方法，`defineExpose` 的方法不在代理上，所以逻辑层在 `getCurrentInstance().proxy` 上手动挂了 `handleRenderMsg`。删掉这段 H5 桥就断了。
- 逻辑层有 watchdog：超时未收到 `render-ready` 会发 `reinit`，renderjs 先 `dispose()` 再 `bootScene()`。二次进入走快速路径，跳过 7 个 Three.js 脚本的重复注入。
- Three.js 核心 7 个脚本串行注入后，按需追加 `RoomEnvironment` / `Sky` / `FXAAShader`；配置了角色模型时再加 `GLTFLoader` + `SkeletonUtils`。街景玩家和行人共用 `static/models/pingyao-hanfu-courtyard.glb`，由 `scripts/build-pingyao-character.mjs` 生成，骨架与部分动画来自 KayKit CC0（见 `static/models/LICENSES.md`）。
- 画面链路：线性离屏 RT → 可选 UnrealBloom → FXAA/输出。灯光特效开关只插拔 bloom 通道；低帧率只暂缓 bloom 和阴影，并按 fps 调像素比。街巷布局、POI 触发半径由 `common/utils/street-world.js` 与 `common/data/streets.js` 共享给逻辑层和 renderjs。
- `common/3d/` 是早期工厂模块，街景页**没有引用它**，改它不会影响画面。

### 横竖屏

游戏页（splash、role-select、street、dialog、3d-test）在 `pages.json` 里声明 `pageOrientation: landscape`，进入时再调 `orientation.js` 的 `lockGameLandscape()`，离开时 `releaseOrientationLock()`。四个 tab 页默认竖屏，但横屏时用 `common/styles/tab-landscape.scss` 的 mixin 做横屏布局（H5 需扣掉 tabBar 高度 `--window-bottom`）。用户当前目标是**手机横屏展示正常**，改 HUD 时至少在 844×390 / 667×375 两种横屏视口下用 `mobile-visual-audit.py` 核对。

### 时辰与相位

`phase.js` 按真实时间返回当前时辰（昼/暮/夜等），街景通过 `applyPhase` 命令切换光照、天空和辉光强度；`phase-transition` 相关测试覆盖切换时不重编译整场材质的约束。

## 当前会话目标（2026-09-18 用户口述）

完善游戏、保证逻辑闭环可用、手机横屏展示正常，并继续把 3D 场景做得精美流畅、动画专业；素材可结合 imagegen 网关生成后经 `scripts/prepare-*.py` 裁切入库；只用浏览器调试。
