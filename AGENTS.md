# AGENTS.md

本文件是整个仓库的统一开发指南。以当前源码、配置和实际验证结果为准；历史记录与接口草案不代表已实现能力。

## 项目现状

- 平遥古城沉浸式文旅游戏前端原型，使用 uni-app、Vue 3、JavaScript、SCSS；当前随包 Three.js 实测为 r146（0.146.0），不要仅按历史标注推断可用 API。
- 当前主线为桌面 Web，保留 Android/iOS APP 的 HBuilderX 调试和云打包流程；根目录提供基于 Vite 的 H5 调试脚手架。桌面布局在宽度 1000px、可用高度 560px 起启用，手机继续使用横竖屏适配。
- 主流程为启动页、角色选择、3D 街景探索，配合晋小鸦 NPC、任务、签到、成就、服饰、商城兑换和行旅册。当前街景使用可见玩家化身及跟随相机。
- 数据来自 `common/data/` 和 `uni.setStorageSync` 本地存档，无后端或鉴权。地图页已接入设备定位（`common/utils/location.js`：WGS84 取点后本地换算 GCJ02，古城范围内投影到水墨城图，城外或失败时回落到当前街景代表点位）和可选的腾讯位置服务逆地址解析（`common/utils/tencent-lbs.js`，需运行时注入 `globalThis.__PYGC_CONFIG__.tencentLbs` 的 key 与代理地址，未配置时显示“腾讯服务未配置”）；浏览器定位需 HTTPS 或 localhost。支付和线下核销服务尚未接入；步数来自虚拟场景移动。

## 目录与入口

应用源码位于 `src/平遥古城沉浸式游戏/`，下文业务模块路径均相对此目录。不要把页面建到仓库根目录。

```text
package.json / package-lock.json  H5 脚手架依赖和命令
run-h5.mjs                       H5 源码镜像、开发服务和构建启动器
test/                           Node 回归测试和移动端视觉检查脚本
img/                            原始设计参考图
src/平遥古城沉浸式游戏/
  App.vue / main.js             生命周期、全局样式、theme/storage 注入
  pages.json / manifest.json    路由、tabBar、横竖屏、APP 权限
  pages/                        index、map、shop、user 四个 tab 页面
  pages_game/                   splash、role-select、street、dialog、3d-test
  pages_shop/redeem/            兑换券页面
  common/data/                  角色、街道、POI、任务、服饰、文化文案等数据
  common/utils/                 存档、任务、状态快照、街道布局等业务逻辑
  common/3d/                    3D 工厂参考模块，当前页面渲染实现仍内联
  common/constants/theme.js     JavaScript 主题常量
  components/                   扁平存放的公共 Vue 组件
  static/                       运行时图片、字体、音频和 Three.js 库
  uni.scss                      全局 SCSS 变量
```

`pages_game/`、`pages_shop/` 当前通过 `pages.json` 的 `pages` 数组注册，并非已配置的 `subPackages`。新增页面需同步路由配置。

## 开发与验证命令

从仓库根目录执行，建议使用 Node.js 22.12+ 或 24 LTS：

```sh
npm ci
npm run dev:h5
npm run build:h5
node --test test/*.test.mjs
python test/web-game-audit.py
```

- 开发地址为 `http://localhost:5219`，入口为 `/#/pages_game/splash/splash`。启动器使用 `strictPort: true`，端口占用会报错，不会自动换端口。
- `run-h5.mjs` 将代码镜像到项目内 `.cache/pingyao-h5-harness/app`；当前依赖下已验证中文路径。开发模式监听源码变化。始终修改仓库源码，不编辑临时副本。
- 构建输出位于项目内 `.cache/pingyao-h5-harness/dist/build/h5`，不是仓库根目录的 `dist/`，所有构建与缓存保留在项目内。
- 临时副本的 `static/` 和 `node_modules/` 是指回仓库的 junction。清理前须核对链接目标；多个启动器共用临时目录，不要并发启动开发与构建进程。
- HBuilderX 中打开 `src/平遥古城沉浸式游戏/`，使用“运行到浏览器”或“运行到手机或模拟器”；APP 打包使用云打包流程。
- 没有 `npm test`、lint 或类型检查脚本。Node 测试使用内置 `node:test`；模块类型提示是现有配置产生的警告，不应只为消除警告改动包配置。
- 修改业务或渲染代码时运行相关测试，并按影响范围执行 H5 构建。静态源码断言不能证明 3D 已正确渲染；街景或布局改动还需检查实际画面、交互和移动端横竖屏。
- 移动端视觉检查：先运行 H5 服务，再执行 `python test/mobile-visual-audit.py`。需预装 Python 的 `playwright`、`Pillow` 和 Playwright Chromium；脚本固定访问 5219 端口，输出到 `test/artifacts/mobile-ui/`。APP 资源路径及旋转行为还需 HBuilderX 真机验证。
- Web 验收：H5 服务启动后运行 `python test/web-game-audit.py`，使用独立浏览器存档验证键鼠、换装、主线任务、五街切换、宽屏/手机尺寸与刷新存档，证据输出到 `test/artifacts/web-game/`。截图与性能采样仅代表当前浏览器/设备。

## 状态与业务边界

