# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**平遥古城沉浸式游戏 APP** — An immersive game app set in Pingyao Ancient City (平遥古城), combining real-world tourism with gamified exploration. Built with HBuilderX + uni-app, targeting Android/iOS APP.

**Current Status**: Frontend prototype stage with mock data and local storage. Not production-ready. See `当前项目进度.md` for detailed status.

### Core Concept
Players take on a character role (研学/寻宝/偶遇/打卡爱好者/帮不忙行) and explore a virtual recreation of Pingyao Ancient City. An NPC guide named **晋小鸦** (a owl mascot) provides cultural narration, location-based dialogue, and task triggers.

### Key Features
- **实时定位 + 坐标移动**: Real-time GPS positioning with map navigation
- **第一视角3D古城还原**: First-person 3D restoration of the ancient city (based on real Pingyao landmarks like 日升昌、榆次分号、瑞蚨祥)
- **线上线下商铺**: O2O commerce — online shopping with offline experience
- **路线推荐 + 打卡积分**: Route planning, check-in point system, score accumulation
- **虚拟服饰兑换**: Virtual costume/outfit rewards system
- **文化层面**: Cultural storytelling layer with NPC-triggered tasks and 晋商 (Shanxi merchant) history narration
- **步数计数 + 等级系统**: Step counter, leveling (e.g., 票号学徒 Lv.1), and virtual currency (银钥)

### Game Flow
1. 横屏启动 → "欢迎来到XX古城，请选择你的角色"
2. 角色选择（研学/寻宝/偶遇/打卡爱好者/帮不忙行）
3. 晋小鸦 NPC introduces current location + nearby points of interest
4. 用户交互：explore streets, enter shops, complete tasks, collect rewards

### UI Reference Style
- Chinese ink-painting style world map (水墨风大地图) with discoverable "???" locations
- Pixel-art / 国风 top-down town view for "find hidden objects" gameplay
- 3D street-level view with NPC dialogue bubbles, bottom HUD (level, location, steps, currency)

## Tech Stack

- **Framework**: Uni-app (Vue 3, Composition API with `<script setup>`)
- **3D Engine**: Three.js v0.157.0，运行于 renderjs 层（见 3D System 章节），非逻辑层
- **IDE**: HBuilderX (App开发版)
- **Target**: Android APP (云打包) / iOS APP / H5 (调试用)
- **Map APIs**: Tencent QQ Maps for real-world positioning
- **Storage**: localStorage (uni.setStorageSync), no backend
- **Units**: rpx (750rpx = screen width)
- **Color Scheme**: 古铜棕 #8B4513 / 沙金色 #D4A574 / 中国红 #C41E3A / 宣纸白 #F5F0E8

## Development Commands

**Run in HBuilderX**:
- Open `src/平遥古城沉浸式游戏` in HBuilderX
- Run → Run to Browser → Chrome (for H5 debugging)
- Run → Run to Phone or Emulator → Custom Base (for APP debugging)
- Build → Cloud Package → Android/iOS (for production APK/IPA)

**No CLI commands** — this is a HBuilderX-managed uni-app project without npm scripts.

## Project Structure

```
src/平遥古城沉浸式游戏/
├── pages/              # TabBar main pages (首页/地图/商城/我的)
├── pages_game/         # Game core subpackage (splash/role-select/street/dialog/3d-test)
├── pages_shop/         # Shop subpackage (redeem)
├── common/
│   ├── data/          # Mock data (roles, POI, dialogs, quests, streets, shop items)
│   ├── utils/         # Utilities (storage, level, poi, quest-manager, game-state, phase, check-in, audio)
│   ├── 3d/            # Three.js factories (scene/camera/player/joystick/poi/building)
│   └── constants/     # Theme constants
├── components/        # Shared components (NPC bubbles, HUD, cards)
├── static/           # Static assets (tabbar icons, logo, libs/ = Three.js)
├── App.vue           # App lifecycle + global styles
├── main.js           # App entry (provides theme + storage)
├── pages.json        # Page routing + tabBar config
├── manifest.json     # App manifest (permissions, orientation, version)
└── uni.scss          # Global SCSS variables
```

