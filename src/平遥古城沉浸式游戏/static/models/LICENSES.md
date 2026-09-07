# 3D 与视觉资源许可证

街景建筑构件、行人、晋小鸦、猫、烟雾与灯光贴花由运行时代码生成。

## 角色模型

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
