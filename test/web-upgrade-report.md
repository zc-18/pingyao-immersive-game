# 桌面 Web 与汉服角色验收记录

日期：2026-09-24。继续会话 `90bc8cd9-685d-4404-8afa-9b172025f4f6` 的桌面 Web、人物与动作优化目标。

## 已完成

- 启动、选角、街景 HUD、四个主页面及弹窗适配桌面，保留手机横竖屏布局。
- 支持 WASD/方向键移动、Shift 快行、鼠标环顾与滚轮缩放；E 互动、I 换装、J 行旅册、C 观衣、R 镜头归位、G 致意、Esc 关闭面板/设置。
- 接入成人比例汉服人物，修正肩袖蒙皮、领口、裤装露出、鞋底绑定、步频、足部接触与碰撞范围。模型包含九段动画，运行时使用待机、步行、跑步和致意。
- 保留换装、任务奖励、场景切换和本地存档；修复 Windows 源码镜像偶发 EBUSY 导致的热更新失败。
- 保留 Blender 源工程、构建脚本、布料纹理、提示词和素材许可。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `node --test test/*.test.mjs` | 123 项通过，0 失败；包含新人物蒙皮、脚底、碰撞范围及步态验证 |
| `npm run build:h5` | 成功，退出码 0；存在依赖现有的 Sass @import 弃用提示 |
| `python test/web-game-audit.py` | 完整流程通过，浏览器错误为 0 |
| `python test/web-game-audit.py --quick --motion` | 最终步态调整后的行走/跑步录制通过，浏览器错误为 0 |
| `python test/mobile-visual-audit.py` | 手机横竖屏及桌面尺寸通过，无视口溢出或加载卡住 |

完整 Web 验证覆盖全新存档、选角、键鼠与失焦释放、面板阻止移动、购买与穿戴、首个主线任务及奖励、五条街切换、刷新后存档恢复、四个主页面和商城详情。覆盖 1920×1080、1366×768、1024×768、844×390、390×844。移动检查另覆盖 430×932、932×430、667×375、1440×900。

本机 MX450 / Chromium / Three.js r146，在 1440×900 窗口抽样 301 帧约 59.6 FPS，p95 帧时约 16.8ms；当时自适应像素比约 0.93，阴影关闭。这是单机短时采样，不代表所有设备表现。

## 查看与复现

在仓库根目录运行 `npm run dev:h5`，打开 <http://localhost:5219/#/pages_game/splash/splash>。开发服务与构建共用镜像目录，不应同时运行。

- [Web 检查数据](artifacts/web-game/report.json)
- [启动页](artifacts/web-game/splash.png)、[街景](artifacts/web-game/street.png)、[人物近景](artifacts/web-game/hanfu-portrait.png)
- [行走动画](artifacts/web-game/walk.gif)、[跑步动画](artifacts/web-game/run.gif)、[动作接触图](artifacts/web-game/motion-contact-sheet.jpg)
- [模型与构建说明](../3D/README.md)

构建产物位于 `.cache/pingyao-h5-harness/dist/build/h5`。截图、录制和 JSON 验收证据保留在项目内 `test/artifacts/`，不提交到仓库。

## 当前边界

所有玩家身份共用同一成人男性基础人体，人物是风格化模型；服装使用骨骼蒙皮，没有物理布料模拟。浏览器验收不替代 HBuilderX Android/iOS 真机资源加载与旋转验证。后端、真实 GPS、支付与线下核销仍未接入。