- 存档统一使用 `common/utils/storage.js` 的 `STORAGE_KEYS`、读取函数和 `patchStorageObject()`，保留规范化与默认值逻辑。初始化由 `App.vue` 调用 `ensureStorageDefaults()`。
- 页面聚合状态优先使用 `common/utils/game-state.js` 的 `getGameSnapshot()`；场景切换、POI 到访和启动路由使用该模块现有函数。
- 存档不是 Vue 响应式状态。写入后沿用页面现有的快照刷新或 tick 机制，并在需要时通过 `onShow` 刷新。
- 任务由 `common/data/quests.js` 定义，通过 `quest-manager.js` 的 `advanceQuestByEvent()`、`EVENT_TYPES` 和 `recordSteps()` 推进。不要在页面另建一套任务状态或重复发奖。
- 等级与经验进度使用 `level.js`，POI 状态使用 `poi.js`，签到、成就、行旅册分别使用 `check-in.js`、`achievements.js`、`journal.js`。
- 区分 `silver`（银两）、`silverKey`（银钥）和 `score`（积分），保留既有奖励、扣费及重复领取保护。
- 新增或修改 POI、街道、任务时同步核对 ID、所属场景、建筑绑定与可达性。共享街巷布局位于 `common/utils/street-world.js`。

## Three.js 与 renderjs

- 当前角色为 `static/models/pingyao-hanfu-human.glb`，基于 Quaternius CC0 成人男性人体和同骨架动画，汉服源工程、构建脚本、纹理及许可在根目录 `3D/`。新旧骨架名称、鞋底材质、步频与碰撞半径不同；不要套用旧角色的坐标形变参数。`test/human-character.test.mjs` 验证当前模型，其他角色测试仍覆盖保留资产。
- 桌面操作：WASD/方向键移动、按住 Shift 快行、鼠标拖动环顾、滚轮缩放、E 互动、I 换装、J 行旅册、C 观衣、R 镜头归位、G 致意、Esc 关闭面板/设置。renderjs 键盘动作经现有 `handleRenderMsg` 桥接逻辑层，编辑输入框时不截获快捷键。

- 实际渲染代码在 `pages_game/street/street.vue` 和 `pages_game/3d-test/3d-test.vue` 的 `<script module="..." lang="renderjs">` 中。仅修改 `common/3d/` 不会自动改变这两个页面。
- 逻辑层负责 `uni.*`、存档和任务，renderjs 负责 DOM、WebGL、输入和动画。沿用页面内联实现，不在逻辑层导入 Three.js，也不把普通 npm 导入或 CDN 依赖直接搬入现有 renderjs 加载流程。
- 逻辑层通过 `sceneCmd` 与 `:change:sceneCmd` 下发命令，renderjs 通过 `$ownerInstance.callMethod('handleRenderMsg', ...)` 回传 JSON 可序列化数据。APP 两层不共享 `window`，不能用浏览器全局事件替代桥接。
- 保留街景页的 `defineExpose`、H5 公共实例代理上的 `handleRenderMsg` 注册及就绪前消息队列，否则可能丢失加载完成和玩家移动事件。
- Three.js 库从 `static/libs/` 串行加载为 `window.THREE`，顺序为 `three.min.js`、`CopyShader.js`、`LuminosityHighPassShader.js`、`EffectComposer.js`、`RenderPass.js`、`ShaderPass.js`、`UnrealBloomPass.js`。`EffectComposer` 定义 `THREE.Pass`，必须先于三个 Pass。
- 动态脚本和纹理沿用现有资源解析函数：APP 使用 `plus.io.convertLocalFileSystemURL('_www/static/...')`，H5 相对 `document.baseURI` 解析。不要把 APP 动态资源硬编码为文件系统根路径 `/static/...`。细节见 `static/libs/README.md`。
- 保留初始化、切场和异常路径的 `render-ready`/`render-error` 回传、重试及加载兜底。切场、重入和卸载需清理动画帧、监听器、计时器以及 geometry、material、texture、render target 等 GPU 资源。
- 游戏页的横屏由 `pages.json` 和 `common/utils/orientation.js` 配合控制；启动、选角、街景、对话和 3d-test 已配置横屏，其他页面默认竖屏。保留离开页面时的锁定释放及 H5/竖屏降级布局。

## 编码与视觉约定

- 普通组件使用 Vue 3 `<script setup>`、`defineProps()`、`defineEmits()`；renderjs 保持其现有 `export default` 结构，不套用普通组件的语法约束。
- 业务代码沿用 `@/` 或现有相对导入。`components/` 为扁平文件结构，使用的组件应显式导入，不假设 `easycom.autoscan` 能自动发现所有文件。
- 沿用现有 SCSS、`uni.scss` 中的 `$py-*` 变量和主题常量。常规布局使用 `rpx`，游戏画布与横屏 HUD 按现有 `px`、视口单位和媒体查询处理，避免机械替换单位。
- 视觉保持国风水墨、古城场景和 NPC 引导；使用现有图片及 `PyIcon.vue` 图标。主题基色为古铜棕 `#8B4513`、沙金色 `#D4A574`、中国红 `#C41E3A`、宣纸白 `#F5F0E8`。
- 修改前检查工作区已有改动，不覆盖用户的代码、素材或测试。不要提交 `node_modules/`、`unpackage/`、`.hbuilderx/`、`output/`、`test/artifacts/` 或临时镜像产物。

## 保留文档

仓库根目录：
- `当前项目进度.md`：历史开发记录，保留问题背景与修复过程，不作为当前待办或验收结论。
- `接口文档.md`：后端接口设计草案，尚未接入现有客户端。
- `沉浸式游戏古城UI设计[初稿].docx` 与 `img/`：原始设计和视觉参考。
- `CLAUDE.md`：引用本指南，避免维护两份不同步的开发规范。

应用源码目录：
- `static/libs/README.md` 与 `static/audio/README.md`：运行时资源说明。
