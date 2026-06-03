# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**平遥古城沉浸式游戏 APP** — An immersive game app set in Pingyao Ancient City (平遥古城), combining real-world tourism with gamified exploration. Built with HBuilderX + uni-app, targeting Android/iOS APP.

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

## Tech Stack (Planned)

- **Framework**: Uni-app (Vue 3, Composition API with `<script setup>`)
- **IDE**: HBuilderX (App开发版)
- **Target**: Android APP (云打包) / iOS APP / H5 (调试用)
- **Map APIs**: Tencent QQ Maps for real-world positioning
- **Storage**: localStorage (uni.setStorageSync), no backend
- **Units**: rpx (750rpx = screen width)
- **Color Scheme**: 古铜棕 #8B4513 / 沙金色 #D4A574 / 中国红 #C41E3A / 宣纸白 #F5F0E8

## Project Structure (Target)

```
pages/           # TabBar主页面 (首页/论坛/地图/商城/我的)
pages_game/      # 游戏核心子包 (3D街景/任务系统/NPC对话)
pages_map/       # 地图相关子包 (POI/打卡/路线)
pages_shop/      # 商城子包
pages_user/      # 用户子包 (角色/积分/虚拟服饰)
common/          # 工具函数 + 数据定义
components/      # 公共组件 (NPC气泡/HUD/地图标记)
static/          # 静态资源 (图标/地图贴图)
```

## Game Systems

- **等级系统**: Lv1 票号学徒 → Lv2 柜台伙计 → Lv3 账房先生 → Lv4 大掌柜 → Lv5 晋商传人
- **虚拟货币**: 银钥 — earned via check-ins, tasks, daily login; spent in shop
- **打卡系统**: GPS-based check-in at real POI locations, daily limits, score rewards
- **NPC 晋小鸦**: Context-aware dialogue system, triggered by location/time/events

## Design Documents

- `沉浸式游戏古城UI设计[初稿].docx` — UI design draft document
- `微信图片_*.jpg` — Reference images (handwritten notes, map style, street view mockup)
- `AI提示词-APP版.md` — Step-by-step AI prompts for generating project code
