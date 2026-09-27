# 平遥古城 3D 精修资产包

本目录保存 Blender / glTF 源资产。当前街景已接入 `pingyao-hanfu-human.glb`，兼容随包 Three.js r146；下面的 merchant 资产保留为上一版本。

## 当前 Web 角色

- 源工程：`pingyao-hanfu-human.blend`（Blender 5.2.2 LTS，已打包纹理，默认只显示一套服饰）。
- 运行时：`../src/平遥古城沉浸式游戏/static/models/pingyao-hanfu-human.glb`，内嵌贴图，无 CDN。
- 成人比例人体、3 档袖型、长短下摆、7 种头饰、7 种配饰；所有身份沿用这套男性基础网格，服装按存档切换。
- 9 段动画：Idle、Walking_A、Walking_B、Running_A、Interact、Talk、Cheer、Sit_Idle、PickUp。游戏当前使用前进步态、待机和致意；其余动作保留在资产中。
- 生成脚本 `scripts/build_pingyao_human_hero.py`，可用 `blender -b --factory-startup -P 3D/scripts/build_pingyao_human_hero.py` 重建。需将 CC0 上游包解压到项目 `.cache/quaternius/ubc/`、`ual/`，目录结构见脚本开头；服装贴图与提示词保留在 `textures/hanfu/`。
- `-- --preview` 可额外输出 Blender 预览到项目 `.cache/hanfu-build/`；正常修改可直接打开已打包纹理的 blend，不依赖下载缓存。
- 验证：`node --test test/human-character.test.mjs`；浏览器流程与截图：`python test/web-game-audit.py`。当前网页效果以 `test/artifacts/web-game/` 的实际渲染为准。

## 交付物

| 文件 | 用途 |
| --- | --- |
| `exports/pingyao-merchant-hero.glb` | 精修汉服主角，含骨架、换装部件、织锦纹理和五段动作 |
| `exports/pingyao-street-props.glb` | 古城灯笼、票号招牌、香炉道具组 |
| `pingyao-hero-atelier.blend` | Blender 5.2.2 LTS 源工程，含人物、道具和预览灯光 |
| `previews/hero-final.png` | 推荐商旅造型静态预览 |
| `previews/hero-interact.png` | 双手致意交互动作预览 |
| `previews/hero-walk-cycle.gif` | `Walking_A` 十帧循环预览 |
| `previews/street-props.png` | 三件道具预览 |
| `concepts/pingyao-hero-turnaround.png` | 角色四视图概念参考 |
| `textures/pingyao-brocade-512.png` | 移动端织锦贴图，已内嵌到人物 GLB |
| `scripts/build_pingyao_asset_pack.py` | 可重复执行的 Blender 构建与导出脚本 |
| `asset-manifest.json` | 面数、材质、动作和文件索引 |

## 人物规格

- glTF 2.0 / GLB，Y-up，约 1.894 米高。
- 31,392 三角面，移动端近景主角预算。
- 动作：`Idle`、`Walking_A`、`Running_A`、`Interact`、`Cheer`。
- 头饰：`hair-bun`、`skullcap`、`scholar-scarf`、`guard-cap`、`merchant-cap`、`festival-cap`、`merchant-crown`。
- 配件：`satchel`、`scroll`、`ledger`、`scabbard`、`jade`、`seal`、`tassel`。
- 保留项目现有 `hw_*` / `acc_*` 节点规则；节点使用 `_0`、`_1` 后缀，现有运行时正则可归并为同一换装件。
- 新增朱红与炭黑主色、晋商织锦衣缘及更明确的皮肤/布料/玉石/金属 PBR 参数；沿用原模型已验证的眉形与发髻，避免刚性面部附件在动作中发生漂移。

## 接入方式

人物 GLB 可放入应用的 `static/models/`，再把服饰数据中的 `modelPath` 或街景页 `PLAYER_MODEL_PATH` 指向新文件。道具 GLB 可由同一 `GLTFLoader` 加载，三个根节点分别为：

- `Prop_Lantern_Root`
- `Prop_Piaohao_Sign_Root`
- `Prop_Incense_Burner_Root`

这里的 merchant 接入说明仅适用于保留的上一版资产；当前入口已指向 human 模型。

## 重建

在 Blender 5.2.2 LTS 中打开 `pingyao-hero-atelier.blend` 可继续编辑。完整重建时，在 Blender 文本编辑器运行 `scripts/build_pingyao_asset_pack.py`；脚本读取项目现有 `pingyao-hanfu-courtyard.glb` 的原创网格和兼容骨架，重新生成本目录内的 GLB、预览、源工程和 manifest。

概念图与织锦原图使用 `gpt-image-2`、high quality 各生成一次，最终提示词保存在对应图片旁边。

## 验证记录

- 人物和道具 GLB 的 magic、版本、声明长度和实际长度一致。
- 人物 GLB 含 1 个 skin、5 段指定动画、1 张内嵌纹理。
- `Walking_A` 预览为 10 帧、400 x 500、100 ms/帧，连续帧均有有效像素差。
- Blender MCP 预览检查了待机、交互和道具场景。
