# CLAUDE.md

完整开发规范、目录、路由、platform API、存档与视觉约定统一维护在 [AGENTS.md](AGENTS.md)。本文件只补充命令速查与跨文件架构脉络。

@AGENTS.md

## 命令速查

仓库根目录执行：

```sh
npm run dev                          # localhost:5219/#/splash，strictPort
npm run build                        # dist/
npm run preview                      # 默认 5219，勿与 dev 抢端口
npm test
node --test test/street-controls.test.mjs
node --test --test-name-pattern="计步" test/street-step-persistence.test.mjs
python test/mobile-visual-audit.py --skip-street  # 非街景布局冒烟
python test/mobile-visual-audit.py               # 完整视口矩阵
python test/web-game-audit.py                    # 键鼠、任务、五街、存档闭环
```

没有 lint/typecheck。Node 测试大量为源码断言，不能代替实际画面；审计截图与 JSON 在 test/artifacts，历史 report 不是最新验收。只用浏览器调试。

## 跨文件架构

### 启动与页面缓存

index.html → main.js：根字号、补齐存档、同步成就，再挂载 App 与 router。App 的 router-view/keep-alive 缓存由 platform/navigation.js 管理，生命周期封装负责显示/隐藏时刷新快照或暂停渲染。四个标签页常驻；街景切到标签页也暂存，回来复用场景；reLaunch 清空全部缓存，供换身份/重置使用。不要用每次重建街景代替正确的暂停/恢复。

开发调试使用 window.__pygc 的 router、navigation、readStorage 与 page.setupState。程序跳转使用应用已有 navigation 实例，避免热更新后动态导入另一个实例；生产包无此钩子。

### 存档 → 快照 → 任务

storage.js 管理六个 localStorage 键及旧包装格式；game-state.js 组合快照、启动路由与到访；quest-manager.js 消费事件、推进 objective、结算奖励。步数先进入 step-buffer.js 再批量落盘。存档不可写时保留提示和重试，不能假称已发奖；非响应式存档在 onPageShow 或 tick 后重取快照。

### 街景两部分

street.vue 维护 Vue/HUD/任务与加载状态，street-renderer.js 维护 Three.js、输入、动画、GPU 生命周期，由页面直接驱动；具体接口以源码为准，不另建平行输入/状态通道。街巷布局与触发半径由 street-world.js、streets.js 共享。

当前角色 public/static/models/pingyao-hanfu-human.glb；scripts/build-pingyao-character.mjs 生成的是保留的 courtyard 旧资产，不是当前人体模型。当前模型源工程、生成脚本与许可在 3D/。

phase.js 根据真实时间返回晨/午/昏/夜；街景平滑改变灯光、天空和辉光。后处理保持稳定颜色输出，低帧率降级不能制造昼夜色差或反复重编译整场材质。

### 尺寸与资源发布

Vite 把 SCSS 的 rpx 转 rem，viewport.js 决定根字号；内联样式用同一换算。App 在桌面提供顶部导航、小屏提供底部标签栏；--app-header-height / --window-bottom 与 tab-landscape.scss 配合，至少检查桌面、844×390、667×375、390×844。

public/static 原样进入 dist/static，业务 bundle 进入 dist/assets；没有源码复制脚手架。scripts/package-pingyao-release.mjs 从 dist 生成发布暂存目录、文本预压缩和 SHA256SUMS，发布/回滚见 deploy/README.md。素材生成器会覆盖 public/static，不当检查命令运行；output/imagegen 是输入源，应保留。

## 当前会话目标

只做 Web 端、逻辑闭环可玩、桌面与手机横竖屏显示正常、3D 精美流畅；素材可用 imagegen 网关生成后经 scripts/prepare-*.py 裁切入库。
