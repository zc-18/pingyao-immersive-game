# 横屏适配与街景优化验收记录

日期：2026-09-05。源码根目录：`src/平遥古城沉浸式游戏/`。

本轮先保存现有工作区的页面基线，再修改四个 tab 页面和街景内联 renderjs。保留此前已有的页面、方向控制、素材和测试改动。未替换 Three.js 库，未接入后端，未更改本地任务发奖契约，未创建提交。

## 预览与对比图

- H5 预览：<http://localhost:5219/#/pages_game/splash/splash>
- [四页横屏 844×390 前后对比](artifacts/landscape-depth/comparisons/tabs-844x390.jpg)
- [矮横屏 667×375 前后对比](artifacts/landscape-depth/comparisons/tabs-667x375.jpg)
- [竖屏 390×844 前后对比](artifacts/landscape-depth/comparisons/tabs-390x844.jpg)
- [竖屏 430×932 前后对比](artifacts/landscape-depth/comparisons/tabs-430x932.jpg)
- [五条街景前后对比](artifacts/landscape-depth/comparisons/five-streets.jpg)
- [晨午昏夜 WebGL 画面](artifacts/landscape-depth/comparisons/phases.jpg)

每组对比左侧为优化前，右侧为优化后。截图含实时粒子、程序化纹理随机变化和时钟，不能用逐像素完全一致作为竖屏验收标准；容器尺寸另行测量。

## 横屏结果

限定 `(orientation: landscape) and (max-height: 600px)`，使用 Grid/Flex 分配剩余高度。没有整页缩放，没有修改全局 rpx 换算。共同处理 `vh/dvh` 回退、安全区和 tabBar 占位，APP 与 H5 分别保留原有页面方向和资源路径机制。

| 检查项 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 844×390 商城列表高度 | 0px，商品无法实际点击 | 220px，商品和详情可达 |
| 667×375 商城列表高度 | 0px | 205px |
| 844×390 地图高度 | 531.75px | 259.98px |
| 667×375 古城入街按钮顶部 | 640.80px，在首屏外 | 154.41px，44px 高 |
| 844×390 我的文档高度 | 3216px | 390px，册内独立纵向滚动 |
| 390×844、430×932 四页主要容器宽高差 | 基线 | 全部为 0px |

H5 实测中，横屏根部继承字体随 rpx 放大到约 31.51px，而同一会话旋转后的 `uni.upx2px(100)` 仍返回 52。这说明不能用全局 upx 结果代替实际 CSS 布局测量。横屏页面内改用稳定的字体、图标和触控尺寸，主要操作按约 44 CSS px 检查。

- 古城：左侧角色、NPC 与任务，右侧对话、入街主操作及入口；较矮横屏首屏可进入街景。
- 商城：压缩招牌、资产和分类，商品列表获得剩余高度；详情可滚动，兑换操作保持可达。
- 地图：底图和 POI 保持共用百分比坐标；地图按高度约束，详情进入右侧区域；全城 POI 实际点击通过。纯展示的玩家标记不再拦截点位点击。
- 我的：身份和等级、签到和成就分列，服饰与札记可滚动；修正成就弹层被动画 transform 和层叠顺序限制的问题。
- 衣橱与 POI：遮罩关闭改为独立兄弟节点，修正 H5 下内部按钮冒泡导致误关闭；衣橱预览与文字不再重叠，POI 增加可达的“查看线索”操作。
- 兑换券：横屏双列信息和二维码，长内容可滚动，底部操作与返回入口可达。

原始尺寸：[优化前](artifacts/landscape-depth/before/all-metrics.json)、[最终四页](artifacts/landscape-depth/after-final/tabs-metrics.json)、[竖屏尺寸差值](artifacts/landscape-depth/comparisons/portrait-dimension-deltas.json)。

## 3D 改动

实际渲染代码仍位于 `pages_game/street/street.vue` 内联 renderjs，沿用 `sceneCmd` 和 `handleRenderMsg` 桥接。

- 连续坡屋顶替代断开的屋面板，连接屋脊、山墙和檐口；依建筑样式区分面宽、门窗、柜台及立面细节。
- 立面统一朝向步行区，保留 POI 所属建筑、到访半径和可达范围；砖瓦 UV 按世界尺寸映射，牌匾平面匹配文字纹理比例。
- 调整门槛、箱体、摊位支脚和悬挂连接，去除造成支撑脱离的整组倾斜。
- 保留玩家化身和跟随相机，横屏采用较收敛的 FOV 和前方观察目标；移动、计步及目标交互保持有效。
- 协调四时辰曝光、补光、雾色与暖色窗灯。远景屋脊改用普通透明混合，修正昼景天空被混合层冲白；切换粒子类型时释放旧几何和材质。
- 将同材质静态几何合批，按街道两侧和装饰分组保留裁剪；窗光与灯笼材质单独分组，避免时辰变化连带改变墙面。
- 手机点光源预算 2，桌面 4，复用并移到最近的灯笼位置；紧凑视口 Bloom 内部尺寸为画布的一半，仅点灯时启用，低帧率时关闭。
- 保留手机阴影降级，桌面阴影贴图为 1024；动态像素比忽略首段 1.8 秒加载采样，避免启动工作直接触发降档。
- 场景、纹理缓存和玩家资源分别持有释放责任；切场去重释放材质/几何，缓存纹理只在整体卸载时释放。页面隐藏、恢复、上下文丢失和重建路径清理监听器及动画循环。

