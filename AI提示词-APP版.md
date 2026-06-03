# 平遥古城 3D 沉浸式游戏 App — 分阶段提示词

## 📋 进度

- [x] 第 0 轮：工程基础修正 ✅
- [ ] 第 1 轮：3D3技术架构方案 ⬅️ 当前
- [ ] 第 2 轮：3D 街景主舞台实现
- [ ] 第 3 轮：沉浸式主流程重构
- [ ] 第 4 轮：任务系统与 NPC 场景触发
- [ ] 第 5 轮：沉浸感打磨与辅助页面整合

## 📝 使用方式

每次**新开一个 Claude Code 对话**，复制对应轮次的代码块内容粘贴即可。提示词已包含完整上下文，AI 不需要前一对话的记忆。完成后检查「完成判定」，全通过再进入下一轮。

---

## ~~第 0 轮~~ ✅ 已完成

已完成：3d-test.vue + renderjs/Three.js 骨架 + Bloom + 横屏配置 + libs 下载

---

## 第 1 轮：3D 技术架构方案

**完成判定：**

- [ ] `common/3d/` 架构文件齐全
- [ ] 3d-test 页面有氛围的古城场景（天空+地面+建筑+灯笼+POI+雾气）
- [ ] 摇杆移动 + 相机跟随 + Bloom 辉光
- [ ] 数据迁移函数处理 4 条街景

**提示词：**

