# AGENTS.md

本文件是仓库统一开发指南，以当前源码、配置与实际验证为准。历史记录与接口草案不代表已实现能力。

## 项目与目录

平遥古城文旅网页游戏，使用 Vue 3.5、vue-router 4、Vite 7、JavaScript、SCSS，仅做 Web，只用浏览器调试。流程为启动、选角、3D 街景探索，配合 NPC、任务、签到、成就、服饰、商城和行旅册。无后端鉴权，支付与线下核销尚未接入；步数来自虚拟移动。

```text
index.html / vite.config.js       入口、Vue 插件、@ 别名、样式转换
package.json / package-lock.json  ES modules、依赖与命令
public/static/                   图片、字体、音频、模型、纹理、Three.js 库
src/
  main.js                        根字号、存档初始化、成就同步、挂载应用
  App.vue                        router-view、keep-alive、标签栏、提示与确认框
  router.js                      hash 路由、alias、页面 meta
  platform/                      navigation、lifecycle、toast、modal、viewport
  styles/variables.scss          SCSS 变量（Vite additionalData 自动注入）
  styles/global.scss             全局重置与共享视觉类
  pages/                         index、map、shop、user 四个标签页
  pages_game/                    splash、role-select、street、dialog
  pages_shop/redeem/              兑换券页面
  common/data/                   角色、街道、POI、任务、服饰和文化文案
  common/utils/                  存档、快照、任务、定位、音频和街巷布局
  common/constants/theme.js      JS 主题常量
  common/styles/                 标签页横屏 mixin
  components/                    扁平存放公共 Vue 组件
scripts/ / 3D/scripts/            素材生成、裁切与发布打包
3D/                              Blender 源工程、纹理和许可
test/helpers/browser-env.mjs    浏览器 API 测试替身
test/                           Node 回归和 Python Playwright 审计
deploy/                         Nginx 配置和发布/回滚流程
dist/                           完整静态构建产物（忽略提交）
```

业务模块路径相对 src，页面不要建到根目录。public/static 在站点以 `/static/...` 访问，构建原样进入 dist/static；业务 bundle 在 dist/assets。直接修改仓库源码，没有源码镜像步骤。

## 命令与验证

仓库根目录执行，使用 Node.js 22.12+ 或 24：

```sh
npm ci
npm run dev                          # http://localhost:5219/#/splash
npm run build                        # dist/index.html、assets/、static/
npm run preview                      # 默认同为 5219
npm test                             # node --test test/*.test.mjs
node --test test/street-controls.test.mjs
node --test --test-name-pattern="计步" test/street-step-persistence.test.mjs
python test/mobile-visual-audit.py
python test/mobile-visual-audit.py --skip-street
python test/web-game-audit.py
```

- dev/preview 使用 strictPort，占用直接报错，不要重复启动。预览可显式指定 `npm run preview -- --port 5220`，固定 5219 的审计仍针对开发服务。
- 无 lint/typecheck 脚本。Node 回归包含源码断言和纯逻辑测试，localStorage、定位与 fetch 替身在 test/helpers/browser-env.mjs；通过不代表 3D 画面正确。
- 改业务或渲染后运行相关单测与构建；改街景/布局还需浏览器检查画面、交互、切页和尺寸变化。
- Python 审计依赖 playwright、Pillow、Playwright Chromium，默认 localhost:5219，证据在 test/artifacts。deployed-game-audit.py 单独接收站点 URL，使用隔离存档，不依赖开发钩子。截图与性能仅代表所用浏览器/设备。
- 目标视口：桌面宽度 ≥1000px（常用桌面布局还要求可用高度 ≥560px）；手机横屏 844×390、667×375；竖屏 390×844。

## 路由与 platform

createWebHashHistory 管理路由，根路径和未知路径回到 /splash。新增页面须注册 router.js，使 meta.page 与组件 defineOptions 的 name 一致。