重要版本核实：仓库运行时 `THREE.REVISION` 实际是 **146**，并非文档所写的 157。纹理现在通过能力检测使用旧版 `encoding` 或新版 `colorSpace`；已在 `static/libs/README.md` 记录差异，没有擅自升级本地库及旧式后处理脚本。

## 性能数据

条件：Windows，Playwright Chromium 无头浏览器，844×390 CSS px，设备 DPR 1。每街等待 5 秒后采样约 5 秒，使用真实切街按钮并核对存档中的场景 ID。探针只注入测试浏览器，按 RAF 聚合包括后处理在内的 `renderer.info`，不在生产代码增加调试全局。

### 同场景资源比较

| 街景 | 绘制调用 前→后 | 三角面 前→后 | 几何资源 前→后 | 纹理资源 前→后 |
| --- | ---: | ---: | ---: | ---: |
| 票号旧巷 / bank-house | 252→136 | 7281→7759 | 239→136 | 39→27 |
| south-avenue | 261→146 | 8197→8747 | 249→147 | 52→40 |
| academy-lane | 253→144 | 8033→8523 | 241→145 | 68→56 |
| market-crossing | 265→154 | 8995→9545 | 252→154 | 78→66 |
| lantern-quarter | 275→148 | 8955→9961 | 262→148 | 86→74 |

调用减少约 42%–46%。三角面增加约 6%–11%，用于连续屋顶、山墙和支撑细节。纹理计数包含依次访问街景后已上传的缓存，不是单街独占资源，也不是 GPU 内存字节数。

### 软件渲染前后

ANGLE SwiftShader / Vulkan，实际像素比均为 0.85，阴影关闭。软件路径没有稳定的 FPS 提升，不能宣称达到手机性能目标。

| 街景 | FPS 前→后 | 平均帧间隔 ms 前→后 | P95 ms 前→后 |
| --- | ---: | ---: | ---: |
| bank-house | 5.49→4.93 | 182.09→202.77 | 233.30→216.60 |
| south-avenue | 3.97→4.65 | 252.17→215.21 | 333.30→233.30 |
| academy-lane | 7.27→4.74 | 137.50→210.87 | 150.10→233.30 |
| market-crossing | 7.35→4.88 | 136.03→204.85 | 183.40→216.70 |
| lantern-quarter | 4.78→4.75 | 209.02→210.41 | 250.00→216.70 |

### 硬件渲染优化后

实际 renderer：`ANGLE (NVIDIA, NVIDIA GeForce MX450, Direct3D11)`，显存 2GB。五街午景均为约 **60.00 FPS / 16.67ms**，P95 为 **16.70–16.80ms**，像素比 1，阴影关闭。此数据不能与软件基线计算 FPS 提升比例，也不代表手机真机。

灯市四时辰采样：晨 60.00、午 60.00、昏 40.87、夜 60.00 FPS。昏景平均帧间隔 24.47ms，P95 16.70ms，存在影响平均值的长帧；需要真机持续采样确认首次后处理启用及切时辰成本。夜景 162 次调用、9975 三角面、89 纹理、149 几何资源，含 Bloom 和已预热的四时辰缓存。

原始记录：[软件基线](artifacts/landscape-depth/before/streets-metrics.json)、[最终软件](artifacts/landscape-depth/after-final-software/streets-metrics.json)、[最终硬件及四时辰](artifacts/landscape-depth/after-final-hardware/streets-metrics.json)。不要使用早期 `before/all-metrics.json` 内的街景采样项，五街基线以独立 `streets-metrics.json` 为准。

## 验证范围