## Architecture Patterns

### State Management
- **No Vuex/Pinia** — uses uni.setStorageSync/getStorageSync for persistence
- **Storage keys** defined in `common/utils/storage.js` → `STORAGE_KEYS`
- **User profile**: `pygc_user_profile` (nickname, roleId, roleName, avatar)
- **User progress**: `pygc_user_progress` (level, exp, silver, silverKey, score, steps)
- **Game settings**: `pygc_game_settings` (music, effects, orientation, mock flags)
- **Storage normalization**: `normalizeUserProfile()` and `normalizeUserProgress()` ensure data integrity
- **Default state**: `ensureStorageDefaults()` called in App.vue onLaunch
- **Game state aggregator**: `common/utils/game-state.js` 是组合 runtime+profile+progress+quest 的统一读取入口。优先用 `getGameSnapshot()` 一次性取快照；场景/运行时更新用 `getCurrentStreetScene()`/`setCurrentStreetScene()`、`markPoiVisited()`、`markNpcTalk()`、`resolveLaunchRoute()`，而非在页面里直接读 storage

### Level System
- **Level calculation**: `common/utils/level.js` exports `getLevelMeta()`, `getLevelProgress()`, `getLevelSnapshot()`
- **5 levels**: 票号学徒 (0 exp) → 柜台伙计 (600) → 账房先生 (1600) → 大掌柜 (3000) → 晋商传人 (4800)
- **Max cap**: 6800 exp (FINAL_LEVEL_CAP)
- **Usage**: Pass `exp` value to get level metadata, progress percentage, and next level requirements

### POI System
- **POI status**: `nearby`, `hot`, `route`, `quest`, `discoverable` (defined in `common/utils/poi.js`)
- **Unlocked statuses**: `nearby`, `hot`, `route`, `quest`, `completed` (见 `UNLOCKED_POI_STATUS_LIST`)
- **Status helpers**: `isUnlockedPoi()`, `getPoiStatusText()`, `getPoiIcon()`
- **POI data**: `common/data/poi-list.js` contains mock POI locations

### Theme System
- **SCSS variables**: `uni.scss` defines `$py-*` variables (colors, spacing, shadows, surfaces)
- **JS constants**: `common/constants/theme.js` exports `THEME_COLORS`, `THEME_SPACING`, etc.
- **Global injection**: `main.js` provides `theme` and `storage` via `app.provide()` and `app.config.globalProperties`
- **Global styles**: `App.vue` defines `.page-shell`, `.ink-card`, `.copper-button`, `.paper-panel`, etc.

### Component Patterns
- **Easycom auto-import**: Components in `components/` are auto-registered (no manual import needed)
- **Naming**: PascalCase for component files (e.g., `NpcMessageBubble.vue`)
- **Props**: Use `defineProps()` with TypeScript-style type annotations
- **Emits**: Use `defineEmits()` for event declarations

## 3D System (renderjs)

第一视角街景（`pages_game/street/street.vue`、`pages_game/3d-test/3d-test.vue`）用 Three.js **v0.157.0** 渲染，运行在 `<script module="..." lang="renderjs">` 块内 —— **不是逻辑层**。

- **绝不在逻辑层 import three，也不用 npm/CDN 引入**。renderjs 无法 import npm 包。Three.js 通过动态注入 `<script>` 标签从 `/static/libs/` 按固定顺序加载为 `window.THREE`。加载顺序与下载地址见 @static/libs/README.md（7 个文件，顺序不能错，路径必须以 `/` 开头）。
- **3D 逻辑封装在 `common/3d/` 的依赖注入工厂里**：`SceneManagerFactory`、`CameraControllerFactory`、`PlayerControllerFactory`、`JoystickControllerFactory`、`PoiBeaconFactory`、`BuildingFactoryMethods`，以及 `scene-config.js`（`createDefaultSceneConfig()`、`migrateStreetData()`）。它们在运行时接收 `THREE` 参数，而非自行 import。
- **操作**：左半屏虚拟摇杆移动，右半屏拖拽旋转相机。世界坐标 X=左右、Z=前后、Y=上下。
- **强制横屏**：street 与 3d-test 在 pages.json 中设 `pageOrientation: "landscape"`，其余页面为竖屏。