| 新路径 | 页面 | 保留的旧路径 alias |
| --- | --- | --- |
| /splash | 启动 | /pages_game/splash/splash |
| /role-select | 选角 | /pages_game/role-select/role-select |
| /street | 街景 | /pages_game/street/street |
| /dialog | NPC 对话 | /pages_game/dialog/dialog |
| /home | 古城标签页 | /pages/index/index |
| /map | 地图标签页 | /pages/map/map |
| /shop | 商城标签页 | /pages/shop/shop |
| /user | 行旅册标签页 | /pages/user/user |
| /redeem | 兑换券 | /pages_shop/redeem/redeem |

旧分享链接和存档返回地址继续有效；新增跳转使用新路径。

- platform/navigation.js 接受字符串或 `{ url }`。navigateTo 推入页面，离开非标签页时暂存，返回原样恢复；redirectTo 替换当前地址。四个标签页常驻 keep-alive。
- switchTab 关闭其余暂存页，但街景保留并暂停渲染；navigateTo('/street') 或浏览器后退回来复用场景。reLaunch 清空全部缓存并替换地址，换身份/重置行旅后街景重建。缓存语义不等于清空浏览器历史。
- reLaunch 到当前地址也会通过 pageGeneration 重建页面。router/navigation 是共享单例，修改这两模块时开发热更新会整页重载，避免地址与视图使用不同实例。
- navigateBack 有站内历史则后退；深链无上一页时执行 fail 回调或回到 fallback（默认 /home）。
- platform/lifecycle.js 仅在页面 setup 中调用：onPageLoad 首次挂载前一次，传入 query；onPageShow 首次显示、缓存恢复或浏览器标签页重新可见时执行；onPageHide 缓存、卸载或标签页隐藏时执行。show/hide 交替，避免重复启动计时器和动画。
- toast.js 的 showToast/hideToast 控制 `.app-toast`；modal.js 的 showModal 返回 Promise，并支持 success/complete、确认/取消和可编辑输入。确认框 `.app-modal`，标签栏 `.app-tabbar` / `.app-tabbar__item`。

## 存档与业务边界

- 统一使用 common/utils/storage.js 的 STORAGE_KEYS、规范化 getter 和 patchStorageObject；页面不直接读写 localStorage，不新增零散键。数组型订单沿用该模块存储接口，不把数组作为对象 patch。
- 六键：pygc_runtime、pygc_user_profile、pygc_user_progress、pygc_game_settings、pygc_mock_flags、pygc_shop_redeem_orders。对象/数组保持旧版 `{"type":"object","data":...}` 包装兼容，字符串原样存储。
- main.js 在挂载前 ensureStorageDefaults 并同步成就。存档非响应式，用 game-state.js 的 getGameSnapshot 聚合，写入后刷新快照或 tick，在 onPageShow 重读。
- 场景、POI、启动路由沿用 game-state.js；quests.js 定义任务，由 quest-manager.js 的 advanceQuestByEvent/EVENT_TYPES 推进，步数经 step-buffer.js 批量 recordSteps。禁止重复推进与发奖。
- 等级、POI、签到、成就、札记分别用 level.js、poi.js、check-in.js、achievements.js、journal.js。日期使用 localDateString 的本地日界，不以 UTC 翻日。
- 区分 silver（银两）、silverKey（银钥）、score（积分），保留扣费失败与重复领取保护。修改 POI/街道/任务需核对 ID、所属场景、建筑绑定、触发半径和可达性，共享布局在 street-world.js。
- 地图使用 navigator.geolocation 获取 WGS84、本地转换 GCJ02；古城内投影到城图，城外/失败回落街景点位。浏览器定位需要 HTTPS 或 localhost 和授权。腾讯服务由 tencent-lbs.js 封装，配置 globalThis.__PYGC_CONFIG__.tencentLbs 的 key/proxyUrl；未配置显示“腾讯服务未配置”，不提交真实密钥。

## 街景与 Three.js