```
你是一个前端 3D 游戏架构师。请基于我当前仓库，设计并实现完整的 3D 场景架构层。

## ⚠️ 项目上下文（新对话必读，先理解再动手）

「平遥古城沉浸式游戏 APP」，uni-app + Vue3 + <script setup>，Three.js 通过 renderjs 实现 3D 古城探索。

**源码位置**：`src/平遥古城沉浸式游戏/`（不是仓库根目录），所有文件操作必须在此目录下。

**当前目录结构**：
src/平遥古城沉浸式游戏/
├── pages.json / manifest.json / App.vue / main.js / uni.scss
├── pages/                      # TabBar 页（index/map/shop/user）
├── pages_game/
│   ├── splash/splash.vue       # 启动页
│   ├── role-select/            # 角色选择
│   ├── street/street.vue       # 街景页（当前是 CSS 伪 3D，约 269 行）
│   ├── dialog/dialog.vue       # NPC 对话页
│   └── 3d-test/3d-test.vue     # ✅ 3D 渲染测试页（第 0 轮完成）
├── pages_shop/redeem/
├── common/
│   ├── data/                   # roles.js / streets.js / poi-list.js / npc-dialogs.js / achievements.js / shop-items.js
│   ├── utils/                  # storage.js / level.js / poi.js
│   └── constants/theme.js
├── components/                 # 10 个公共组件
└── static/
    ├── libs/                   # ✅ Three.js 0.157.0 + 后处理库（7 个 JS）
    └── tabbar/

**第 0 轮已完成**：
- 3d-test.vue：renderjs + Three.js 集成验证（动态脚本加载、Low-Poly 渲染、Bloom、触摸旋转、Raycaster、FPS 监控、dispose）
- 横屏配置：3d-test 和 street 页面 landscape，其他 portrait
- ⚠️ `common/3d/` 目录尚不存在 — 需要你从头创建

## ⚠️ 技术约束（必须严格遵守）

**renderjs 约束**：
1. 不能 import/require 任何文件，Three.js 通过动态 `<script>` 从 `/static/libs/` 加载
2. 通信只能传 JSON 可序列化数据（不能传函数/DOM/class 实例）
3. prop 驱动：`:change:propName="module.methodName"` 语法
4. canvas 用 `document.createElement` 或 `getElementById` 获取
5. 不能使用 `uni.*` API
6. 路径以 `/` 开头：`/static/libs/xxx.js`
7. dispose 必须手动释放所有 Geometry/Material/Texture/RenderTarget
8. 所有架构代码必须写成**纯函数/对象字面量**，不能用 ES6 class

**Three.js 加载顺序**（在 renderjs 中）：
1. `/static/libs/three.min.js` → window.THREE
2. `/static/libs/CopyShader.js`
3. `/static/libs/LuminosityHighPassShader.js`
4. `/static/libs/ShaderPass.js`
5. `/static/libs/RenderPass.js`
6. `/static/libs/EffectComposer.js`
7. `/static/libs/UnrealBloomPass.js`

**美术方向**：Low-Poly 国风（低面数 + 暖色调 + 后处理），不要写实 PBR
- 配色：墙体 #D4C5A9 / 屋顶 #3D3D3D / 木构 #8B4513 / 路面 #9E9E8E / 灯光 #FFD77F / 天空 #D7C0A2→#F6EAD7 / POI #C41E3A
- 性能：< 50,000 面 / < 100 draw calls / H5 ≥ 30fps / APP ≥ 24fps
- 全部程序化生成，不依赖外部模型文件

**图片资源**：阅读仓库根目录的 `图片资源清单.md` 了解所有可用图片。代码中假设图片已在 `static/img/` 下，引用格式 `/static/img/xxx.png`。本轮不涉及图片使用。

## 你必须先做的事

1. 阅读仓库根目录的 `CLAUDE.md`（项目规范）和 `当前项目进度.md`（现状分析）
2. 阅读 `src/平遥古城沉浸式游戏/pages_game/3d-test/3d-test.vue`（第 0 轮 renderjs 骨架）
3. 阅读 `src/平遥古城沉浸式游戏/common/data/streets.js`（4 条街景数据）
4. 阅读 `src/平遥古城沉浸式游戏/common/data/poi-list.js`
5. 查看 `img/4.jpg`（3D 街景概念图，注意建筑风格和布局）

## 需要实现的架构组件

> ⚠️ 由于 renderjs 不能 import，这些"文件"实际上是要内联到 renderjs 中的代码段。
> 在 `common/3d/` 下写参考文件，但在 3d-test.vue 的 renderjs 中必须直接内联使用。

### 1. SceneManager（场景管理器）
- Scene / Camera / Renderer / AnimationLoop
- 后处理管线（EffectComposer → RenderPass → UnrealBloomPass）
- loadScene(config) / dispose() 完整清理
- FogExp2 + resize + DPR（Math.min(dpr, 2)）+ 帧率监控

### 2. CameraController（相机系统）
- 第三人称跟随（距离 8-12、俯角 25°-35°）
- 右半屏拖拽旋转 360°，垂直 10°-60°
- 双指缩放（5-20） / lerp 平滑 / lookAt(target, duration)

### 3. JoystickController（虚拟摇杆）
- DOM 覆盖层，左半屏触摸半透明圆环 + 内圈跟随
- 输出 { dx: -1~1, dy: -1~1 }，松手归零，支持 PC WASD

### 4. PlayerController（玩家控制器）
- 简单几何体（Cylinder 身体 + Sphere 头）
- 摇杆输入移动（3-5 单位/秒）/ AABB 碰撞 / 脚下阴影 / 行走浮动

### 5. BuildingFactory（程序化古建筑 — 最重要，参考 img/4.jpg）

| 类型 | 结构 | 面数 |
|------|------|------|
| traditional_house | 矩形墙体 + 硬山顶（有翘角飞檐！不要平顶！）+ 门窗 | ≤ 300 |
| bank_building | 大体量 + 匾额 + 大门 | ≤ 400 |
| gate_tower | 四柱三间 + 多层飞檐 + 通道 | ≤ 500 |
| shop_front | 矮宽 + 敞开门面 + 招牌 | ≤ 200 |
| city_wall | 长条 + 城垛齿状顶 | ≤ 200 |
| lantern_post | 细柱 + 红灯笼球 + PointLight | ≤ 50 |

关键：屋顶有飞檐！招牌用 CanvasTexture 绘制竖排中文。灯笼 emissive + PointLight。用 mergeBufferGeometries 减 draw calls。

### 6. PoiBeacon（POI 信标）
- 底部发光圆环 + 浮动八面体 + 光柱
- 颜色：discoverable 金 / quest 红 / completed 灰 / nearby 白脉冲

### 7. 场景配置数据结构
ground / sky / fog / lighting / buildings / pois / decorations / playerSpawn / road / particles

### 8. migrateStreetData（数据迁移）
纯函数，converts streets.js → 3D 场景配置（百分比→坐标，自动生成灯笼，poiOverrides→pois）

### 9. 通信协议
逻辑层→renderjs：loadScene / movePlayer / focusPoi / highlightPoi / setWeather / dispose
renderjs→逻辑层：onSceneReady / onPoiEnter / onPoiLeave / onBuildingTap / onPoiTap / onPlayerMove / onFpsUpdate / onLoadProgress

## 输出要求

1. 所有架构代码可运行
2. 3d-test.vue 用 migrateStreetData 加载第一条街景
3. 场景：渐变天空 + 雾气 + 石板路 + ≥4 栋有飞檐的古建筑 + 中文招牌 + 灯笼（Bloom）+ POI 信标 + 玩家角色
4. 摇杆移动 + 相机跟随 + 触摸旋转
5. 面数 < 50,000

## 不要做的事

- 不要改动现有页面业务逻辑 / 不要删除数据文件
- 不要 npm install three / 不要改 globalStyle.pageOrientation
- 不要在 renderjs 中 import/require 或用 uni.*
- 不要改 street.vue（本轮只改 3d-test.vue）

## 视觉品质是硬要求

不要灰蒙蒙的丑陋场景！必须有：暖色光照 / 建筑颜色层次 / 灯笼 Bloom / 雾气纵深 / 天空渐变。
```

