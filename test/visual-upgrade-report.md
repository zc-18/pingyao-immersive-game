# 平遥街景画质升级验收记录

日期：2026-09-07。运行时 Three.js：r146。源码目录：`src/平遥古城沉浸式游戏/`。

## 结论

街景已经从单层灰砖街提升为带实例化筒瓦、滴水轮廓、木构檐下、后院屋脊、延伸城墙、主题摊点和三层远景的低多边形古城。默认玩家增加外扩袍摆、手、面部、眨眼、衣摆惯性和重心起伏；街上有两名行人、晋小鸦、墙头猫、炊烟和风动布幡。灯笼增加骨架、光晕和地面暖光，四时辰的光色、雾、曝光、辉光和灯火在 2.2 秒内插值。

硬件 WebGL 采样满足整街不超过 200 draw calls、50k 三角面的预算。首次五街轮询为 154–171 calls、16.6k–19.0k triangles；补充的五街 × 四时辰热缓存矩阵为 154–173 calls、16.4k–19.0k triangles。FPS 没有在所有采样中稳定达到 60；首次五街轮询为 38.5–55.1 FPS，矩阵采样为 58.0–60.0 FPS。

## 画面证据

- 五街与四时辰截图：`test/artifacts/visual-upgrade/`
- 原始指标：`test/artifacts/visual-upgrade/streets-metrics.json`
- 五街 × 四时辰的 20 张截图与矩阵指标：`test/artifacts/visual-upgrade/matrix-*.png`、`matrix-metrics.json`
- 优化前与上一轮深度基线：`test/artifacts/landscape-depth/`

截图来自 WebGL canvas 帧缓冲，并验证移动前后画面发生变化，不只截取 HUD。

## 性能

条件：Windows、Playwright Chromium、844x390 CSS px、DPR 1、ANGLE D3D11、NVIDIA GeForce MX450。每街等待资源稳定后采样约 5 秒。手机式降级路径保持无阴影、Bloom 半分辨率、像素比上限 1.25；本轮自适应采样实际像素比为 0.85–1。

严格的五街 × 四时辰矩阵在同一浏览器会话预热后完成 20/20 组采样：调用范围 154–173，三角面 16,431–18,998，FPS 58.0–60.0。以下五街表保留首次轮询数据，用来体现初次资源解析、场景切换和偶发长帧的实际影响。

| 街景 | 上一轮 calls | 本轮 calls | 上一轮 triangles | 本轮 triangles | FPS |
| --- | ---: | ---: | ---: | ---: | ---: |
| bank-house | 136 | 154 | 7,759 | 16,566 | 54.1 |
| south-avenue | 146 | 167 | 8,747 | 17,868 | 51.2 |
| academy-lane | 144 | 160 | 8,523 | 17,044 | 55.1 |
| market-crossing | 154 | 171 | 9,545 | 18,362 | 52.9 |
| lantern-quarter | 148 | 167 | 9,961 | 18,994 | 38.5 |

| 灯街时辰 | calls | triangles | FPS |
| --- | ---: | ---: | ---: |
| 晨 | 162 | 18,653 | 52.1 |
| 午 | 162 | 18,653 | 47.1 |
| 昏 | 162 | 18,653 | 55.1 |
| 夜 | 167 | 18,994 | 51.2 |

纹理计数随五街依次访问累积到 115；它包含缓存中已上传过的牌匾、程序化纹理和每次解析的模型纹理，不等于单街独占纹理。额外连续切街复测显示几何资源在 149–167 之间波动，没有随场景单调增长。新增角色 GLB、离线插件、字体子集与许可证文件合计约 3.8 MiB，远低于 15 MiB 打包预算。KayKit Mage 原始模型为 5,683 三角面，程序化汉服附件加入后仍低于 8k 角色预算。

## 实现范围

- `street.vue`：APP/H5 二进制双路径、可选 GLB 解析、AnimationMixer 状态机、GLB 原位换装、程序化角色兜底、PMREM RoomEnvironment、WebGL2 4x MSAA/WebGL1 FXAA、Bloom、暗角暖调 ShaderPass、相机阻尼/前视/FOV/静止环视。
- `street.vue`：实例化筒瓦、檐椽/雀替、门钉与票号台阶、后院屋顶和烟囱、城墙雉堞、远山/城墙/屋脊视差、云层、行人/鸟/猫/炊烟、风动布幡、灯笼光晕和光斑。
- `street-world.js`：五街各增加拴马桩、上马石、水缸、水井、条凳、茶摊、酱菜缸、酒旗、晒布、鸟笼和门帘等主题陈设，不修改道路、相机边界和 POI 触发模型。
- `static/libs/`：加入 r146 的 GLTFLoader、SkeletonUtils、Sky、RoomEnvironment、RGBELoader 和 FXAAShader；运行时全部使用包内路径。
- `static/fonts/`：加入 44 KiB 的 Ma Shan Zheng WOFF2 子集和 OFL 文本；字体失败时回落 KaiTi/STKaiti/serif。
- `static/models/LICENSES.md`：记录字体与 Three.js 插件来源、许可证和修改方式。

## 验证

- `node --test test/*.test.mjs`：26/26 通过。
- `npm run build:h5`：通过。输出在系统临时目录 `pingyao-h5-harness/dist/build/h5`。
- `python test/landscape-depth-audit.py --only streets --phases --gpu --label ../visual-upgrade`：完成五街和四时辰采样；画布非空且移动前后有差异。
- `python test/landscape-depth-audit.py --only matrix --gpu --label ../visual-upgrade`：完成五街 × 四时辰 20/20 组合采样与画布截图。
- `python test/mobile-visual-audit.py`：390x844、430x932、844x390、932x430、667x375 与 1440x900 均完成；街景画布存在且加载层正常退出。
- 浏览器控制台仍有仓库既有的两个音频 `NotSupportedError`，原因是 `static/audio/` 没有可播放音源；`Object` 为已知的 `hideTabBar:fail not TabBar page`。两者不来自 WebGL 渲染。

## 未完成与真机验证

- 玩家使用 KayKit Adventurers 的 CC0 Mage 骨骼模型，运行时隐藏西式法师附件并挂接程序化汉服外层。资源或解析失败时会静默保留升级后的程序化汉服角色。
- 没有加入 ambientCG/Poly Haven PBR 贴图或 HDR。当前继续用可控体积的 Canvas 青砖、瓦、石板、木纹及 RoomEnvironment，避免未经视觉筛选的素材混搭。
- APP 的 `plus.io.resolveLocalFileSystemURL` + `FileReader.readAsArrayBuffer` + `GLTFLoader.parse()` 路径必须在 HBuilderX Android/iOS 真机验证；H5 fetch 成功不能替代该检查。
- 需要真机复测温升、持续 10 分钟移动、DPR 3、后台恢复、刘海安全区和首次解析 GLB/启用 Bloom 的长帧。灯街五街轮询采样最低为 38.5 FPS，尚不能宣称桌面或手机全程 60 FPS。