## Game Systems

- **等级系统**: Lv1 票号学徒 → Lv2 柜台伙计 → Lv3 账房先生 → Lv4 大掌柜 → Lv5 晋商传人
- **虚拟货币**: 银钥 (silverKey) — earned via check-ins, tasks, daily login; spent in shop
- **打卡系统**: GPS-based check-in at real POI locations, daily limits, score rewards
- **NPC 晋小鸦**: Context-aware dialogue system, triggered by location/time/events

### 任务系统 (Quests)
- **数据**: `common/data/quests.js` — `questList`、`QUEST_STATUS`(locked/available/active/completed/claimed)、`QUEST_TYPE`(main/side/daily)
- **管理**: `common/utils/quest-manager.js` — 事件驱动。用 `advanceQuestByEvent(eventType, payload)` 推进，`EVENT_TYPES` 含 sceneLoaded/poiEntered/poiInteracted/buildingInteracted/npcDialogCompleted 等；常用 `getTrackedQuest()`、`startQuest()`、`claimQuestReward()`

### 成就系统 (Achievements)
- `common/utils/achievements.js` — `ACHIEVEMENTS` 列表、`evaluateAchievements(snapshot)`、`syncAchievementUnlocks()`、`getAchievementSummary()`。解锁记录持久化在 `userProgress.unlockedAchievements`

### 时辰系统 (Time Phases)
- `common/utils/phase.js` — 把现实时间映射为古城四时辰（晨/午/昏/夜），用 `getCurrentPhase()`。每个时辰驱动 3D 的天空/雾/光照/bloom + 飘落粒子 + 灯笼

### 签到系统 (Daily Check-in)
- `common/utils/check-in.js` — `hasCheckedInToday()`、`claimDailyCheckIn()`、`getCheckInPreview()`；7 天阶梯奖励循环（`CHECK_IN_REWARD_TABLE`）

## Design Constraints

**Current Issues** (from `当前项目进度.md`):
- **Direction drift**: Pages feel like info dashboards, not immersive game scenes
- **Landscape layout**: Horizontal orientation set but not optimized for game experience
- **Weak game loop**: Main flow (splash → role select → street → tasks) lacks strong guidance
- **Card-heavy UI**: Too many card-based layouts, not enough scene-based immersion

**Design Goals**:
- Prioritize scene immersion over information density
- Strengthen NPC guidance and task flow
- Optimize horizontal layout for game-like experience
- Reduce card-based layouts in favor of environmental storytelling

## Coding Conventions

- **Vue 3 Composition API**: Always use `<script setup>` syntax
- **No Options API**: Do not use `export default { data, methods, ... }`
- **Imports**: Use `@/` alias for absolute paths (e.g., `@/common/utils/storage`)
- **Styling**: Use `<style lang="scss">` and reference `uni.scss` variables
- **Units**: Use `rpx` for responsive sizing (750rpx = screen width)
- **Storage access**: Use `storage.get()`, `storage.set()`, `storage.patchObject()` from `common/utils/storage.js`
- **Level calculations**: Use `getLevelMeta()`, `getLevelSnapshot()` from `common/utils/level.js`
- **POI helpers**: Use `isUnlockedPoi()`, `getPoiStatusText()` from `common/utils/poi.js`

## Reference Documents

- `当前项目进度.md` — Current project status and known issues
- `沉浸式游戏古城UI设计[初稿].docx` — UI design draft document
- `img/` folder — Reference images (handwritten notes, map style, street view mockup, 晋小鸦 NPC design)