---

## 第 2 轮：3D 街景主舞台实现

**完成判定：**
- [ ] 街景页是 WebGL 3D 场景
- [ ] 摇杆 + 相机 + HUD 底栏 + NPC 浮窗 + 互动按钮
- [ ] 4 条街景可切换 + Loading 过渡
- [ ] 旧 CSS 清除 / H5 ≥ 30fps

**提示词：**

```
请基于我当前仓库，用 Three.js + renderjs 的 3D 场景完全替代当前街景页的 CSS 伪 3D 实现。

## ⚠️ 项目上下文（新对话必读）

「平遥古城沉浸式游戏 APP」，uni-app + Vue3 + <script setup>，Three.js 通过 renderjs。

**源码位置**：`src/平遥古城沉浸式游戏/`

**当前结构**：
src/平遥古城沉浸式游戏/
├── pages.json / manifest.json / App.vue / main.js / uni.scss
├── pages/          # TabBar 页（index/map/shop/user）
├── pages_game/
│   ├── splash / role-select / dialog / 3d-test
│   └── street/street.vue       # ⬅️ 本轮重构目标（当前 CSS 伪 3D）
├── common/
│   ├── data/       # 6 个数据文件
│   ├── 3d/         # ✅ SceneManager / CameraController / PlayerController / BuildingFactory / JoystickController / PoiBeacon / migrateStreetData（第 1 轮完成）
│   ├── utils/      # storage.js / level.js / poi.js
│   └── constants/
├── components/     # 10 个组件
└── static/libs/ + static/img/ + static/tabbar/

**已完成**：第 0 轮（renderjs+Three.js 验证+横屏）+ 第 1 轮（common/3d/ 架构层+3d-test 展示古城场景）

**技术约束**：renderjs 不能 import，通信只传 JSON，Three.js 从 `/static/libs/` 加载，架构代码需内联到 renderjs。美术 Low-Poly 国风 + Bloom/Fog，配色 #8B4513/#D4A574/#C41E3A/#F5F0E8，< 50,000 面，H5 ≥ 30fps。字体 "Noto Serif SC", serif。

**图片资源**：阅读仓库根目录的 `图片资源清单.md` 了解全部素材。本轮重点使用的图片：npc_owl_avatar.png / icon_silver_key.png / icon_steps.png / icon_level.png / texture_xuan_paper.png / loading_bar_frame.png。引用 `/static/img/xxx.png`，不要用 CSS 画或占位色块替代。

## 你必须先做的事

1. 阅读 `CLAUDE.md` 和 `当前项目进度.md`
2. 阅读 `图片资源清单.md`（了解本轮可用的图片及用途）
3. 阅读 street.vue 完整代码（CSS 伪 3D，要替换）
4. 阅读 components/GameHud.vue 和 components/NpcFloat.vue
5. 阅读 common/3d/ 下所有架构文件
6. 阅读 common/data/streets.js
7. 查看 `img/4.jpg`（概念图，注意 HUD/NPC/互动按钮/氛围）

## 需要完成的工作

### 1. 重构 street.vue
Template（从下到上叠放）：全屏 Canvas → 虚拟摇杆区 → HUD 底栏 → NPC 浮窗 → POI 弹窗 → 互动按钮 → Loading 层 → 小地图

Script Setup：保留 currentStreet/streetPois/activePoi 等，新增 renderjs 回调（onPoiEnter/onPoiLeave/onBuildingTap/onPlayerMove）+ 发送指令（loadScene/focusPoi）

Renderjs：初始化 SceneManager + migrateStreetData 加载街景 + Raycaster + 回调逻辑层

### 2. 新建 GameHudV2.vue（参考 img/4.jpg 底部 HUD）
底栏半透明毛玻璃胶囊形：左区（角色+等级 icon_level.png）/ 中区（位置+步数 icon_steps.png）/ 右区（银钥 icon_silver_key.png）

### 3. 新建 NpcOwl.vue
右下角 npc_owl_avatar.png 圆形头像 + 呼吸动画，展开对话气泡，onPoiEnter 自动展开，3 秒自动收起

### 4. 互动按钮
靠近建筑浮现：票号→"进店参观" / 商铺→"进店逛逛" / 牌楼→"查看碑文" / 文庙→"入庙参拜"

### 5. Loading
全屏 texture_xuan_paper.png 平铺 + "青石路长，且行且听……" + loading_bar_frame.png 进度条 + ready 淡出

### 6. 清理旧 CSS 伪 3D 代码（~600 行），保留业务逻辑

## 不要做的事
- 不要重写 streets.js/poi-list.js（用 migrateStreetData）
- 不要改首页/对话页/地图页
- 不要改 common/3d/（除非 bug）

## 验收标准
1. 街景页 3D 渲染 + 2. 摇杆+相机 + 3. HUD 概念图风格 + 4. NPC 浮窗 + 5. 互动按钮 + 6. 4 条街景切换 + 7. Loading + 8. 旧 CSS 清除 + 9. H5 ≥ 30fps + 10. 有氛围感
```

