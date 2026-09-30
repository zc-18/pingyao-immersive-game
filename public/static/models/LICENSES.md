# 3D 与视觉资源许可证

本目录源文件位于仓库 `public/static/models/`，站点通过 `/static/models/` 访问，构建原样进入 `dist/static/models/`。下文 `3D/` 和 `scripts/` 路径相对仓库根目录。

街景建筑构件、行人、晋小鸦、猫、烟雾与灯光贴花由运行时代码生成。

## 角色模型

- **Pingyao Hanfu Human / pingyao-hanfu-human.glb**
  - 当前街景默认玩家和行人模型，Blender 源文件及构建脚本位于仓库 `3D/`。
  - Quaternius Universal Base Characters 的成人比例人体、皮肤与头发，配 Universal Animation Library 同骨架动作，均为 CC0 1.0 Universal。许可原文与来源链接见 `3D/LICENSES.md`。
  - 汉服与换装部件为程序化建模，纹理内嵌；含 9 段动作，运行时使用待机、漫步、跑步和致意。鞋底采样、双腿 IK 和步频随实际速度调整。
  - 书生造型修订：柔化脸部和眉形，重绘肤色贴图，重建内领并修整肩袖衔接；默认青灰交领长衫、束发和玉佩。生成贴图的来源与提示词见 `3D/LICENSES.md` 和 `3D/textures/hanfu/`。
  - 风格化成人男性角色，非扫描写实人物；衣物使用蒙皮，不是物理布料。

- **Pingyao Merchant Hero / pingyao-merchant-hero.glb**
  - 保留的上一版玩家和行人模型，由 `3D/pingyao-hero-atelier.blend` 导出；完整资产清单、预览与可重复构建脚本位于仓库根目录 `3D/`。
  - 基于下述 Pingyao Courtyard 原创可见网格和兼容骨架精修，新增晋商织锦衣缘、材质层次及商旅造型。织锦贴图已内嵌到 GLB。
  - 含 `Idle`、`Walking_A`、`Running_A`、`Interact`、`Cheer` 五段动作，31,392 三角面、2,093,208 bytes。KayKit 骨架和基础动作继续遵循 CC0 1.0 Universal。

- **Pingyao Courtyard / pingyao-hanfu-courtyard.glb**
  - 保留的上一版街景玩家和行人模型，由 `scripts/build-pingyao-character.mjs` 生成。沿用既有原创网格并调整成人头身比，同步重建骨架位置、逆绑定矩阵与动画平移轨道。
  - KayKit CC0 骨架与 Idle、Walking_A、Running_A、Cheer 的来源保持下述署名；步态与手臂摆幅已重定向。Interact 替换为本项目烘焙的双手致意、轻微躬身动画。
  - 31,392 三角面（含隐藏换装部件），1,772,732 bytes，约 1.69 MiB。渲染时按真实位移混合动作，玩家及行人使用鞋底采样及有限双骨骼 IK 支撑，暂停行走时行人回到待机。
  - 面部修订 2：收窄头型、连续曲面鼻部、贴合眼白的虹膜与瞳孔、独立眼睑和睫毛闭眼形变、细化耳廓与发丝、柔和皮肤顶点色。可见几何仍为本项目原创；骨架与动作来源不变。
  - 表面细化修订 1：重新分配面部网格密度，调整鼻梁、鼻尖和口鼻比例；双唇曲面带唇线与顶点色，虹膜带径向色差，皮肤增加局部暖色和柔和明暗。连续颈部在胸骨与头骨之间混合蒙皮，衣领包住颈根；细发丝使用渐细曲面。未新增外部图片或材质纹理。
  - 风格化成人角色，非扫描写实人物；衣摆是混合蒙皮与轻微形变，非完整布料物理。

- **Pingyao Hanfu Detailed / pingyao-hanfu-detailed.glb**
  - 保留的上一版模型。可见几何由本仓库先前版本生成，包括面部、头发、交领、袖口、手指、褶裙、布鞋和可切换配饰。
  - 保留下列 KayKit CC0 模型的骨架、绑定姿态以及 Idle、Walking_A、Running_A、Interact、Cheer 五段动画；没有复制其可见角色网格。
  - 当前生成命令 `node scripts/build-pingyao-character.mjs` 输出上述 courtyard 版本，旧详细模型文件保留。生成器从保留的 `pingyao-character.glb` 读取骨骼和动画。
  - 资源预算：小于 2 MiB，包含隐藏服饰变体在内小于 32,000 三角面。相同材质的可兼容网格合并，保留头饰和配饰的独立开关。
  - 运行时按服饰配色，使用混合蒙皮、眨眼和轻微布料形变；动作以真实位移速度混合。不是布料物理仿真或扫描人物模型。

- **KayKit Character Pack: Adventurers / Mage.glb**
  - 作者：Kay Lousberg（KayKit Game Assets）
  - 来源：https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
  - 固定版本：https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/tree/672074b73ba276876a19e8816ecdc5241817ab47
  - 许可证：CC0 1.0 Universal，原文见 `KayKit-CC0.txt`
  - 原始文件：`Characters/gltf/Mage.glb`，5,683 三角面、76 段骨骼动画、3,589,240 bytes
  - 修改：运行时隐藏魔法书、法杖、披风与法师帽；按服饰 JSON 给身体、袍、帽材质换色，并在 hips/head/hand 骨骼挂接程序化袍摆、腰带、冠帽和配饰。Idle/Walking/Running 驱动移动，Cheer/Interact 作为 POI 挥手动作。

## 字体

- **Ma Shan Zheng（马善政毛笔楷书）**
  - 作者：Google Fonts 项目所列字体作者
  - 来源：https://fonts.google.com/specimen/Ma+Shan+Zheng
  - 原始仓库：https://github.com/google/fonts/tree/main/ofl/mashanzheng
  - 许可证：SIL Open Font License 1.1，全文见 `../fonts/OFL-MaShanZheng.txt`
  - 修改：通过 Google Fonts `text` 参数生成仅覆盖本项目街名、牌匾和 POI 常用字的 WOFF2 子集；文件名为 `../fonts/MaShanZheng-Pingyao.woff2`

## Three.js 示例插件

`../libs/GLTFLoader.js`、`SkeletonUtils.js`、`Sky.js`、`RoomEnvironment.js`、`RGBELoader.js` 与 `FXAAShader.js` 来自 Three.js 0.146.0 `examples/js`，来源为 https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/ ，遵循 Three.js MIT 许可证。文件未改动。

模型加载失败会静默保留 `pingyao-player-v2` 程序化汉服角色，不阻塞街景。