- 两部分：pages_game/street/street.vue 负责 Vue 逻辑、HUD、存档、任务和生命周期；street-renderer.js 负责 Three.js、DOM/WebGL、输入和动画，由页面直接驱动。接口细节以两文件源码为准。
- 使用随站点提供的 Three.js r146，不混入另一份 npm 引擎或 CDN。串行注入 window.THREE：three.min.js → CopyShader.js → LuminosityHighPassShader.js → EffectComposer.js → RenderPass.js → ShaderPass.js → UnrealBloomPass.js。EffectComposer 定义 THREE.Pass，必须先于三个 Pass。
- 核心完成后按需加载 RoomEnvironment、Sky、FXAAShader；模型需 GLTFLoader 和 SkeletonUtils。资源沿用解析函数，以 /static/ 或相对 document.baseURI 加载，详见 public/static/libs/README.md。
- 当前模型 public/static/models/pingyao-hanfu-human.glb，基于 Quaternius CC0 人体与同骨架动画；源工程和许可在 3D。旧角色骨架、鞋底、步频、碰撞参数不适用于当前人物。
- 保留加载就绪/失败、重试和 watchdog，真正就绪才结算到访。切场/卸载释放动画帧、监听器、计时器及 GPU geometry/material/texture/render target；缓存隐藏暂停，恢复不叠加监听器。
- 线性离屏 RT → 可选辉光 → FXAA/颜色输出；低帧率暂缓辉光/阴影并调整像素比，不能跳过必要输出冒充优化。时辰切换不应重编译整场材质。
- 桌面：WASD/方向键、Shift 快行、鼠标环顾、滚轮缩放、E 互动、I 换装、J 行旅册、C 观衣、R 归位、G 致意、Esc 关闭面板/设置。输入框不截获快捷键；手机保留触控取消处理。

## 编码、视觉与调试

- Vue 组件用 script setup、defineProps/defineEmits；显式导入扁平 components 中的组件。使用 @/（指向 src）或现有相对路径。
- SCSS 使用 styles/variables.scss 的 $py-* 及主题常量，经 Vite additionalData 注入。PostCSS 以 32rpx=1rem 转换；viewport.js 在宽度 ≤960px 时使 750rpx=视口宽，>960px 按 375px 基准固定。JS 内联尺寸用 rpx() 转 rem，不能直接向浏览器输出 rpx。
- 画布/HUD 保留 px、视口单位与媒体查询。四个栏目页在宽度 ≥1000px 使用 76px 顶部品牌导航，小屏使用底部标签栏；App 维护 --app-header-height、--window-bottom 等安全区变量，tab-landscape.scss 同时扣除顶部与底部占位。街景保持全屏。方向锁仅在支持的全屏浏览器尝试，不依赖成功，始终有横竖屏布局。
- 国风水墨、古城与 NPC 引导，沿用图片和 PyIcon.vue。主题：古铜棕 #8B4513、沙金 #D4A574、中国红 #C41E3A、宣纸白 #F5F0E8。
- 仅开发环境提供 `window.__pygc = { router, navigation, readStorage(key), page }`。readStorage 返回解码值；page 是当前 Vue 内部实例，状态在 page.setupState。程序化跳转用该 navigation 或 router，不动态导入 navigation.js，以免 HMR 后得到第二套缓存状态。生产无此钩子。

## 文件与历史资料

修改前检查工作区，不覆盖其他人的代码/素材/测试。任务产物留在项目内；不提交 node_modules、dist、.cache、output、test/artifacts 和个人调试文件。只清自己创建的中间文件，环境目录与旧遗留产物未经用户点名不删。

当前项目进度.md、test/*-report.md 是历史记录，不是当前待办；接口文档.md 是后端草案。原 UI docx 和 img 为设计参考。scripts/prepare-*.py 从 output/imagegen 读取源图并裁切入 public/static，不删除输入源。素材生成器会覆盖资产，不能作为普通验证命令运行。发布/回滚见 deploy/README.md，源码同步与部署是独立操作。