---

## 第 3 轮：沉浸式主流程重构

**完成判定：**
- [ ] 启动页水墨卷轴感 + 角色选择大卡滑动
- [ ] 选角后直达 3D 街景 + 入城过场 2-3 秒
- [ ] 对话以场景内弹层弹出 + HUD 菜单替代 tabBar

**提示词：**

```
请基于当前仓库，在 3D 主舞台已搭好的前提下，重构整个沉浸式主流程。

## ⚠️ 项目上下文（新对话必读）

「平遥古城沉浸式游戏 APP」，uni-app + Vue3 + <script setup>，Three.js 通过 renderjs。

**源码位置**：`src/平遥古城沉浸式游戏/`

**当前结构**：
src/平遥古城沉浸式游戏/
├── pages.json / manifest.json / App.vue / main.js / uni.scss
├── pages/          # TabBar 页
├── pages_game/
│   ├── splash/splash.vue       # ⬅️ 本轮修改：启动页视觉升级
│   ├── role-select/role-select.vue  # ⬅️ 本轮修改：角色选择升级
│   ├── street/street.vue       # ✅ 3D 主舞台（第 2 轮完成）
│   ├── dialog/dialog.vue       # 保留为对话历史
│   └── 3d-test/
├── common/
│   ├── data/       # 6 个数据文件
│   ├── 3d/         # ✅ 完整 3D 架构层
│   ├── utils/ / constants/
├── components/     # ✅ GameHudV2 / NpcOwl 等（第 2 轮新增）
└── static/libs/ + static/img/ + static/tabbar/

**已完成**：第 0-2 轮（renderjs 验证 → 3D 架构 → 街景页 3D+HUD+NPC+互动+Loading）

**约束**：renderjs 不能 import / 通信只传 JSON / Low-Poly 国风 / 配色 #8B4513/#D4A574/#C41E3A/#F5F0E8 / 字体 "Noto Serif SC", serif

**图片资源**：阅读仓库根目录 `图片资源清单.md` 了解全部素材。本轮重点使用：title_pingyao.png / bg_ink_mountains.png / deco_clouds.png / btn_enter_city.png / npc_owl_full.png / npc_owl_avatar.png / role_*.png（5张）/ icon_menu*.png（6张）/ texture_xuan_paper.png。引用 `/static/img/xxx.png`，不要 CSS 画或占位。

## 你必须先做的事

1. 阅读 `CLAUDE.md` 和 `当前项目进度.md` 和 `图片资源清单.md`
2. 阅读 splash.vue、role-select.vue、pages.json（tabBar）、dialog.vue
3. 查看 `img/4.jpg` 和 `img/1.jpg`（流程手稿）

## 目标流程

启动页（水墨）→ [首次]角色选择 / [回访]跳过 → 入城过场(2-3s) → 3D 街景（核心停留页）→ 靠近 POI → NPC 弹层对话 → HUD 菜单

## 需要完成的工作

### 1. 启动页（splash.vue）
- 有角色 → `uni.reLaunch` 跳 street / 无角色 → `uni.navigateTo` 跳 role-select
- 视觉：水墨渐变背景 + `title_pingyao.png` 书法标题 + `bg_ink_mountains.png` 底部山水 + `deco_clouds.png` CSS 飘云动画 + `btn_enter_city.png` 入城按钮呼吸发光

### 2. 角色选择（role-select.vue）
- 选完跳 street / 横向大卡滑动（60% 屏宽）/ 各角色预制卡面（role_*.png）/ 晋小鸦开场白（每角色不同文案）

### 3. 入城过场（street.vue onLoad 首次进入）
阶段1(1s) 黑色渐亮+"城门待启……" → 阶段2(1s) 晋小鸦"欢迎来到平遥古城" → 阶段3(1s) 3D 场景渐入

### 4. 对话场景化 — 新建 components/SceneDialog.vue
半屏底部滑出弹层 + texture_xuan_paper.png 背景 + 左侧 npc_owl_full.png + 右侧对话气泡 + 复用 npc-dialogs.js

### 5. 菜单替代 tabBar — 新建 components/GameMenu.vue
右上角 icon_menu.png → 右侧滑出菜单（icon_menu_map/shop/journal/quest/settings）→ uni.navigateTo 跳辅助页。App.vue onLaunch 调 uni.hideTabBar()

### 6. 首页降级
保留为"行旅总览"从菜单进入，移除"继续探索"按钮

## 不要做的事
- 不要改 3D 渲染逻辑和 common/3d/ / 不要重写商城/地图/个人中心 / 不要删数据文件

## 验收标准
1. 启动页水墨氛围 + 2. 角色大卡+卡面图 + 3. 直达 3D 街景 + 4. 入城过场 + 5. 对话弹层 + 6. 菜单替代 tabBar + 7. 一气呵成
```