| 验证 | 结果与证据 |
| --- | --- |
| 390×844、430×932、844×390、932×430、667×375、1440×900 | 四个 tab 页面、衣橱、成就、商品详情、地图抽屉、设置和兑换券均有截图；未检测到横向溢出 |
| 同一页面连续旋转并回到竖屏 | 四页均通过；长内容允许正常纵向滚动，横屏内容区域无塌陷 |
| 选角→入城→移动→POI→任务奖励 | 实际输入走到日升昌；记录 12 步，到访、收藏和任务完成；发奖后银两 318，弹层可关闭 |
| 签到→购衣→装备→商城兑换→返回 | 签到累计 1 日，装备 `ledger-clerk`，生成 1 张本地兑换券，正常返回商城 |
| 五街连续切换 3 轮 | 每轮采样均为 148 几何 / 77 纹理 / 1 画布 / 5 灯光，资源进入平台期 |
| 街景内反复换装 | 6 次切换通过，纹理未因旧玩家释放而失效 |
| 页面隐藏、返回 | `sceneCmd` 暂停/恢复通过；浏览器合成 `visibilitychange` 测试通过，未等同于 APP 系统后台测试 |
| WebGL context loss / restore | 实际调用浏览器扩展触发中断、恢复，恢复后画布非空白 |
| 反复进入退出 3 次，DPR 3 | 像素比 1.25；每次仅 1 画布；退出后旧画布移除且上下文丢失；后两次均 136 几何 / 27 纹理 |
| WebGL 像素 | 在最终屏幕输出 pass 后、绘制缓冲丢弃前读取 `toDataURL()`；五街 RGB 方差 >1500，移动前后 RGB 平均绝对差 >25，非 HUD 截图假阳性 |
| Node 回归 | 25 项通过，包含实际 Three 对象上的合批边界、资源释放、屋脊连接、粒子更换和纹理兼容测试 |
| H5 生产构建 | 通过；输出位于系统临时目录 `pingyao-h5-harness/dist/build/h5` |

[完整流程记录](artifacts/landscape-depth/workflow/report.json)、[旋转与资源恢复记录](artifacts/landscape-depth/edges/report.json)、[衣橱截图](artifacts/landscape-depth/workflow/wardrobe-667x375.png)、[成就截图](artifacts/landscape-depth/workflow/achievement-667x375.png)、[恢复后的 WebGL](artifacts/landscape-depth/edges/restored-webgl.png)。

## 素材与边界

盘点并复用 `static/img/`、`static/img/3d/` 和原始 `img/`，没有本轮新增生成图或替换用户已有图片。现有 512×512 织锦约 96KiB，解码 RGBA 约 1MiB；1774×887 屋脊远景约 126KiB，RGBA 约 6MiB，含完整 mipmap 约 8MiB。动态资源加载失败保留材质兜底，APP 保留 `_www` 路径解析。

尚未进行 Android/iOS、HBuilderX APP WebView 或真机测试。待验证：真实刘海和手势区、APP rpx 换算与动态视口、系统旋转与锁定释放、后台恢复、低内存/温升、持续 10 分钟移动及 30 FPS 目标。浏览器此次采样不能替代这些测试。

已有运行提示仍存在：缺失音频文件导致 `NotSupportedError`；`static/audio/` 只有 README。原先显示为 `Object` 的 Promise 拒绝已定位为 `hideTabBar:fail not TabBar page`，不影响此次可见 tabBar 布局和导航，但控制台不是零错误。构建保留现有 Sass `@import`、Node 模块类型和启动器 shell 弃用提示。

清理测试生成的 `.pyc` 文件被自动审批策略拒绝，返回 `blocked by policy`；两份缓存保留在 `test/__pycache__/` 并已加入忽略规则。没有将缓存、截图、node_modules 或临时镜像纳入源码。

## 修改清单与复跑

本轮业务源码：四个 tab `.vue`、`common/styles/tab-landscape.scss`、`pages/user/user-landscape.scss`、`pages_shop/redeem/redeem.vue`、`components/OutfitWardrobe.vue`、`PyIcon.vue`、`StreetHud.vue`、`pages_game/street/street.vue`、`common/utils/street-world.js`、`phase.js`、`static/libs/README.md`。签到和成就布局覆盖限定在“我的”页面；公共组件原有竖屏尺寸保留。

验证文件：扩展 `test/mobile-visual-audit.py`，增加 `landscape-depth-audit.py`、`journey-depth-workflow.py`、`landscape-edge-workflow.py`、`street-resource-ownership.test.mjs` 和 `render-depth-evidence.py`。图片及 JSON 位于被忽略的 `test/artifacts/landscape-depth/`。

```sh
node --test test/*.test.mjs
# 构建与开发服务共用临时镜像，先停止开发服务再构建。
npm run build:h5
npm run dev:h5
python test/mobile-visual-audit.py
python test/journey-depth-workflow.py
python test/landscape-edge-workflow.py
python test/landscape-depth-audit.py --label after-final --only tabs --gpu
python test/landscape-depth-audit.py --label after-final-hardware --only streets --gpu --phases
python test/landscape-depth-audit.py --label after-final-software --only streets
python test/render-depth-evidence.py
```

性能审计应单独运行，避免并发浏览器审计影响采样。修改源码后等待 H5 镜像和编译完成再启动测试，防止热更新过程中读取到短暂的不完整文件。
