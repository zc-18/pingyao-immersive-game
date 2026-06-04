# 音频素材目录（/static/audio/）

`common/utils/audio.js` 已接好"何时播什么"，但**音频文件需自行放入本目录**。文件缺失时引擎静默兜底（不报错、不崩溃），补齐文件后即自动生效——与 `static/libs/`（Three.js）同一思路。

## 命名规则

引擎按 `<类型>_<名称>.mp3` 解析：

- BGM（背景音乐）：`bgm_<名称>.mp3`
- SFX（音效）：`sfx_<名称>.mp3`

## 需要的文件清单

### 背景音乐 BGM（循环，建议 30s~2min 无缝循环，音量已统一压到 0.55）

| 文件名 | 用途 | 触发位置 |
| --- | --- | --- |
| `bgm_street_ambient.mp3` | 3D 街景环境乐（古城白日/夜市氛围） | `pages_game/street/street.vue` 进入街景 |
| `bgm_ancient_city.mp3` | 古城主题（备用，启动/首页可选接入） | 预留 |
| `bgm_shop.mp3` | 商城（备用） | 预留 |
| `bgm_menu.mp3` | 菜单/角色选择（备用） | 预留 |

### 音效 SFX（短促一次性，音量 0.8）

| 文件名 | 用途 | 触发位置 |
| --- | --- | --- |
| `sfx_quest_complete.mp3` | 任务通关 | 街景 handleQuestComplete |
| `sfx_level_up.mp3` | 升阶 | 街景升阶弹层 |
| `sfx_coin.mp3` | 领取奖励 / 节奏奖励飘字 / 商城出票 | 街景领奖 + 商城兑换 |
| `sfx_npc_talk.mp3` | 晋小鸦讲解 | 街景 playPoiTopic |
| `sfx_quest_start.mp3` | 角色确认·启程印章落下 | 角色选择确认 |
| `sfx_reward.mp3` | 每日签到领取 | "我的"页签到 |
| `sfx_achievement.mp3` | 成就点亮（预留） | 预留 |
| `sfx_button_click.mp3` | 通用点击（预留） | 预留 |
| `sfx_footstep.mp3` | 脚步（预留） | 预留 |
| `sfx_door_open.mp3` | 开门/进店（预留） | 预留 |

## 格式与体积建议

- 格式：`.mp3`（uni-app `createInnerAudioContext` APP/H5 通用兼容）
- BGM：单声道或立体声，128kbps 足够；务必做**无缝循环**剪辑
- SFX：<1s，44.1kHz，尽量小体积（云打包包体敏感）
- 全部音频均受"我的 → 设置 → 音效"总开关（`gameSettings.enableMusic`）控制

## 开关与音量

- 总开关：`gameSettings.enableMusic`（关闭时引擎不创建任何音频上下文）
- 音量：代码内 `setVolume('bgm'|'sfx', 0~1)` 调整，默认 BGM 0.55 / SFX 0.8