---

## 第 4 轮：任务系统与 NPC 场景触发

**完成判定：**
- [ ] quests.js ≥ 6 个任务 + 1 条主线全流程跑通
- [ ] POI 高亮+引导线 + HUD 任务追踪 + 奖励弹窗+飘字
- [ ] 角色奖励差异 + 等级提升反馈

**提示词：**

```
请基于当前仓库，构建任务驱动系统，让角色、POI、NPC、奖励真正联动。

## ⚠️ 项目上下文（新对话必读）

「平遥古城沉浸式游戏 APP」，uni-app + Vue3 + <script setup>，Three.js 通过 renderjs。

**源码位置**：`src/平遥古城沉浸式游戏/`

**当前结构**：
src/平遥古城沉浸式游戏/
├── pages.json / manifest.json / App.vue
├── pages/          # 辅助页（tabBar 已用菜单替代）
├── pages_game/
│   ├── splash/     # ✅ 水墨启动页
│   ├── role-select/ # ✅ 大卡角色选择
│   ├── street/     # ✅ 3D 主舞台
│   ├── dialog / 3d-test
├── common/
│   ├── data/       # roles.js / streets.js / poi-list.js / npc-dialogs.js / achievements.js / shop-items.js
│   ├── 3d/         # ✅ 完整 3D 架构层
│   ├── utils/      # storage.js（STORAGE_KEYS / patchStorageObject）/ level.js / poi.js
│   └── constants/
├── components/     # GameHudV2 / NpcOwl / SceneDialog / GameMenu 等
└── static/libs/ + static/img/ + static/tabbar/

**已完成**：第 0-3 轮（renderjs 验证 → 3D 架构 → 街景 3D+HUD+NPC → 启动+选角+入城+对话弹层+菜单）

**约束**：renderjs 不能 import / 通信只传 JSON / 存储用 `patchStorageObject(STORAGE_KEYS.userProgress, ...)` / 图片 `/static/img/xxx.png`

**图片资源**：阅读仓库根目录 `图片资源清单.md`。本轮重点：icon_quest.png / frame_scroll.png / icon_silver_key.png / npc_owl_full.png / texture_xuan_paper.png。

## 你必须先做的事

1. 阅读 common/data/roles.js（角色 bonus）
2. 阅读 common/data/poi-list.js / npc-dialogs.js / achievements.js
3. 阅读 common/utils/storage.js 和 level.js
4. 阅读 `图片资源清单.md`
5. 查看 `img/4.jpg`

## 需要完成的工作

### 1. 任务数据 common/data/quests.js
≥6 个任务（2主+3支+1日常），含 id/type/title/description/trigger/objectives/rewards/roleBonus/npcHints(4阶段)/prerequisite/sceneId

### 2. 任务管理器 common/utils/quest-manager.js
getActiveQuests(roleId) / getQuestStatus / startQuest / checkObjective / completeQuest(含角色加成) / getQuestNpcHint
状态持久化：`patchStorageObject(STORAGE_KEYS.userProgress, { questData: ... })`

### 3. 3D 场景任务引导
目标 POI 高亮（highlightPoi）+ 地面引导线（发光虚线）+ 到达自动触发对话 + HUD 任务追踪条（icon_quest.png + 文字）+ 无任务显示"🚶 自由探索中"

### 4. 奖励反馈
新建 RewardPopup.vue：frame_scroll.png 卷轴展开 + 银钥 icon_silver_key.png + npc_owl_full.png 结语 + 金色"收下奖励"
新建 FloatingText.vue：CSS 飘字 "银钥 +20" / "+50 EXP"

### 5. 等级提升
阈值时全屏金色光效 + "晋升为 柜台伙计 Lv.2"

### 6. NPC 对话与任务绑定
对话内容按任务阶段变化 → 完成 objective → 全完弹奖励

### 7. 角色差异化
研学者+10%文化奖励 / 寻宝人+15%银钥 / 偶遇客+30%随机 / 打卡爱好者积分高 / 帮不忙行委托快。HUD 显示 bonus。

## 不要做的事
- 不要改 common/3d/ / 不要改 3D 渲染 / 不要改启动页/角色选择 / 不要删数据文件

## 验收标准
1. ≥6 任务 + 2. 状态机正确 + 3. POI 高亮+引导线 + 4. 任务追踪条 + 5. 奖励弹窗+飘字 + 6. 角色差异 + 7. 等级反馈 + 8. 1 条主线全流程
```

---

## 第 5 轮：沉浸感打磨与辅助页面整合

**完成判定：**
- [ ] 地图水墨风+迷雾 / 商城古城氛围 / 个人中心行旅手帐
- [ ] 小地图 + ≥2 种天气 + 全局反馈统一 + 音效埋点 + 文案审查
- [ ] `H5 ≥ 30fps`

**提示词：**

```
请基于当前仓库完成最终的沉浸感打磨与全局整合。

## ⚠️ 项目上下文（新对话必读）

「平遥古城沉浸式游戏 APP」，uni-app + Vue3 + <script setup>，Three.js 通过 renderjs。

**源码位置**：`src/平遥古城沉浸式游戏/`

**当前结构**：
src/平遥古城沉浸式游戏/
├── pages/
│   ├── index/      # 行旅总览（不再是主页）
│   ├── map/        # ⬅️ 本轮改造：水墨风地图
│   ├── shop/       # ⬅️ 本轮改造：古城店铺
│   └── user/       # ⬅️ 本轮改造：行旅手帐
├── pages_game/     # ✅ splash / role-select / street(3D主舞台) / dialog / 3d-test
├── pages_shop/redeem/  # ⬅️ 本轮改造
├── common/
│   ├── data/       # roles / streets / poi-list / npc-dialogs / achievements / shop-items / quests
│   ├── 3d/         # ✅ 3D 架构层
│   ├── utils/      # storage / level / poi / quest-manager
│   └── constants/
├── components/     # GameHudV2 / NpcOwl / SceneDialog / GameMenu / RewardPopup / FloatingText
└── static/libs/ + static/img/ + static/tabbar/

**已完成**：第 0-4 轮（renderjs → 3D 架构 → 街景 3D → 启动+选角+菜单 → 任务系统+奖励+等级+角色差异化）

**约束**：renderjs 不能 import / 通信只传 JSON / Low-Poly 国风 / 配色 #8B4513/#D4A574/#C41E3A/#F5F0E8 / 图片 `/static/img/xxx.png`

**图片资源**：阅读仓库根目录 `图片资源清单.md` 了解全部素材及用途。本轮大量使用第 5 轮标记的图片（地图/商城/手帐/徽章类）。

## 你必须先做的事

1. 从启动页完整体验到完成一个任务
2. 阅读 `图片资源清单.md`（了解本轮所有可用图片）
3. 检查 map.vue / shop.vue / user.vue 现有实现
4. 查看 `img/4.jpg` 和 `img/2.jpg`（水墨地图参考）

## 需要完成的工作

### 1. 地图页游戏化（参考 img/2.jpg）
改造 map.vue：水墨渐变背景 + bg_ink_mountains.png 底部装饰 + 未探索区覆盖 map_fog_overlay.png+"???" + 已探索 POI 用 map_poi_lantern.png + 任务目标用 map_poi_flag.png+脉冲 + 点击信息卡+"前往"

### 2. 商城页
shop.vue + redeem.vue：shop_sign.png 招牌 + texture_wood.png 底纹 + card_bamboo_frame.png 卡片框 + icon_silver_key.png 银钥图标

### 3. 个人中心 → 行旅手帐
user.vue：journal_cover.png 封面 + role_*.png 角色像+等级条 + 足迹统计 + 成就徽章墙（badge_*.png 完成原色/未完成 CSS grayscale+opacity 灰化）+ frame_scroll.png 卷轴框

### 4. 街景页小地图
HUD 右上角 ~120rpx 圆形：道路线+建筑块+POI 点+玩家蓝三角+任务红点，可收起

### 5. 天气系统（SceneManager）
晴天（暖光+尘埃）/ 雨天（灰天+雨粒+反光）/ 晨雾（浓雾+暖橙光）

### 6. 全局反馈 — 新建 GameToast.vue
替换 uni.showToast：奖励金色飘字 / 成就卷轴展开 / 等级全屏光效 / NPC 底部气泡（npc_owl_avatar.png）/ 系统顶部小条

### 7. 音效占位 — 新建 common/utils/audio.js
playBGM / playSFX / stopBGM / setVolume，当前只打印日志

### 8. 文案审查
"请前往"→"客官，往那边走" / "暂无数据"→"这片街区还笼在晨雾里……" / "点击查看"→"翻开看看" / "返回"→"回到古城" / "确定"→"就这样" / "取消"→"再想想"

### 9. 性能检查
全场景 H5 ≥ 30fps / 无内存泄漏 / z-index 正确 / 横屏 UI 合理

## 不要做的事
- 不要改 3D 渲染核心 / 不要改任务系统核心 / 不要删数据文件

## 验收标准
1. 地图水墨+迷雾 + 2. 商城古城氛围 + 3. 手帐风格 + 4. 小地图 + 5. ≥2 天气 + 6. 反馈统一 + 7. 音效埋点 + 8. 文案统一 + 9. ≥30fps + 10. 无出戏感
```

---

## 最终检查清单

|  | 检查项 | 要求 |
|---|--------|------|
| 1 | 3D 场景 | WebGL 渲染，天空/地面/建筑/灯笼/雾气 |
| 2 | 视觉品质 | Bloom + 雾气 + 暖色光照，不是灰色方块 |
| 3 | 古建筑 | 有飞檐屋顶、招牌、门窗 |
| 4 | 操控 | 摇杆 + 触摸旋转 + 第三人称相机 |
| 5 | 流程 | 启动→选角→入城→3D探索 ≤30秒 |
| 6 | 主舞台 | 3D 街景是核心停留空间 |
| 7 | NPC | 晋小鸦浮窗 + 位置/任务绑定对话 |
| 8 | 任务 | ≥1 主线跑通 + 导航+判定+奖励 |
| 9 | 角色 | 不同角色奖励可感知 |
| 10 | 辅助 | 地图/商城/手帐服务探索 |
| 11 | 天气 | ≥1 种可见 |
| 12 | 国风 | Low-Poly 保留平遥辨识度 |
| 13 | HUD | 状态条 + 任务追踪 + 小地图 |
| 14 | 帧率 | H5 ≥ 30fps |
| 15 | 横屏 | 仅 3D 页面横屏 |
| 16 | 数据 | 所有数据文件被消费 |
| 17 | 菜单 | HUD 菜单呼出辅助功能 |
| 18 | 图片 | 预制图片全部正确引用，无占位色块 |
